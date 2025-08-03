# Configuração do Microserviço AI

Esta é uma solução robusta que separa a funcionalidade de IA em um microserviço Python Flask, resolvendo os problemas de compatibilidade com a API do Cohere.

## Arquitetura

```
BUSC-AI 2.0 (Node.js)
    ↓ HTTP Requests
AI Microservice (Python Flask)
    ↓ API Calls
Cohere API
```

## Instalação e Configuração

### 1. Configurar o Microserviço AI (Python)

```bash
# Navegar para o diretório do microserviço
cd ai-service

# Executar o script de configuração (Windows)
setup.bat

# Ou para Linux/Mac
chmod +x setup.sh
./setup.sh
```

### 2. Configurar as Chaves de API

Edite o arquivo `ai-service\.env`:
```env
COHERE_API_KEY=sua_chave_cohere_aqui
PORT=5000
FLASK_ENV=development
```

### 3. Iniciar o Microserviço

```bash
cd ai-service
python app.py
```

O serviço estará disponível em `http://localhost:5000`

### 4. Testar o Sistema Principal

```bash
# No diretório principal
npm start
```

## Vantagens desta Arquitetura

### 🚀 **Robustez**
- **Fallbacks Automáticos**: Se o microserviço estiver indisponível, usa análise local
- **Health Checks**: Verifica automaticamente se o serviço está funcionando
- **Timeouts**: Evita travamentos do sistema principal

### 🔧 **Flexibilidade**
- **Troca de Providers**: Fácil alteração entre Cohere, OpenAI, ou Ollama
- **Configuração Independente**: O microserviço tem suas próprias dependências
- **Escalabilidade**: Pode ser executado em containers separados

### 💰 **Economia**
- **Cache Inteligente**: Evita chamadas desnecessárias à API
- **Rate Limiting**: Controla o uso da API
- **Modo Fallback**: Funciona mesmo sem créditos de API

### 🐛 **Debugging**
- **Logs Separados**: Facilita identificar problemas
- **Endpoints de Health**: Monitora o status do serviço
- **Versionamento Independente**: Atualizações sem afetar o sistema principal

## Endpoints Disponíveis

### `GET /health`
Verifica se o microserviço está funcionando:
```json
{
  "status": "healthy",
  "cohere_available": true,
  "timestamp": "2025-08-03T19:45:00.000Z"
}
```

### `POST /analyze-query`
Analisa uma consulta de pesquisa:
```json
{
  "query": "Como fazer um bolo de chocolate?"
}
```

### `POST /generate-keywords`
Gera palavras-chave para um tópico:
```json
{
  "topic": "inteligência artificial"
}
```

## Próximos Passos

### Opção 1: Usar o Microserviço Flask
1. Configure a chave do Cohere no `ai-service\.env`
2. Execute `cd ai-service && python app.py`
3. Execute `npm start` no diretório principal

### Opção 2: Migrar para OpenAI (alternativa)
Se preferir usar OpenAI em vez de Cohere, posso adaptar o código.

### Opção 3: Implementar Ollama Local
Para uma solução completamente gratuita e offline.

## Status Atual

✅ **Funcionando**: Sistema principal em Node.js
✅ **Funcionando**: Microserviço Flask com fallbacks
⚠️ **Pendente**: Configuração da chave Cohere válida
🔄 **Em desenvolvimento**: Endpoints completos de summarização

Qual opção você gostaria de seguir?
