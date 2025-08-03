# BUSC-AI 2.0

Advanced Web Search Intelligence System with AI

A sophisticated search system that leverages Artificial Intelligence to analyze queries, search the web, extract relevant content, and synthesize comprehensive and accurate responses using advanced AI technology.

## Key Features

### Advanced AI Integration
- Semantic query analysis using Cohere AI
- Intelligent keyword generation and expansion
- Automatic content summarization and extraction
- Multi-source response synthesis with contextual understanding

### Intelligent Web Search
- Multi-strategy search approach with relevance scoring
- Automatic spam and paywall filtering
- Real-time URL validation and health checks
- Advanced result deduplication with similarity analysis

### Performance Optimization
- Intelligent caching system with configurable TTL
- Rate limiting for API calls and web requests
- Asynchronous parallel processing pipeline
- Automatic retry mechanism with exponential backoff

### Production-Ready Robustness
- Comprehensive error handling and recovery
- Intelligent fallback mechanisms for AI service failures
- Rigorous input validation and sanitization
- Detailed logging and monitoring capabilities

## Project Architecture

```
busc-ai-2.0/
├── src/
│   ├── core/
│   │   └── engine.js          # Main orchestration engine
│   ├── services/
│   │   ├── ai.js             # AI service integration
│   │   ├── search.js         # Web search service
│   │   └── scraper.js        # Content extraction service
│   ├── utils/
│   │   ├── cache.js          # Caching system
│   │   ├── helpers.js        # Utility functions
│   │   └── logger.js         # Logging system
│   ├── ui/
│   │   └── terminal.js       # Terminal user interface
## Technical Overview

### Core Technologies
- **Node.js 18+**: Modern JavaScript runtime with ES modules support
- **Python Flask**: Microservice for AI operations
- **Cohere AI**: Advanced language model for content analysis
- **Serper API**: High-quality web search results
- **Winston**: Professional logging framework
- **Axios**: HTTP client with retry capabilities

### Architecture Patterns
- **Microservice Architecture**: Separation of AI logic into Python service
- **Service Layer Pattern**: Clear separation of concerns
- **Repository Pattern**: Centralized data access through cache
- **Strategy Pattern**: Multiple content extraction strategies
- **Factory Pattern**: Dynamic service instantiation

### Performance Features
- **Concurrent Processing**: Parallel execution of multiple operations
- **Intelligent Caching**: SHA256-based key generation with TTL management
- **Rate Limiting**: Configurable limits for API and web requests
- **Connection Pooling**: Efficient HTTP connection management
- **Memory Management**: Optimized object creation and garbage collection

## Installation Guide

### Quick Start with Docker (Recommended)

The easiest way to run BUSC-AI 2.0 is using Docker:

### Prerequisites
- Docker installed and running
- Cohere API key (free at [cohere.ai](https://cohere.ai))
- Serper API key (free at [serper.dev](https://serper.dev))

### Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/marcosgomes068/web-busc-AI-2.0.git
cd web-busc-AI-2.0

# 2. Configure environment
cd docker
cp .env.example .env
# Edit .env file with your API keys

# 3. Run with Docker Compose
docker-compose up -d

# 4. Access the service
open http://localhost:3000
```

### Alternative: Direct Docker Run

```bash
# Simple build from root
docker build -t busc-ai .
docker run -p 3000:3000 \
  -e COHERE_API_KEY=your_cohere_key \
  -e SERPER_API_KEY=your_serper_key \
  busc-ai

# Advanced build from docker folder
docker build -f docker/Dockerfile -t busc-ai .
```

**For detailed Docker instructions, see: [docker/README.md](./docker/README.md)**

## Manual Installation

### Prerequisites
- **Node.js**: Version 18.0.0 or higher
- **Python**: Version 3.8+ (for AI microservice)
- **npm/yarn**: Package manager
- **API Keys**: Cohere and Serper API access

### Setup Instructions

#### 1. Repository Setup
```bash
git clone https://github.com/marcosgomes068/web-busc-AI-2.0.git
cd web-busc-AI-2.0
```

#### 2. Node.js Dependencies
```bash
npm install
```

#### 3. Python Microservice Setup
```bash
cd ai-service
chmod +x setup.sh
./setup.sh
```

#### 4. Environment Configuration

Choose and copy the appropriate environment template:

**For Production:**
```bash
cp .env.production.example .env
```

**For Development:**
```bash
cp .env.example .env
```

**For Local Testing:**
```bash
cp .env.local.example .env
```

Then edit the `.env` file with your actual API keys and settings:

```env
# Required API Keys
COHERE_API_KEY=your_actual_cohere_api_key
SERPER_API_KEY=your_actual_serper_api_key

# Environment
NODE_ENV=production
LOG_LEVEL=info

# Performance Settings
API_RATE_LIMIT=10
WEB_REQUEST_RATE_LIMIT=5
CACHE_TTL=86400
CACHE_MAX_SIZE=1000
```

### API Keys Setup

