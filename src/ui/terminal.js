import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';

const APPLICATION_TITLE = 'BUSC-AI 2.0';
const APPLICATION_SUBTITLE = 'Assistente de IA com Busca na Web';
const APPLICATION_DESCRIPTION = 'Sistema inteligente de busca e análise web com IA';

const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 500;

const VALIDATION_MESSAGES = {
  EMPTY_QUERY: 'Por favor, digite sua pergunta',
  MIN_LENGTH: `A pergunta deve ter pelo menos ${MIN_QUERY_LENGTH} caracteres`,
  MAX_LENGTH: `A pergunta é muito longa (máximo ${MAX_QUERY_LENGTH} caracteres)`
};

const UI_MESSAGES = {
  PROMPT_QUERY: 'Pergunte qualquer coisa:',
  PROMPT_CONTINUE: 'Deseja fazer outra pesquisa?',
  SUCCESS_DEFAULT: 'Concluído!',
  ERROR_DEFAULT: 'Falhou!'
};

const TIPS_CONTENT = [
  'Faça perguntas naturais como faria a um assistente',
  'Use perguntas específicas para melhores respostas',
  'O sistema busca e analisa informações atuais da web',
  'Respostas são geradas com base em múltiplas fontes confiáveis'
];

const HELP_CONTENT = [
  'Faça perguntas específicas para melhores resultados',
  'Use palavras-chave relevantes',
  'O sistema analisa múltiplas fontes automaticamente',
  'Resultados são armazenados em cache para consultas repetidas'
];

/**
 * Terminal user interface handler for the BUSC-AI application
 */
class Terminal {
  constructor() {
    this.spinner = null;
  }

  /**
   * Displays the application banner with branding and usage tips
   */
  showBanner() {
    const bannerContent = this.createBannerContent();
    const bannerBox = this.createBannerBox(bannerContent);
    
    console.log(bannerBox);
    this.displayUsageTips();
    console.log();
  }

  /**
   * Creates the main banner content
   */
  createBannerContent() {
    return (
      chalk.cyan.bold(APPLICATION_TITLE) + '\n' +
      chalk.gray(APPLICATION_SUBTITLE) + '\n' +
      chalk.gray(APPLICATION_DESCRIPTION)
    );
  }

