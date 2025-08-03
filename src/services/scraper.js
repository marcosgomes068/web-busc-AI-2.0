import axios from 'axios';
import * as cheerio from 'cheerio';
import UserAgent from 'user-agents';
import { CONFIG } from '../config.js';
import { RateLimiter, retry, validateUrl } from '../utils/helpers.js';
import logger from '../utils/logger.js';

class WebScraper {
  constructor() {
    this.userAgent = new UserAgent({ deviceCategory: 'desktop' });
    this.rateLimiter = new RateLimiter(CONFIG.api.webRateLimit);
    this.cache = new Map();
    this.maxCacheSize = 100;
    this.timeout = 10000; // 10 segundos
    this.retryAttempts = 3;
    
    // User agents rotativos para evitar bloqueios
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0'
    ];
    this.currentUserAgentIndex = 0;
  }

  async scrapeUrls(urls) {
    const results = [];
    const validUrls = await this.validateUrls(urls);
    
    logger.info(`Starting to scrape ${validUrls.length} URLs`);
    
    for (const url of validUrls.slice(0, CONFIG.system.maxPagesToAnalyze)) {
      try {
        // Verificar cache primeiro
        if (this.cache.has(url)) {
          const cached = this.cache.get(url);
          if (Date.now() - cached.timestamp < 300000) { // 5 minutos de cache
            logger.info(`Using cached content for: ${url}`);
            results.push(cached.content);
            continue;
          }
        }
        
        const content = await this.scrapeUrl(url);
        if (content && this.isValidContent(content)) {
          results.push(content);
          this.cacheContent(url, content);
          logger.info(`Successfully scraped: ${url} (${content.text.length} chars)`);
        } else {
          logger.warn(`Invalid content from: ${url}`);
        }
        
        // Delay entre requests para ser respeitoso
        await this.delay(1000 + Math.random() * 2000); // 1-3 segundos
        
      } catch (error) {
        logger.error(`Scraping failed for ${url}:`, {
          message: error.message,
          status: error.response?.status,
          timeout: error.code === 'ECONNABORTED'
        });
      }
    }
    
    logger.info(`Scraping completed: ${results.length}/${validUrls.length} successful`);
    return results;
  }

  isValidContent(content) {
    return content && 
           content.text && 
           content.text.length > 100 && 
           content.text.length < 500000 && // Máximo 500KB
           !this.isErrorPage(content.text);
  }

  isErrorPage(text) {
    const errorKeywords = [
      '404', '403', '500', 'not found', 'access denied', 
      'error', 'blocked', 'captcha', 'robot', 'bot detection'
    ];
    const lowerText = text.toLowerCase();
    return errorKeywords.some(keyword => lowerText.includes(keyword)) && text.length < 1000;
  }

  cacheContent(url, content) {
    // Limitar tamanho do cache
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(url, {
      content,
      timestamp: Date.now()
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRandomUserAgent() {
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.userAgents.length;
    return this.userAgents[this.currentUserAgentIndex];
  }

  async scrapeUrl(url) {
    if (!validateUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    return await this.rateLimiter.execute(async () => {
      // Primeiro, fazer uma tentativa com limite normal
      let response;
      try {
        response = await retry(async () => {
          return await axios.get(url, {
            headers: {
              'User-Agent': this.getRandomUserAgent(),
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8,*;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br',
              'DNT': '1',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'none',
              'Cache-Control': 'max-age=0'
            },
            timeout: this.timeout,
            maxRedirects: 5,
            maxContentLength: CONFIG.system.maxContentLength,
            validateStatus: (status) => status >= 200 && status < 400,
            responseType: 'text'
          });
        }, this.retryAttempts);
      } catch (error) {
        // Se falhou por tamanho, tentar com estratégia de streaming
        if (error.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED' || 
            error.message.includes('maxContentLength')) {
          logger.info(`Content too large for ${url}, trying streaming approach`);
          return await this.scrapeUrlWithStreaming(url);
        }
        throw error;
      }

      // Verificar se o conteúdo é HTML válido
      if (!response.data || typeof response.data !== 'string') {
        throw new Error('Invalid response data');
      }

      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const content = this.extractContent(response.data, url);
      
      if (!content.text || content.text.length < 50) {
        throw new Error('Content too short or empty');
      }
      
      return content;
    });
  }

  async scrapeUrlWithStreaming(url) {
    return new Promise((resolve, reject) => {
      let htmlContent = '';
      let totalSize = 0;
      const maxSize = 500000; // 500KB limite para streaming
      const timeout = setTimeout(() => reject(new Error('Streaming timeout')), this.timeout);

      axios({
        method: 'get',
        url: url,
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8,*;q=0.5',
        },
        responseType: 'stream',
        timeout: this.timeout,
        maxRedirects: 5
      }).then(response => {
        response.data.on('data', chunk => {
          totalSize += chunk.length;
          
          if (totalSize > maxSize) {
            logger.info(`Stopping stream for ${url} at ${totalSize} bytes`);
            response.data.destroy();
            clearTimeout(timeout);
            
            try {
              const content = this.extractContent(htmlContent, url);
              resolve(content);
            } catch (error) {
              reject(error);
            }
            return;
          }
          
          htmlContent += chunk.toString();
        });

        response.data.on('end', () => {
          clearTimeout(timeout);
          try {
            const content = this.extractContent(htmlContent, url);
            resolve(content);
          } catch (error) {
            reject(error);
          }
        });

        response.data.on('error', error => {
          clearTimeout(timeout);
          reject(error);
        });
      }).catch(error => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  extractContent(html, url) {
    try {
      const $ = cheerio.load(html);
      
      // Para páginas muito grandes (como Wikipedia), ser mais seletivo
      const isLargePage = html.length > 300000; // 300KB
      
      if (isLargePage) {
        return this.extractContentFromLargePage($, url);
      }
      
      // Remove elementos indesejados de forma mais agressiva
      this.removeUnwantedElements($);
      
      // Extrair informações estruturadas
      const title = this.extractTitle($);
      const meta = this.extractMeta($);
      
      // Encontrar conteúdo principal com múltiplas estratégias
      let mainContent = this.findMainContent($);
      
      // Se não encontrou conteúdo principal, tentar estratégias alternativas
      if (!mainContent || mainContent.length < 200) {
        mainContent = this.extractAlternativeContent($);
      }
      
      // Última tentativa: pegar todo o texto do body
      if (!mainContent || mainContent.length < 100) {
        mainContent = $('body').text();
      }
      
      const cleanedText = this.cleanText(mainContent);
      
      // Validar qualidade do conteúdo
      if (!this.isQualityContent(cleanedText, title)) {
        throw new Error('Low quality content detected');
      }
      
      return {
        title: title || '',
        text: cleanedText,
        meta: meta,
        url: url,
        extractedAt: new Date().toISOString(),
        wordCount: cleanedText.split(/\s+/).length,
        language: this.detectLanguage(cleanedText)
      };
    } catch (error) {
      logger.error(`Content extraction failed for ${url}:`, error.message);
      throw error;
    }
  }

  extractContentFromLargePage($, url) {
    logger.info(`Processing large page: ${url}`);
    
    // Para páginas grandes, focar apenas no conteúdo principal
    this.removeUnwantedElements($);
    
    const title = this.extractTitle($);
    const meta = this.extractMeta($);
    
    // Estratégia específica para páginas grandes - extrair seções prioritárias
    let mainContent = '';
    
    // 1. Tentar extrair introdução/resumo primeiro
    const intro = this.extractIntroContent($);
    if (intro && intro.length > 100) {
      mainContent = intro;
    }
    
    // 2. Se não tem introdução suficiente, pegar primeiros parágrafos
    if (mainContent.length < 300) {
      const firstParagraphs = this.extractFirstParagraphs($, 10); // Primeiros 10 parágrafos
      if (firstParagraphs.length > mainContent.length) {
        mainContent = firstParagraphs;
      }
    }
    
    // 3. Fallback: conteúdo principal limitado
    if (mainContent.length < 200) {
      mainContent = this.findMainContent($);
    }
    
    // Limitar tamanho para páginas grandes
    if (mainContent.length > 50000) { // 50KB max para páginas grandes
      mainContent = mainContent.substring(0, 50000) + '...';
    }
    
    const cleanedText = this.cleanText(mainContent);
    
    return {
      title: title || '',
      text: cleanedText,
      meta: meta,
      url: url,
      extractedAt: new Date().toISOString(),
      wordCount: cleanedText.split(/\s+/).length,
      language: this.detectLanguage(cleanedText),
      largePage: true
    };
  }

  extractIntroContent($) {
    // Procurar por seções de introdução comuns
    const introSelectors = [
      '.mw-parser-output > p:first-of-type', // Wikipedia intro
      '.lead', '.intro', '.summary', '.abstract',
      'article > p:first-of-type',
      '.entry-content > p:first-of-type',
      '#content > p:first-of-type'
    ];
    
    for (const selector of introSelectors) {
      const intro = $(selector).text().trim();
      if (intro.length > 100) {
        return intro;
      }
    }
    
    return '';
  }

  extractFirstParagraphs($, maxParagraphs = 10) {
    const paragraphs = [];
    let count = 0;
    
    $('p').each((_, elem) => {
      if (count >= maxParagraphs) return false;
      
      const text = $(elem).text().trim();
      if (text.length > 50) { // Apenas parágrafos substanciais
        paragraphs.push(text);
        count++;
      }
    });
    
    return paragraphs.join(' ');
  }

  removeUnwantedElements($) {
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 'aside',
      '.sidebar', '.menu', '.navigation', '.navbar', '.header', '.footer',
      '.advertisement', '.ads', '.ad', '.google-ad', '.banner',
      '.social-share', '.social-media', '.share-buttons',
      '.comments', '.comment-section', '.disqus',
      '.popup', '.modal', '.overlay', '.cookie-notice',
      '.breadcrumb', '.pagination', '.related-posts',
      'iframe', 'video', 'audio', 'embed', 'object',
      '.hidden', '.invisible', '[style*="display:none"]', '[style*="visibility:hidden"]'
    ];
    
    unwantedSelectors.forEach(selector => {
      $(selector).remove();
    });
    
    // Remover elementos com pouco texto
    $('div, span, section').each((_, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      if (text.length < 20 && !$elem.find('p, article, main').length) {
        $elem.remove();
      }
    });
  }

  isQualityContent(text, title) {
    if (!text || text.length < 100) return false;
    
    const words = text.split(/\s+/);
    if (words.length < 50) return false;
    
    // Verificar se não é apenas links ou listas
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length < 3) return false;
    
    // Verificar diversidade de vocabulário
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const vocabularyRatio = uniqueWords.size / words.length;
    if (vocabularyRatio < 0.3) return false; // Muito repetitivo
    
    return true;
  }

  detectLanguage(text) {
    const portugueseWords = ['que', 'para', 'com', 'uma', 'por', 'são', 'mais', 'como', 'foi', 'dos'];
    const englishWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had'];
    
    const words = text.toLowerCase().split(/\s+/).slice(0, 100);
    
    const ptCount = words.filter(word => portugueseWords.includes(word)).length;
    const enCount = words.filter(word => englishWords.includes(word)).length;
    
    if (ptCount > enCount) return 'pt-BR';
    if (enCount > ptCount) return 'en';
    return 'unknown';
  }

  findMainContent($) {
    // Estratégia 1: Procurar por seletores semânticos comuns
    const mainSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.article-body',
      '#content',
      '.main-content',
      '.page-content',
      '.story-body',
      '.text-content'
    ];
    
    for (const selector of mainSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().trim();
        if (text.length > 200) {
          return text;
        }
      }
    }
    
    // Estratégia 2: Encontrar o maior bloco de texto em parágrafos
    let maxContent = '';
    let maxLength = 0;
    
    $('div, section, article').each((_, elem) => {
      const $elem = $(elem);
      const paragraphs = $elem.find('p');
      
      if (paragraphs.length >= 3) { // Pelo menos 3 parágrafos
        const text = paragraphs.text().trim();
        if (text.length > maxLength && text.length > 300) {
          maxLength = text.length;
          maxContent = text;
        }
      }
    });
    
    if (maxContent) return maxContent;
    
    // Estratégia 3: Maior elemento individual com texto substancial
    $('div, section, p').each((_, elem) => {
      const text = $(elem).clone().children().remove().end().text().trim();
      if (text.length > maxLength && text.length > 200 && text.length <= 100000) {
        maxLength = text.length;
        maxContent = text;
      }
    });
    
    return maxContent;
  }

  extractAlternativeContent($) {
    // Tentar extrair de elementos específicos de notícias/blogs
    const contentSelectors = [
      '.entry-content p',
      '.post-body p',
      '.article-text p',
      '.story-content p',
      '.news-content p',
      'p'
    ];
    
    for (const selector of contentSelectors) {
      const elements = $(selector);
      if (elements.length >= 2) {
        const combinedText = elements.map((_, el) => $(el).text().trim())
                                   .get()
                                   .filter(text => text.length > 50)
                                   .join(' ');
        
        if (combinedText.length > 300) {
          return combinedText;
        }
      }
    }
    
    return '';
  }

  extractTitle($) {
    const titleSelectors = [
      'h1',
      'title',
      '.article-title',
      '.post-title',
      '.entry-title',
      '[property="og:title"]',
      '[name="twitter:title"]'
    ];
    
    for (const selector of titleSelectors) {
      const element = $(selector).first();
      let title = '';
      
      if (selector.includes('property') || selector.includes('name')) {
        title = element.attr('content');
      } else {
        title = element.text();
      }
      
      if (title && title.trim().length > 0) {
        return title.trim().substring(0, 200); // Limitar tamanho do título
      }
    }
    
    return '';
  }

  extractMeta($) {
    return {
      description: $('meta[name="description"]').attr('content') || 
                  $('meta[property="og:description"]').attr('content') || 
                  $('meta[name="twitter:description"]').attr('content') || '',
      keywords: $('meta[name="keywords"]').attr('content') || '',
      author: $('meta[name="author"]').attr('content') || 
              $('meta[property="article:author"]').attr('content') || '',
      publishedDate: $('meta[property="article:published_time"]').attr('content') || 
                    $('meta[name="date"]').attr('content') || 
                    $('time[datetime]').attr('datetime') || '',
      type: $('meta[property="og:type"]').attr('content') || 'website',
      siteName: $('meta[property="og:site_name"]').attr('content') || '',
      canonical: $('link[rel="canonical"]').attr('href') || ''
    };
  }

  cleanText(text) {
    if (!text) return '';
    
    const maxTextLength = 150000; // 150KB limite para texto limpo
    
    let cleanedText = text
      // Normalizar espaços em branco
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .replace(/\t+/g, ' ')
      
      // Remover caracteres especiais problemáticos, mas manter pontuação essencial
      .replace(/[^\w\s\-.,!?;:()\[\]"'/\n\u00C0-\u017F]/g, '')
      
      // Remover múltiplas pontuações seguidas
      .replace(/[.]{3,}/g, '...')
      .replace(/[!]{2,}/g, '!')
      .replace(/[?]{2,}/g, '?')
      
      // Remover linhas muito curtas ou suspeitas
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 10 && 
               !trimmed.match(/^[\d\s\-_.]+$/) && // Não apenas números/símbolos
               !trimmed.match(/^(home|menu|login|search|contact|about)$/i); // Não apenas palavras de navegação
      })
      .join('\n')
      
      .trim();
    
    // Remover frases repetitivas comuns
    const commonPhrases = [
      'clique aqui', 'leia mais', 'saiba mais', 'continue lendo',
      'click here', 'read more', 'learn more', 'continue reading'
    ];
    
    commonPhrases.forEach(phrase => {
      const regex = new RegExp(phrase, 'gi');
      cleanedText = cleanedText.replace(regex, '');
    });
    
    // Truncar se muito grande
    if (cleanedText.length > maxTextLength) {
      // Truncar em uma frase completa
      const truncated = cleanedText.substring(0, maxTextLength);
      const lastSentence = truncated.lastIndexOf('.');
      
      if (lastSentence > maxTextLength * 0.8) {
        cleanedText = truncated.substring(0, lastSentence + 1);
      } else {
        cleanedText = truncated + '...';
      }
    }
    
    return cleanedText;
  }

  async validateUrls(urls) {
    const validUrls = [];
    const promises = urls.map(async (url) => {
      try {
        if (!validateUrl(url)) {
          logger.warn(`Invalid URL format: ${url}`);
          return null;
        }
        
        // Verificar se o domínio não está em lista negra
        if (this.isBlacklistedDomain(url)) {
          logger.warn(`Blacklisted domain: ${url}`);
          return null;
        }
        
        // Quick HEAD request para verificar acessibilidade
        const response = await axios.head(url, {
          timeout: 5000,
          maxRedirects: 3,
          headers: {
            'User-Agent': this.getRandomUserAgent()
          },
          // Ser mais tolerante com códigos de status
          validateStatus: (status) => status >= 200 && status < 500
        });
        
        if (response.status >= 200 && response.status < 400) {
          const contentType = response.headers['content-type'] || '';
          if (contentType.includes('text/html') || contentType.includes('text/plain') || !contentType) {
            return url;
          } else {
            logger.warn(`Non-HTML content type for ${url}: ${contentType}`);
          }
        } else if (response.status >= 400 && response.status < 500) {
          // Para códigos 4xx, tentar mesmo assim (pode ser proteção anti-bot no HEAD)
          logger.info(`Status ${response.status} for ${url}, will try scraping anyway`);
          return url;
        }
        
        return null;
        
      } catch (error) {
        // Se HEAD falhou, pode ser que o site não aceite HEAD requests
        // Vamos tentar mesmo assim para alguns tipos de erro
        if (error.code === 'ECONNABORTED' || 
            error.response?.status === 405 || // Method Not Allowed
            error.response?.status === 403) { // Forbidden (pode aceitar GET)
          logger.info(`HEAD failed for ${url}, will try GET anyway`);
          return url;
        }
        
        logger.warn(`URL validation failed for ${url}:`, {
          status: error.response?.status,
          message: error.message
        });
        return null;
      }
    });
    
    const results = await Promise.allSettled(promises);
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        validUrls.push(result.value);
      }
    });
    
    logger.info(`URL validation: ${validUrls.length}/${urls.length} valid URLs`);
    return validUrls;
  }

  isBlacklistedDomain(url) {
    const blacklistedDomains = [
      'facebook.com',
      'twitter.com', 
      'x.com',
      'instagram.com',
      'youtube.com',
      'tiktok.com',
      'pinterest.com',
      'linkedin.com',
      'discord.com',
      'reddit.com',
      'amazon.com', // Muitas vezes bloqueia bots
      'mercadolivre.com', // Pode ter anti-bot
      'ebay.com'
    ];
    
    try {
      const domain = new URL(url).hostname.toLowerCase();
      return blacklistedDomains.some(blocked => domain.includes(blocked));
    } catch {
      return true; // Se não conseguir parsear a URL, considerar inválida
    }
  }

  // Método para limpar cache manualmente
  clearCache() {
    this.cache.clear();
    logger.info('Scraper cache cleared');
  }

  // Método para obter estatísticas do scraper
  getStats() {
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      currentUserAgent: this.userAgents[this.currentUserAgentIndex]
    };
  }
}

const scraperService = new WebScraper();
export default scraperService;
