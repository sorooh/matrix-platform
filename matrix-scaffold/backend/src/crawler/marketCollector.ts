/**
 * Market & Trend Collector
 * Phase 6: AI Crawler & Simulation Environment
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { prisma } from '../config/database'
import { crawlerEngine } from './engine'
import { parser } from './parser'
import { knowledgeGraphIntegration } from './knowledgeGraph'

export interface PriceData {
  product: string
  price: number
  currency: string
  url: string
  timestamp: Date
  source?: string
}

export interface CompetitorData {
  name: string
  url: string
  products: string[]
  pricing?: Record<string, number>
  features?: string[]
  metadata?: Record<string, unknown>
}

export interface MarketingContent {
  type: 'blog' | 'social' | 'ad' | 'email' | 'other'
  title: string
  content: string
  url: string
  author?: string
  publishedAt?: Date
  metadata?: Record<string, unknown>
}

export interface MarketIntelligenceReport {
  date: Date
  prices: PriceData[]
  competitors: CompetitorData[]
  marketingContent: MarketingContent[]
  trends: Array<{
    keyword: string
    frequency: number
    trend: 'up' | 'down' | 'stable'
  }>
  summary: string
}

export class MarketCollector {
  private priceData: PriceData[] = []
  private competitorData: CompetitorData[] = []
  private marketingContent: MarketingContent[] = []

  /**
   * Collect price data from URL
   */
  async collectPrices(url: string, options?: { selector?: string; productName?: string }): Promise<PriceData[]> {
    try {
      logger.info('Collecting price data', { url })

      const result = await crawlerEngine.crawlUrl(url)
      if (!result.content || !result.html) {
        return []
      }

      const prices: PriceData[] = []

      // Extract prices from content (simplified - in production, use ML models)
      const priceRegex = /[\$€£¥]?\s*(\d+[\.,]\d{2})/g
      const matches = result.content.match(priceRegex) || []

      for (const match of matches) {
        const price = parseFloat(match.replace(/[^\d.,]/g, '').replace(',', '.'))
        if (!isNaN(price) && price > 0) {
          prices.push({
            product: options?.productName || 'Unknown',
            price,
            currency: this.detectCurrency(match),
            url,
            timestamp: new Date(),
            source: result.url,
          })
        }
      }

      // Store in database
      for (const price of prices) {
        this.priceData.push(price)
      }

      logger.info('Price data collected', {
        url,
        pricesCount: prices.length,
      })

      eventBus.publish('crawler.market.prices.collected', {
        url,
        prices,
      })

      return prices
    } catch (error: any) {
      logger.error('Collect prices failed:', error)
      return []
    }
  }

  /**
   * Collect competitor data
   */
  async collectCompetitorData(url: string): Promise<CompetitorData | null> {
    try {
      logger.info('Collecting competitor data', { url })

      const result = await crawlerEngine.crawlUrl(url)
      if (!result.content || !result.html) {
        return null
      }

      const parsed = parser.parseHTML(result.html, url)

      // Extract competitor information
      const competitor: CompetitorData = {
        name: parsed.title || url,
        url,
        products: [],
        features: [],
        metadata: parsed.metadata,
      }

      // Extract product names (simplified - in production, use NLP)
      const productKeywords = ['product', 'service', 'solution', 'offer']
      for (const keyword of productKeywords) {
        const regex = new RegExp(`\\b${keyword}[^.]*\\.`, 'gi')
        const matches = parsed.content.match(regex) || []
        for (const match of matches) {
          const product = match.replace(/\b(product|service|solution|offer)\b/gi, '').trim()
          if (product.length > 3 && product.length < 100) {
            competitor.products.push(product)
          }
        }
      }

      // Extract features (look for bullet points, lists)
      const featureRegex = /[-•]\s*([^.\n]+)/g
      const featureMatches = parsed.content.match(featureRegex) || []
      for (const match of featureMatches.slice(0, 10)) {
        // Limit to first 10
        const feature = match.replace(/^[-•]\s*/, '').trim()
        if (feature.length > 5 && feature.length < 200) {
          competitor.features?.push(feature)
        }
      }

      // Store competitor data
      this.competitorData.push(competitor)

      logger.info('Competitor data collected', {
        url,
        name: competitor.name,
        productsCount: competitor.products.length,
        featuresCount: competitor.features?.length || 0,
      })

      eventBus.publish('crawler.market.competitor.collected', {
        competitor,
      })

      return competitor
    } catch (error: any) {
      logger.error('Collect competitor data failed:', error)
      return null
    }
  }

  /**
   * Collect marketing content
   */
  async collectMarketingContent(url: string, type?: MarketingContent['type']): Promise<MarketingContent[]> {
    try {
      logger.info('Collecting marketing content', { url, type })

      const result = await crawlerEngine.crawlUrl(url)
      if (!result.content || !result.html) {
        return []
      }

      const parsed = parser.parseHTML(result.html, url)

      // Detect content type
      const detectedType = type || this.detectContentType(url, parsed.content)

      const content: MarketingContent = {
        type: detectedType,
        title: parsed.title || url,
        content: parsed.content,
        url,
        publishedAt: this.extractPublishedDate(parsed.metadata),
        author: this.extractAuthor(parsed.metadata),
        metadata: parsed.metadata,
      }

      // Store marketing content
      this.marketingContent.push(content)

      logger.info('Marketing content collected', {
        url,
        type: content.type,
        title: content.title,
      })

      eventBus.publish('crawler.market.marketing.collected', {
        content,
      })

      return [content]
    } catch (error: any) {
      logger.error('Collect marketing content failed:', error)
      return []
    }
  }

  /**
   * Generate daily intelligence report
   */
  async generateDailyReport(date?: Date): Promise<MarketIntelligenceReport> {
    try {
      const reportDate = date || new Date()

      // Filter data for the date
      const dayStart = new Date(reportDate.setHours(0, 0, 0, 0))
      const dayEnd = new Date(reportDate.setHours(23, 59, 59, 999))

      const prices = this.priceData.filter((p) => p.timestamp >= dayStart && p.timestamp <= dayEnd)
      const competitors = this.competitorData.filter((c) => {
        // Filter by date if available
        return true
      })
      const marketing = this.marketingContent.filter((m) => {
        if (m.publishedAt) {
          return m.publishedAt >= dayStart && m.publishedAt <= dayEnd
        }
        return true
      })

      // Analyze trends
      const trends = this.analyzeTrends(prices, marketing)

      // Generate summary
      const summary = this.generateSummary(prices, competitors, marketing, trends)

      const report: MarketIntelligenceReport = {
        date: reportDate,
        prices,
        competitors,
        marketingContent: marketing,
        trends,
        summary,
      }

      logger.info('Daily intelligence report generated', {
        date: reportDate,
        pricesCount: prices.length,
        competitorsCount: competitors.length,
        marketingCount: marketing.length,
        trendsCount: trends.length,
      })

      eventBus.publish('crawler.market.report.generated', {
        report,
      })

      return report
    } catch (error: any) {
      logger.error('Generate daily report failed:', error)
      throw error
    }
  }

  /**
   * Detect currency
   */
  private detectCurrency(priceString: string): string {
    if (priceString.includes('$')) return 'USD'
    if (priceString.includes('€')) return 'EUR'
    if (priceString.includes('£')) return 'GBP'
    if (priceString.includes('¥')) return 'JPY'
    return 'USD' // Default
  }

  /**
   * Detect content type
   */
  private detectContentType(url: string, content: string): MarketingContent['type'] {
    if (url.includes('blog') || url.includes('article')) return 'blog'
    if (url.includes('twitter') || url.includes('facebook') || url.includes('linkedin')) return 'social'
    if (url.includes('ad') || url.includes('advertisement')) return 'ad'
    if (url.includes('email') || url.includes('newsletter')) return 'email'
    return 'other'
  }

  /**
   * Extract published date
   */
  private extractPublishedDate(metadata: Record<string, string>): Date | undefined {
    const dateStr =
      metadata['published_time'] ||
      metadata['article:published_time'] ||
      metadata['og:published_time'] ||
      metadata['date']

    if (dateStr) {
      try {
        return new Date(dateStr)
      } catch {
        return undefined
      }
    }

    return undefined
  }

  /**
   * Extract author
   */
  private extractAuthor(metadata: Record<string, string>): string | undefined {
    return (
      metadata['author'] ||
      metadata['article:author'] ||
      metadata['og:author'] ||
      metadata['creator']
    )
  }

  /**
   * Analyze trends
   */
  private analyzeTrends(
    prices: PriceData[],
    marketing: MarketingContent[]
  ): Array<{ keyword: string; frequency: number; trend: 'up' | 'down' | 'stable' }> {
    const keywordFrequency: Record<string, number> = {}

    // Extract keywords from prices
    for (const price of prices) {
      const keywords = price.product.toLowerCase().split(/\s+/)
      for (const keyword of keywords) {
        if (keyword.length > 3) {
          keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1
        }
      }
    }

    // Extract keywords from marketing content
    for (const content of marketing) {
      const keywords = content.content.toLowerCase().split(/\s+/)
      for (const keyword of keywords) {
        if (keyword.length > 3) {
          keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1
        }
      }
    }

    // Convert to trends
    const trends = Object.entries(keywordFrequency)
      .map(([keyword, frequency]) => ({
        keyword,
        frequency,
        trend: 'stable' as const, // In production, compare with previous periods
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20) // Top 20

    return trends
  }

  /**
   * Generate summary
   */
  private generateSummary(
    prices: PriceData[],
    competitors: CompetitorData[],
    marketing: MarketingContent[],
    trends: Array<{ keyword: string; frequency: number; trend: string }>
  ): string {
    const topTrends = trends.slice(0, 5).map((t) => t.keyword).join(', ')

    return `Daily Market Intelligence Report:
- ${prices.length} price points collected
- ${competitors.length} competitors analyzed
- ${marketing.length} marketing content pieces reviewed
- Top trends: ${topTrends}
- Market activity: ${prices.length > 0 ? 'Active' : 'Low'}`
  }

  /**
   * Get price history
   */
  getPriceHistory(product?: string, limit?: number): PriceData[] {
    let prices = this.priceData

    if (product) {
      prices = prices.filter((p) => p.product.toLowerCase().includes(product.toLowerCase()))
    }

    // Sort by timestamp (newest first)
    prices.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    if (limit) {
      prices = prices.slice(0, limit)
    }

    return prices
  }

  /**
   * Get competitor list
   */
  getCompetitors(): CompetitorData[] {
    return [...this.competitorData]
  }

  /**
   * Get marketing content
   */
  getMarketingContent(type?: MarketingContent['type'], limit?: number): MarketingContent[] {
    let content = this.marketingContent

    if (type) {
      content = content.filter((c) => c.type === type)
    }

    // Sort by published date (newest first)
    content.sort((a, b) => {
      const dateA = a.publishedAt?.getTime() || 0
      const dateB = b.publishedAt?.getTime() || 0
      return dateB - dateA
    })

    if (limit) {
      content = content.slice(0, limit)
    }

    return content
  }
}

// Global Market Collector
export const marketCollector = new MarketCollector()

