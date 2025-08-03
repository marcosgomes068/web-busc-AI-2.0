# =====================================================
# BUSC-AI 2.0 - Dockerfile de Produção
# =====================================================
# Dockerfile otimizado para produção com múltiplos estágios
# Garante build consistente e sem erros

# Estágio 1: Build das dependências
FROM node:18-alpine AS dependencies

# Metadados da imagem
LABEL maintainer="BUSC-AI Team"
LABEL version="2.0.0"
LABEL description="Sistema inteligente de busca e análise web com IA"

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências primeiro (para cache layer)
COPY package*.json ./

# Instalar dependências com cache otimizado
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Estágio 2: Build da aplicação
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar dependências do estágio anterior
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./

# Copiar código fonte
COPY . .

# Criar diretórios necessários
RUN mkdir -p logs cache temp && \
    chmod 755 logs cache temp

# Estágio 3: Imagem final de produção
FROM node:18-alpine AS production

# Instalar apenas dependências mínimas do sistema
RUN apk add --no-cache \
    dumb-init \
    ca-certificates \
    tzdata

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S busc-ai && \
    adduser -S busc-ai -u 1001 -G busc-ai

# Definir diretório de trabalho
WORKDIR /app

# Copiar aplicação do estágio builder
COPY --from=builder --chown=busc-ai:busc-ai /app .

# Criar e definir permissões para diretórios de dados
RUN mkdir -p /app/logs /app/cache /app/temp && \
    chown -R busc-ai:busc-ai /app && \
    chmod -R 755 /app/logs /app/cache /app/temp

# Configurar timezone (opcional)
ENV TZ=America/Sao_Paulo

# Variáveis de ambiente para produção
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info
ENV DOCKER_MODE=true

# Expor porta da aplicação
EXPOSE 3000

# Verificação de saúde do container
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Trocar para usuário não-root
USER busc-ai

# Comando de inicialização com dumb-init para handling de sinais
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/docker-server.js"]
