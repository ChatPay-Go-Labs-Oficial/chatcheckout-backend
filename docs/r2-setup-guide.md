# Guia Completo: Como Obter Credenciais do Cloudflare R2

Este guia mostra passo a passo como criar um bucket R2 e obter todas as credenciais necessárias.

## Pré-requisitos

- Conta Cloudflare (gratuita ou paga)
- Acesso ao dashboard Cloudflare

---

## Passo 1: Acessar o R2 no Dashboard

1. **Acesse:** https://dash.cloudflare.com/
2. **Faça login** com sua conta Cloudflare
3. No menu lateral esquerdo, procure por **"R2"** (pode estar em "Storage & Databases" ou diretamente na barra lateral)
4. Clique em **"R2 Object Storage"**

> **Nota:** Se for sua primeira vez, pode ser necessário ativar o R2. Cloudflare oferece 10GB grátis por mês!

---

## Passo 2: Obter o Account ID (R2_ACCOUNT_ID)

O Account ID fica visível na URL ou na tela principal do R2:

1. Quando você estiver na tela do R2, observe a **URL** do navegador
2. Ela terá um formato parecido com: 
   ```
   https://dash.cloudflare.com/[ACCOUNT_ID]/r2/overview
   ```
3. **Copie o ACCOUNT_ID** da URL (é uma string alfanumérica longa)
4. Ou procure por "Account ID" na tela, geralmente aparece no canto superior direito

**Exemplo:**
```
URL: https://dash.cloudflare.com/a1b2c3d4e5f6g7h8/r2/overview
Account ID: a1b2c3d4e5f6g7h8
```

---

## Passo 3: Criar um Bucket R2 (R2_BUCKET_NAME)

1. Na tela do R2, clique em **"Create bucket"**
2. **Nome do bucket:** Digite `chatcheckout-uploads` (ou o nome que preferir)
   - ⚠️ Deve ser único globalmente
   - Apenas letras minúsculas, números e hífens
3. **Localização:** Escolha a mais próxima dos seus usuários
   - Sugestões: 
     - `WNAM` (Western North America) - se usuários nos EUA
     - `ENAM` (Eastern North America) 
     - `WEUR` (Western Europe)
     - `Automatic` (recomendado) - deixa Cloudflare decidir
4. Clique em **"Create bucket"**
5. **Anote o nome do bucket** que você criou

**Variável de ambiente:**
```bash
R2_BUCKET_NAME=chatcheckout-uploads
```

---

## Passo 4: Gerar API Tokens (R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY)

Agora vamos gerar as credenciais de acesso:

### 4.1. Acessar Gerenciamento de API Tokens

1. Na tela do R2, procure no **menu superior/lateral** por:
   - **"Manage R2 API Tokens"** OU
   - **"R2 API Tokens"** OU
   - Botão **"Manage API Tokens"**

2. Alternativamente, vá direto para:
   ```
   https://dash.cloudflare.com/[SEU_ACCOUNT_ID]/r2/api-tokens
   ```

### 4.2. Criar Novo Token

1. Clique em **"Create API Token"**
2. Preencha as informações:

   **Nome do Token:**
   ```
   chatcheckout-backend-production
   ```

   **Permissões:**
   - Marque: ✅ **"Object Read & Write"**
   - Ou escolha: **"Admin Read & Write"** (se quiser permissões completas)

   **Aplicar a:**
   - Selecione **"Specific buckets"**
   - Escolha o bucket: `chatcheckout-uploads` (que você criou no Passo 3)

   **TTL (Time to Live):**
   - Deixe **"Forever"** (sem expiração) OU
   - Defina uma data de expiração se preferir

3. Clique em **"Create API Token"**

### 4.3. Copiar as Credenciais

⚠️ **IMPORTANTE:** Esta tela aparece **APENAS UMA VEZ**! Copie e salve as credenciais imediatamente.

Você verá algo assim:

```
Access Key ID: a1b2c3d4e5f6g7h8i9j0
Secret Access Key: AbCdEfGhIjKlMnOpQrStUvWxYz0123456789ABCD
```

**Copie e cole no seu `.env`:**
```bash
R2_ACCESS_KEY_ID=a1b2c3d4e5f6g7h8i9j0
R2_SECRET_ACCESS_KEY=AbCdEfGhIjKlMnOpQrStUvWxYz0123456789ABCD
```

⚠️ **Se você perder o Secret Access Key:**
- Não há como recuperar
- Será necessário deletar o token e criar um novo

---

## Passo 5: Configurar Acesso Público ao Bucket (R2_PUBLIC_URL)

