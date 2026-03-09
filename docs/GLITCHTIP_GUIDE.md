# Guia Completo de Monitoramento com GlitchTip

Este guia explica como usar o GlitchTip para monitorar eventos de negócio e erros da aplicação ChatCheckout Backend. A aplicação utiliza o SDK do Sentry (compatível com GlitchTip) para rastreamento automatizado e manual.

## 📋 Índice

- [Configuração do Ambiente](#configuração-do-ambiente)
- [Acessando o GlitchTip](#acessando-o-glitchtip)
- [Rastreamento Automatizado](#rastreamento-automatizado)
- [Eventos de Negócio](#eventos-de-negócio)
- [Testando a Integração](#testando-a-integração)
- [Estrutura dos Eventos](#estrutura-dos-eventos)
- [Filtrando Eventos](#filtrando-eventos)
- [Alertas e Notificações](#alertas-e-notificações)

---

## Configuração do Ambiente

Para habilitar o monitoramento, as seguintes variáveis de ambiente devem estar configuradas no `.env`:

```bash
# Habilita o rastreamento de erros (Sentry/GlitchTip)
ERROR_TRACKING_ENABLED=true

# Habilita o rastreamento de eventos de negócio
BUSINESS_EVENTS_ENABLED=true

# DSN do GlitchTip (fornecido pelo dashboard)
GLITCHTIP_DSN=https://1ed8b90712b4434a9b2e5821161a562d@glitchtip-web-production-5a21.up.railway.app/1

# Ambiente da aplicação
SENTRY_ENVIRONMENT=development

# Taxa de amostragem para performance (0.0 a 1.0)
TRACES_SAMPLE_RATE=1.0
```

---

## Acessando o GlitchTip

### URL de Acesso

```
https://glitchtip-web-production-5a21.up.railway.app/
```

### Primeiro Acesso

1. Acesse a URL acima.
2. Faça login com suas credenciais.
3. Selecione o projeto `chatcheckout-backend`.

---

## Rastreamento Automatizado

A aplicação possui mecanismos automáticos para capturar erros e performance sem necessidade de código extra em cada rota.

### 1. Captura de Exceções (`ErrorTrackingFilter`)
Todas as exceções não tratadas que chegam ao NestJS são capturadas automaticamente pelo `ErrorTrackingFilter` e enviadas ao GlitchTip com o contexto da requisição (URL, método, headers sanitizados).

### 2. Monitoramento de Performance (`ErrorTracingInterceptor`)
Operações críticas são rastreadas automaticamente para medir o tempo de resposta e sucesso:
- **Checkout**: Todos os fluxos de checkout.
- **Pagamentos**: Processamento de PIX, Cartão e Crypto.
- **Autenticação**: Login e Registro.
- **Webhooks**: Processamento de eventos do Stripe.
- **Amostragem**: 10% de todas as outras requisições (configurável via `TRACES_SAMPLE_RATE`).

---

## Eventos de Negócio

Para monitorar o sucesso e comportamento do usuário, utilizamos o `BusinessEventsService`.

### Como usar no código (Desenvolvedores)

Injete o serviço no seu componente:

```typescript
constructor(private readonly businessEvents: BusinessEventsService) {}

// Exemplo: Rastrear conclusão de uma transação crypto
this.businessEvents.trackCryptoEvent(CryptoEventType.TRANSACTION_COMPLETED, {
  transactionId: 'tx_123',
  amountFiat: '150.00',
  tokenSymbol: 'USDC',
  result: EventResult.SUCCESS
});
```

### Categorias Disponíveis
- `auth`: Logins, registros, falhas de senha.
- `product`: Criação, atualização, estoque baixo.
- `order`: Pedidos criados, cancelados, concluídos.
- `payment`: Sucesso/falha de pagamentos (PIX/Card/Crypto).
- `crypto`: Transações na blockchain, seleção de planos.
- `checkout_tracking`: Abandono de carrinho, etapas do checkout.

---

## Testando a Integração

Existem endpoints de teste para validar se os eventos estão chegando corretamente no GlitchTip.

### Endpoints de Teste (Swagger)
Acesse `/api` e procure pela tag `business-events`.

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/business-events/test/status` | Verifica se o rastreamento está ativo |
| `POST` | `/business-events/test/all` | Envia um evento de cada categoria para teste |
| `POST` | `/business-events/test/auth` | Testa evento de autenticação |
| `POST` | `/business-events/test/crypto` | Testa evento de criptomoeda |

---

## Estrutura dos Eventos

Cada evento enviado ao GlitchTip contém:

| Campo | Descrição |
|-------|----------|
| `message` | Título formatado: `[CATEGORIA] Nome do Evento - Resultado` |
| `level` | `info`, `warning`, `error` ou `critical` |
| `tags` | Tags para filtro: `sellerId`, `orderId`, `event_type`, `environment`, `correlation_id` |
| `extra` | Dados completos do evento (payload JSON) |
| `user` | ID e Role do usuário (se autenticado) |

---

## Filtrando Eventos

No dashboard do GlitchTip, use a barra de pesquisa para filtros avançados:

### Exemplos de Pesquisa
- **Tudo de um vendedor**: `tag:"sellerId:vendedor-123"`
- **Falhas de pagamento**: `tag:"event_category:payment" tag:"result:failure"`
- **Checkout abandonado**: `tag:"event_type:session.abandoned"`
- **Transações USDC**: `tag:"token_symbol:USDC"`
- **Erros Críticos**: `is:unresolved level:error`

---

## Alertas e Notificações

Configure alertas em **Settings → Alerts** para ser notificado sobre anomalias.

**Sugestões de Alerta:**
1. **Pico de Erros**: Mais de 5 exceções em 1 minuto.
2. **Falha Crítica de Pagamento**: Qualquer evento na categoria `payment` com resultado `failure` e severidade `error`.
3. **Abandono de Checkout**: Aumento repentino de `session.abandoned`.

---

## Suporte

- **Dashboard**: [Link do Railway](https://glitchtip-web-production-5a21.up.railway.app/)
- **Docs GlitchTip**: [glitchtip.com](https://glitchtip.com/documentation/)
- **Docs Sentry**: [docs.sentry.io](https://docs.sentry.io/) (O backend usa o SDK Node.js do Sentry)
