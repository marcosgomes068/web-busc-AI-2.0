import SearchService from '../services/search.js';
import ScraperService from '../services/scraper.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

// Importação direta do objeto AIService
import { default as AIService } from '../services/ai.js';

class SearchEngine {
  async processQuery(query) {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cachedResult = cache.get(query);
      if (cachedResult) {
        return cachedResult;
      }

      logger.info(`Processing query: ${query}`);

      // Step 1: Analyze query with AI
      const analysis = await AIService.analyzeQuery(query);
      logger.info('Query analysis completed');

      // Step 2: Generate keywords
      const keywords = await AIService.generateKeywords(analysis.mainTopic);
      logger.info('Keywords generated');

      // Step 3: Generate search queries
      const searchQueries = SearchService.generateSearchQueries(analysis, keywords);
      logger.info(`Generated ${searchQueries.length} search queries`);

      // Step 4: Execute web search
      const searchResults = await SearchService.search(searchQueries);
      logger.info(`Found ${searchResults.length} search results`);

      if (searchResults.length === 0) {
        throw new Error('No search results found');
      }

      // Step 5: Extract URLs from search results and validate
      const searchUrls = searchResults.map(result => result.link || result.url).filter(Boolean);
      const validUrls = await ScraperService.validateUrls(searchUrls);
      const scrapedContent = await ScraperService.scrapeUrls(validUrls);
      logger.info(`Scraped ${scrapedContent.length} pages`);

      // Se não conseguiu extrair conteúdo, usar informações dos resultados de busca
      let contentToAnalyze = scrapedContent;
      if (scrapedContent.length === 0) {
        logger.warn('No content could be scraped, using search result summaries');
        contentToAnalyze = searchResults.map(result => ({
          title: result.title || '',
          text: (result.snippet || result.description || '').substring(0, 1000),
          url: result.link || result.url || '',
          meta: {
            description: result.snippet || result.description || '',
            keywords: '',
            author: '',
            publishedDate: ''
          },
          extractedAt: new Date().toISOString(),
          isSearchResult: true
        }));
        logger.info(`Using ${contentToAnalyze.length} search result summaries`);
      }

      // Step 6: Summarize each page
      const summaries = [];
      for (const content of contentToAnalyze) {
        try {
          const summary = await AIService.summarizeContent(content.text, analysis.mainTopic);
          summaries.push({
            ...summary,
            url: content.url,
            title: content.title
          });
        } catch (error) {
          logger.error(`Failed to summarize content from ${content.url}:`, error);
        }
      }

      logger.info(`Generated ${summaries.length} summaries`);

      // Step 7: Synthesize final response
      const finalResponse = await AIService.synthesizeResponse(summaries, query);
      
      const result = {
        ...finalResponse,
        metadata: {
          query,
          processedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          sourcesFound: searchResults.length,
          sourcesProcessed: scrapedContent.length,
          summariesGenerated: summaries.length,
          analysis,
          keywords
        },
        sources: scrapedContent.map(content => ({
          url: content.url,
          title: content.title,
          snippet: content.text.substring(0, 200) + '...'
        }))
      };

      // Cache the result
      cache.set(query, result);
      
      logger.info(`Query processed successfully in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      logger.error('Query processing failed:', error);
      
      return {
        response: `Desculpe, não foi possível processar sua consulta: "${query}". ${error.message}`,
        sections: [],
        sources: [],
        confidence: 0,
        metadata: {
          query,
          processedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          error: error.message
        }
      };
    }
  }

  async getHealthStatus() {
    try {
      // Test AI service
      await AIService.analyzeQuery('test query');
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        cache: cache.getStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

export default new SearchEngine();
