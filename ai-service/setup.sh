#!/bin/bash
# Script para inicializar o microserviço AI

echo "Configurando microserviço AI..."

# Criar ambiente virtual Python
python -m venv venv

# Ativar ambiente virtual (Windows)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Instalar dependências
pip install -r requirements.txt

echo "Microserviço AI configurado com sucesso!"
echo "Para iniciar o serviço, execute:"
echo "  cd ai-service"
echo "  python app.py"
