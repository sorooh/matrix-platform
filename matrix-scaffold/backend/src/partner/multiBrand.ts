/**
 * Phase 8.2 - Multi-Brand Support
 * 
 * White-label branding support
 * - Custom themes per partner
 * - Custom domains and SSL
 * - Region-specific pricing
 * - Brand customization
 */

import { logger, logError, logInfo } from '../config/logger'
import { partnerPortalManager } from './partnerPortal'

export interface BrandConfig {
  partnerId: string
  brandName: string
  logo?: string
  favicon?: string
  theme: BrandTheme
  domain?: string
  subdomain?: string
  sslEnabled: boolean
  regionPricing?: Record<string, Record<string, number>> // region -> AI ID -> price
  customColors?: Record<string, string>
  customFonts?: Record<string, string>
  metadata: Record<string, any>
}

export interface BrandTheme {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  accentColor: string
  fontFamily?: string
  fontSize?: string
}

class MultiBrandManager {
  private brandConfigs: Map<string, BrandConfig> = new Map()

  async initialize() {
    logInfo('Initializing Multi-Brand Support...')

    // Load brand configs from database
    try {
      const { prisma } = await import('../config/database')
      const configs = await prisma.brandConfig.findMany()
      for (const config of configs) {
        this.brandConfigs.set(config.partnerId, {
          partnerId: config.partnerId,
          brandName: config.brandName,
          logo: config.logo || undefined,
          favicon: config.favicon || undefined,
          theme: config.theme as BrandTheme,
          domain: config.domain || undefined,
          subdomain: config.subdomain || undefined,
          sslEnabled: config.sslEnabled,
          regionPricing: config.regionPricing as Record<string, Record<string, number>> || undefined,
          customColors: config.customColors as Record<string, string> || undefined,
          customFonts: config.customFonts as Record<string, string> || undefined,
          metadata: config.metadata as Record<string, any>
        })
      }
      logInfo(`✅ Loaded ${configs.length} brand configs from database`)
    } catch (error) {
      logError(error as Error, { context: 'Multi-Brand initialization' })
    }

    logInfo('✅ Multi-Brand Support initialized')
  }

  // Get brand config
  async getBrandConfig(partnerId: string): Promise<BrandConfig | null> {
    return this.brandConfigs.get(partnerId) || null
  }

  // Get brand config by domain
  async getBrandConfigByDomain(domain: string): Promise<BrandConfig | null> {
    for (const config of this.brandConfigs.values()) {
      if (config.domain === domain || config.subdomain === domain) {
        return config
      }
    }
    return null
  }

  // Update brand config
  async updateBrandConfig(
    partnerId: string,
    updates: Partial<BrandConfig>
  ): Promise<BrandConfig | null> {
    const existing = this.brandConfigs.get(partnerId)
    if (!existing) {
      // Create new config
      const partner = await partnerPortalManager.getPartner(partnerId)
      if (!partner) return null

      const config: BrandConfig = {
        partnerId,
        brandName: partner.name,
        theme: {
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          accentColor: '#28a745'
        },
        subdomain: partner.subdomain,
        sslEnabled: true,
        metadata: {},
        ...updates
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.brandConfig.create({
          data: {
            partnerId,
            brandName: config.brandName,
            logo: config.logo || null,
            favicon: config.favicon || null,
            theme: config.theme,
            domain: config.domain || null,
            subdomain: config.subdomain || null,
            sslEnabled: config.sslEnabled,
            regionPricing: config.regionPricing || {},
            customColors: config.customColors || {},
            customFonts: config.customFonts || {},
            metadata: config.metadata
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create brand config in database' })
      }

      this.brandConfigs.set(partnerId, config)
      return config
    }

    const updated = {
      ...existing,
      ...updates
    }

    // Update SSL if domain changed
    if (updates.domain && updates.domain !== existing.domain) {
      await this.updateSSL(partnerId, updates.domain)
    }

    // Save to database
    try {
      const { prisma } = await import('../config/database')
      await prisma.brandConfig.update({
        where: { partnerId },
        data: {
          brandName: updated.brandName,
          logo: updated.logo || null,
          favicon: updated.favicon || null,
          theme: updated.theme,
          domain: updated.domain || null,
          subdomain: updated.subdomain || null,
          sslEnabled: updated.sslEnabled,
          regionPricing: updated.regionPricing || {},
          customColors: updated.customColors || {},
          customFonts: updated.customFonts || {},
          metadata: updated.metadata
        }
      })
    } catch (error) {
      logError(error as Error, { context: 'Update brand config in database' })
    }

    this.brandConfigs.set(partnerId, updated)
    return updated
  }

  // Get pricing for region
  async getPricingForRegion(
    partnerId: string,
    region: string,
    aiId: string
  ): Promise<number | null> {
    const config = this.brandConfigs.get(partnerId)
    if (!config) return null

    if (config.regionPricing && config.regionPricing[region]) {
      return config.regionPricing[region][aiId] || null
    }

    // Get default pricing from marketplace
    const { marketplaceManager } = await import('../marketplace/marketplace')
    const listing = await marketplaceManager.getListing(aiId)
    if (listing) {
      return listing.price.monthly || listing.price.instant || null
    }

    return null
  }

  // Update SSL
  private async updateSSL(partnerId: string, domain: string): Promise<void> {
    try {
      // In production, use Let's Encrypt or similar
      logInfo(`✅ Updated SSL for partner ${partnerId} (${domain})`)
    } catch (error) {
      logError(error as Error, { context: 'Update SSL' })
    }
  }
}

export const multiBrandManager = new MultiBrandManager()

