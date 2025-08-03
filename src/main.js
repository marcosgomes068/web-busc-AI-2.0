import SearchEngine from './core/engine.js';
import Terminal from './ui/terminal.js';
import logger from './utils/logger.js';
import { CONFIG } from './config.js';
import chalk from 'chalk';

class Application {
  constructor() {
    this.engine = SearchEngine;
    this.ui = Terminal;
  }

  async start() {
    try {
      this.ui.clear();
      this.ui.showBanner();

      // Health check
      this.ui.startSpinner('Verificando sistema...');
      const health = await this.engine.getHealthStatus();
      
      if (health.status !== 'healthy') {
        this.ui.stopSpinner(false, 'Sistema não está funcionando corretamente');
        this.ui.displayError(new Error(health.error || 'Falha na verificação do sistema'));
        return;
      }
      
      this.ui.stopSpinner(true, 'Sistema pronto!');

      // Main loop
      while (true) {
        try {
          const query = await this.ui.promptQuery();
          
          this.ui.startSpinner('Analisando consulta...');
          
          // Process the query
          const result = await this.processQueryWithProgress(query);
          
          this.ui.stopSpinner(true, 'Pesquisa concluída!');
          this.ui.displayResult(result);

          // Ask if user wants to continue
          const shouldContinue = await this.ui.promptContinue();
          if (!shouldContinue) {
            break;
          }

        } catch (error) {
          this.ui.stopSpinner(false, 'Erro durante a pesquisa');
          this.ui.displayError(error);
          logger.error('Application error:', error);

          const shouldContinue = await this.ui.promptContinue();
          if (!shouldContinue) {
            break;
          }
        }
      }

      console.log(chalk.cyan('\nObrigado por usar o BUSC-AI 2.0!'));

    } catch (error) {
      logger.error('Fatal application error:', error);
      this.ui.displayError(error);
      process.exit(1);
    }
  }

  async processQueryWithProgress(query) {
    const steps = [
      '🤔 Pensando sobre sua pergunta...',
      '🔍 Buscando informações na web...',
      '📄 Analisando fontes encontradas...',
      '📝 Extraindo conteúdo relevante...',
      '🧠 Processando informações...',
      '✨ Preparando resposta final...'
    ];

    let currentStep = 0;
    const updateProgress = () => {
      if (currentStep < steps.length) {
        this.ui.updateSpinner(steps[currentStep]);
        currentStep++;
      }
    };

    // Update progress every 2.5 seconds for more natural feel
    const progressInterval = setInterval(updateProgress, 2500);
    
    try {
      const result = await this.engine.processQuery(query);
      clearInterval(progressInterval);
      return result;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nEncerrando aplicação...'));
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
const app = new Application();
app.start().catch(error => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});