#### Cohere AI (Required)
1. Visit [cohere.ai](https://cohere.ai)
2. Create a free account
3. Generate an API key in the dashboard
4. Add to `.env` as `COHERE_API_KEY`

#### Serper API (Required)
1. Visit [serper.dev](https://serper.dev)
2. Create an account
3. Get your API key (100 free searches/month)
4. Add to `.env` as `SERPER_API_KEY`

## Latest Improvements

### Version 2.0 Features

#### 🧠 **Intelligent AI Enhancement**
- **Cohere AI Integration**: Automatic fallback when web data is insufficient
- **Quality Detection**: System detects when responses need AI enhancement
- **Knowledge Synthesis**: Combines web-scraped data with AI knowledge base
- **Smart Fallback**: Provides comprehensive answers even with limited web content

#### 🛠 **Professional Code Refactoring**
- **Senior Developer Standards**: Applied enterprise-level coding practices
- **Clean Architecture**: Separated concerns with clear service layers
- **Performance Optimization**: Improved caching, rate limiting, and error handling
- **Production Ready**: Enhanced logging, monitoring, and configuration management

#### 🔍 **Enhanced Search Intelligence**
- **Multi-Strategy Approach**: Advanced search query generation
- **Content Quality Scoring**: Intelligent source ranking and filtering
- **Duplicate Detection**: Advanced similarity analysis for result deduplication
- **Robust Error Recovery**: Intelligent fallbacks for failed operations

#### 📊 **Advanced Response Generation**
- **Question Type Analysis**: Specialized responses for different query types
- **Structured Information Extraction**: Categorized data extraction (facts, entities, dates, etc.)
- **Multi-Section Responses**: Organized content with historical context and details
- **Source Integration**: Professional citation and reference formatting

## Usage

### Start the System
```bash
npm start
```

### Development Mode
```bash
npm run dev
```

### Example Usage
```
BUSC-AI 2.0
Advanced Web Search Intelligence System with AI

🔍 Ask anything: What are the fastest Formula 1 cars?

⠋ Analyzing query...
⠋ Searching the web...
⠋ Analyzing sources...
⠋ Processing information...
⠋ Preparing final response...

✅ Search completed!

Based on information from reliable sources about **fastest Formula 1 cars**:

**Technical Specifications:**
• Modern F1 cars can reach speeds over 350 km/h on long straights
• Acceleration: 0-100 km/h in approximately 2.3 seconds
• Advanced hybrid power units produce over 1000 horsepower combined

**Historical Context:**
• The fastest recorded speed in F1 was 372.6 km/h by Valtteri Bottas (2016)
• Current regulations limit engine development but focus on efficiency
• Aerodynamic advances continue to improve cornering speeds

**Enhanced AI Knowledge:**
Formula 1 cars represent the pinnacle of automotive engineering, featuring:
- Carbon fiber monocoque chassis for maximum strength and minimum weight
- Advanced aerodynamics with sophisticated wing designs
- Hybrid power units combining V6 turbo engines with energy recovery systems
- Specialized tires designed for different track conditions and strategies

🔗 Sources:
[1] Formula 1 - Wikipedia
    https://en.wikipedia.org/wiki/Formula_One
    "Formula One is the highest class of international auto racing..."

──────────────────────────────────────────────────
⏱️ Processed in 8.5s | 📊 3 sources found, 2 processed
📅 August 3, 2025, 10:30 PM
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

## Adaptação para Outras APIs de IA

O BUSC-AI 2.0 pode ser facilmente adaptado para usar outras APIs de IA como OpenAI, Anthropic Claude, Google Gemini, etc.

### Guia Completo de Adaptação

Para instruções detalhadas sobre como adaptar o sistema para outros provedores de IA, consulte:

**[GUIA DE ADAPTAÇÃO PARA OUTRAS APIs DE IA](./ADAPTACAO-IA.md)**

### Provedores Suportados

- **Cohere AI** (atual) - Padrão otimizado
- **OpenAI GPT** (GPT-4, GPT-3.5) - Guia completo incluído
- **Anthropic Claude** (Claude 3) - Guia completo incluído  
- **Google Gemini** (Gemini Pro) - Guia completo incluído
- **Outros provedores** - Template para adaptação personalizada

### O que o guia inclui:

- **Passo a passo detalhado** para cada provedor
- **Exemplos de código** completos e funcionais
- **Configuração de ambiente** para múltiplos provedores
- **Templates de adaptação** personalizados
- **Resolução de problemas** comuns
- **Comparação de custos** e performance

## Implementação em Outros Projetos

O BUSC-AI 2.0 pode ser integrado em diversos tipos de projetos como biblioteca, API, microserviço ou módulo embarcado.

### Guia de Implementação

Para instruções completas sobre como implementar o BUSC-AI 2.0 em seus projetos, consulte:

**[GUIA DE IMPLEMENTAÇÃO EM OUTROS PROJETOS](./IMPLEMENTACAO-EM-PROJETOS.md)**

### Formas de Integração Suportadas

- **Biblioteca NPM** - Instalar como dependência
- **API REST** - Expor como serviço web  
- **Microserviço** - Containerizar com Docker/Kubernetes
- **Módulo Embarcado** - Integração direta do código
- **SDK Personalizado** - Wrapper para outras linguagens

### Casos de Uso Incluídos

- **Aplicações Web** (React, Vue, Angular, Next.js)
- **APIs REST** (Express.js, FastAPI)
- **Aplicações Mobile** (React Native, Flutter)
- **Aplicações Desktop** (Electron)
- **E-commerce** - Busca inteligente de produtos
- **Chatbots** - Respostas com dados atuais
- **Sistemas de Pesquisa** - Análise automatizada

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
