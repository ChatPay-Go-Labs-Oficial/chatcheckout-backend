# Planejamento de Implementação: Cloudflare R2 Storage

**Issue:** #10 - Implement Cloudflare R2 for file storage  
**Data:** 2025-12-06  
**Status:** Em Planejamento

## 1. Visão Geral

Substituir o atual Google Cloud Storage (GCS) pelo Cloudflare R2 para reduzir custos e melhorar performance global.

### 1.1 Motivação

- **Custos:** R2 tem preços mais baixos que GCS
- **Egress Zero:** Sem taxas de transferência de dados de saída
- **Performance:** CDN global da Cloudflare
- **Compatibilidade:** API S3-compatible facilita migração
- **Situação Atual:** GCS está em bypass (dummy URL), facilitando a migração

## 2. Análise do Estado Atual

### 2.1 Código Existente

**Arquivo:** `src/upload/upload.service.ts`
- Atualmente em **bypass mode** (retorna URLs dummy)
- Usa `@google-cloud/storage` package
- Configuração hardcoded (bucket name, project ID)
- Credenciais via `service-account.json`
- Função: `uploadFile()` - recebe Multer file, retorna URL pública

**Dependências:**
- `@google-cloud/storage: ^7.17.1` - **REMOVER**
- `uuid` - usado mas não declarado no package.json - **ADICIONAR**

### 2.2 Fluxo Atual

1. Controller recebe arquivo via `FileInterceptor` (Multer)
2. Validação via `MultiFileValidationPipe`
3. UploadService gera UUID + nome original
4. ~~Upload para GCS bucket~~ (atualmente em bypass)
5. Retorna URL pública

## 3. Arquitetura Proposta

### 3.1 Stack Tecnológica

- **SDK:** `@aws-sdk/client-s3` (v3) - API S3-compatible
- **Multer:** Mantém integração atual
- **Config:** Migrar para variáveis de ambiente

### 3.2 Mudanças Estruturais

```
src/upload/
├── upload.controller.ts      # Sem alterações
├── upload.module.ts           # Sem alterações significativas
├── upload.service.ts          # Refatoração completa
├── pipes/
│   └── multi-file-validation.pipe.ts  # Sem alterações
└── config/                    # NOVO (opcional)
    └── r2.config.ts          # Configuração isolada do R2
```

## 4. Implementação Detalhada

### 4.1 Fase 1: Configuração e Dependências

#### 4.1.1 Variáveis de Ambiente

**Arquivo:** `.env` / `.env.example`

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=chatcheckout-uploads
R2_PUBLIC_URL=https://your-bucket.r2.dev  # URL pública do bucket (se configurado)

# Remover (ou deprecar):
# GCS_PROJECT_ID=...
# GCS_BUCKET_NAME=...
```

#### 4.1.2 Dependências NPM

**Adicionar:**
```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.621.0",
    "uuid": "^10.0.0"
  }
}
```

**Remover:**
```json
{
  "dependencies": {
    "@google-cloud/storage": "^7.17.1"  // REMOVER
  }
}
```

**Comandos:**
```bash
npm install @aws-sdk/client-s3 uuid
npm uninstall @google-cloud/storage
```

#### 4.1.3 Arquivo de Credenciais

- **Remover:** `service-account.json` (após migração completa)
- **Adicionar:** Instruções no `.gitignore` já protegem arquivos `.json`

### 4.2 Fase 2: Refatoração do UploadService

#### 4.2.1 Nova Implementação

**Arquivo:** `src/upload/upload.service.ts`

```typescript
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME');
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL');

    // Endpoint do Cloudflare R2
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    this.s3Client = new S3Client({
      region: 'auto', // R2 usa 'auto' como região
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    try {
      const fileName = `${uuidv4()}-${file.originalname}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Opcional: ACL pública se bucket permitir
        // ACL: 'public-read',
      });

      await this.s3Client.send(command);

      // Retorna URL pública
      return `${this.publicUrl}/${fileName}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload file to R2: ${error.message}`,
      );
    }
  }
}
```

#### 4.2.2 Melhorias Opcionais

**A. Validação de Configuração**

```typescript
constructor(private readonly configService: ConfigService) {
  const requiredVars = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID', 
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL',
  ];

  requiredVars.forEach(varName => {
    if (!this.configService.get(varName)) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  });
  
  // ... resto da inicialização
}
```

**B. Método de Deleção (futuro)**

```typescript
async deleteFile(fileName: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: this.bucketName,
    Key: fileName,
  });
  
  await this.s3Client.send(command);
}
```

**C. Método de Geração de URL Assinada (download temporário)**

```typescript
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async getSignedUrl(fileName: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: this.bucketName,
    Key: fileName,
  });
  
  return await getSignedUrl(this.s3Client, command, { expiresIn });
}
```

### 4.3 Fase 3: Configuração do Cloudflare R2

#### 4.3.1 No Dashboard Cloudflare

1. **Criar Bucket:**
   - Acessar R2 no dashboard
   - Criar bucket: `chatcheckout-uploads`
   - Escolher localização (padrão é multi-região)

2. **Gerar API Tokens:**
   - Criar API Token com permissões:
     - Object Read & Write
     - Bucket: `chatcheckout-uploads`
   - Anotar `Access Key ID` e `Secret Access Key`

3. **Configurar Domínio Público (Opcional mas Recomendado):**
   - Habilitar acesso público ao bucket
   - Configurar custom domain: `uploads.chatcheckout.com`
   - Ou usar R2.dev subdomain: `chatcheckout-uploads.r2.dev`

4. **CORS (se necessário para upload direto do frontend):**
   ```json
   [
     {
       "AllowedOrigins": ["https://chatcheckout.com"],
       "AllowedMethods": ["GET", "PUT", "POST"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

### 4.4 Fase 4: Testes

#### 4.4.1 Teste Unitário

**Arquivo:** `src/upload/upload.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  let service: UploadService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                R2_ACCOUNT_ID: 'test-account',
                R2_ACCESS_KEY_ID: 'test-key',
                R2_SECRET_ACCESS_KEY: 'test-secret',
                R2_BUCKET_NAME: 'test-bucket',
                R2_PUBLIC_URL: 'https://test.r2.dev',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Mock S3Client para testes isolados
  describe('uploadFile', () => {
    it('should upload file and return public URL', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test'),
        size: 1024,
      } as Express.Multer.File;

      // Mock do S3Client.send
      jest.spyOn(service['s3Client'], 'send').mockResolvedValue({} as any);

      const result = await service.uploadFile(mockFile);

      expect(result).toContain('https://test.r2.dev/');
      expect(result).toContain('test.pdf');
    });
  });
});
```

#### 4.4.2 Teste de Integração (Manual)

```bash
# 1. Configurar .env com credenciais reais do R2
# 2. Iniciar servidor
npm run start:dev

