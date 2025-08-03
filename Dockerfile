# =====================================================
# BUSC-AI 2.0 - Dockerfile Simples (Raiz)
# =====================================================
# Este é um Dockerfile simplificado na raiz do projeto
# Para o Dockerfile completo, veja: docker/Dockerfile

FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++ dumb-init

# Criar usuário não-root
RUN addgroup -g 1001 -S busc-ai && \
    adduser -S busc-ai -u 1001 -G busc-ai

WORKDIR /app

# Copiar e instalar dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Criar diretórios e definir permissões
RUN mkdir -p logs cache temp && \
    chown -R busc-ai:busc-ai /app

# Configuração
ENV NODE_ENV=production
ENV PORT=3000
ENV DOCKER_MODE=true

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

USER busc-ai

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/docker-server.js"]
