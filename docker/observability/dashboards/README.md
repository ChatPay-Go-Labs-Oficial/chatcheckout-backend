# Grafana Dashboards - ChatCheckout Backend

## Dashboards Disponíveis

### 1. 📊 **Overview da Aplicação** (`application-overview.json`)
Visão geral completa da aplicação com métricas HTTP, latência e status.

**Painéis incluídos:**
- Taxa de Requisições (RPS) por método e rota
- Latência p95 e p99
- Requisições por Status HTTP (stacked)
- Status da Aplicação (Up/Down gauge)
- Taxa de Erros (5xx)
- Top 10 Endpoints por Requisições
- Top 10 Endpoints por Latência

**Datasource:** Prometheus

---

### 2. 🔍 **Logs & Trace Correlation** (`logs-explorer.json`)
Dashboard completo para análise de logs com Loki e correlação com traces.

**Painéis incluídos:**
- Explorador de Logs interativo
- Logs por Nível (Error/Warning/Info)
- Distribuição por Nível (pie chart)
- Volume de Logs por Minuto
- Erros por Tipo
- Últimos 50 Logs de Erro
- Traces Mais Ativos

**Datasource:** Loki + Tempo (para trace correlation)

**Features:**
- Clique em um log para ver o trace completo no Tempo
- Filtre por `level`, `status_code`, `route`
- Correlação automática com traces via `trace_id`

---

### 3. 💰 **Métricas de Negócio** (`business-metrics.json`)
Dashboard focado em métricas de e-commerce e conversão.

**Painéis incluídos:**
- Taxa de Checkout Iniciados
- Taxa de Pagamentos Processados
- Taxa de Acesso a Produtos
- Latência p95 - Checkout & Pagamento
- Taxa de Erro - Checkout
- Top 10 Endpoints Populares

**Datasource:** Prometheus

**KPIs monitorados:**
- Throughput de checkout
- Performance de pagamentos
- Interação com produtos

---

## Como Importar

### Método 1: Via Interface do Grafana

1. Acesse: http://localhost:3001
2. Vá em: **Dashboards** → **Import**
3. Clique em: **Upload JSON file**
4. Selecione o arquivo JSON desejado
5. Configure a datasource (se necessário):
   - **Prometheus** → `prometheus`
   - **Loki** → `loki`
   - **Tempo** → `tempo`

### Método 2: Via Provisionamento Automático

Os dashboards podem ser auto-provisionados adicionando-os ao diretório de provisioning:

```bash
# Copie os dashboards para o diretório de provisioning
cp docker/observability/dashboards/*.json \
   docker/observability/provisioning/dashboards/
```

### Método 3: Via API do Grafana

```bash
# Import dashboard via API
curl -X POST \
  http://localhost:3001/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @docker/observability/dashboards/application-overview.json
```

---

## Variáveis e Filtros

### Variáveis Disponíveis

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `application` | Nome da aplicação | `chatcheckout-backend` |
| `environment` | Ambiente | `development`, `production` |
| `level` | Nível de log (Loki) | `info`, `warn`, `error` |
| `status_code` | Status HTTP | `200`, `404`, `500` |
| `method` | Método HTTP | `GET`, `POST` |
| `route` | Rota da API | `/health`, `/products` |
| `trace_id` | ID do trace (Tempo) | para correlação |

### Queries Loki Úteis

```logql
# Logs de erro nos últimos 15 minutos
{application="chatcheckout-backend", level="error"}

# Logs de uma rota específica
{application="chatcheckout-backend"} |= `"/auth/login"`

# Logs com trace_id para correlação
{application="chatcheckout-backend"} | json | trace_id != ""

# Erros 5xx com detalhes
{application="chatcheckout-backend", level="error"} | json | line_format "{{.method}} {{.url}} - {{.message}}"
```

### Queries Prometheus Úteis

```promql
# Taxa de requisições com erro 5xx
sum(rate(http_requests_total{status_code=~"5.."}[5m]))

# Latência p95 por rota
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (route))

# Status codes nos últimos 5 minutos
sum by (status_code) (rate(http_requests_total[5m]))

# Top 5 rotas mais lentas
topk(5, histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (route)))
```

---

## Correlação de Logs com Traces

Uma das funcionalidades mais poderosas do Grafana Stack é a correlação entre logs e traces:

### Como Funciona

1. Cada log inclui um `trace_id` (do OpenTelemetry)
2. Clique no `trace_id` no painel de logs do Loki
3. O Grafana abre automaticamente o trace completo no Tempo
4. Veja toda a jornada da requisição através dos microserviços

### Exemplo de Uso

```bash
# 1. Encontre logs de erro
{application="chatcheckout-backend", level="error"}

# 2. Clique no trace_id no log
# Exemplo: trace_id="0ebd5498506a6ffd8bd27daa670ca179"

# 3. O trace completo abre no Tempo mostrando:
# - Span de HTTP
# - Span de Database Query
# - Tempo total de cada operação
```

---

## Screenshots

### Application Overview
```
┌─────────────────────────────────────────────────────────┐
│ Visão Geral da Aplicação                                │
├─────────────────────────────────────────────────────────┤
│ [Taxa de Requisições]    [Latência p95/p99]            │
│ ┌─────────────────────┐ ┌───────────────────────────┐ │
│ │ GET /products        │ │ p95  ████████            │ │
│ │ POST /auth/login    │ │ p99  ████████████         │ │
│ └─────────────────────┘ └───────────────────────────┘ │
│                                                         │
│ [Status HTTP]     [App Status]   [Taxa de Erros]      │
│  ██████            UP (green)      0.5%                │
└─────────────────────────────────────────────────────────┘
```

---

## Atualização de Dashboards

### Recomendações para Produção

1. **Configure alertas** baseados nos dashboards
2. **Ajuste o time range** para períodos maiores (24h, 7d)
3. **Use variáveis** para ambientes (dev, staging, prod)
4. **Configure notificações** (Slack, Email, PagerDuty)

### Exemplo de Alerta

```yaml
# Alerta: Taxa de Erro Alta
name: HighErrorRate
expr: sum(rate(http_requests_total{status_code=~"5.."}[5m])) > 0.05
for: 5m
annotations:
  summary: "Taxa de erro acima de 5% nos últimos 5 minutos"
  description: "Taxa de erro: {{ $value | humanizePercentage }}"
```

---

## Troubleshooting

### Dashboards não mostram dados

1. **Verifique se as datasources estão configuradas:**
   - http://localhost:3001/datasources

2. **Verifique se o Prometheus está fazendo scrape:**
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

3. **Verifique se o Loki está recebendo logs:**
   ```bash
   curl 'http://localhost:3100/loki/api/v1/query?query={application="chatcheckout-backend"}'
   ```

4. **Verifique se o backend está rodando:**
   ```bash
   curl http://localhost:8000/health
   ```

### Variáveis não aparecem

1. **Verifique se LOKI_ENABLED=true**
2. **Verifique se TRACES_ENABLED=true**
3. **Confira a URL do Loki/Tempo**

---

## Próximos Passos

1. **Configure alertas** para monitoramento proativo
2. **Crie dashboards customizados** para casos específicos
3. **Integre com PagerDuty/Slack** para notificações
4. **Configure retenção** de logs e traces no Grafana Cloud