# 3. Testar upload via curl ou Postman
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/test-image.jpg"

# 4. Verificar:
# - Resposta contém URL pública
# - Arquivo acessível via browser na URL retornada
# - Arquivo aparece no dashboard R2
```

### 4.5 Fase 5: Documentação

#### 4.5.1 Atualizar `docs/setup.md`

**Seção: Configuration**

Substituir:
```markdown
**GCS:** Configure Google Cloud Storage credentials if you plan to test uploads.
```

Por:
```markdown
**Cloudflare R2:** Configure R2 storage for file uploads:
- `R2_ACCOUNT_ID`: Your Cloudflare account ID
- `R2_ACCESS_KEY_ID`: R2 API token access key
- `R2_SECRET_ACCESS_KEY`: R2 API token secret
- `R2_BUCKET_NAME`: Name of your R2 bucket (e.g., `chatcheckout-uploads`)
- `R2_PUBLIC_URL`: Public URL for your bucket (e.g., `https://your-bucket.r2.dev`)

To obtain credentials:
1. Go to Cloudflare Dashboard > R2
2. Create a bucket
3. Generate API token with Read & Write permissions
4. Configure public access if needed
```

#### 4.5.2 Atualizar `docs/architecture.md`

**Seção: Upload Module**

Substituir:
```markdown
**Service:** Integrates with Google Cloud Storage to upload files.
```

Por:
```markdown
**Service:** Integrates with Cloudflare R2 (S3-compatible) to upload files.
```

#### 4.5.3 Atualizar `.env.example`

Adicionar:
```bash
# Cloudflare R2 Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=chatcheckout-uploads
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

Remover (ou comentar como deprecated):
```bash
# GCS_PROJECT_ID=  # DEPRECATED: Migrated to Cloudflare R2
```

#### 4.5.4 Atualizar README.md (se houver)

Mencionar a mudança de storage provider no changelog ou features.

### 4.6 Fase 6: Migração de Arquivos Existentes (Se Aplicável)

**Status Atual:** GCS está em bypass (dummy URLs), então **não há arquivos reais para migrar**.

**Se houvesse arquivos:**

1. **Script de Migração:**
```typescript
// scripts/migrate-gcs-to-r2.ts
import { Storage } from '@google-cloud/storage';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

async function migrateFiles() {
  const gcs = new Storage({ /* config */ });
  const s3 = new S3Client({ /* config */ });
  
  const [files] = await gcs.bucket('old-bucket').getFiles();
  
  for (const file of files) {
    const [buffer] = await file.download();
    
    await s3.send(new PutObjectCommand({
      Bucket: 'new-bucket',
      Key: file.name,
      Body: buffer,
    }));
    
    console.log(`Migrated: ${file.name}`);
  }
}

migrateFiles().catch(console.error);
```

2. **Atualizar URLs no Banco:**
```sql
-- Se houver URLs no banco de dados (ex: tabela products)
UPDATE products 
SET image_url = REPLACE(
  image_url, 
  'https://storage.googleapis.com/chat-checkout-storage/',
  'https://chatcheckout-uploads.r2.dev/'
);
```

