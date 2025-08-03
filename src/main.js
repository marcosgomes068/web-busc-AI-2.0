import SearchEngine from './core/engine.js';
import Terminal from './ui/terminal.js';
import logger from './utils/logger.js';
import { CONFIG } from './config.js';
import chalk from 'chalk';

const SYSTEM_HEALTH_CHECK_MESSAGE = 'Verificando sistema...';
const SYSTEM_READY_MESSAGE = 'Sistema pronto!';
const SYSTEM_ERROR_MESSAGE = 'Sistema não está funcionando corretamente';
const HEALTH_CHECK_ERROR_MESSAGE = 'Falha na verificação do sistema';
const QUERY_ANALYSIS_MESSAGE = 'Analisando consulta...';
const SEARCH_COMPLETED_MESSAGE = 'Pesquisa concluída!';
const SEARCH_ERROR_MESSAGE = 'Erro durante a pesquisa';
const GRACEFUL_SHUTDOWN_MESSAGE = '\nObrigado por usar o BUSC-AI 2.0!';
const PROCESS_INTERRUPT_MESSAGE = '\n\nEncerrando aplicação...';

/**
 * Main application class responsible for orchestrating the search engine
 * and user interface interactions
 */
class Application {
  constructor() {
    this.searchEngine = SearchEngine;
    this.userInterface = Terminal;
  }

  /**
   * Initializes and starts the application main loop
   */
  async start() {
    try {
      this.initializeUserInterface();
      await this.performSystemHealthCheck();
      await this.runMainApplicationLoop();
      this.displayGracefulShutdownMessage();

    } catch (error) {
      this.handleFatalError(error);
    }
  }

  /**
   * Initializes the user interface
   */
  initializeUserInterface() {
    this.userInterface.clear();
    this.userInterface.showBanner();
  }

  /**
   * Performs system health check before starting main operations
   */
  async performSystemHealthCheck() {
    this.userInterface.startSpinner(SYSTEM_HEALTH_CHECK_MESSAGE);
    const healthStatus = await this.searchEngine.getHealthStatus();
    
    if (!this.isSystemHealthy(healthStatus)) {
      this.handleUnhealthySystem(healthStatus);
      return;
    }
    
    this.userInterface.stopSpinner(true, SYSTEM_READY_MESSAGE);
  }

  /**
   * Checks if the system health status indicates a healthy state
   */
  isSystemHealthy(healthStatus) {
    return healthStatus.status === 'healthy';
  }

  /**
   * Handles unhealthy system state
   */
  handleUnhealthySystem(healthStatus) {
    this.userInterface.stopSpinner(false, SYSTEM_ERROR_MESSAGE);
    const errorMessage = healthStatus.error || HEALTH_CHECK_ERROR_MESSAGE;
    this.userInterface.displayError(new Error(errorMessage));
  }

  /**
   * Runs the main application loop for user interactions
   */
  async runMainApplicationLoop() {
    while (true) {
      const shouldContinue = await this.processUserQuery();
      if (!shouldContinue) {
        break;
      }
    }
  }

  /**
   * Processes a single user query and returns whether to continue
   */
  async processUserQuery() {
    try {
      const userQuery = await this.userInterface.promptQuery();
      await this.executeSearchWithFeedback(userQuery);
      return await this.userInterface.promptContinue();

    } catch (error) {
      return this.handleQueryError(error);
    }
  }

  /**
   * Executes search with user feedback and displays results
   */
  async executeSearchWithFeedback(query) {
    this.userInterface.startSpinner(QUERY_ANALYSIS_MESSAGE);
    const searchResult = await this.processQueryWithProgress(query);
    this.userInterface.stopSpinner(true, SEARCH_COMPLETED_MESSAGE);
    this.userInterface.displayResult(searchResult);
  }

  /**
   * Handles errors during query processing
   */
  async handleQueryError(error) {
    this.userInterface.stopSpinner(false, SEARCH_ERROR_MESSAGE);
    this.userInterface.displayError(error);
    logger.error('Application error:', error);
    return await this.userInterface.promptContinue();
  }

  /**
   * Displays graceful shutdown message
   */
  displayGracefulShutdownMessage() {
    console.log(chalk.cyan(GRACEFUL_SHUTDOWN_MESSAGE));
  }

  /**
   * Handles fatal application errors
   */
  handleFatalError(error) {
    logger.error('Fatal application error:', error);
    this.userInterface.displayError(error);
    process.exit(1);
  }

  /**
   * Processes user query with progress feedback
   */
  async processQueryWithProgress(query) {
    const PROGRESS_STEPS = [
      'Pensando sobre sua pergunta...',
      'Buscando informações na web...',
      'Analisando fontes encontradas...',
      'Extraindo conteúdo relevante...',
      'Processando informações...',
      'Preparando resposta final...'
    ];

    const PROGRESS_UPDATE_INTERVAL_MS = 2500;

    let currentStepIndex = 0;
    const updateProgress = () => {
      if (currentStepIndex < PROGRESS_STEPS.length) {
        this.userInterface.updateSpinner(PROGRESS_STEPS[currentStepIndex]);
        currentStepIndex++;
      }
    };

    const progressInterval = setInterval(updateProgress, PROGRESS_UPDATE_INTERVAL_MS);
    
    try {
      const searchResult = await this.searchEngine.processQuery(query);
      clearInterval(progressInterval);
      return searchResult;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }
}

/**
 * Configures graceful shutdown handlers
 */
function configureProcessHandlers() {
  process.on('SIGINT', () => {
    console.log(chalk.yellow(PROCESS_INTERRUPT_MESSAGE));
    process.exit(0);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

/**
 * Initializes and starts the application
 */
async function initializeApplication() {
  const application = new Application();
  
  try {
    await application.start();
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

configureProcessHandlers();
initializeApplication();
