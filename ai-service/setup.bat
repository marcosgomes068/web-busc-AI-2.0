@echo off
REM Script para configurar o microserviço AI no Windows

echo Configurando microservico AI...

REM Criar ambiente virtual Python
python -m venv venv

REM Ativar ambiente virtual
call venv\Scripts\activate

REM Instalar dependências
pip install -r requirements.txt

echo Microservico AI configurado com sucesso!
echo Para iniciar o servico, execute:
echo   cd ai-service
echo   python app.py
