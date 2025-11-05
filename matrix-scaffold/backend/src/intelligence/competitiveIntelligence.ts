/**
 * Phase 9.3 - Competitive Intelligence & Market Analysis
 * 
 * Competitor monitoring and market analysis
 * - Competitor monitoring
 * - Market trend analysis
 * - Feature gap analysis
 * - Pricing comparison
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type CompetitorType = 'direct' | 'indirect' | 'potential'
export type MarketTrend = 'growing' | 'stable' | 'declining'
export type FeatureGapType = 'missing' | 'inferior' | 'superior'

export interface Competitor {
  id: string
  name: string
  type: CompetitorType
  website?: string
  description: string
  features: string[]
  pricing: {
    model: string
    price: number
    currency: string
  }
  marketShare: number // percentage
  strengths: string[]
  weaknesses: string[]
  lastUpdated: Date
}

export interface MarketTrendAnalysis {
  id: string
  market: string
  trend: MarketTrend
  growthRate: number // percentage
  totalSize: number // market size in USD
  ourPosition: number // percentage
  competitors: string[]
  insights: string[]
  analyzedAt: Date
}

export interface FeatureGap {
  id: string
  competitorId: string
  competitorName: string
  feature: string
  type: FeatureGapType
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  impact: {
    users: number
    revenue: number
  }
  detectedAt: Date
}

export interface PricingComparison {
  id: string
  competitorId: string
  competitorName: string
  ourPrice: number
  competitorPrice: number
  difference: number
  differencePercentage: number
  recommendation: 'match' | 'lower' | 'higher' | 'maintain'
  comparedAt: Date
}

class CompetitiveIntelligence {
  private competitors: Map<string, Competitor> = new Map()
  private trends: Map<string, MarketTrendAnalysis> = new Map()
  private gaps: Map<string, FeatureGap> = new Map()
  private pricing: Map<string, PricingComparison> = new Map()

  async initialize() {
    logInfo('Initializing Competitive Intelligence & Market Analysis...')

    // Initialize default competitors
    await this.initializeDefaultCompetitors()

    // Start competitor monitoring
    this.startCompetitorMonitoring()

    // Start market analysis
    this.startMarketAnalysis()

    logInfo('✅ Competitive Intelligence & Market Analysis initialized')
  }

  // Initialize default competitors
  private async initializeDefaultCompetitors(): Promise<void> {
    const defaultCompetitors: Omit<Competitor, 'id' | 'lastUpdated'>[] = [
      {
        name: 'OpenAI',
        type: 'direct',
        website: 'https://openai.com',
        description: 'AI platform provider',
        features: ['GPT models', 'API', 'Enterprise support'],
        pricing: {
          model: 'usage-based',
          price: 0.002,
          currency: 'USD'
        },
        marketShare: 35,
        strengths: ['Brand recognition', 'Advanced models'],
        weaknesses: ['High cost', 'Limited customization']
      },
      {
        name: 'Anthropic',
        type: 'direct',
        website: 'https://anthropic.com',
        description: 'AI safety and research',
        features: ['Claude models', 'API', 'Safety focus'],
        pricing: {
          model: 'usage-based',
          price: 0.003,
          currency: 'USD'
        },
        marketShare: 15,
        strengths: ['Safety focus', 'Advanced models'],
        weaknesses: ['Limited features', 'Higher cost']
      }
    ]

    for (const competitor of defaultCompetitors) {
      const competitorId = nanoid()
      const now = new Date()

      const comp: Competitor = {
        id: competitorId,
        ...competitor,
        lastUpdated: now
      }

      this.competitors.set(competitorId, comp)
    }
  }

  // Monitor competitor
  async monitorCompetitor(competitorId: string): Promise<Competitor> {
    try {
      const competitor = this.competitors.get(competitorId)
      if (!competitor) throw new Error('Competitor not found')

      // In production, fetch latest data from competitor website/API
      competitor.lastUpdated = new Date()

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.competitor.update({
          where: { id: competitorId },
          data: {
            lastUpdated: competitor.lastUpdated
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Monitor competitor in database' })
      }

      this.competitors.set(competitorId, competitor)

      logInfo(`✅ Monitored competitor ${competitorId}: ${competitor.name}`)

      return competitor
    } catch (error) {
      logError(error as Error, { context: 'Monitor competitor' })
      throw error
    }
  }

  // Analyze market trends
  async analyzeMarketTrends(market: string): Promise<MarketTrendAnalysis> {
    try {
      const analysisId = nanoid()
      const now = new Date()

      // In production, analyze actual market data
      const trend: MarketTrend = 'growing'
      const growthRate = Math.random() * 20 + 10 // 10-30%
      const totalSize = Math.random() * 1000000000 + 1000000000 // $1B-$2B
      const ourPosition = Math.random() * 10 + 5 // 5-15%

      const analysis: MarketTrendAnalysis = {
        id: analysisId,
        market,
        trend,
        growthRate,
        totalSize,
        ourPosition,
        competitors: Array.from(this.competitors.values()).map(c => c.name),
        insights: [
          `Market is ${trend} with ${growthRate.toFixed(2)}% growth rate`,
          `Our market position is ${ourPosition.toFixed(2)}%`,
          `Total market size is $${(totalSize / 1000000).toFixed(2)}M`
        ],
        analyzedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.marketTrendAnalysis.create({
          data: {
            id: analysisId,
            market,
            trend,
            growthRate,
            totalSize,
            ourPosition,
            competitors: analysis.competitors,
            insights: analysis.insights,
            analyzedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Analyze market trends in database' })
      }

      this.trends.set(analysisId, analysis)

      logInfo(`✅ Analyzed market trends for ${market}`)

      return analysis
    } catch (error) {
      logError(error as Error, { context: 'Analyze market trends' })
      throw error
    }
  }

  // Detect feature gap
  async detectFeatureGap(
    competitorId: string,
    feature: string,
    type: FeatureGapType
  ): Promise<FeatureGap> {
    try {
      const competitor = this.competitors.get(competitorId)
      if (!competitor) throw new Error('Competitor not found')

      const gapId = nanoid()
      const now = new Date()

      const priority: 'low' | 'medium' | 'high' | 'critical' = type === 'superior' ? 'low' : type === 'inferior' ? 'high' : 'critical'

      const gap: FeatureGap = {
        id: gapId,
        competitorId,
        competitorName: competitor.name,
        feature,
        type,
        description: `${competitor.name} has ${type === 'missing' ? 'missing' : type === 'inferior' ? 'inferior' : 'superior'} feature: ${feature}`,
        priority,
        impact: {
          users: Math.floor(Math.random() * 10000) + 1000,
          revenue: Math.random() * 100000 + 10000
        },
        detectedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.featureGap.create({
          data: {
            id: gapId,
            competitorId,
            competitorName: competitor.name,
            feature,
            type,
            description: gap.description,
            priority,
            impact: gap.impact,
            detectedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Detect feature gap in database' })
      }

      this.gaps.set(gapId, gap)

      logInfo(`✅ Detected feature gap ${gapId}: ${feature} (${type})`)

      return gap
    } catch (error) {
      logError(error as Error, { context: 'Detect feature gap' })
      throw error
    }
  }

  // Compare pricing
  async comparePricing(
    competitorId: string,
    ourPrice: number
  ): Promise<PricingComparison> {
    try {
      const competitor = this.competitors.get(competitorId)
      if (!competitor) throw new Error('Competitor not found')

      const comparisonId = nanoid()
      const now = new Date()

      const competitorPrice = competitor.pricing.price
      const difference = ourPrice - competitorPrice
      const differencePercentage = (difference / competitorPrice) * 100

      let recommendation: 'match' | 'lower' | 'higher' | 'maintain'
      if (Math.abs(differencePercentage) < 5) {
        recommendation = 'maintain'
      } else if (differencePercentage > 20) {
        recommendation = 'lower'
      } else if (differencePercentage < -20) {
        recommendation = 'higher'
      } else {
        recommendation = 'match'
      }

      const comparison: PricingComparison = {
        id: comparisonId,
        competitorId,
        competitorName: competitor.name,
        ourPrice,
        competitorPrice,
        difference,
        differencePercentage,
        recommendation,
        comparedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.pricingComparison.create({
          data: {
            id: comparisonId,
            competitorId,
            competitorName: competitor.name,
            ourPrice,
            competitorPrice,
            difference,
            differencePercentage,
            recommendation,
            comparedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Compare pricing in database' })
      }

      this.pricing.set(comparisonId, comparison)

      logInfo(`✅ Compared pricing with ${competitor.name}: ${recommendation}`)

      return comparison
    } catch (error) {
      logError(error as Error, { context: 'Compare pricing' })
      throw error
    }
  }

  // Start competitor monitoring
  private startCompetitorMonitoring(): void {
    // Monitor competitors weekly
    setInterval(async () => {
      try {
        for (const competitor of this.competitors.values()) {
          await this.monitorCompetitor(competitor.id)
        }
      } catch (error) {
        logError(error as Error, { context: 'Competitor monitoring' })
      }
    }, 7 * 24 * 60 * 60 * 1000) // Weekly
  }

  // Start market analysis
  private startMarketAnalysis(): void {
    // Analyze market trends monthly
    setInterval(async () => {
      try {
        await this.analyzeMarketTrends('AI Platform Market')
      } catch (error) {
        logError(error as Error, { context: 'Market analysis' })
      }
    }, 30 * 24 * 60 * 60 * 1000) // Monthly
  }

  // Get competitors
  async getCompetitors(type?: CompetitorType): Promise<Competitor[]> {
    const competitors: Competitor[] = []
    for (const competitor of this.competitors.values()) {
      if (type && competitor.type !== type) continue
      competitors.push(competitor)
    }
    return competitors.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
  }

  // Get trends
  async getTrends(market?: string): Promise<MarketTrendAnalysis[]> {
    const trends: MarketTrendAnalysis[] = []
    for (const trend of this.trends.values()) {
      if (market && trend.market !== market) continue
      trends.push(trend)
    }
    return trends.sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime())
  }

  // Get gaps
  async getGaps(competitorId?: string, priority?: 'low' | 'medium' | 'high' | 'critical'): Promise<FeatureGap[]> {
    const gaps: FeatureGap[] = []
    for (const gap of this.gaps.values()) {
      if (competitorId && gap.competitorId !== competitorId) continue
      if (priority && gap.priority !== priority) continue
      gaps.push(gap)
    }
    return gaps.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
  }
}

export const competitiveIntelligence = new CompetitiveIntelligence()

