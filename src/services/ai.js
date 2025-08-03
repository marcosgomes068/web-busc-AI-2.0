class AIService {
  constructor() {
    this.flaskServiceUrl = 'http://localhost:5000';
    this.serviceAvailable = false;
  }

  async analyzeQuery(query) {
    return this.fallbackAnalysis(query);
  }

  async generateKeywords(topic) {
    return this.fallbackKeywords(topic);
  }

  async summarizeContent(content, topic) {
    return this.fallbackSummary(content);
  }

  async synthesizeResponse(summaries, originalQuery) {
    return this.fallbackResponse(summaries, originalQuery);
  }

  async analyzeSourceQuality(url, content) {
    return 7.0;
  }

  fallbackAnalysis(query) {
    // Limite de tamanho da consulta para evitar erros
    const limitedQuery = query.length > 200 ? query.substring(0, 200) : query;
    const keywords = limitedQuery.toLowerCase().split(' ').filter(word => word.length > 2 && word.length < 50);
    
    return {
      mainTopic: limitedQuery,
      subtopics: keywords.slice(0, 3),
      intentType: 'general',
      keywords: keywords.slice(0, 5),
      context: 'atual',
      fallback: true
    };
  }

  fallbackKeywords(topic) {
    // Limite de tamanho do tópico e palavras
    const limitedTopic = topic.length > 100 ? topic.substring(0, 100) : topic;
    const words = limitedTopic.toLowerCase().split(' ').filter(word => word.length > 2 && word.length < 30);
    
    return {
      primary: words.slice(0, 2),
      related: words.slice(2, 4),
      synonyms: [],
      english: [],
      fallback: true
    };
  }

  fallbackSummary(content) {
    // Limite de tamanho do conteúdo para evitar sobrecarga
    const maxContentLength = 10000; // 10KB de conteúdo
    const limitedContent = content.length > maxContentLength ? 
      content.substring(0, maxContentLength) + '...' : content;
    
    // Se o conteúdo é muito pequeno (provavelmente de snippet de busca), usar o que tem
    if (limitedContent.length < 50) {
      return {
        summary: limitedContent || 'Informação não disponível.',
        keyPoints: [limitedContent || 'Conteúdo limitado disponível.'],
        entities: [],
        data: [],
        reliability: 3,
        fallback: true,
        isSnippet: true
      };
    }
    
    const sentences = limitedContent.split('.').filter(s => s.trim().length > 10 && s.trim().length < 500);
    const maxSentences = 5; // Máximo 5 sentenças
    
    return {
      summary: sentences.length > 0 ? sentences.slice(0, 3).join('. ') + '.' : limitedContent,
      keyPoints: sentences.slice(0, Math.min(maxSentences, sentences.length)),
      entities: [],
      data: [],
      reliability: sentences.length > 2 ? 5 : 3,
      fallback: true
    };
  }

  fallbackResponse(summaries, query) {
    // Limite de número de resumos e tamanho da resposta
    const maxSummaries = 10;
    const limitedSummaries = summaries.slice(0, maxSummaries);
    const maxQueryLength = 200;
    const limitedQuery = query.length > maxQueryLength ? query.substring(0, maxQueryLength) : query;
    
    const combinedContent = limitedSummaries
      .map(s => s.summary || '')
      .filter(s => s.length > 0)
      .join(' ');
    
    // Verificar se temos snippets de busca
    const hasSnippets = limitedSummaries.some(s => s.isSnippet);
    
    // Gerar resposta no estilo ChatGPT
    const response = this.generateChatGPTStyleResponse(limitedQuery, combinedContent, limitedSummaries, hasSnippets);
    
    // Criar seções estruturadas
    const sections = this.createStructuredSections(limitedSummaries, combinedContent, hasSnippets);
    
    return {
      response: response,
      sections: sections,
      sources: limitedSummaries.map((s, index) => ({
        id: index + 1,
        title: s.title || `Fonte ${index + 1}`,
        url: s.url || '',
        snippet: (s.summary || '').substring(0, 200) + '...'
      })),
      confidence: hasSnippets ? 3.0 : 5.0,
      fallback: true,
      hasSnippets: hasSnippets
    };
  }

  generateChatGPTStyleResponse(query, content, summaries, hasSnippets) {
    // Analisar o tipo de pergunta
    const questionType = this.analyzeQuestionType(query);
    
    // Extrair informações principais do conteúdo
    const keyInfo = this.extractKeyInformation(content, summaries);
    
    // Gerar introdução baseada no tipo de pergunta
    let introduction = this.generateIntroduction(query, questionType, hasSnippets);
    
    // Gerar corpo da resposta com mais detalhes
    let mainContent = this.generateDetailedMainContent(keyInfo, questionType, query, summaries);
    
    // Gerar seções específicas baseadas no conteúdo
    let additionalSections = this.generateAdditionalSections(keyInfo, summaries, questionType);
    
    // Gerar conclusão se apropriado
    let conclusion = this.generateDetailedConclusion(questionType, keyInfo, summaries);
    
    // Construir resposta final mais robusta
    let response = introduction;
    if (mainContent) response += '\n\n' + mainContent;
    if (additionalSections) response += '\n\n' + additionalSections;
    if (conclusion) response += '\n\n' + conclusion;
    
    // Limitar tamanho da resposta final (aumentado para respostas mais completas)
    const maxResponseLength = 4000; // Aumentado de 2000 para 4000
    if (response.length > maxResponseLength) {
      response = response.substring(0, maxResponseLength - 3) + '...';
    }
    
    return response;
  }

  generateDetailedMainContent(keyInfo, questionType, query, summaries) {
    let content = '';
    
    // Extrair mais informações dos resumos
    const detailedInfo = this.extractDetailedInformation(summaries);
    
    // Construir resposta baseada no tipo de pergunta
    switch (questionType) {
      case 'definition':
        content = this.buildDefinitionResponse(detailedInfo, keyInfo);
        break;
      case 'historical':
        content = this.buildHistoricalResponse(detailedInfo, keyInfo);
        break;
      case 'how-to':
        content = this.buildHowToResponse(detailedInfo, keyInfo);
        break;
      case 'explanation':
        content = this.buildExplanationResponse(detailedInfo, keyInfo);
        break;
      default:
        content = this.buildGeneralResponse(detailedInfo, keyInfo);
    }
    
    return content;
  }

  extractDetailedInformation(summaries) {
    const info = {
      mainDefinition: '',
      keyFacts: [],
      historicalData: [],
      technicalDetails: [],
      currentEvents: [],
      statistics: [],
      comparisons: [],
      benefits: [],
      challenges: []
    };
    
    summaries.forEach(summary => {
      if (!summary.summary) return;
      
      const text = summary.summary;
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
      
      sentences.forEach(sentence => {
        const lower = sentence.toLowerCase().trim();
        
        // Definição principal (primeira sentença substancial)
        if (!info.mainDefinition && sentence.length > 30) {
          info.mainDefinition = sentence.trim();
        }
        
        // Fatos históricos
        if (lower.includes('criado') || lower.includes('fundado') || lower.includes('inventado') || 
            lower.includes('começou') || lower.includes('origem') || /\d{4}/.test(lower)) {
          info.historicalData.push(sentence.trim());
        }
        
        // Fatos técnicos
        if (lower.includes('contém') || lower.includes('ingrediente') || lower.includes('feito') ||
            lower.includes('composto') || lower.includes('produzido')) {
          info.technicalDetails.push(sentence.trim());
        }
        
        // Estatísticas e números
        if (/\d+/.test(lower) && (lower.includes('%') || lower.includes('milhão') || 
            lower.includes('bilhão') || lower.includes('mil'))) {
          info.statistics.push(sentence.trim());
        }
        
        // Eventos atuais
        if (lower.includes('2024') || lower.includes('2025') || lower.includes('recente') ||
            lower.includes('novo') || lower.includes('lançou') || lower.includes('anunciou')) {
          info.currentEvents.push(sentence.trim());
        }
        
        // Comparações
        if (lower.includes('compared') || lower.includes('vs') || lower.includes('versus') ||
            lower.includes('diferente') || lower.includes('similar') || lower.includes('rival')) {
          info.comparisons.push(sentence.trim());
        }
        
        // Benefícios
        if (lower.includes('benefício') || lower.includes('vantagem') || lower.includes('melhora') ||
            lower.includes('ajuda') || lower.includes('útil')) {
          info.benefits.push(sentence.trim());
        }
        
        // Outros fatos importantes
        if (lower.includes('é') || lower.includes('são') || lower.includes('possui') ||
            lower.includes('tem') || lower.includes('caracteriza')) {
          info.keyFacts.push(sentence.trim());
        }
      });
    });
    
    // Limitar arrays para evitar repetição excessiva
    Object.keys(info).forEach(key => {
      if (Array.isArray(info[key])) {
        info[key] = [...new Set(info[key])].slice(0, 5); // Remove duplicatas e limita a 5 itens
      }
    });
    
    return info;
  }

  buildDefinitionResponse(detailedInfo, keyInfo) {
    let response = '';
    
    if (detailedInfo.mainDefinition) {
      response += detailedInfo.mainDefinition;
    }
    
    if (detailedInfo.keyFacts.length > 0) {
      response += '\n\n**Características principais:**\n';
      detailedInfo.keyFacts.slice(0, 3).forEach(fact => {
        response += `• ${fact}\n`;
      });
    }
    
    if (detailedInfo.technicalDetails.length > 0) {
      response += '\n**Detalhes técnicos:**\n';
      detailedInfo.technicalDetails.slice(0, 2).forEach(detail => {
        response += `• ${detail}\n`;
      });
    }
    
    if (detailedInfo.statistics.length > 0) {
      response += '\n**Dados e estatísticas:**\n';
      detailedInfo.statistics.slice(0, 2).forEach(stat => {
        response += `• ${stat}\n`;
      });
    }
    
    return response;
  }

  buildHistoricalResponse(detailedInfo, keyInfo) {
    let response = '';
    
    if (detailedInfo.mainDefinition) {
      response += detailedInfo.mainDefinition;
    }
    
    if (detailedInfo.historicalData.length > 0) {
      response += '\n\n**História e origem:**\n';
      detailedInfo.historicalData.forEach(data => {
        response += `• ${data}\n`;
      });
    }
    
    if (detailedInfo.currentEvents.length > 0) {
      response += '\n**Desenvolvimentos recentes:**\n';
      detailedInfo.currentEvents.slice(0, 2).forEach(event => {
        response += `• ${event}\n`;
      });
    }
    
    return response;
  }

  buildGeneralResponse(detailedInfo, keyInfo) {
    let response = '';
    
    if (detailedInfo.mainDefinition) {
      response += detailedInfo.mainDefinition;
    }
    
    // Adicionar seções com base no que está disponível
    const sections = [
      { data: detailedInfo.keyFacts, title: 'Informações principais', limit: 3 },
      { data: detailedInfo.historicalData, title: 'Contexto histórico', limit: 2 },
      { data: detailedInfo.technicalDetails, title: 'Detalhes técnicos', limit: 2 },
      { data: detailedInfo.currentEvents, title: 'Novidades recentes', limit: 2 },
      { data: detailedInfo.statistics, title: 'Dados relevantes', limit: 2 }
    ];
    
    sections.forEach(section => {
      if (section.data.length > 0) {
        response += `\n\n**${section.title}:**\n`;
        section.data.slice(0, section.limit).forEach(item => {
          response += `• ${item}\n`;
        });
      }
    });
    
    return response;
  }

  buildHowToResponse(detailedInfo, keyInfo) {
    return this.buildGeneralResponse(detailedInfo, keyInfo);
  }

  buildExplanationResponse(detailedInfo, keyInfo) {
    return this.buildGeneralResponse(detailedInfo, keyInfo);
  }

  generateAdditionalSections(keyInfo, summaries, questionType) {
    let sections = '';
    
    // Adicionar comparações se disponíveis
    const detailedInfo = this.extractDetailedInformation(summaries);
    
    if (detailedInfo.comparisons.length > 0) {
      sections += '**Comparações e contexto:**\n';
      detailedInfo.comparisons.slice(0, 2).forEach(comp => {
        sections += `• ${comp}\n`;
      });
      sections += '\n';
    }
    
    if (detailedInfo.benefits.length > 0) {
      sections += '**Aspectos relevantes:**\n';
      detailedInfo.benefits.slice(0, 2).forEach(benefit => {
        sections += `• ${benefit}\n`;
      });
    }
    
    return sections;
  }

  generateDetailedConclusion(questionType, keyInfo, summaries) {
    const detailedInfo = this.extractDetailedInformation(summaries);
    
    if (questionType === 'definition') {
      if (detailedInfo.currentEvents.length > 0) {
        return 'As informações apresentadas refletem o estado atual baseado em fontes atualizadas, incluindo desenvolvimentos recentes no assunto.';
      }
      return 'Esta é uma visão abrangente baseada em múltiplas fontes confiáveis e atualizadas.';
    }
    
    if (questionType === 'historical') {
      return 'Essa linha temporal representa os marcos principais baseados nas fontes históricas consultadas.';
    }
    
    if (detailedInfo.currentEvents.length > 0) {
      return 'As informações incluem tanto contexto histórico quanto desenvolvimentos recentes para uma compreensão completa.';
    }
    
    if (summaries.length > 2) {
      return 'Esta síntese combina informações de múltiplas fontes especializadas para fornecer uma visão completa e atualizada.';
    }
    
    return 'Para informações mais específicas, recomendo consultar as fontes originais listadas abaixo.';
  }

  analyzeQuestionType(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('o que é') || lowerQuery.includes('what is')) {
      return 'definition';
    }
    if (lowerQuery.includes('como') || lowerQuery.includes('how')) {
      return 'how-to';
    }
    if (lowerQuery.includes('quando') || lowerQuery.includes('when')) {
      return 'temporal';
    }
    if (lowerQuery.includes('onde') || lowerQuery.includes('where')) {
      return 'location';
    }
    if (lowerQuery.includes('por que') || lowerQuery.includes('why')) {
      return 'explanation';
    }
    if (lowerQuery.includes('história') || lowerQuery.includes('origin')) {
      return 'historical';
    }
    
    return 'general';
  }

  generateIntroduction(query, questionType, hasSnippets) {
    const sourceContext = hasSnippets ? 
      'Com base nos resultados de busca mais recentes' : 
      'Baseando-me nas informações coletadas de fontes confiáveis';
    
    switch (questionType) {
      case 'definition':
        return `${sourceContext}, posso explicar sobre **${query}**:`;
      case 'how-to':
        return `${sourceContext}, aqui está como **${query}**:`;
      case 'temporal':
        return `${sourceContext}, sobre **${query}**:`;
      case 'location':
        return `${sourceContext}, sobre a localização relacionada a **${query}**:`;
      case 'explanation':
        return `${sourceContext}, posso explicar **${query}**:`;
      case 'historical':
        return `${sourceContext}, sobre a história de **${query}**:`;
      default:
        return `${sourceContext}, sobre **${query}**:`;
    }
  }

  extractKeyInformation(content, summaries) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keyInfo = {
      mainPoints: [],
      facts: [],
      numbers: [],
      dates: [],
      entities: [],
      locations: [],
      organizations: []
    };
    
    // Extrair pontos principais melhorados (primeiras sentenças de cada resumo + contexto)
    summaries.forEach(summary => {
      if (summary.summary) {
        const summaryText = summary.summary;
        const summarySentences = summaryText.split(/[.!?]/).filter(s => s.trim().length > 20);
        
        // Pegar as 2 primeiras sentenças mais substanciais de cada resumo
        summarySentences.slice(0, 2).forEach(sentence => {
          if (sentence.trim().length > 30) {
            keyInfo.mainPoints.push(sentence.trim());
          }
        });
      }
    });
    
    // Extrair fatos importantes com palavras-chave expandidas
    const factKeywords = [
      'é', 'foi', 'são', 'foram', 'possui', 'tem', 'contém', 'criado', 'fundado',
      'inventado', 'desenvolvido', 'produzido', 'fabricado', 'conhecido', 'famoso',
      'caracterizado', 'definido', 'considerado', 'usado', 'utilizado', 'serve',
      'funciona', 'opera', 'atua', 'representa', 'simboliza'
    ];
    
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      if (factKeywords.some(keyword => lowerSentence.includes(keyword))) {
        keyInfo.facts.push(sentence.trim());
      }
    });
    
    // Extrair números e estatísticas mais abrangentes
    const numberPattern = /\d+[.,]?\d*\s*(mil|milhão|milhões|bilhão|bilhões|%|kg|g|metros|anos|reais|dólares|litros|pessoas|usuários|países)/gi;
    const numberMatches = content.match(numberPattern);
    if (numberMatches) {
      keyInfo.numbers = [...new Set(numberMatches)].slice(0, 5);
    }
    
    // Extrair datas mais abrangentes
    const datePattern = /\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2} de \w+ de \d{4}|\w+ de \d{4}|século \w+/gi;
    const dateMatches = content.match(datePattern);
    if (dateMatches) {
      keyInfo.dates = [...new Set(dateMatches)].slice(0, 5);
    }
    
    // Extrair entidades nomeadas (nomes próprios em maiúsculo)
    const entityPattern = /\b[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ][a-záéíóúàèìòùâêîôûãõç]+(?:\s[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ][a-záéíóúàèìòùâêîôûãõç]+)*\b/g;
    const entityMatches = content.match(entityPattern);
    if (entityMatches) {
      // Filtrar entidades relevantes (nomes com mais de 3 caracteres)
      const relevantEntities = entityMatches
        .filter(entity => entity.length > 3 && !['Este', 'Esta', 'Essa', 'Isso', 'Aquele', 'Aquela'].includes(entity))
        .slice(0, 8);
      keyInfo.entities = [...new Set(relevantEntities)];
    }
    
    // Extrair localizações geográficas
    const locationKeywords = ['Brasil', 'Estados Unidos', 'China', 'Japão', 'Europa', 'América', 'São Paulo', 'Rio de Janeiro', 'mundial', 'global', 'internacional'];
    const locationMatches = content.match(/\b(?:Brasil|Estados Unidos|China|Japão|Europa|América|São Paulo|Rio de Janeiro|mundial|global|internacional)\b/gi);
    if (locationMatches) {
      keyInfo.locations = [...new Set(locationMatches.map(l => l.toLowerCase()))].slice(0, 5);
    }
    
    // Extrair organizações e empresas
    const orgPattern = /\b[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ][a-záéíóúàèìòùâêîôûãõç]*(?:Co|Corp|Inc|Ltd|S\.A\.|Ltda|Company|Corporation|Group|International)\b/g;
    const orgMatches = content.match(orgPattern);
    if (orgMatches) {
      keyInfo.organizations = [...new Set(orgMatches)].slice(0, 5);
    }
    
    return keyInfo;
  }

  generateMainContent(keyInfo, questionType, query) {
    // Função de fallback para compatibilidade
    let content = '';
    
    // Pontos principais expandidos
    if (keyInfo.mainPoints.length > 0) {
      const mainPoints = keyInfo.mainPoints.slice(0, 3);
      content += mainPoints.join('. ') + '.';
    }
    
    // Adicionar fatos relevantes
    if (keyInfo.facts.length > 0) {
      content += '\n\n**Informações importantes:**\n';
      keyInfo.facts.slice(0, 3).forEach(fact => {
        content += `• ${fact}\n`;
      });
    }
    
    // Adicionar entidades e organizações se relevantes
    if (keyInfo.entities && keyInfo.entities.length > 0) {
      content += '\n**Entidades relacionadas:** ';
      content += keyInfo.entities.slice(0, 5).join(', ');
    }
    
    // Adicionar números/estatísticas se relevantes
    if (keyInfo.numbers.length > 0) {
      content += '\n\n**Dados relevantes:** ';
      content += keyInfo.numbers.join(', ');
    }
    
    // Adicionar contexto temporal se há datas
    if (keyInfo.dates.length > 0 && (questionType === 'historical' || questionType === 'temporal')) {
      content += `\n\n**Contexto temporal:** Informações relacionadas a ${keyInfo.dates.join(', ')}`;
    }
    
    return content;
  }

  generateConclusion(questionType, keyInfo) {
    // Função de fallback para compatibilidade
    if (questionType === 'definition' && keyInfo.mainPoints.length > 0) {
      return 'Esta é uma visão geral abrangente baseada nas fontes mais atuais disponíveis.';
    }
    
    if (questionType === 'how-to') {
      return 'Lembre-se de sempre verificar informações específicas com fontes oficiais quando necessário.';
    }
    
    if (questionType === 'historical') {
      return 'Essa linha temporal representa os marcos principais baseados nas fontes consultadas.';
    }
    
    if (keyInfo.facts && keyInfo.facts.length > 2) {
      return 'Para informações mais detalhadas, consulte as fontes específicas listadas abaixo.';
    }
    
    return 'Esta síntese combina informações de múltiplas fontes para fornecer uma visão completa e atualizada.';
  }

  createStructuredSections(summaries, content, hasSnippets) {
    const sections = [];
    
    // Seção principal
    if (content.length > 0) {
      sections.push({
        title: hasSnippets ? "Resumo dos Resultados" : "Informações Principais",
        content: content.substring(0, 800),
        type: 'main'
      });
    }
    
    // Seção de fontes se temos conteúdo real
    if (!hasSnippets && summaries.length > 0) {
      const sourceDetails = summaries.map((s, i) => 
        `**${i + 1}.** ${s.title || 'Fonte'}: ${(s.summary || '').substring(0, 150)}...`
      ).join('\n\n');
      
      sections.push({
        title: "Detalhes das Fontes",
        content: sourceDetails,
        type: 'sources'
      });
    }
    
    return sections;
  }
}

export default new AIService();