  /**
   * Creates a styled banner box
   */
  createBannerBox(content) {
    return boxen(content, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    });
  }

  /**
   * Displays usage tips for better user experience
   */
  displayUsageTips() {
    console.log(chalk.gray('Dicas:'));
    TIPS_CONTENT.forEach(tip => {
      console.log(chalk.gray(`• ${tip}`));
    });
  }

  /**
   * Prompts user for search query with validation
   */
  async promptQuery() {
    const { query } = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: chalk.cyan(`${UI_MESSAGES.PROMPT_QUERY}`),
        validate: this.validateQueryInput.bind(this)
      }
    ]);
    
    return query.trim();
  }

  /**
   * Validates user query input
   */
  validateQueryInput(input) {
    const trimmedInput = input.trim();
    
    if (!trimmedInput) {
      return VALIDATION_MESSAGES.EMPTY_QUERY;
    }
    
    if (trimmedInput.length < MIN_QUERY_LENGTH) {
      return VALIDATION_MESSAGES.MIN_LENGTH;
    }
    
    if (trimmedInput.length > MAX_QUERY_LENGTH) {
      return VALIDATION_MESSAGES.MAX_LENGTH;
    }
    
    return true;
  }

  /**
   * Starts loading spinner with specified text
   */
  startSpinner(text = 'Processando...') {
    this.spinner = ora({
      text: chalk.blue(text),
      spinner: 'dots'
    }).start();
  }

  /**
   * Updates spinner text during operation
   */
  updateSpinner(text) {
    if (this.spinner) {
      this.spinner.text = chalk.blue(text);
    }
  }

  /**
   * Stops spinner with success or failure indication
   */
  stopSpinner(isSuccess = true, text = '') {
    if (!this.spinner) return;

    const displayText = text || (isSuccess ? UI_MESSAGES.SUCCESS_DEFAULT : UI_MESSAGES.ERROR_DEFAULT);
    
    if (isSuccess) {
      this.spinner.succeed(chalk.green(displayText));
    } else {
      this.spinner.fail(chalk.red(displayText));
    }
    
    this.spinner = null;
  }

  /**
   * Displays search results with formatted output
   */
  displayResult(result) {
    console.log('\n');
    
    this.displayMainResponse(result.response);
    this.displayAdditionalSections(result.sections);
    this.displaySourceReferences(result.sources);
    this.displayMetadataIfAvailable(result.metadata);
  }

  /**
   * Displays the main AI response
   */
  displayMainResponse(response) {
    console.log(chalk.white(response));
  }

  /**
   * Displays additional content sections
   */
  displayAdditionalSections(sections) {
    if (!sections || sections.length === 0) return;

    sections.forEach(section => {
      if (this.shouldDisplaySection(section)) {
        this.displayContentSection(section);
      }
    });
  }

  /**
   * Determines if a section should be displayed
   */
  shouldDisplaySection(section) {
    if (section.type === 'sources') {
      console.log('\n' + chalk.cyan.bold('Fontes detalhadas:'));
      console.log(chalk.gray(section.content));
      return false;
    }
    
    const excludedTitles = ['Resumo dos Resultados', 'Informações Principais'];
    return !excludedTitles.includes(section.title);
  }

  /**
   * Displays a content section with formatting
   */
  displayContentSection(section) {
    console.log('\n' + chalk.yellow.bold(`${section.title}:`));
    console.log(chalk.white(section.content));
  }

  /**
   * Displays source references in professional format
   */
  displaySourceReferences(sources) {
    if (!sources || sources.length === 0) return;

    console.log('\n' + chalk.cyan.bold('Fontes:'));
    sources.forEach((source, index) => {
      this.displaySingleSource(source, index);
      
      if (index < sources.length - 1) {
        console.log('');
      }
    });
  }

  /**
   * Displays a single source reference
   */
  displaySingleSource(source, index) {
    console.log(chalk.blue(`[${index + 1}] ${source.title}`));
    console.log(chalk.gray(`    ${source.url}`));
    
    if (this.hasValidSnippet(source.snippet)) {
      console.log(chalk.gray(`    "${source.snippet}"`));
    }
  }

  /**
   * Checks if snippet is valid for display
   */
  hasValidSnippet(snippet) {
    return snippet && snippet.length > 10;
  }

  /**
   * Displays metadata if available
   */
  displayMetadataIfAvailable(metadata) {
    if (metadata) {
      this.displayMetadata(metadata);
    }
  }

  /**
   * Displays metadata information in a formatted way
   */
  displayMetadata(metadata) {
    const separator = chalk.gray('─'.repeat(50));
    const processingTime = `Processado em ${metadata.processingTime}ms`;
    const sourcesInfo = `${metadata.sourcesFound || 0} fontes encontradas, ${metadata.sourcesProcessed || 0} processadas`;
    const timestamp = new Date(metadata.processedAt).toLocaleString('pt-BR');
    
    console.log('\n' + separator);
    console.log(chalk.gray(`Tempo: ${processingTime}`));
    console.log(chalk.gray(`Fontes: ${sourcesInfo}`));
    console.log(chalk.gray(`Data: ${timestamp}`));
  }

  /**
   * Displays error messages in a formatted error box
   */
  displayError(error) {
    const errorContent = this.createErrorContent(error);
    const errorBox = this.createErrorBox(errorContent);
    console.log(errorBox);
  }

  /**
   * Creates formatted error content
   */
  createErrorContent(error) {
    return chalk.red.bold('ERRO') + '\n' + chalk.red(error.message || error);
  }

  /**
   * Creates a styled error box
   */
  createErrorBox(content) {
    return boxen(content, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'red'
    });
  }

  /**
   * Prompts user whether to continue with another search
   */
  async promptContinue() {
    const { continue: shouldContinue } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: chalk.yellow(UI_MESSAGES.PROMPT_CONTINUE),
        default: true
      }
    ]);
    
    return shouldContinue;
  }

  /**
   * Displays help information for better user experience
   */
  showHelp() {
    console.log(chalk.cyan.bold('\nDICAS DE USO:'));
    HELP_CONTENT.forEach(tip => {
      console.log(chalk.white(`• ${tip}`));
    });
  }

  /**
   * Clears the terminal screen
   */
  clear() {
    console.clear();
  }
}

export default new Terminal();