Para que os arquivos enviados sejam acessíveis publicamente via URL:

### Opção A: Usar Domínio R2.dev (Mais Simples)

1. Na lista de buckets do R2, clique no bucket `chatcheckout-uploads`
2. Vá para a aba **"Settings"**
3. Procure por **"Public access"** ou **"R2.dev subdomain"**
4. Clique em **"Allow access"** ou **"Connect domain"**
5. Escolha **"R2.dev subdomain"** (grátis)
6. A URL será algo como:
   ```
   https://pub-a1b2c3d4e5f6.r2.dev
   ```
   OU
   ```
   https://chatcheckout-uploads.a1b2c3d4e5f6.r2.dev
   ```

**Copie essa URL e adicione ao `.env`:**
```bash
R2_PUBLIC_URL=https://pub-a1b2c3d4e5f6.r2.dev
```

### Opção B: Usar Domínio Customizado (Avançado)

Se você tem um domínio próprio gerenciado pela Cloudflare:

1. Na aba **"Settings"** do bucket
2. Clique em **"Connect domain"**
3. Escolha **"Custom domain"**
4. Digite: `uploads.seudominio.com`
5. Cloudflare irá configurar automaticamente o DNS

**Adicione ao `.env`:**
```bash
R2_PUBLIC_URL=https://uploads.seudominio.com
```

---

## Passo 6: Configurar CORS (Opcional mas Recomendado)

Se o frontend vai fazer upload direto, configure CORS:

1. No bucket, vá para **"Settings"**
2. Procure por **"CORS policy"**
3. Clique em **"Add CORS policy"**
4. Cole este JSON:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://seudominio.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

5. Clique em **"Save"**

---

## Resumo Final: Arquivo .env

Após seguir todos os passos, seu `.env` deve ter:

```bash
# Cloudflare R2 Storage
R2_ACCOUNT_ID=a1b2c3d4e5f6g7h8        # Do Passo 2
R2_ACCESS_KEY_ID=a1b2c3d4e5f6g7h8i9j0 # Do Passo 4.3
R2_SECRET_ACCESS_KEY=AbCdEfGhIjKlMnOpQrStUvWxYz0123456789ABCD # Do Passo 4.3
R2_BUCKET_NAME=chatcheckout-uploads   # Do Passo 3
R2_PUBLIC_URL=https://pub-a1b2c3d4e5f6.r2.dev # Do Passo 5
```

---

## Testando a Configuração

### Via AWS CLI (S3 Compatible)

Se você tem AWS CLI instalado, pode testar:

```bash
export AWS_ACCESS_KEY_ID="seu-access-key-id"
export AWS_SECRET_ACCESS_KEY="seu-secret-access-key"
export AWS_ENDPOINT_URL="https://a1b2c3d4e5f6g7h8.r2.cloudflarestorage.com"

# Listar buckets
aws s3 ls --endpoint-url=$AWS_ENDPOINT_URL

# Upload de teste
echo "Teste" > test.txt
aws s3 cp test.txt s3://chatcheckout-uploads/test.txt --endpoint-url=$AWS_ENDPOINT_URL
```

### Via Aplicação NestJS

Após configurar o `.env`, inicie o servidor:

```bash
npm run start:dev
```

Se o servidor iniciar sem erros de "Missing required environment variable", está tudo certo!

---

## Troubleshooting

### ❌ "Forbidden" ao fazer upload
- Verifique se o API Token tem permissão de **Write**
- Confirme que o token foi aplicado ao bucket correto

### ❌ "Bucket not found"
- Verifique o nome do bucket no `.env`
- Certifique-se que o bucket existe no dashboard

### ❌ "Invalid credentials"
- Verifique se copiou corretamente o Access Key ID e Secret
- Confirme que não há espaços extras

### ❌ Arquivo não acessível publicamente
- Verifique se habilitou "Public access" no bucket
- Confirme a URL pública (R2_PUBLIC_URL)

---

## Links Úteis

- **Dashboard R2:** https://dash.cloudflare.com/
- **Documentação R2:** https://developers.cloudflare.com/r2/
- **API S3 Compatibility:** https://developers.cloudflare.com/r2/api/s3/api/
- **Pricing R2:** https://developers.cloudflare.com/r2/pricing/

---

## Próximos Passos

Após obter todas as credenciais:

1. ✅ Atualizar `.env` com os valores reais
2. ✅ Reiniciar o servidor: `npm run start:dev`
3. ✅ Testar upload via Swagger: `http://localhost:3000/api`
4. ✅ Verificar arquivo no dashboard R2
5. ✅ Validar URL pública no navegador

**Boa sorte! 🚀**
