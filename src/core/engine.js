import SearchService from '../services/search.js';
import ScraperService from '../services/scraper.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import { default as AIService } from '../services/ai.js';

const NO_SEARCH_RESULTS_ERROR = 'No search results found';
const SCRAPING_FALLBACK_WARNING = 'No content could be scraped, using search result summaries';
const CONTENT_SUMMARY_FAILURE_PREFIX = 'Failed to summarize content from';
const QUERY_PROCESSING_FAILURE_PREFIX = 'Desculpe, não foi possível processar sua consulta:';
const CONTENT_TRUNCATION_LIMIT = 1000;
const SNIPPET_TRUNCATION_LIMIT = 200;
const SNIPPET_SUFFIX = '...';

/**
 * Main search engine that orchestrates query processing, content retrieval,
 * and AI-powered response generation
 */
class SearchEngine {
  /**
   * Processes a user query through the complete search and analysis pipeline
   */
  async processQuery(query) {
    const processingStartTime = Date.now();
    
    try {
      const cachedResult = this.getCachedResult(query);
      if (cachedResult) {
        return cachedResult;
      }

      logger.info(`Processing query: ${query}`);

      const analysis = await this.analyzeUserQuery(query);
      const keywords = await this.generateSearchKeywords(analysis.mainTopic);
      const searchQueries = this.generateSearchQueries(analysis, keywords);
      const searchResults = await this.executeWebSearch(searchQueries);

      this.validateSearchResults(searchResults);

      const contentToAnalyze = await this.retrieveAndValidateContent(searchResults);
      const contentSummaries = await this.generateContentSummaries(contentToAnalyze, analysis.mainTopic);
      const finalResponse = await this.synthesizeFinalResponse(contentSummaries, query);
      
      const result = this.buildResultObject(
        finalResponse,
        query,
        processingStartTime,
        searchResults,
        contentToAnalyze,
        contentSummaries,
        analysis,
        keywords
      );

      this.cacheResult(query, result);
      this.logSuccessfulProcessing(processingStartTime);
      
      return result;

    } catch (error) {
      return this.handleQueryProcessingError(error, query, processingStartTime);
    }
  }

  /**
   * Retrieves cached result for the given query
   */
  getCachedResult(query) {
    return cache.get(query);
  }

  /**
   * Analyzes user query using AI service
   */
  async analyzeUserQuery(query) {
    const analysis = await AIService.analyzeQuery(query);
    logger.info('Query analysis completed');
    return analysis;
  }

  /**
   * Generates search keywords from the main topic
   */
  async generateSearchKeywords(mainTopic) {
    const keywords = await AIService.generateKeywords(mainTopic);
    logger.info('Keywords generated');
    return keywords;
  }

  /**
   * Generates search queries from analysis and keywords
   */
  generateSearchQueries(analysis, keywords) {
    const searchQueries = SearchService.generateSearchQueries(analysis, keywords);
    logger.info(`Generated ${searchQueries.length} search queries`);
    return searchQueries;
  }

  /**
   * Executes web search using generated queries
   */
  async executeWebSearch(searchQueries) {
    const searchResults = await SearchService.search(searchQueries);
    logger.info(`Found ${searchResults.length} search results`);
    return searchResults;
  }

  /**
   * Validates that search results were found
   */
  validateSearchResults(searchResults) {
    if (searchResults.length === 0) {
      throw new Error(NO_SEARCH_RESULTS_ERROR);
    }
  }

  /**
   * Retrieves and validates content from search results
   */
  async retrieveAndValidateContent(searchResults) {
    const searchUrls = this.extractUrlsFromSearchResults(searchResults);
    const validUrls = await ScraperService.validateUrls(searchUrls);
    const scrapedContent = await ScraperService.scrapeUrls(validUrls);
    
    logger.info(`Scraped ${scrapedContent.length} pages`);

    return scrapedContent.length > 0 
      ? scrapedContent 
      : this.createFallbackContentFromSearchResults(searchResults);
  }

  /**
   * Extracts URLs from search results
   */
  extractUrlsFromSearchResults(searchResults) {
    return searchResults
      .map(result => result.link || result.url)
      .filter(Boolean);
  }

