# Guia de Investigação de Incidente - Orders Desaparecidos

## Data do Incidente: 2026-03-20

## Resumo Executivo

Dados da tabela `orders` desapareceram sem explicação aparente. Investigação do código revelou que **a aplicação não possui mecanismos para deletar ordens em massa**.

## Status da Investigação do Código

| Verificação | Resultado | Detalhes |
|-------------|-----------|----------|
| Endpoint DELETE na API | ✅ NEGATIVO | `order.controller.ts` só tem operações GET |
| Método remove/delete | ✅ NEGATIVO | `order.service.ts` não possui métodos de deleção |
| CASCADE deletions | ✅ NEGATIVO | Foreign keys são `ON DELETE NO ACTION` |
| TypeORM synchronize | ✅ NEGATIVO | Está `false` - não recria tabelas |
| Acesso direto ao banco | ✅ CONFIRMADO | Ninguém da equipe acessou |

**Conclusão: O código NÃO é a causa.**

---

## Ação 1: Verificar Logs e Banco

### Via Railway CLI

```bash
# Instalar Railway CLI se necessário
npm install -g @railway/cli

# Login
railway login

# Ver logs recentes (últimas 500 linhas)
railway logs --lines 500 --verbose > railway-logs-$(date +%Y%m%d).txt

# Ver logs de um deployment específico
railway logs --deployment <deployment-id>
```

### Conectar ao PostgreSQL

```bash
# Opção 1: Via CLI do Railway
railway db connect

# Opção 2: Via psql direto (pegue DATABASE_URL no dashboard)
psql $DATABASE_URL

# Opção 3: Via tabela interativa no dashboard Railway
# 1. Vá no serviço PostgreSQL
# 2. Clique em "Query" ou "Connect"
```

### Queries de Investigação

```sql
-- 1. Verificar estado atual da tabela orders
SELECT COUNT(*) as total_orders FROM orders;

-- 2. Verificar outras tabelas (para confirmar se é isolado)
SELECT
    'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'product', COUNT(*) FROM product
UNION ALL
SELECT 'stripe_transactions', COUNT(*) FROM stripe_transactions
UNION ALL
SELECT 'crypto_transactions', COUNT(*) FROM crypto_transactions
UNION ALL
SELECT 'checkout_tracking_events', COUNT(*) FROM checkout_tracking_events;

-- 3. Verificar migrations executadas
SELECT * FROM migrations_history
ORDER BY timestamp DESC
LIMIT 10;

-- 4. Verificar sequências (indicativo de TRUNCATE)
-- Se sequence_value > 0 mas table_count = 0, alguém executou TRUNCATE
SELECT
    (SELECT COUNT(*) FROM orders) as table_count,
    (SELECT last_value FROM orders_id_seq) as sequence_value;

-- 5. Ver última ordem (se existir)
SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;

-- 6. Ver índices e constraints
\d orders

-- 7. Ver estatísticas da tabela
SELECT
    schemaname,
    tablename,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze
FROM pg_stat_user_tables
WHERE tablename = 'orders';
```

---

## Ação 2: Verificar Acessos e Permissões

### No Dashboard Railway

1. **Acesse:** https://railway.app
2. **Vá em:** Project → Settings → Members
3. **Verifique:** Quem tem acesso ao projeto

### Revogar Acessos Desnecessários

```bash
# Via CLI - listar membros
railway members

# Remover membro (se necessário)
railway members remove <email>
```

### Rotacionar Credenciais

**CRÍTICO:** Se houver suspeita de acesso não autorizado:

```bash
# 1. No Railway Dashboard, vá no serviço PostgreSQL
# 2. Clique em "Settings" → "Reset Database Credentials"
# 3. Atualize a DATABASE_URL nas variáveis de ambiente
```

### Verificar Variáveis de Ambiente

```bash
# Listar todas as variáveis ( cuidado com dados sensíveis )
railway variables

# Verificar se DATABASE_URL está exposta em algum lugar
grep -r "DATABASE_URL" .gitignore
grep -r "DATABASE_URL" .env*
```

---

## Ação 3: Adicionar Logging e Auditoria

### 3.1. Auditoria no Nível de Banco de Dados

```sql
-- Habilitar logging de statements no PostgreSQL
-- ATENÇÃO: Isso afeta performance, use apenas para investigação

-- Logar todos os statements (temporário)
ALTER DATABASE railway SET log_statement = 'all';

-- Ou logar apenas DDL (recomendado para produção)
ALTER DATABASE railway SET log_statement = 'ddl';

-- Verificar configuração atual
SHOW log_statement;
```

