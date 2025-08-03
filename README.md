# BUSC-AI 2.0

Sistema de Busca Inteligente na Web com IA

Um sistema avançado de pesquisa que utiliza Inteligência Artificial para analisar consultas, buscar informações na web, extrair conteúdo relevante e sintetizar respostas abrangentes e precisas.

## Características

### IA Avançada
- Análise semântica de consultas usando Cohere AI
- Geração inteligente de palavras-chave
- Sumarização automática de conteúdo
- Síntese de respostas a partir de múltiplas fontes

### Busca Web Inteligente
- Múltiplas estratégias de busca
- Filtragem automática de spam e paywalls
- Validação de URLs em tempo real
- Deduplicação de resultados

### Performance
- Cache inteligente com TTL configurável
- Rate limiting para APIs
- Processamento paralelo/assíncrono
- Retry automático com backoff exponencial

### Robustez
- Tratamento abrangente de erros
- Fallbacks para falhas de IA
- Validação rigorosa de entrada
- Logs detalhados para monitoramento

## 📁 Estrutura do Projeto

```
busc-ai-2.0/
├── src/
│   ├── core/
│   │   └── engine.js          # Motor principal do sistema
│   ├── services/
│   │   ├── ai.js             # Integração com APIs de IA
│   │   ├── search.js         # Serviço de busca web
│   │   └── scraper.js        # Extração de conteúdo
│   ├── utils/
│   │   ├── cache.js          # Sistema de cache
│   │   ├── helpers.js        # Funções utilitárias
│   │   └── logger.js         # Sistema de logs
│   ├── ui/
│   │   └── terminal.js       # Interface de terminal
│   ├── config.js             # Configurações centralizadas
│   └── main.js               # Ponto de entrada
├── cache/                    # Cache de resultados
├── logs/                     # Arquivos de log
├── temp/                     # Arquivos temporários
├── .env                      # Variáveis de ambiente
├── .config                   # Configurações do sistema
└── package.json
```

## Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### 1. Clone o repositório
```bash
git clone <repository-url>
cd busc-ai-2.0
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Edite o arquivo `.env`:

```env
# API Keys (OBRIGATÓRIO)
COHERE_API_KEY=sua_chave_cohere_aqui
SERPER_API_KEY=sua_chave_serper_aqui

# Environment
NODE_ENV=development
LOG_LEVEL=info

# Rate Limits
API_RATE_LIMIT=10
WEB_REQUEST_RATE_LIMIT=5

# Cache Settings
CACHE_TTL=86400
CACHE_MAX_SIZE=1000
```

### 4. Obtenha as chaves de API

#### Cohere AI
1. Acesse [cohere.ai](https://cohere.ai)
2. Crie uma conta gratuita
3. Gere uma API key no dashboard
4. Adicione no `.env` como `COHERE_API_KEY`

#### Serper (Google Search)
1. Acesse [serper.dev](https://serper.dev)
2. Crie uma conta
3. Obtenha sua API key (100 pesquisas grátis/mês)
4. Adicione no `.env` como `SERPER_API_KEY`

## Uso

### Executar o sistema
```bash
npm start
```

### Modo desenvolvimento (com hot reload)
```bash
npm run dev
```

### Exemplo de uso
```
BUSC-AI 2.0
Sistema de Busca Inteligente na Web com IA

Digite sua pesquisa: Como funciona a energia solar?

⠋ Analisando consulta com IA...
⠋ Gerando palavras-chave...
⠋ Executando busca na web...
⠋ Extraindo conteúdo das páginas...
⠋ Resumindo informações...
⠋ Sintetizando resposta final...

================================================================================
RESULTADO DA PESQUISA
================================================================================

Introdução:
A energia solar é uma tecnologia que converte a luz do sol em eletricidade...

Pontos Principais:
• Células fotovoltaicas convertem luz em energia elétrica
• Painéis solares podem ser instalados em residências e empresas
• Tecnologia limpa e sustentável...

FONTES CONSULTADAS:
1. Portal Solar - Como funciona a energia solar
   https://portalsolar.com.br/como-funciona
   
2. ANEEL - Energia Solar Fotovoltaica
   https://aneel.gov.br/energia-solar
```

## Configuração

### Arquivo `.config`
Personalize o comportamento do sistema:

```json
{
  "system": {
    "maxPagesToAnalyze": 7,      // Máximo de páginas para analisar
    "timeoutRequests": 30000,    // Timeout para requisições (ms)
    "maxContentLength": 50000    // Tamanho máximo de conteúdo
  },
  "search": {
    "resultsPerQuery": 20,       // Resultados por consulta
    "region": "br",              // Região de busca
    "language": "pt-BR"          // Idioma preferido
  },
  "ai": {
    "model": "command-nightly",  // Modelo Cohere
    "maxTokens": 2048,           // Máximo de tokens por resposta
    "temperature": 0.3           // Criatividade (0-1)
  }
}
```

## Como Funciona

### 1. **Análise da Consulta**
- IA analisa a consulta e identifica tópico principal
- Detecta tipo de intenção (pergunta, definição, comparação)
- Gera palavras-chave relevantes

### 2. **Busca Web**
- Executa múltiplas consultas com diferentes estratégias
- Filtra automaticamente spam, paywalls e conteúdo irrelevante
- Remove duplicatas e rankeia por relevância

### 3. **Extração de Conteúdo**
- Valida URLs antes da extração
- Extrai conteúdo principal das páginas
- Limpa e normaliza o texto

### 4. **Análise por IA**
- Cada página é resumida individualmente
- Extrai pontos principais, dados e entidades
- Avalia confiabilidade da fonte

### 5. **Síntese Final**
- Combina todos os resumos
- Identifica consensos e contradições
- Gera resposta estruturada e abrangente

## Scripts Disponíveis

```bash
npm start          # Executa o sistema
npm run dev        # Modo desenvolvimento
npm test           # Executa testes
npm run lint       # Verifica código
npm run format     # Formata código
```

## Monitoramento

### Logs
- `logs/error.log` - Apenas erros
- `logs/combined.log` - Todos os logs
- Console em desenvolvimento

### Cache
- Cache automático de consultas similares
- TTL configurável (padrão: 24h)
- Limpeza automática de itens expirados

### Métricas
- Tempo de processamento
- Taxa de sucesso na extração
- Número de fontes processadas
- Nível de confiança das respostas

## Segurança

- Validação rigorosa de entrada do usuário
- Sanitização de URLs
- Rate limiting para evitar abuso
- User-Agent realista para web scraping
- Tratamento seguro de erros

## Troubleshooting

### Problemas Comuns

1. **"API key not found"**
   - Verifique se as chaves estão corretas no `.env`
   - Confirme que as APIs estão ativas

2. **"No search results found"**
   - Tente uma consulta mais específica
   - Verifique conectividade com internet

3. **"Rate limit exceeded"**
   - Aguarde alguns minutos
   - Ajuste `API_RATE_LIMIT` no `.env`

4. **Timeout errors**
   - Aumente `timeoutRequests` no `.config`
   - Verifique sua conexão de internet

### Debug
```bash
# Executar com logs detalhados
LOG_LEVEL=debug npm start

# Limpar cache
rm -rf cache/*

# Verificar logs
tail -f logs/combined.log
```

## Contribuições

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

MIT License - veja o arquivo LICENSE para detalhes.

## Autor

**Gabriel** - Desenvolvedor Principal

---

**Se este projeto foi útil, não esqueça de dar uma estrela!**
