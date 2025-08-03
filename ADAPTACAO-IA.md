# Guia de Adaptação para Outras APIs de IA

Este guia explica como modificar o BUSC-AI 2.0 para usar outras APIs de IA como OpenAI, Anthropic, Google Gemini, etc.

## Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura Atual](#estrutura-atual)
3. [Adaptação para OpenAI](#adaptação-para-openai)
4. [Adaptação para Anthropic Claude](#adaptação-para-anthropic-claude)
5. [Adaptação para Google Gemini](#adaptação-para-google-gemini)
6. [Criando um Adaptador Personalizado](#criando-um-adaptador-personalizado)
7. [Configuração de Ambiente](#configuração-de-ambiente)
8. [Testes e Validação](#testes-e-validação)

---

## Visão Geral

O BUSC-AI 2.0 atualmente usa a **Cohere AI** como provedor de IA principal. Para adaptar para outras APIs, você precisa modificar principalmente o arquivo `src/services/ai.js` e as configurações de ambiente.

### Arquivos que você precisará modificar:

- `src/services/ai.js` - Serviço principal de IA
- `.env` - Configurações de ambiente
- `package.json` - Dependências (se necessário)

---

## Estrutura Atual

### Arquivo: `src/services/ai.js`

```javascript
// Estrutura atual com Cohere
import { CohereClient } from 'cohere-ai';

class AIService {
    constructor() {
        this.client = new CohereClient({
            token: process.env.COHERE_API_KEY,
        });
    }

    async generateResponse(prompt, context = '') {
        // Lógica atual com Cohere
    }
}
```

---

## Adaptação para OpenAI

### Passo 1: Instalar a biblioteca OpenAI

```bash
npm uninstall cohere-ai
npm install openai
```

### Passo 2: Modificar `src/services/ai.js`

**Localizar e substituir:**

```javascript
// ANTES (linhas 1-3)
import { CohereClient } from 'cohere-ai';
import { validateEnvironmentVariables } from '../utils/helpers.js';
import logger from '../utils/logger.js';
```

**Por:**

```javascript
// DEPOIS
import OpenAI from 'openai';
import { validateEnvironmentVariables } from '../utils/helpers.js';
import logger from '../utils/logger.js';
```

### Passo 3: Substituir a inicialização do cliente

**Localizar:**

```javascript
// ANTES (aproximadamente linha 15-20)
constructor() {
    validateEnvironmentVariables(['COHERE_API_KEY']);
    
    this.client = new CohereClient({
        token: process.env.COHERE_API_KEY,
    });
    
    this.rateLimiter = new RateLimiter(
        parseInt(process.env.API_RATE_LIMIT) || DEFAULT_API_RATE_LIMIT,
        RATE_LIMIT_WINDOW_MS
    );
}
```

**Substituir por:**

```javascript
// DEPOIS
constructor() {
    validateEnvironmentVariables(['OPENAI_API_KEY']);
    
    this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.rateLimiter = new RateLimiter(
        parseInt(process.env.API_RATE_LIMIT) || DEFAULT_API_RATE_LIMIT,
        RATE_LIMIT_WINDOW_MS
    );
}
```

### Passo 4: Adaptar o método `generateResponse`

**Localizar o método `generateResponse` (aproximadamente linha 60-100):**

```javascript
// ANTES
async generateResponse(prompt, context = '') {
    await this.rateLimiter.acquire();
    
    try {
        const fullPrompt = this.buildFullPrompt(prompt, context);
        
        const response = await this.client.chat({
            model: process.env.AI_MODEL || 'command-r-plus',
            message: fullPrompt,
            max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 2048,
            temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.3,
        });
        
        return response.text;
    } catch (error) {
        logger.error('Erro na geração de resposta da IA:', error);
        throw new Error(`Falha no serviço de IA: ${error.message}`);
    }
}
```

**Substituir por:**

```javascript
// DEPOIS
async generateResponse(prompt, context = '') {
    await this.rateLimiter.acquire();
    
    try {
        const fullPrompt = this.buildFullPrompt(prompt, context);
        
        const response = await this.client.chat.completions.create({
            model: process.env.AI_MODEL || 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um assistente inteligente que analisa conteúdo web e fornece respostas precisas e abrangentes.'
                },
                {
                    role: 'user',
                    content: fullPrompt
                }
            ],
            max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 2048,
            temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.3,
        });
        
        return response.choices[0].message.content;
    } catch (error) {
        logger.error('Erro na geração de resposta da IA:', error);
        throw new Error(`Falha no serviço de IA: ${error.message}`);
    }
}
```

### Passo 5: Adaptar o método `enhanceResponseWithCohere`

**Localizar o método `enhanceResponseWithCohere` (aproximadamente linha 150-200) e renomear:**

```javascript
// ANTES
async enhanceResponseWithCohere(originalResponse, userQuery) {
    // ... código existente
}
```

**Substituir por:**

```javascript
// DEPOIS
async enhanceResponseWithOpenAI(originalResponse, userQuery) {
    try {
        const enhancementPrompt = `
Pergunta do usuário: "${userQuery}"
Resposta atual baseada em pesquisa web: "${originalResponse}"

Com base no seu conhecimento, analise se a resposta atual está completa e precisa.
Se necessário, complemente com informações adicionais relevantes.
Mantenha um tom informativo e forneça uma resposta abrangente.
`;

        const response = await this.client.chat.completions.create({
            model: process.env.AI_MODEL || 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um especialista em fornecer informações precisas e abrangentes.'
                },
                {
                    role: 'user',
                    content: enhancementPrompt
                }
            ],
            max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 2048,
            temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.2,
        });

        return response.choices[0].message.content;
    } catch (error) {
        logger.error('Erro na melhoria da resposta:', error);
        return originalResponse;
    }
}
```

### Passo 6: Atualizar chamadas dos métodos

**Localizar todas as chamadas para `enhanceResponseWithCohere` e alterar para `enhanceResponseWithOpenAI`**

### Passo 7: Configurar variáveis de ambiente

**Editar seus arquivos `.env`:**

```bash
# Substituir
COHERE_API_KEY=sua_chave_cohere

# Por
OPENAI_API_KEY=sua_chave_openai

# Ajustar modelo
AI_MODEL=gpt-4
# ou AI_MODEL=gpt-3.5-turbo para uma opção mais econômica
```

---

## Adaptação para Anthropic Claude

### Passo 1: Instalar a biblioteca Anthropic

```bash
npm uninstall cohere-ai
npm install @anthropic-ai/sdk
```

### Passo 2: Modificar imports

```javascript
// Substituir
import { CohereClient } from 'cohere-ai';

// Por
import Anthropic from '@anthropic-ai/sdk';
```

### Passo 3: Substituir inicialização

```javascript
// Substituir
this.client = new CohereClient({
    token: process.env.COHERE_API_KEY,
});

// Por
this.client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Passo 4: Adaptar método generateResponse

```javascript
async generateResponse(prompt, context = '') {
    await this.rateLimiter.acquire();
    
    try {
        const fullPrompt = this.buildFullPrompt(prompt, context);
        
        const response = await this.client.messages.create({
            model: process.env.AI_MODEL || 'claude-3-sonnet-20240229',
            max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 2048,
            temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.3,
            messages: [
                {
                    role: 'user',
                    content: fullPrompt
                }
            ]
        });
        
        return response.content[0].text;
    } catch (error) {
        logger.error('Erro na geração de resposta da IA:', error);
        throw new Error(`Falha no serviço de IA: ${error.message}`);
    }
}
```

### Passo 5: Configurar variáveis de ambiente

```bash
ANTHROPIC_API_KEY=sua_chave_anthropic
AI_MODEL=claude-3-sonnet-20240229
# Outros modelos: claude-3-opus-20240229, claude-3-haiku-20240307
```

---

## Adaptação para Google Gemini

### Passo 1: Instalar a biblioteca Google

```bash
npm uninstall cohere-ai
npm install @google/generative-ai
```

### Passo 2: Modificar imports

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
```

### Passo 3: Substituir inicialização

```javascript
constructor() {
    validateEnvironmentVariables(['GOOGLE_API_KEY']);
    
    this.client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.model = this.client.getGenerativeModel({ 
        model: process.env.AI_MODEL || 'gemini-pro' 
    });
    
    // ... resto do código
}
```

### Passo 4: Adaptar método generateResponse

```javascript
async generateResponse(prompt, context = '') {
    await this.rateLimiter.acquire();
    
    try {
        const fullPrompt = this.buildFullPrompt(prompt, context);
        
        const result = await this.model.generateContent(fullPrompt);
        const response = await result.response;
        
        return response.text();
    } catch (error) {
        logger.error('Erro na geração de resposta da IA:', error);
        throw new Error(`Falha no serviço de IA: ${error.message}`);
    }
}
```

### Passo 5: Configurar variáveis de ambiente

```bash
GOOGLE_API_KEY=sua_chave_google
AI_MODEL=gemini-pro
# Outros modelos: gemini-pro-vision
```

---

## Criando um Adaptador Personalizado

Para facilitar a troca entre diferentes provedores, você pode criar um adaptador:

### Criar arquivo `src/adapters/ai-adapter.js`

```javascript
// src/adapters/ai-adapter.js
class AIAdapter {
    constructor(provider, config) {
        this.provider = provider;
        this.config = config;
        this.initializeClient();
    }

    initializeClient() {
        switch (this.provider) {
            case 'openai':
                this.client = new OpenAI({ apiKey: this.config.apiKey });
                break;
            case 'anthropic':
                this.client = new Anthropic({ apiKey: this.config.apiKey });
                break;
            case 'google':
                this.client = new GoogleGenerativeAI(this.config.apiKey);
                this.model = this.client.getGenerativeModel({ model: this.config.model });
                break;
            case 'cohere':
                this.client = new CohereClient({ token: this.config.apiKey });
                break;
            default:
                throw new Error(`Provedor não suportado: ${this.provider}`);
        }
    }

    async generateResponse(prompt) {
        switch (this.provider) {
            case 'openai':
                return await this.generateOpenAI(prompt);
            case 'anthropic':
                return await this.generateAnthropic(prompt);
            case 'google':
                return await this.generateGoogle(prompt);
            case 'cohere':
                return await this.generateCohere(prompt);
        }
    }

    // Implementar métodos específicos para cada provedor...
}

export default AIAdapter;
```

### Usar o adaptador em `src/services/ai.js`

```javascript
import AIAdapter from '../adapters/ai-adapter.js';

class AIService {
    constructor() {
        const provider = process.env.AI_PROVIDER || 'cohere';
        const config = {
            apiKey: process.env[`${provider.toUpperCase()}_API_KEY`],
            model: process.env.AI_MODEL,
            maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 2048,
            temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.3,
        };

        this.adapter = new AIAdapter(provider, config);
    }

    async generateResponse(prompt, context = '') {
        return await this.adapter.generateResponse(prompt, context);
    }
}
```

---

## Configuração de Ambiente

### Template para múltiplos provedores (.env)

```bash
# ==================================================
# CONFIGURAÇÃO DE PROVEDOR DE IA
# ==================================================

# Escolha o provedor: cohere, openai, anthropic, google
AI_PROVIDER=openai

# ==================================================
# CHAVES DE API (configure apenas a que usar)
# ==================================================

# Cohere (padrão atual)
COHERE_API_KEY=sua_chave_cohere

# OpenAI
OPENAI_API_KEY=sua_chave_openai

# Anthropic
ANTHROPIC_API_KEY=sua_chave_anthropic

# Google
GOOGLE_API_KEY=sua_chave_google

# ==================================================
# CONFIGURAÇÕES DE MODELO
# ==================================================

# Para OpenAI
AI_MODEL=gpt-4
# Opções: gpt-4, gpt-3.5-turbo, gpt-4-turbo

# Para Anthropic
# AI_MODEL=claude-3-sonnet-20240229
# Opções: claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307

# Para Google
# AI_MODEL=gemini-pro
# Opções: gemini-pro, gemini-pro-vision

# Para Cohere
# AI_MODEL=command-r-plus
# Opções: command-r-plus, command-r, command

# ==================================================
# CONFIGURAÇÕES GERAIS
# ==================================================

AI_MAX_TOKENS=2048
AI_TEMPERATURE=0.3
```

---

## Testes e Validação

### Passo 1: Teste básico

Após fazer as modificações, teste o sistema:

```bash
npm start
```

Faça uma pergunta simples para verificar se a integração está funcionando.

### Passo 2: Teste de fallback

Verifique se o sistema de fallback ainda funciona corretamente.

### Passo 3: Teste de performance

Compare os tempos de resposta entre diferentes provedores.

### Passo 4: Teste de qualidade

Avalie a qualidade das respostas com diferentes modelos.

---

## Notas Importantes

### Limitações por Provedor

1. **OpenAI**: Limites de rate limiting mais restritivos
2. **Anthropic**: Modelos mais caros, mas alta qualidade
3. **Google**: Ainda em desenvolvimento, API pode mudar
4. **Cohere**: Bom custo-benefício, especializado em texto

### Custos

- **OpenAI GPT-4**: ~$0.03 por 1K tokens
- **Anthropic Claude**: ~$0.015 por 1K tokens  
- **Google Gemini**: Gratuito até certo limite
- **Cohere**: ~$0.002 por 1K tokens

### Backup de Configuração

Sempre mantenha um backup da configuração atual antes de fazer alterações:

```bash
cp src/services/ai.js src/services/ai.js.backup
cp .env .env.backup
```

---

## Resolução de Problemas

### Erro: "API Key inválida"
- Verifique se a chave está correta no arquivo `.env`
- Confirme se a variável de ambiente está sendo carregada

### Erro: "Modelo não encontrado"
- Verifique se o modelo especificado está disponível para sua conta
- Consulte a documentação do provedor para modelos disponíveis

### Erro: "Rate limit exceeded"
- Ajuste os valores de `API_RATE_LIMIT` no `.env`
- Considere usar modelos menos restritivos

### Erro: "Timeout"
- Aumente os valores de timeout no `.env`
- Verifique sua conexão de internet

---

## Próximos Passos

1. Escolha o provedor de IA desejado
2. Siga o guia específico para esse provedor
3. Configure as variáveis de ambiente
4. Teste a integração
5. Ajuste parâmetros conforme necessário

---

**Dica**: Mantenha sempre uma versão funcional como backup antes de fazer modificações significativas!

---

*Este guia foi criado para o BUSC-AI 2.0. Para dúvidas específicas, consulte a documentação oficial de cada provedor de IA.*
