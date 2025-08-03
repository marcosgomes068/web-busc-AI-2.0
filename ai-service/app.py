# AI Microservice com Flask
# Arquivo: ai-service/app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import cohere
import os
import json
import logging
from datetime import datetime
from dotenv import load_dotenv

# Carregar variáveis do arquivo .env
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuração do Cohere
COHERE_API_KEY = os.environ.get('COHERE_API_KEY')
if COHERE_API_KEY:
    co = cohere.Client(COHERE_API_KEY)
else:
    co = None
    logger.warning("COHERE_API_KEY not found, using fallback mode")

def fallback_analysis(query):
    """Análise básica sem IA"""
    keywords = [word for word in query.lower().split() if len(word) > 2]
    return {
        "mainTopic": query,
        "subtopics": keywords[:3],
        "intentType": "general",
        "keywords": keywords[:5],
        "context": "atual",
        "fallback": True
    }

def fallback_keywords(topic):
    """Geração básica de palavras-chave"""
    words = [word for word in topic.lower().split() if len(word) > 2]
    return {
        "primary": words[:2],
        "related": words[2:4],
        "synonyms": [],
        "english": [],
        "fallback": True
    }

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint para verificar se o serviço está funcionando"""
    return jsonify({
        "status": "healthy",
        "cohere_available": co is not None,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/analyze-query', methods=['POST'])
def analyze_query():
    """Analisa uma consulta de pesquisa"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        if co:
            try:
                prompt = f"""Analise esta consulta de pesquisa e retorne um JSON com:
{{
  "mainTopic": "tópico principal",
  "subtopics": ["subtópico1", "subtópico2"],
  "intentType": "question|definition|comparison|tutorial|general",
  "keywords": ["palavra1", "palavra2", "palavra3"],
  "context": "atual|histórico|geral"
}}

Consulta: "{query}"

Responda apenas com o JSON, sem texto adicional."""
                
                response = co.generate(
                    model='command-r-plus',
                    prompt=prompt,
                    max_tokens=500,
                    temperature=0.3
                )
                
                result = json.loads(response.generations[0].text.strip())
                result["fallback"] = False
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"Cohere API error: {e}")
                return jsonify(fallback_analysis(query))
        else:
            return jsonify(fallback_analysis(query))
            
    except Exception as e:
        logger.error(f"Error in analyze_query: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/generate-keywords', methods=['POST'])
def generate_keywords():
    """Gera palavras-chave para um tópico"""
    try:
        data = request.get_json()
        topic = data.get('topic', '')
        
        if not topic:
            return jsonify({"error": "Topic is required"}), 400
        
        if co:
            try:
                prompt = f"""Gere palavras-chave para busca web sobre: "{topic}"
Retorne um JSON com:
{{
  "primary": ["palavra-chave principal 1", "palavra-chave principal 2"],
  "related": ["termo relacionado 1", "termo relacionado 2"],
  "synonyms": ["sinônimo 1", "sinônimo 2"],
  "english": ["english term 1", "english term 2"]
}}

Responda apenas com o JSON, sem texto adicional."""
                
                response = co.generate(
                    model='command-r-plus',
                    prompt=prompt,
                    max_tokens=300,
                    temperature=0.3
                )
                
                result = json.loads(response.generations[0].text.strip())
                result["fallback"] = False
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"Cohere API error: {e}")
                return jsonify(fallback_keywords(topic))
        else:
            return jsonify(fallback_keywords(topic))
            
    except Exception as e:
        logger.error(f"Error in generate_keywords: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