**Para este projeto:** Pular esta fase.

## 5. Checklist de Implementação

### 5.1 Preparação
- [ ] Criar bucket no Cloudflare R2
- [ ] Gerar API tokens (Access Key + Secret)
- [ ] Configurar domínio público para o bucket
- [ ] Testar conectividade com AWS CLI ou S3 Browser

### 5.2 Código
- [x] Instalar `@aws-sdk/client-s3` e `uuid`
- [x] Remover `@google-cloud/storage`
- [x] Refatorar `upload.service.ts` para usar S3Client
- [x] Adicionar validação de env vars
- [x] Adicionar tratamento de erros específicos do R2
- [x] Implementar testes unitários
- [ ] Executar testes e2e

### 5.3 Configuração
- [x] Adicionar variáveis R2 no `.env.example`
- [ ] Configurar `.env` local com credenciais reais
- [ ] Remover `service-account.json` (após confirmação)
- [ ] Verificar que `.gitignore` protege credenciais

### 5.4 Documentação
- [x] Atualizar `docs/setup.md`
- [x] Atualizar `docs/architecture.md`
- [x] Atualizar `docs/overview.md` (Cloud Storage section)
- [ ] Adicionar notas de migração em changelog (se houver)

### 5.5 Testes
- [ ] Teste manual: upload de imagem
- [ ] Teste manual: acesso público à URL
- [ ] Verificar arquivo no dashboard R2
- [ ] Teste de carga (opcional): múltiplos uploads simultâneos
- [ ] Validar integração com módulo Product (se usa upload)

### 5.6 Deploy
- [ ] Atualizar variáveis de ambiente no servidor (staging/production)
- [ ] Deploy de staging para validação
- [ ] Monitorar logs de erro
- [ ] Deploy de produção
- [ ] Verificar custos no dashboard Cloudflare

### 5.7 Cleanup
- [x] Remover código GCS comentado
- [ ] Deletar `service-account.json`
- [x] Remover dependência `@google-cloud/storage` do package.json
- [ ] (Se aplicável) Desativar bucket GCS antigo

## 6. Estimativa de Esforço

| Fase | Tarefa | Tempo Estimado |
|------|--------|----------------|
| 1 | Configuração R2 (dashboard) | 30 min |
| 2 | Instalação de dependências | 10 min |
| 3 | Refatoração do UploadService | 1-2 horas |
| 4 | Testes unitários | 1 hora |
| 5 | Testes de integração | 30 min |
| 6 | Atualização de documentação | 30 min |
| 7 | Code review + ajustes | 1 hora |
| **TOTAL** | | **4-5 horas** |

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Incompatibilidade S3 API | Baixa | Médio | R2 é altamente compatível; testar em staging primeiro |
| Problemas com CORS | Média | Baixo | Configurar CORS no bucket antecipadamente |
| Credenciais erradas | Média | Baixo | Validar env vars na inicialização |
| Performance inferior | Baixa | Médio | Benchmark antes/depois; R2 é geralmente mais rápido |
| Custo inesperado | Baixa | Baixo | R2 tem pricing previsível; monitorar dashboard |

## 8. Rollback Plan

Se houver problemas após deploy:

1. **Reverter código:**
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Restaurar variáveis GCS:**
   - Reativar `service-account.json`
   - Restaurar env vars antigas

3. **Reinstalar dependências:**
   ```bash
   npm install @google-cloud/storage
   npm uninstall @aws-sdk/client-s3
   ```

4. **Duração estimada do rollback:** 15-30 minutos

## 9. Métricas de Sucesso

- ✅ 100% dos uploads funcionando via R2
- ✅ URLs públicas acessíveis
- ✅ Tempo de upload < 2s para arquivos até 5MB
- ✅ Zero erros em 24h pós-deploy
- ✅ Redução de custos (comparar fatura GCS vs R2 após 1 mês)

## 10. Próximos Passos (Pós-Implementação)

1. **Monitoramento:**
   - Adicionar logs de performance de upload
   - Dashboard de métricas (uploads/dia, tamanho médio)

2. **Otimizações Futuras:**
   - Implementar resize de imagens (sharp + Lambda@Edge ou Cloudflare Workers)
   - CDN caching estratégico
   - Upload direto do frontend (signed URLs)

3. **Segurança:**
   - Implementar rate limiting específico para uploads
   - Validação de tipos de arquivo mais rigorosa
   - Scan de malware (Cloudflare for SaaS)

## 11. Referências

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS SDK for JavaScript v3 - S3 Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [R2 S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Migrating from GCS to R2](https://developers.cloudflare.com/r2/examples/gcs/)

---

**Documento criado em:** 2025-12-06  
**Última atualização:** 2025-12-06  
**Responsável:** Backend Team  
**Revisores:** -
