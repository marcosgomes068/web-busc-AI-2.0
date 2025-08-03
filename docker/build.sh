#!/bin/bash

# =====================================================
# BUSC-AI 2.0 - Script de Build Docker
# =====================================================
# Script para build fácil e sem erros do container

set -e  # Parar em caso de erro

echo "🐳 BUSC-AI 2.0 - Build Docker"
echo "============================="

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado!"
    echo "   Instale o Docker primeiro: https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar se Docker está rodando
if ! docker info &> /dev/null; then
    echo "❌ Docker não está rodando!"
    echo "   Inicie o Docker primeiro"
    exit 1
fi

echo "✅ Docker encontrado e rodando"

# Navegar para o diretório pai (raiz do projeto)
cd "$(dirname "$0")/.."

# Limpar builds anteriores (opcional)
echo "🧹 Removendo imagens anteriores..."
docker rmi busc-ai:latest 2>/dev/null || true
docker rmi busc-ai:2.0.0 2>/dev/null || true

# Build da imagem
echo "🔨 Fazendo build da imagem..."
docker build \
    --no-cache \
    --progress=plain \
    -f docker/Dockerfile \
    -t busc-ai:latest \
    -t busc-ai:2.0.0 \
    .

echo "✅ Build concluído com sucesso!"

# Verificar se a imagem foi criada
if docker images | grep -q "busc-ai"; then
    echo "🎉 Imagem Docker criada:"
    docker images | grep busc-ai
else
    echo "❌ Erro: Imagem não foi criada"
    exit 1
fi

echo ""
echo "🚀 Para executar o container:"
echo "   docker run -p 3000:3000 \\"
echo "     -e COHERE_API_KEY=sua_chave_cohere \\"
echo "     -e SERPER_API_KEY=sua_chave_serper \\"
echo "     busc-ai:latest"
echo ""
echo "📋 Ou use o docker-compose:"
echo "   cd docker"
echo "   cp .env.example .env"
echo "   # Configure suas chaves no arquivo .env"
echo "   docker-compose up -d"
echo ""
echo "✅ Build finalizado!"