  /**
   * Creates fallback content when scraping fails
   */
  createFallbackContentFromSearchResults(searchResults) {
    logger.warn(SCRAPING_FALLBACK_WARNING);
    
    const fallbackContent = searchResults.map(result => ({
      title: result.title || '',
      text: this.truncateText(result.snippet || result.description || '', CONTENT_TRUNCATION_LIMIT),
      url: result.link || result.url || '',
      meta: this.createFallbackMetadata(result),
      extractedAt: new Date().toISOString(),
      isSearchResult: true
    }));

    logger.info(`Using ${fallbackContent.length} search result summaries`);
    return fallbackContent;
  }

  /**
   * Truncates text to specified limit
   */
  truncateText(text, limit) {
    return text.substring(0, limit);
  }

  /**
   * Creates fallback metadata for search results
   */
  createFallbackMetadata(result) {
    return {
      description: result.snippet || result.description || '',
      keywords: '',
      author: '',
      publishedDate: ''
    };
  }
  /**
   * Generates summaries for all content pieces
   */
  async generateContentSummaries(contentToAnalyze, mainTopic) {
    const summaries = [];
    
    for (const content of contentToAnalyze) {
      try {
        const summary = await this.generateSingleContentSummary(content, mainTopic);
        summaries.push(summary);
      } catch (error) {
        this.logSummaryError(content.url, error);
      }
    }

    logger.info(`Generated ${summaries.length} summaries`);
    return summaries;
  }

  /**
   * Generates summary for a single content piece
   */
  async generateSingleContentSummary(content, mainTopic) {
    const summary = await AIService.summarizeContent(content.text, mainTopic);
    return {
      ...summary,
      url: content.url,
      title: content.title
    };
  }

  /**
   * Logs error when content summarization fails
   */
  logSummaryError(url, error) {
    logger.error(`${CONTENT_SUMMARY_FAILURE_PREFIX} ${url}:`, error);
  }

  /**
   * Synthesizes final response from content summaries
   */
  async synthesizeFinalResponse(summaries, query) {
    return await AIService.synthesizeResponse(summaries, query);
  }

  /**
   * Builds the complete result object
   */
  buildResultObject(finalResponse, query, startTime, searchResults, scrapedContent, summaries, analysis, keywords) {
    return {
      ...finalResponse,
      metadata: this.createMetadata(query, startTime, searchResults, scrapedContent, summaries, analysis, keywords),
      sources: this.createSourcesInfo(scrapedContent)
    };
  }

  /**
   * Creates metadata object for the result
   */
  createMetadata(query, startTime, searchResults, scrapedContent, summaries, analysis, keywords) {
    return {
      query,
      processedAt: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      sourcesFound: searchResults.length,
      sourcesProcessed: scrapedContent.length,
      summariesGenerated: summaries.length,
      analysis,
      keywords
    };
  }

  /**
   * Creates sources information for the result
   */
  createSourcesInfo(scrapedContent) {
    return scrapedContent.map(content => ({
      url: content.url,
      title: content.title,
      snippet: this.createSnippet(content.text)
    }));
  }

  /**
   * Creates a snippet from content text
   */
  createSnippet(text) {
    return text.substring(0, SNIPPET_TRUNCATION_LIMIT) + SNIPPET_SUFFIX;
  }

  /**
   * Caches the result for future queries
   */
  cacheResult(query, result) {
    cache.set(query, result);
  }

  /**
   * Logs successful processing completion
   */
  logSuccessfulProcessing(startTime) {
    logger.info(`Query processed successfully in ${Date.now() - startTime}ms`);
  }

  /**
   * Handles errors during query processing
   */
  handleQueryProcessingError(error, query, startTime) {
    logger.error('Query processing failed:', error);
    
    return {
      response: `${QUERY_PROCESSING_FAILURE_PREFIX} "${query}". ${error.message}`,
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

  /**
   * Checks the health status of all system components
   */
  async getHealthStatus() {
    try {
      await this.performHealthCheck();
      return this.createHealthyStatus();
    } catch (error) {
      return this.createUnhealthyStatus(error);
    }
  }

  /**
   * Performs a basic health check by testing AI service
   */
  async performHealthCheck() {
    await AIService.analyzeQuery('test query');
  }

  /**
   * Creates a healthy status response
   */
  createHealthyStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      cache: cache.getStats()
    };
  }

  /**
   * Creates an unhealthy status response
   */
  createUnhealthyStatus(error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

export default new SearchEngine();
