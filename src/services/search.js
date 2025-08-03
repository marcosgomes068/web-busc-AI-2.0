import axios from 'axios';
import stringSimilarity from 'string-similarity';
import { CONFIG } from '../config.js';
import { RateLimiter, retry, extractDomain } from '../utils/helpers.js';
import logger from '../utils/logger.js';

const SERPER_SEARCH_ENDPOINT = 'https://google.serper.dev/search';
const CONTENT_TYPE_JSON = 'application/json';
const HTTPS_PROTOCOL = 'https://';
const HTTP_PROTOCOL = 'http';
const PDF_EXTENSION = '.pdf';
const DUPLICATE_TITLE_THRESHOLD = 0.9;
const MAX_SEARCH_QUERIES = 4;

const DOMAIN_SCORES = {
  EDUCATION: 30,
  GOVERNMENT: 30,
  ORGANIZATION: 20,
  WIKI: 25,
  HTTPS_BONUS: 10
};

const CONTENT_SCORING = {
  TITLE_DIVISOR: 10,
  TITLE_MAX_SCORE: 20,
  SNIPPET_DIVISOR: 20,
  SNIPPET_MAX_SCORE: 15
};

/**
 * Search service that handles web search operations, result filtering,
 * deduplication, and relevance scoring
 */
class SearchService {
  constructor() {
    this.rateLimiter = new RateLimiter(CONFIG.api.webRateLimit);
    this.excludedDomains = new Set(CONFIG.filtering.excludeDomains);
    this.paywallDomains = new Set(CONFIG.filtering.paywallDomains);
  }

  /**
   * Executes search for multiple queries and processes results
   */
  async search(queries) {
    const allSearchResults = [];
    
    for (const query of queries) {
      try {
        const queryResults = await this.executeSearchForQuery(query);
        allSearchResults.push(...queryResults);
      } catch (error) {
        this.logSearchError(query, error);
      }
    }

    return this.processSearchResults(allSearchResults);
  }

  /**
   * Executes search for a single query
   */
  async executeSearchForQuery(query) {
    return await this.rateLimiter.execute(async () => {
      const searchResponse = await this.performSearchRequest(query);
      this.logSearchCompletion(query);
      return searchResponse.data.organic || [];
    });
  }

  /**
   * Performs the actual search API request with retry logic
   */
  async performSearchRequest(query) {
    return await retry(async () => {
      return await axios.post(SERPER_SEARCH_ENDPOINT, 
        this.createSearchRequestBody(query),
        this.createSearchRequestConfig()
      );
    });
  }

  /**
   * Creates the request body for search API
   */
  createSearchRequestBody(query) {
    return {
      q: query,
      num: CONFIG.search.resultsPerQuery,
      gl: CONFIG.search.region,
      hl: CONFIG.search.language
    };
  }

  /**
   * Creates the request configuration for search API
   */
  createSearchRequestConfig() {
    return {
      headers: {
        'X-API-KEY': CONFIG.api.serper,
        'Content-Type': CONTENT_TYPE_JSON
      },
      timeout: CONFIG.system.timeoutRequests
    };
  }

  /**
   * Processes search results through filtering, deduplication, and scoring
   */
  processSearchResults(results) {
    const filteredResults = this.filterInvalidResults(results);
    const deduplicatedResults = this.removeDuplicateResults(filteredResults);
    const scoredResults = this.assignRelevanceScores(deduplicatedResults);
    
    return this.sortAndLimitResults(scoredResults);
  }