### 3.2. Criar Tabela de Auditoria

```sql
-- Tabela para registrar operações sensíveis
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE, TRUNCATE
    old_data JSONB,
    new_data JSONB,
    user_name VARCHAR(255),
    query_text TEXT,
    executed_at TIMESTAMP DEFAULT NOW(),
    ip_address INET
);

-- Índice para consultas
CREATE INDEX idx_audit_log_table ON audit_log(table_name, executed_at DESC);
```

### 3.3. Trigger para Auditoria da Tabela Orders

```sql
-- Função para registrar deleções
CREATE OR REPLACE FUNCTION log_order_deletion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        table_name,
        operation,
        old_data,
        query_text,
        executed_at
    ) VALUES (
        'orders',
        'DELETE',
        row_to_json(OLD),
        current_query(),
        NOW()
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_order_delete_audit ON orders;
CREATE TRIGGER trigger_order_delete_audit
    BEFORE DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_order_deletion();

-- Trigger para TRUNCATE
CREATE OR REPLACE FUNCTION log_order_truncate()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        table_name,
        operation,
        query_text,
        executed_at
    ) VALUES (
        'orders',
        'TRUNCATE',
        current_query(),
        NOW()
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_truncate_audit ON orders;
CREATE TRIGGER trigger_order_truncate_audit
    BEFORE TRUNCATE ON orders
    FOR EACH STATEMENT
    EXECUTE FUNCTION log_order_truncate();
```

### 3.4. Consultar Auditoria

```sql
-- Ver todas as deleções na tabela orders
SELECT * FROM audit_log
WHERE table_name = 'orders'
ORDER BY executed_at DESC;

-- Ver operações suspeitas
SELECT * FROM audit_log
WHERE operation IN ('DELETE', 'TRUNCATE', 'DROP')
ORDER BY executed_at DESC
LIMIT 20;
```

### 3.5. Logging na Aplicação

Adicionar middleware de auditoria já existe no projeto. Vamos expandi-lo:

**Arquivo:** `src/common/logging/audit-log.middleware.ts`

```typescript
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      auditLog?: {
        userId?: string;
        action: string;
        resource: string;
        details?: any;
      };
    }
  }
}

@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger('AuditLog');

  use(req: Request, res: Response, next: NextFunction) {
    // Log alterações em recursos sensíveis
    const originalSend = res.send;
    res.send = function (data) {
      if (req.method !== 'GET' && req.url.includes('/order')) {
        // Logar qualquer operação não-GET em orders
        // Isso ajuda a identificar operações suspeitas
      }
      return originalSend.call(this, data);
    };

    next();
  }
}
```

---

## Checklist Imediato

- [ ] Coletar logs do Railway dos últimos 7 dias
- [ ] Conectar ao banco e executar queries de investigação
- [ ] Verificar quem tem acesso ao projeto Railway
- [ ] Rotacionar DATABASE_URL se houver suspeita
- [ ] Implementar triggers de auditoria
- [ ] Configurar alertas no Railway
- [ ] Implementar backup automatizado

---

## Comandos Úteis Railway

```bash
# Listar todos os serviços
railway services

# Ver status do projeto
railway status

# Ver variáveis de ambiente
railway variables

# Ver logs em tempo real
railway logs --tail

# Ver histórico de deployments
railway deployments

# Abrir dashboard no navegador
railway open
```

---

## Cenários Possíveis

| Cenário | Probabilidade | Evidência a Procurar |
|---------|--------------|---------------------|
| Acesso não autorizado | ALTA | Queries DELETE de IP desconhecido |
| Migration acidental | MÉDIA | Migration `down` executada |
| Bug do Railway | BAIXA | Múltiplos usuários reportando |
| TRUNCATE manual | ALTA | Sequence com valor alto, tabela vazia |

---

## Contato Suporte Railway

Se nenhuma causa for identificada:

1. Abra ticket em: https://railway.app/support
2. Incluir: Project ID, Deployment ID, Período aproximado
3. Anexar: Logs coletados, Queries de investigação

---

## Prevenção Futura

1. **Implementar backups diários** automatizados
2. **Habilitar logging de queries** no PostgreSQL
3. **Usar variável de auditoria** para tracking
4. **Limitar acessos** ao projeto Railway
5. **Implementar soft deletes** ao invés de deletes físicos
6. **Monitorar métricas** com alertas
