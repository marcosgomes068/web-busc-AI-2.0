# 🐳 BUSC-AI 2.0 - Docker Setup

Guia completo para usar o BUSC-AI 2.0 em containers Docker de forma simples e sem erros.

## Requisitos

- **Docker** instalado e rodando
- **Chaves de API**: Cohere e Serper (veja [configuração](#configuração-de-apis))

## Estrutura Docker

```
docker/
├── Dockerfile              # Configuração da imagem
├── docker-compose.yml      # Orquestração de containers
├── .dockerignore           # Arquivos ignorados no build
├── .env.example            # Template de configuração
├── build.sh                # Script de build (Linux/Mac)
├── build.bat               # Script de build (Windows)
└── README.md               # Este arquivo
```

## Método 1: Build Automático (Recomendado)

### Windows
```bash
# Na pasta docker/
.\build.bat

# Ou manualmente da raiz do projeto:
docker build -f docker/Dockerfile -t busc-ai:latest .
```

### Linux/Mac
```bash
# Na pasta docker/
chmod +x build.sh
./build.sh

# Ou manualmente da raiz do projeto:
docker build -f docker/Dockerfile -t busc-ai:latest .
```

## Método 2: Docker Compose (Mais Fácil)

### Passo 1: Configurar ambiente
```bash
# Na pasta docker/
cp .env.example .env

# Editar arquivo .env e configurar suas chaves:
# COHERE_API_KEY=sua_chave_cohere_aqui
# SERPER_API_KEY=sua_chave_serper_aqui
```

### Passo 2: Executar
```bash
# Na pasta docker/
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar container
docker-compose down
```

## Método 3: Docker Run Direto

```bash
# Executar container diretamente (da raiz do projeto)
docker build -f docker/Dockerfile -t busc-ai .
docker run -d \
  --name busc-ai \
  -p 3000:3000 \
  -e COHERE_API_KEY=sua_chave_cohere \
  -e SERPER_API_KEY=sua_chave_serper \
  -e NODE_ENV=production \
  busc-ai:latest

# Ver logs
docker logs -f busc-ai

# Parar container
docker stop busc-ai
docker rm busc-ai
```

## Acessando o Serviço

Após subir o container, o serviço estará disponível em:

### Interface Web
- **Principal**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Status**: http://localhost:3000/status

### API Endpoints

#### POST /api/search
Busca inteligente via API

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Como funciona a inteligência artificial?"}'
```

#### GET /health
Health check para monitoramento

```bash
curl http://localhost:3000/health
```

#### GET /status
Status detalhado do sistema

```bash
curl http://localhost:3000/status
```

## Configuração de APIs

### Cohere AI
1. Acesse: https://dashboard.cohere.ai/api-keys
2. Crie uma conta gratuita
3. Gere uma API key
4. Configure no arquivo `.env`: `COHERE_API_KEY=sua_chave`

### Serper API
1. Acesse: https://serper.dev/dashboard
2. Crie uma conta gratuita
3. Gere uma API key
4. Configure no arquivo `.env`: `SERPER_API_KEY=sua_chave`

## Configurações Avançadas

### Variáveis de Ambiente

```bash
# APIs (obrigatórias)
COHERE_API_KEY=sua_chave_cohere
SERPER_API_KEY=sua_chave_serper

# Servidor
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Performance
API_RATE_LIMIT=20
CACHE_TTL=172800
CACHE_MAX_SIZE=5000

# IA
AI_MODEL=command-r-plus
AI_MAX_TOKENS=4096
AI_TEMPERATURE=0.2
```

### Volumes Persistentes

Para manter logs e cache entre reinicializações:

```bash
# Da raiz do projeto
docker run -d \
  --name busc-ai \
  -p 3000:3000 \
  -v $(pwd)/docker-data/logs:/app/logs \
  -v $(pwd)/docker-data/cache:/app/cache \
  -e COHERE_API_KEY=sua_chave \
  -e SERPER_API_KEY=sua_chave \
  busc-ai:latest
```

### Recursos Limitados

```bash
docker run -d \
  --name busc-ai \
  -p 3000:3000 \
  --memory=1g \
  --cpus=1.0 \
  -e COHERE_API_KEY=sua_chave \
  -e SERPER_API_KEY=sua_chave \
  busc-ai:latest
```

## Desenvolvimento

### Build para Desenvolvimento
```bash
# Da raiz do projeto
# Build com cache
docker build -f docker/Dockerfile -t busc-ai:dev .

# Build sem cache
docker build --no-cache -f docker/Dockerfile -t busc-ai:dev .

# Build com logs detalhados
docker build --progress=plain -f docker/Dockerfile -t busc-ai:dev .
```

### Debug do Container
```bash
# Entrar no container rodando
docker exec -it busc-ai sh

# Ver logs em tempo real
docker logs -f busc-ai

# Verificar recursos
docker stats busc-ai

# Inspecionar container
docker inspect busc-ai
```

## Troubleshooting

### Problema: "Permission denied"
```bash
# Linux/Mac: dar permissão aos scripts
chmod +x docker/build.sh

# Verificar permissões do Docker
sudo usermod -aG docker $USER
# Fazer logout e login novamente
```

### Problema: "Port already in use"
```bash
# Verificar o que está usando a porta
netstat -tulpn | grep 3000

# Usar porta diferente
docker run -p 3001:3000 busc-ai:latest
```

### Problema: "API Key inválida"
```bash
# Verificar variáveis de ambiente
docker exec busc-ai env | grep API_KEY

# Testar API keys
curl -H "Authorization: Bearer sua_chave_cohere" \
  https://api.cohere.ai/v1/models
```

### Problema: "Cannot connect to Docker daemon"
```bash
# Windows: Iniciar Docker Desktop
# Linux: Iniciar serviço Docker
sudo systemctl start docker

# Mac: Iniciar Docker Desktop
```

### Problema: "Build falhou"
```bash
# Limpar cache do Docker
docker system prune -a

# Verificar espaço em disco
df -h

# Rebuild do zero (da raiz do projeto)
docker build --no-cache -f docker/Dockerfile -t busc-ai:latest .
```

## Monitoramento

### Health Checks
```bash
# Verificar saúde do container
curl http://localhost:3000/health

# Status detalhado
curl http://localhost:3000/status
```

### Logs
```bash
# Ver logs recentes
docker logs --tail 50 busc-ai

# Logs em tempo real
docker logs -f busc-ai

# Logs com timestamp
docker logs -t busc-ai
```

### Métricas
```bash
# Uso de recursos
docker stats busc-ai

# Processos no container
docker exec busc-ai ps aux

# Espaço em disco
docker exec busc-ai df -h
```

## Produção

### Docker Swarm
```bash
# Inicializar swarm
docker swarm init

# Deploy do serviço (na pasta docker/)
docker stack deploy -c docker-compose.yml busc-ai-stack
```

### Kubernetes
```bash
# Aplicar deployment
kubectl apply -f k8s/

# Verificar pods
kubectl get pods

# Ver logs
kubectl logs -f deployment/busc-ai
```

### Nginx Proxy
```bash
# Usar profile nginx do docker-compose (na pasta docker/)
docker-compose --profile nginx up -d
```

## Exemplos de Uso

### Teste Rápido
```bash
# Busca simples
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "últimas notícias tecnologia"}'

# Health check
curl http://localhost:3000/health
```

### Integração com Scripts
```bash
#!/bin/bash
# script-teste.sh

RESPONSE=$(curl -s -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "previsão do tempo hoje"}')

echo "Resposta: $RESPONSE"
```

## Comandos Úteis

### Setup Completo (Início Rápido)
```bash
# 1. Entrar na pasta docker
cd docker/

# 2. Configurar ambiente
cp .env.example .env
# Editar .env com suas chaves de API

# 3. Subir serviço
docker-compose up -d

# 4. Verificar status
curl http://localhost:3000/health

# 5. Testar busca
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "teste"}'
```

### Manutenção
```bash
# Na pasta docker/

# Parar serviços
docker-compose down

# Atualizar e rebuildar
docker-compose build --no-cache
docker-compose up -d

# Limpar dados (cuidado!)
docker-compose down -v
```

## Suporte

Para problemas específicos:

1. **Verificar logs**: `docker logs busc-ai`
2. **Health check**: `curl http://localhost:3000/health`
3. **Verificar configuração**: `docker exec busc-ai env`
4. **Rebuild**: `docker build --no-cache -f docker/Dockerfile -t busc-ai:latest .`

---

**Este setup Docker foi testado e otimizado para funcionar sem erros em qualquer ambiente!** 🚀