  /**
   * Sorts results by score and applies limit
   */
  sortAndLimitResults(results) {
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, CONFIG.system.maxPagesToAnalyze);
  }

  /**
   * Filters out invalid or unwanted search results
   */
  filterInvalidResults(results) {
    return results.filter(result => this.isValidSearchResult(result));
  }

  /**
   * Validates if a search result meets quality criteria
   */
  isValidSearchResult(result) {
    const domain = extractDomain(result.link);
    
    return this.hasValidDomain(domain) &&
           this.isAllowedDomain(domain) &&
           this.isValidUrl(result.link) &&
           this.isNotPdfFile(result.link);
  }

  /**
   * Checks if domain is valid
   */
  hasValidDomain(domain) {
    return domain !== null;
  }

  /**
   * Checks if domain is not in excluded or paywall lists
   */
  isAllowedDomain(domain) {
    return !this.excludedDomains.has(domain) && !this.paywallDomains.has(domain);
  }

  /**
   * Validates URL format
   */
  isValidUrl(url) {
    return url.startsWith(HTTP_PROTOCOL);
  }

  /**
   * Checks if URL is not a PDF file
   */
  isNotPdfFile(url) {
    return !url.includes(PDF_EXTENSION);
  }

  /**
   * Removes duplicate search results based on URL and title similarity
   */
  removeDuplicateResults(results) {
    const seenUrls = new Set();
    const uniqueResults = [];
    
    for (const result of results) {
      if (this.shouldIncludeResult(result, uniqueResults, seenUrls)) {
        seenUrls.add(result.link);
        uniqueResults.push(result);
      }
    }
    
    return uniqueResults;
  }

  /**
   * Determines if a result should be included based on deduplication rules
   */
  shouldIncludeResult(result, existingResults, seenUrls) {
    return this.isWithinDomainLimit(result, existingResults) &&
           this.isNotDuplicateTitle(result, existingResults) &&
           this.isUniqueUrl(result.link, seenUrls);
  }

  /**
   * Checks if adding this result would exceed domain limit
   */
  isWithinDomainLimit(result, existingResults) {
    const resultDomain = extractDomain(result.link);
    const domainCount = this.countResultsFromDomain(existingResults, resultDomain);
    return domainCount < CONFIG.filtering.maxUrlsPerDomain;
  }

  /**
   * Counts existing results from the same domain
   */
  countResultsFromDomain(results, targetDomain) {
    return results.filter(r => extractDomain(r.link) === targetDomain).length;
  }

  /**
   * Checks if title is not too similar to existing results
   */
  isNotDuplicateTitle(result, existingResults) {
    return !existingResults.some(existing => 
      stringSimilarity.compareTwoStrings(result.title, existing.title) > DUPLICATE_TITLE_THRESHOLD
    );
  }

  /**
   * Checks if URL hasn't been seen before
   */
  isUniqueUrl(url, seenUrls) {
    return !seenUrls.has(url);
  }

  /**
   * Assigns relevance scores to search results
   */
  assignRelevanceScores(results) {
    return results.map(result => ({
      ...result,
      score: this.calculateRelevanceScore(result)
    }));
  }

  /**
   * Calculates relevance score for a single result
   */
  calculateRelevanceScore(result) {
    let score = 0;
    
    score += this.calculateDomainAuthorityScore(result.link);
    score += this.calculateProtocolScore(result.link);
    score += this.calculateContentScore(result);
    
    return score;
  }

  /**
   * Calculates score based on domain authority
   */
  calculateDomainAuthorityScore(url) {
    const domain = extractDomain(url);
    
    if (this.isEducationalOrGovernmentDomain(domain)) {
      return DOMAIN_SCORES.EDUCATION;
    }
    
    if (this.isOrganizationDomain(domain)) {
      return DOMAIN_SCORES.ORGANIZATION;
    }
    
    if (this.isWikiDomain(domain)) {
      return DOMAIN_SCORES.WIKI;
    }
    
    return 0;
  }

  /**
   * Checks if domain is educational or governmental
   */
  isEducationalOrGovernmentDomain(domain) {
    return domain.endsWith('.edu') || domain.endsWith('.gov');
  }

  /**
   * Checks if domain is organizational
   */
  isOrganizationDomain(domain) {
    return domain.endsWith('.org');
  }

  /**
   * Checks if domain contains wiki
   */
  isWikiDomain(domain) {
    return domain.includes('wiki');
  }

  /**
   * Calculates score based on protocol security
   */
  calculateProtocolScore(url) {
    return url.startsWith(HTTPS_PROTOCOL) ? DOMAIN_SCORES.HTTPS_BONUS : 0;
  }

  /**
   * Calculates score based on content quality indicators
   */
  calculateContentScore(result) {
    let contentScore = 0;
    
    if (result.title) {
      const titleScore = Math.min(
        result.title.length / CONTENT_SCORING.TITLE_DIVISOR, 
        CONTENT_SCORING.TITLE_MAX_SCORE
      );
      contentScore += titleScore;
    }
    
    if (result.snippet) {
      const snippetScore = Math.min(
        result.snippet.length / CONTENT_SCORING.SNIPPET_DIVISOR, 
        CONTENT_SCORING.SNIPPET_MAX_SCORE
      );
      contentScore += snippetScore;
    }
    
    return contentScore;
  }

  /**
   * Generates search queries from analysis and keywords
   */
  generateSearchQueries(analysis, keywords) {
    const queries = [];
    
    this.addMainTopicQuery(queries, analysis);
    this.addKeywordQuery(queries, keywords);
    this.addSpecificQuery(queries, analysis);
    this.addEnglishQuery(queries, keywords);
    
    return queries.slice(0, MAX_SEARCH_QUERIES);
  }

  /**
   * Adds main topic as a search query
   */
  addMainTopicQuery(queries, analysis) {
    queries.push(analysis.mainTopic);
  }

  /**
   * Adds primary keywords as a search query
   */
  addKeywordQuery(queries, keywords) {
    if (keywords.primary) {
      queries.push(keywords.primary.join(' '));
    }
  }

  /**
   * Adds specific query based on intent type
   */
  addSpecificQuery(queries, analysis) {
    if (analysis.intentType === 'question') {
      queries.push(`"${analysis.mainTopic}" respostas`);
    }
  }

  /**
   * Adds English keywords as a search query
   */
  addEnglishQuery(queries, keywords) {
    if (keywords.english && keywords.english.length > 0) {
      queries.push(keywords.english.join(' '));
    }
  }

  /**
   * Logs search error for a specific query
   */
  logSearchError(query, error) {
    logger.error(`Search failed for query: ${query}`, error);
  }

  /**
   * Logs successful search completion
   */
  logSearchCompletion(query) {
    logger.info(`Search completed for: ${query}`);
  }
}

export default new SearchService();
