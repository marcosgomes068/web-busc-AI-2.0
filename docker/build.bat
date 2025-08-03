@echo off
REM =====================================================
REM BUSC-AI 2.0 - Script de Build Docker (Windows)
REM =====================================================

echo 🐳 BUSC-AI 2.0 - Build Docker
echo =============================

REM Verificar se Docker está instalado
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker não está instalado!
    echo    Instale o Docker primeiro: https://docs.docker.com/get-docker/
    pause
    exit /b 1
)

REM Verificar se Docker está rodando
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker não está rodando!
    echo    Inicie o Docker primeiro
    pause
    exit /b 1
)

echo ✅ Docker encontrado e rodando

REM Navegar para o diretório pai (raiz do projeto)
cd /d "%~dp0\.."

REM Limpar builds anteriores
echo 🧹 Removendo imagens anteriores...
docker rmi busc-ai:latest 2>nul || echo Imagem anterior não encontrada
docker rmi busc-ai:2.0.0 2>nul || echo Imagem anterior não encontrada

REM Build da imagem
echo 🔨 Fazendo build da imagem...
docker build --no-cache --progress=plain -f docker/Dockerfile -t busc-ai:latest -t busc-ai:2.0.0 .

if %errorlevel% neq 0 (
    echo ❌ Erro no build!
    pause
    exit /b 1
)

echo ✅ Build concluído com sucesso!

REM Verificar imagem
docker images | findstr busc-ai

echo.
echo 🚀 Para executar o container:
echo    docker run -p 3000:3000 ^
echo      -e COHERE_API_KEY=sua_chave_cohere ^
echo      -e SERPER_API_KEY=sua_chave_serper ^
echo      busc-ai:latest
echo.
echo 📋 Ou use o docker-compose:
echo    cd docker
echo    copy .env.example .env
echo    # Configure suas chaves no arquivo .env
echo    docker-compose up -d
echo.
echo ✅ Build finalizado!
pause
