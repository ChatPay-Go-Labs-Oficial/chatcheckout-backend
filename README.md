# ChatCheckout Backend

Backend do ChatCheckout com NestJS + TypeScript + PostgreSQL + Redis.

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Docker (opcional)

## Setup

1. **Instalar dependências**
```bash
npm install
```

2. **Configurar variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o `.env` com as seguintes variáveis:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=root
DATABASE_NAME=chatcheckout

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password_secret
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Rate Limiting
THROTTLE_TTL=60        # Tempo em segundos
THROTTLE_LIMIT=10      # Requisições permitidas

# Google Cloud Storage (opcional)
GCS_PROJECT_ID=
GCS_BUCKET_NAME=
GCS_KEY_FILE=

# Python Chat API (opcional)
PYTHON_API_URL=http://localhost:8000
```

3. **Subir banco de dados (Docker)**
```bash
docker-compose up -d postgres redis
```

4. **Executar aplicação**
```bash
npm run start:dev
```

Aplicação rodando em `http://localhost:3000`

## Estrutura do Projeto

```
src/
├── auth/           # Autenticação JWT + Blacklist de tokens
├── user/           # Gerenciamento de usuários
├── product/        # Gerenciamento de produtos
├── chat-ai/        # Integração com chat AI
├── upload/         # Upload de arquivos
├── common/         # Validadores e decorators compartilhados
└── config/         # Configurações da aplicação
```

## Testes

```bash
npm test              # Rodar testes
npm run test:cov      # Coverage
npm run test:watch    # Modo watch
```

**Status atual**: 72/72 testes passando ✅

## Endpoints Principais

**Base URL**: `http://localhost:3000`

### Autenticação
- `POST /auth/login` - Login (rate limit: 5 req/min)
- `POST /auth/refresh` - Renovar token (rate limit: 10 req/min)
- `POST /auth/logout` - Logout (requer autenticação)

### Usuários
- `POST /user/register` - Registrar usuário
- `GET /user/profile` - Perfil do usuário (requer autenticação)
- `PUT /user/:id` - Atualizar usuário (requer autenticação)
- `DELETE /user/:id` - Deletar usuário (requer autenticação)

### Produtos
- `POST /product` - Criar produto (requer autenticação)
- `GET /product` - Listar produtos
- `GET /product/:id` - Detalhes do produto
- `GET /product/user/:userId` - Produtos do usuário (requer autenticação)
- `PUT /product/:id` - Atualizar produto (requer autenticação)
- `DELETE /product/:id` - Deletar produto (requer autenticação)

## Segurança

- **Autenticação**: JWT com access token (1h) e refresh token (7d)
- **Blacklist**: Tokens invalidados armazenados no Redis
- **Rate Limiting**: 
  - Global: 10 requisições/minuto
  - Login: 5 requisições/minuto
  - Refresh: 10 requisições/minuto
- **Validações**: CPF/CNPJ com algoritmos corretos
- **Senhas**: Hash com bcrypt (10 rounds)
- **Guards**: Proteção de rotas com JWT Strategy

## Comandos Úteis

```bash
# Desenvolvimento
npm run start:dev       # Inicia com hot reload
npm run start:debug     # Inicia com debug

# Produção
npm run build           # Compila o projeto
npm run start:prod      # Inicia versão compilada

# Testes
npm test                # Roda todos os testes
npm run test:watch      # Modo watch
npm run test:cov        # Com coverage
npm run test:e2e        # Testes E2E

# Database
npm run migration:generate  # Gera migração
npm run migration:run       # Executa migrações
npm run migration:revert    # Reverte última migração

# Qualidade de código
npm run lint            # ESLint
npm run format          # Prettier
```

## Licença

MIT
