import http from 'http';
import SearchEngine from './core/engine.js';
import logger from './utils/logger.js';
import { CONFIG } from './config.js';

/**
 * Servidor HTTP simples para containers Docker
 * Fornece endpoints de health check e API básica
 */
class DockerServer {
  constructor() {
    this.port = process.env.PORT || 3000;
    this.searchEngine = new SearchEngine();
    this.server = null;
    
    // Contadores para métricas
    this.requestCount = 0;
    this.errorCount = 0;
    this.rateLimitMap = new Map();
    
    // Limpeza periódica do rate limit map
    setInterval(() => {
      const now = Date.now();
      for (const [key, requests] of this.rateLimitMap.entries()) {
        const recentRequests = requests.filter(time => now - time < 60000);
        if (recentRequests.length === 0) {
          this.rateLimitMap.delete(key);
        } else {
          this.rateLimitMap.set(key, recentRequests);
        }
      }
    }, 60000); // Limpeza a cada minuto
  }

  /**
   * Cria o servidor HTTP
   */
  createServer() {
    this.server = http.createServer(async (req, res) => {
      // Configurar CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Handle OPTIONS requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      try {
        await this.handleRequest(req, res);
      } catch (error) {
        logger.error('Erro no servidor:', error);
        this.sendError(res, 500, 'Erro interno do servidor');
      }
    });
  }

  /**
   * Processa requisições HTTP
   */
  async handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${this.port}`);
    const path = url.pathname;
    const method = req.method;

    // Log da requisição com informações detalhadas
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    logger.debug(`${method} ${path} - IP: ${clientIP} - User-Agent: ${userAgent}`);

    // Validação básica de segurança
    if (path.length > 1000) {
      return this.sendError(res, 414, 'URI muito longo');
    }

    // Rate limiting básico (em produção usar Redis)
    const rateLimitKey = clientIP;
    if (!this.rateLimitMap) this.rateLimitMap = new Map();
    
    const now = Date.now();
    const requests = this.rateLimitMap.get(rateLimitKey) || [];
    const recentRequests = requests.filter(time => now - time < 60000); // 1 minuto
    
    if (recentRequests.length > 100) { // 100 requests por minuto
      return this.sendError(res, 429, 'Muitas requisições. Tente novamente em alguns segundos.');
    }
    
    recentRequests.push(now);
    this.rateLimitMap.set(rateLimitKey, recentRequests);

    // Health check endpoint
    if (path === '/health' && method === 'GET') {
      return this.handleHealthCheck(req, res);
    }

    // Status endpoint
    if (path === '/status' && method === 'GET') {
      return this.handleStatus(req, res);
    }

    // Metrics endpoint
    if (path === '/metrics' && method === 'GET') {
      return this.handleMetrics(req, res);
    }

    // API search endpoint
    if (path === '/api/search' && method === 'POST') {
      return this.handleSearch(req, res);
    }

    // Endpoint raiz
    if (path === '/' && method === 'GET') {
      return this.handleRoot(req, res);
    }

    // 404 para outras rotas
    this.sendError(res, 404, 'Endpoint não encontrado');
  }

  /**
   * Health check para Docker
   */
  handleHealthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        service: 'BUSC-AI 2.0',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          limit: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        version: '2.0.0',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      };

      // Verificações de saúde adicionais
      const memoryUsagePercent = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
      if (memoryUsagePercent > 90) {
        health.status = 'warning';
        health.warnings = ['Alto uso de memória'];
      }

      if (process.uptime() < 10) {
        health.status = 'starting';
      }

      this.sendJSON(res, 200, health);
    } catch (error) {
      logger.error('Erro no health check:', error);
      this.sendError(res, 500, 'Erro no health check');
    }
  }

  /**
   * Status detalhado do sistema
   */
  handleStatus(req, res) {
    try {
      const status = {
        service: 'BUSC-AI 2.0',
        status: 'running',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          cpuUsage: process.cpuUsage(),
          loadAverage: process.platform !== 'win32' ? require('os').loadavg() : null
        },
        config: {
          cacheEnabled: CONFIG.cache.enabled,
          aiModel: process.env.AI_MODEL || 'command-r-plus',
          logLevel: CONFIG.logging.level,
          port: this.port,
          timeout: this.server?.timeout || 'not set'
        },
        endpoints: [
          'GET /health - Health check',
          'GET /status - Status detalhado',
          'GET /metrics - Métricas do sistema',
          'POST /api/search - API de busca',
          'GET / - Interface web'
        ]
      };

      this.sendJSON(res, 200, status);
    } catch (error) {
      logger.error('Erro ao obter status:', error);
      this.sendError(res, 500, 'Erro ao obter status do sistema');
    }
  }

  /**
   * Métricas do sistema para monitoramento
   */
  handleMetrics(req, res) {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage_bytes: process.memoryUsage().heapUsed,
        memory_total_bytes: process.memoryUsage().heapTotal,
        memory_rss_bytes: process.memoryUsage().rss,
        cpu_usage: process.cpuUsage(),
        requests_total: this.requestCount || 0,
        errors_total: this.errorCount || 0,
        active_connections: this.server?._connections || 0
      };

      // Formato Prometheus se solicitado
      const acceptHeader = req.headers.accept || '';
      if (acceptHeader.includes('text/plain')) {
        const prometheusMetrics = Object.entries(metrics)
          .map(([key, value]) => `${key} ${value}`)
          .join('\n');
        
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(prometheusMetrics);
      } else {
        this.sendJSON(res, 200, metrics);
      }
    } catch (error) {
      logger.error('Erro ao obter métricas:', error);
      this.sendError(res, 500, 'Erro ao obter métricas');
    }
  }

  /**
   * Endpoint de busca via API
   */
  async handleSearch(req, res) {
    const startTime = Date.now();
    
    try {
      // Incrementar contador de requisições
      this.requestCount = (this.requestCount || 0) + 1;

      // Validar Content-Type
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        return this.sendError(res, 400, 'Content-Type deve ser application/json');
      }

      // Validar tamanho do body
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > 10240) { // 10KB limit
        return this.sendError(res, 413, 'Payload muito grande (máximo 10KB)');
      }

      const body = await this.parseBody(req);
      
      // Validações detalhadas
      if (!body || typeof body !== 'object') {
        return this.sendError(res, 400, 'Body deve ser um objeto JSON válido');
      }

      if (!body.query || typeof body.query !== 'string') {
        return this.sendError(res, 400, 'Campo "query" é obrigatório e deve ser uma string');
      }

      const query = body.query.trim();

      if (query.length < 3) {
        return this.sendError(res, 400, 'Query deve ter pelo menos 3 caracteres');
      }

      if (query.length > 500) {
        return this.sendError(res, 400, 'Query muito longo (máximo 500 caracteres)');
      }

      // Filtros de segurança básicos
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\(/i,
        /function\s*\(/i
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(query))) {
        return this.sendError(res, 400, 'Query contém conteúdo potencialmente perigoso');
      }

      logger.info(`Processando busca via API: "${query}" (${query.length} chars)`);

      const result = await this.searchEngine.processQuery(query);
      const executionTime = Date.now() - startTime;

      const response = {
        success: true,
        query: query,
        response: result.response,
        sources: result.sources || [],
        metadata: {
          executionTime,
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          version: '2.0.0'
        }
      };

      logger.info(`Busca concluída em ${executionTime}ms`);
      this.sendJSON(res, 200, response);
      
    } catch (error) {
      this.errorCount = (this.errorCount || 0) + 1;
      const executionTime = Date.now() - startTime;
      
      logger.error('Erro na busca via API:', {
        error: error.message,
        stack: error.stack,
        executionTime
      });

      // Determinar tipo de erro para resposta apropriada
      if (error.message === 'JSON inválido') {
        this.sendError(res, 400, 'Formato JSON inválido');
      } else if (error.message.includes('timeout')) {
        this.sendError(res, 408, 'Timeout na busca - tente novamente');
      } else if (error.message.includes('rate limit')) {
        this.sendError(res, 429, 'Limite de taxa excedido');
      } else {
        this.sendError(res, 500, 'Erro interno ao processar busca');
      }
    }
  }

  /**
   * Página inicial
   */
  handleRoot(req, res) {
    try {
      const uptime = Math.floor(process.uptime());
      const uptimeFormatted = this.formatUptime(uptime);
      const memoryUsed = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      
      const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <title>BUSC-AI 2.0 - Sistema Inteligente de Busca</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="Sistema inteligente de busca e análise web com IA">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .container { 
                max-width: 800px; 
                margin: 0 auto; 
                background: white; 
                padding: 40px; 
                border-radius: 15px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            h1 { 
                color: #2c3e50; 
                margin-bottom: 10px; 
                font-size: 2.5em;
                text-align: center;
            }
            .subtitle {
                text-align: center;
                color: #666;
                margin-bottom: 30px;
                font-size: 1.2em;
            }
            .status-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }
            .status-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                border-left: 4px solid #007bff;
                text-align: center;
            }
            .status-card h3 {
                color: #2c3e50;
                margin-bottom: 10px;
                font-size: 1.1em;
            }
            .status-value {
                font-size: 1.5em;
                font-weight: bold;
                color: #007bff;
            }
            .endpoint { 
                background: #f8f9fa; 
                padding: 15px; 
                margin: 15px 0; 
                border-left: 4px solid #28a745;
                border-radius: 5px;
            }
            .endpoint-method {
                display: inline-block;
                background: #007bff;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.8em;
                font-weight: bold;
                margin-right: 10px;
            }
            .endpoint-method.post { background: #28a745; }
            .endpoint-method.get { background: #007bff; }
            code { 
                background: #e9ecef; 
                padding: 3px 8px; 
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
            }
            .curl-example {
                background: #2d3748;
                color: #e2e8f0;
                padding: 20px;
                border-radius: 8px;
                overflow-x: auto;
                margin: 20px 0;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
                line-height: 1.4;
            }
            .section {
                margin: 30px 0;
            }
            .section h2 {
                color: #2c3e50;
                margin-bottom: 20px;
                border-bottom: 2px solid #e9ecef;
                padding-bottom: 10px;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e9ecef;
                color: #666;
                font-size: 0.9em;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>BUSC-AI 2.0</h1>
            <p class="subtitle">Sistema Inteligente de Busca e Análise Web com IA</p>
            
            <div class="status-grid">
                <div class="status-card">
                    <h3>Status do Servidor</h3>
                    <div class="status-value">Ativo</div>
                </div>
                <div class="status-card">
                    <h3>Tempo Online</h3>
                    <div class="status-value">${uptimeFormatted}</div>
                </div>
                <div class="status-card">
                    <h3>Memória Usada</h3>
                    <div class="status-value">${memoryUsed} MB</div>
                </div>
                <div class="status-card">
                    <h3>Versão</h3>
                    <div class="status-value">2.0.0</div>
                </div>
            </div>

            <div class="section">
                <h2>Endpoints da API</h2>
                
                <div class="endpoint">
                    <span class="endpoint-method get">GET</span>
                    <strong>/health</strong><br>
                    Verificação de saúde do sistema para containers Docker e monitoramento
                </div>
                
                <div class="endpoint">
                    <span class="endpoint-method get">GET</span>
                    <strong>/status</strong><br>
                    Informações detalhadas sobre o status e configuração do sistema
                </div>

                <div class="endpoint">
                    <span class="endpoint-method get">GET</span>
                    <strong>/metrics</strong><br>
                    Métricas do sistema para monitoramento (compatível com Prometheus)
                </div>
                
                <div class="endpoint">
                    <span class="endpoint-method post">POST</span>
                    <strong>/api/search</strong><br>
                    Endpoint principal para busca inteligente com IA<br>
                    Body: <code>{"query": "sua pergunta aqui"}</code>
                </div>
            </div>

            <div class="section">
                <h2>Exemplo de Uso</h2>
                <p>Use o seguinte comando cURL para testar a API:</p>
                <div class="curl-example">curl -X POST http://localhost:${this.port}/api/search \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "Como funciona a inteligência artificial?"
  }'</div>
            </div>

            <div class="section">
                <h2>Resposta da API</h2>
                <p>A API retorna respostas no formato JSON com as seguintes informações:</p>
                <div class="curl-example">{
  "success": true,
  "query": "sua pergunta",
  "response": "resposta da IA",
  "sources": ["fonte1", "fonte2"],
  "metadata": {
    "executionTime": 1234,
    "timestamp": "2025-08-03T...",
    "requestId": "req_...",
    "version": "2.0.0"
  }
}</div>
            </div>

            <div class="footer">
                <p>BUSC-AI 2.0 - Sistema Inteligente de Busca</p>
                <p>Ambiente: ${process.env.NODE_ENV || 'development'} | Porta: ${this.port}</p>
            </div>
        </div>
    </body>
    </html>`;

      res.writeHead(200, { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(html);
    } catch (error) {
      logger.error('Erro ao gerar página inicial:', error);
      this.sendError(res, 500, 'Erro ao carregar página inicial');
    }
  }

  /**
   * Formatar tempo de uptime
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Parse do body da requisição com validações robustas
   */
  parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      let size = 0;
      const maxSize = 10240; // 10KB limit

      req.on('data', chunk => {
        size += chunk.length;
        
        if (size > maxSize) {
          reject(new Error('Payload muito grande'));
          return;
        }
        
        body += chunk;
      });

      req.on('end', () => {
        try {
          if (!body.trim()) {
            reject(new Error('Body vazio'));
            return;
          }

          const parsed = JSON.parse(body);
          
          // Validação adicional do objeto JSON
          if (typeof parsed !== 'object' || parsed === null) {
            reject(new Error('JSON deve ser um objeto'));
            return;
          }
          
          resolve(parsed);
        } catch (error) {
          reject(new Error('JSON inválido'));
        }
      });

      req.on('error', error => {
        reject(new Error(`Erro na requisição: ${error.message}`));
      });

      // Timeout para parsing
      const timeout = setTimeout(() => {
        reject(new Error('Timeout no parsing do body'));
      }, 5000);

      req.on('end', () => clearTimeout(timeout));
      req.on('error', () => clearTimeout(timeout));
    });
  }

  /**
   * Enviar resposta JSON
   */
  sendJSON(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Enviar erro com logs detalhados
   */
  sendError(res, status, message, details = null) {
    const error = {
      error: true,
      status,
      message,
      timestamp: new Date().toISOString(),
      requestId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    if (details && process.env.NODE_ENV !== 'production') {
      error.details = details;
    }

    // Log do erro
    logger.error(`HTTP ${status}: ${message}`, {
      status,
      message,
      details,
      requestId: error.requestId
    });

    // Headers de segurança
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    this.sendJSON(res, status, error);
  }

  /**
   * Iniciar servidor
   */
  start() {
    this.createServer();

    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Porta ${this.port} já está em uso`);
        process.exit(1);
      } else {
        logger.error('Erro no servidor:', error);
        process.exit(1);
      }
    });

    this.server.listen(this.port, () => {
      logger.info(`BUSC-AI 2.0 Docker Server iniciado na porta ${this.port}`);
      logger.info(`Health check disponível em: http://localhost:${this.port}/health`);
      logger.info(`Status do sistema em: http://localhost:${this.port}/status`);
      logger.info(`API de busca em: http://localhost:${this.port}/api/search`);
      logger.info(`Interface web em: http://localhost:${this.port}/`);
    });

    // Configurar timeout para requisições
    this.server.timeout = 30000; // 30 segundos
    this.server.keepAliveTimeout = 5000; // 5 segundos
    this.server.headersTimeout = 6000; // 6 segundos

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
    process.on('uncaughtException', (error) => {
      logger.error('Erro não capturado:', error);
      this.shutdown();
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Promise rejeitada não tratada:', reason);
      this.shutdown();
    });
  }

  /**
   * Parar servidor graciosamente
   */
  shutdown() {
    logger.info('Iniciando processo de encerramento do servidor...');
    
    if (this.server) {
      // Parar de aceitar novas conexões
      this.server.close((error) => {
        if (error) {
          logger.error('Erro ao encerrar servidor:', error);
          process.exit(1);
        } else {
          logger.info('Servidor encerrado com sucesso');
          process.exit(0);
        }
      });

      // Forçar encerramento após timeout
      setTimeout(() => {
        logger.warn('Forçando encerramento do servidor após timeout');
        process.exit(1);
      }, 10000);
    } else {
      logger.info('Nenhum servidor ativo para encerrar');
      process.exit(0);
    }
  }
}

// Verificar se deve rodar como servidor Docker
const isDockerMode = process.env.DOCKER_MODE === 'true' || process.env.NODE_ENV === 'production';

if (isDockerMode) {
  // Modo servidor para Docker
  logger.info('Iniciando em modo servidor Docker');
  const server = new DockerServer();
  server.start();
} else {
  // Modo terminal interativo (padrão)
  logger.info('Iniciando em modo terminal interativo');
  try {
    // Importar e executar o módulo main.js diretamente
    await import('./main.js');
  } catch (error) {
    logger.error('Erro ao inicializar aplicação terminal:', error);
    logger.info('Iniciando em modo servidor como fallback');
    // Fallback para servidor Docker se o modo terminal falhar
    const server = new DockerServer();
    server.start();
  }
}

export default DockerServer;
