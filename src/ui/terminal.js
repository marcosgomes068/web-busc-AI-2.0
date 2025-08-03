import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';

class Terminal {
  constructor() {
    this.spinner = null;
  }

  showBanner() {
    const banner = boxen(
      chalk.cyan.bold('🤖 BUSC-AI 2.0') + '\n' +
      chalk.gray('Assistente de IA com Busca na Web') + '\n' +
      chalk.gray('Similiar ao modo "busca na web" do ChatGPT'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan'
      }
    );
    console.log(banner);
    
    console.log(chalk.gray('💡 Dicas:'));
    console.log(chalk.gray('• Faça perguntas naturais como faria a um assistente'));
    console.log(chalk.gray('• Use perguntas específicas para melhores respostas'));
    console.log(chalk.gray('• O sistema busca e analisa informações atuais da web'));
    console.log(chalk.gray('• Respostas são geradas com base em múltiplas fontes confiáveis'));
    console.log();
  }

  async promptQuery() {
    const { query } = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: chalk.cyan('🔍 Pergunte qualquer coisa:'),
        validate: (input) => {
          if (!input.trim()) return 'Por favor, digite sua pergunta';
          if (input.length < 3) return 'A pergunta deve ter pelo menos 3 caracteres';
          if (input.length > 500) return 'A pergunta é muito longa (máximo 500 caracteres)';
          return true;
        }
      }
    ]);
    
    return query.trim();
  }

  startSpinner(text = 'Processando...') {
    this.spinner = ora({
      text: chalk.blue(text),
      spinner: 'dots'
    }).start();
  }

  updateSpinner(text) {
    if (this.spinner) {
      this.spinner.text = chalk.blue(text);
    }
  }

  stopSpinner(success = true, text = '') {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(chalk.green(text || 'Concluído!'));
      } else {
        this.spinner.fail(chalk.red(text || 'Falhou!'));
      }
      this.spinner = null;
    }
  }

  displayResult(result) {
    console.log('\n');
    
    // Exibir resposta principal como um assistente de IA
    console.log(chalk.white(result.response));
    
    // Seções adicionais se existirem
    if (result.sections && result.sections.length > 0) {
      result.sections.forEach(section => {
        if (section.type === 'sources') {
          console.log('\n' + chalk.cyan.bold('📚 Fontes detalhadas:'));
          console.log(chalk.gray(section.content));
        } else if (section.title !== 'Resumo dos Resultados' && section.title !== 'Informações Principais') {
          console.log('\n' + chalk.yellow.bold(`${section.title}:`));
          console.log(chalk.white(section.content));
        }
      });
    }

    // Fontes em formato ChatGPT-like
    if (result.sources && result.sources.length > 0) {
      console.log('\n' + chalk.cyan.bold('🔗 Fontes:'));
      result.sources.forEach((source, index) => {
        console.log(chalk.blue(`[${index + 1}] ${source.title}`));
        console.log(chalk.gray(`    ${source.url}`));
        if (source.snippet && source.snippet.length > 10) {
          console.log(chalk.gray(`    "${source.snippet}"`));
        }
        if (index < result.sources.length - 1) console.log('');
      });
    }

    // Metadados mais discretos
    if (result.metadata) {
      this.displayMetadata(result.metadata);
    }
  }

  displayMetadata(metadata) {
    console.log('\n' + chalk.gray('─'.repeat(50)));
    console.log(chalk.gray(`⏱️  Processado em ${metadata.processingTime}ms`));
    console.log(chalk.gray(`📊 ${metadata.sourcesFound || 0} fontes encontradas, ${metadata.sourcesProcessed || 0} processadas`));
    console.log(chalk.gray(`📅 ${new Date(metadata.processedAt).toLocaleString('pt-BR')}`));
  }

  displayError(error) {
    console.log(boxen(
      chalk.red.bold('ERRO') + '\n' +
      chalk.red(error.message || error),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'red'
      }
    ));
  }

  async promptContinue() {
    const { continue: shouldContinue } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: chalk.yellow('Deseja fazer outra pesquisa?'),
        default: true
      }
    ]);
    
    return shouldContinue;
  }

  showHelp() {
    console.log(chalk.cyan.bold('\nDICAS DE USO:'));
    console.log(chalk.white('• Faça perguntas específicas para melhores resultados'));
    console.log(chalk.white('• Use palavras-chave relevantes'));
    console.log(chalk.white('• O sistema analisa múltiplas fontes automaticamente'));
    console.log(chalk.white('• Resultados são armazenados em cache para consultas repetidas'));
  }

  clear() {
    console.clear();
  }
}

export default new Terminal();
