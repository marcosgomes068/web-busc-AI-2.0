import axios from 'axios';
import stringSimilarity from 'string-similarity';
import { CONFIG } from '../config.js';
import { RateLimiter, retry, extractDomain } from '../utils/helpers.js';
import logger from '../utils/logger.js';

class SearchService {
  constructor() {
    this.rateLimiter = new RateLimiter(CONFIG.api.webRateLimit);
    this.excludedDomains = new Set(CONFIG.filtering.excludeDomains);
    this.paywallDomains = new Set(CONFIG.filtering.paywallDomains);
  }

  async search(queries) {
    const allResults = [];
    
    for (const query of queries) {
      try {
        const results = await this.executeSearch(query);
        allResults.push(...results);
      } catch (error) {
        logger.error(`Search failed for query: ${query}`, error);
      }
    }

    return this.processResults(allResults);
  }

  async executeSearch(query) {
    return await this.rateLimiter.execute(async () => {
      const response = await retry(async () => {
        return await axios.post('https://google.serper.dev/search', {
          q: query,
          num: CONFIG.search.resultsPerQuery,
          gl: CONFIG.search.region,
          hl: CONFIG.search.language
        }, {
          headers: {
            'X-API-KEY': CONFIG.api.serper,
            'Content-Type': 'application/json'
          },
          timeout: CONFIG.system.timeoutRequests
        });
      });

      logger.info(`Search completed for: ${query}`);
      return response.data.organic || [];
    });
  }

  processResults(results) {
    const filtered = this.filterResults(results);
    const deduped = this.removeDuplicates(filtered);
    const scored = this.scoreResults(deduped);
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, CONFIG.system.maxPagesToAnalyze);
  }

  filterResults(results) {
    return results.filter(result => {
      const domain = extractDomain(result.link);
      
      if (!domain) return false;
      if (this.excludedDomains.has(domain)) return false;
      if (this.paywallDomains.has(domain)) return false;
      if (!result.link.startsWith('http')) return false;
      if (result.link.includes('.pdf')) return false;
      
      return true;
    });
  }

  removeDuplicates(results) {
    const seen = new Set();
    const unique = [];
    
    for (const result of results) {
      const domain = extractDomain(result.link);
      const domainCount = unique.filter(r => extractDomain(r.link) === domain).length;
      
      if (domainCount >= CONFIG.filtering.maxUrlsPerDomain) continue;
      
      const isDuplicate = unique.some(existing => 
        stringSimilarity.compareTwoStrings(result.title, existing.title) > 0.9
      );
      
      if (!isDuplicate && !seen.has(result.link)) {
        seen.add(result.link);
        unique.push(result);
      }
    }
    
    return unique;
  }

  scoreResults(results) {
    return results.map(result => {
      const domain = extractDomain(result.link);
      let score = 0;
      
      // Domain authority
      if (domain.endsWith('.edu') || domain.endsWith('.gov')) score += 30;
      if (domain.endsWith('.org')) score += 20;
      if (domain.includes('wiki')) score += 25;
      
      // HTTPS preference
      if (result.link.startsWith('https://')) score += 10;
      
      // Title relevance (basic)
      if (result.title) {
        score += Math.min(result.title.length / 10, 20);
      }
      
      // Snippet relevance
      if (result.snippet) {
        score += Math.min(result.snippet.length / 20, 15);
      }
      
      return { ...result, score };
    });
  }

  generateSearchQueries(analysis, keywords) {
    const queries = [];
    
    // Main query
    queries.push(analysis.mainTopic);
    
    // Keyword combinations
    if (keywords.primary) {
      queries.push(keywords.primary.join(' '));
    }
    
    // Specific query
    if (analysis.intentType === 'question') {
      queries.push(`"${analysis.mainTopic}" respostas`);
    }
    
    // English query if relevant
    if (keywords.english && keywords.english.length > 0) {
      queries.push(keywords.english.join(' '));
    }
    
    return queries.slice(0, 4); // Limit to avoid rate limits
  }
}

export default new SearchService();
