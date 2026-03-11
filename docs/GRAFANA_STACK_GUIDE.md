# Guia do Grafana Stack (LGTM) no Railway

Este guia explica como configurar e utilizar a stack LGTM (Loki, Grafana, Tempo, Prometheus) no Railway para substituir o GlitchTip e ter uma visão completa de logs, métricas e traces da sua aplicação NestJS.

## 1. O que é cada componente?

Diferente do GlitchTip que é uma ferramenta única, a stack da Grafana é modular:

- **Grafana**: A interface visual onde você vai criar dashboards e consultar todos os dados.
- **Loki**: Onde os logs estruturados (do Pino) são armazenados. É como o Elasticsearch, mas otimizado para logs.
- **Tempo**: Onde os traces distribuídos (do OpenTelemetry) são armazenados. É aqui que você vê o tempo de execução de cada função/requisição.
- **Prometheus**: O banco de dados de séries temporais que guarda as métricas (consumo de CPU, memória, requisições por segundo, etc).

## 2. Deploy da Stack no Railway

A maneira mais fácil de subir essa infraestrutura é usar o template oficial do Railway.

1. Vá para o painel do seu projeto no Railway.
2. Clique em **New** -> **Template**.
3. Pesquise por **Grafana Loki Tempo Prometheus** (ou "Grafana Stack").
4. Faça o deploy desse template no mesmo ambiente/projeto onde está o seu backend (`chatcheckout-backend`).

Isso vai criar 4 serviços separados no seu projeto.

## 3. Configurando Variáveis de Ambiente no Backend

Para que o seu backend envie os dados para a stack recém-criada, você precisa ir nas configurações do serviço `chatcheckout-backend` no Railway e adicionar as seguintes variáveis apontando para os serviços internos do Railway:

```env
# URL interna do serviço do Loki no Railway (porta padrão do Loki é 3100)
LOKI_URL=http://loki.railway.internal:3100

# Endpoint OTLP do Tempo para receber traces (usando HTTP na porta 4318)
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://tempo.railway.internal:4318/v1/traces

# Certifique-se de que o nível de log está adequado
LOG_LEVEL=info
```

*(Nota: O nome exato `.railway.internal` depende do nome do serviço que foi criado pelo template. Se o serviço se chamar apenas `loki`, a URL será `http://loki.railway.internal:3100`)*

Para as métricas do **Prometheus**, o Prometheus é quem vai "puxar" as métricas do seu backend. Você precisa configurar o serviço do Prometheus no Railway (geralmente editando o `prometheus.yml` no volume ou nas variáveis do serviço) para fazer o *scrape* do seu backend apontando para: `http://<seu-backend>.railway.internal:8000/metrics`.

## 4. Como ver os dados no Grafana

Após o deploy, acesse a URL pública gerada para o serviço do **Grafana** (login padrão costuma ser `admin` / `admin`).

A mágica da stack LGTM é a conectividade entre os dados. Aqui estão as formas de uso comparadas ao GlitchTip:

### Logs (Substituindo a aba de erros do GlitchTip)
1. No menu lateral do Grafana, vá em **Explore** (Explorar).
2. No dropdown superior esquerdo, selecione o data source **Loki**.
3. Você pode filtrar por aplicação: `{application="chatcheckout-backend"}`.
4. Para ver erros, adicione: `{application="chatcheckout-backend", level="error"}`.
5. Os logs estarão no formato JSON.

### Tracing (Substituindo a aba de Performance do GlitchTip)
O nosso backend já está configurado para injetar o `trace_id` em todos os logs.

1. Quando você estiver vendo um erro ou um log de requisição no **Loki** (na aba Explore), expanda a linha do log.
2. Você verá um botão/link chamado **Tempo** ou um ícone ao lado do `trace_id`.
3. Ao clicar, o Grafana mudará a tela para o **Tempo**, mostrando um gráfico de cascata de quanto tempo a requisição demorou, com o tempo exato de cada consulta ao TypeORM (banco de dados) ou requisições HTTP externas!

### Metrics e Dashboards
Você pode criar Dashboards visuais para:
- **Taxa de Erros**: Um gráfico contando logs com `level="error"` (usando Loki).
- **Consumo de Memória/CPU**: Gráficos usando os dados do data source **Prometheus** (ex: `process_resident_memory_bytes`).
- **Tempo de Resposta**: Gráficos mostrando `http_request_duration_seconds` do Prometheus.

## 5. Próximos Passos Recomendados

1. **Dashboard Inicial**: Crie um dashboard no Grafana misturando gráficos do Prometheus (requisições/segundo) com um painel de logs do Loki mostrando os últimos erros.
2. **Alertas da Grafana**: No menu "Alerting", você pode configurar para receber uma notificação no Slack/Email/Webhook caso apareçam logs com `level="error"` no Loki, simulando os alertas automáticos do GlitchTip.
