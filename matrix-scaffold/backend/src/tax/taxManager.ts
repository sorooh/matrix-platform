/**
 * Phase 8.3 - Tax Management System
 * 
 * Professional tax calculation and management
 * - Multi-country tax support
 * - Automatic tax calculation based on location
 * - VAT, GST, Sales Tax support
 * - Tax exemption handling
 * - Tax reporting and compliance
 */

import { logger, logError, logInfo } from '../config/logger'

export type TaxType = 'vat' | 'gst' | 'sales_tax' | 'custom'
export type TaxRegion = 'EU' | 'US' | 'CA' | 'UK' | 'AU' | 'SG' | 'IN' | 'OTHER'

export interface TaxRate {
  id: string
  region: TaxRegion
  country: string
  state?: string
  type: TaxType
  rate: number // Percentage (e.g., 20 for 20%)
  name: string
  description?: string
  effectiveFrom: Date
  effectiveTo?: Date
  isActive: boolean
}

export interface TaxCalculation {
  amount: number
  currency: string
  subtotal: number
  taxAmount: number
  taxRate: number
  taxType: TaxType
  region: TaxRegion
  country: string
  total: number
  breakdown: TaxBreakdown[]
}

export interface TaxBreakdown {
  type: TaxType
  rate: number
  amount: number
  name: string
}

export interface TaxExemption {
  id: string
  userId: string
  country: string
  reason: string
  taxNumber?: string
  validFrom: Date
  validTo?: Date
  isActive: boolean
}

class TaxManager {
  private taxRates: Map<string, TaxRate> = new Map()
  private exemptions: Map<string, TaxExemption> = new Map()

  async initialize() {
    logInfo('Initializing Tax Management System...')

    // Load tax rates from database
    try {
      const { prisma } = await import('../config/database')
      const rates = await prisma.taxRate.findMany()
      for (const rate of rates) {
        this.taxRates.set(rate.id, {
          id: rate.id,
          region: rate.region as TaxRegion,
          country: rate.country,
          state: rate.state || undefined,
          type: rate.type as TaxType,
          rate: rate.rate,
          name: rate.name,
          description: rate.description || undefined,
          effectiveFrom: rate.effectiveFrom,
          effectiveTo: rate.effectiveTo || undefined,
          isActive: rate.isActive
        })
      }
      logInfo(`✅ Loaded ${rates.length} tax rates from database`)
    } catch (error) {
      logError(error as Error, { context: 'Tax initialization' })
    }

    // Initialize default tax rates
    await this.initializeDefaultTaxRates()

    logInfo('✅ Tax Management System initialized')
  }

  // Initialize default tax rates
  private async initializeDefaultTaxRates(): Promise<void> {
    const defaultRates: Omit<TaxRate, 'id' | 'effectiveFrom'>[] = [
      { region: 'EU', country: 'DE', type: 'vat', rate: 19, name: 'German VAT', isActive: true },
      { region: 'EU', country: 'FR', type: 'vat', rate: 20, name: 'French VAT', isActive: true },
      { region: 'EU', country: 'GB', type: 'vat', rate: 20, name: 'UK VAT', isActive: true },
      { region: 'US', country: 'US', state: 'CA', type: 'sales_tax', rate: 7.25, name: 'California Sales Tax', isActive: true },
      { region: 'US', country: 'US', state: 'NY', type: 'sales_tax', rate: 8, name: 'New York Sales Tax', isActive: true },
      { region: 'CA', country: 'CA', type: 'gst', rate: 5, name: 'Canadian GST', isActive: true },
      { region: 'AU', country: 'AU', type: 'gst', rate: 10, name: 'Australian GST', isActive: true },
      { region: 'SG', country: 'SG', type: 'gst', rate: 7, name: 'Singapore GST', isActive: true }
    ]

    for (const rate of defaultRates) {
      const existing = Array.from(this.taxRates.values()).find(
        r => r.country === rate.country && 
        (!rate.state || r.state === rate.state) &&
        r.type === rate.type
      )
      if (!existing) {
        await this.createTaxRate(rate)
      }
    }
  }

  // Create tax rate
  async createTaxRate(rate: Omit<TaxRate, 'id' | 'effectiveFrom'>): Promise<TaxRate> {
    try {
      const { nanoid } = await import('nanoid')
      const rateId = nanoid()
      const now = new Date()

      const taxRate: TaxRate = {
        id: rateId,
        ...rate,
        effectiveFrom: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.taxRate.create({
          data: {
            id: rateId,
            region: taxRate.region,
            country: taxRate.country,
            state: taxRate.state || null,
            type: taxRate.type,
            rate: taxRate.rate,
            name: taxRate.name,
            description: taxRate.description || null,
            effectiveFrom: now,
            effectiveTo: taxRate.effectiveTo || null,
            isActive: taxRate.isActive
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create tax rate in database' })
      }

      this.taxRates.set(rateId, taxRate)
      logInfo(`✅ Created tax rate ${rateId} for ${taxRate.country}`)

      return taxRate
    } catch (error) {
      logError(error as Error, { context: 'Create tax rate' })
      throw error
    }
  }

  // Calculate tax
  async calculateTax(
    amount: number,
    currency: string,
    country: string,
    state?: string,
    userId?: string
  ): Promise<TaxCalculation> {
    try {
      // Check for exemption
      if (userId) {
        const exemption = await this.getExemption(userId, country)
        if (exemption && exemption.isActive) {
          return {
            amount,
            currency,
            subtotal: amount,
            taxAmount: 0,
            taxRate: 0,
            taxType: 'custom',
            region: 'OTHER',
            country,
            total: amount,
            breakdown: []
          }
        }
      }

      // Find applicable tax rate
      const taxRate = await this.getTaxRate(country, state)
      if (!taxRate) {
        // No tax applicable
        return {
          amount,
          currency,
          subtotal: amount,
          taxAmount: 0,
          taxRate: 0,
          taxType: 'custom',
          region: 'OTHER',
          country,
          total: amount,
          breakdown: []
        }
      }

      const taxAmount = amount * (taxRate.rate / 100)
      const total = amount + taxAmount

      return {
        amount,
        currency,
        subtotal: amount,
        taxAmount,
        taxRate: taxRate.rate,
        taxType: taxRate.type,
        region: taxRate.region,
        country,
        total,
        breakdown: [{
          type: taxRate.type,
          rate: taxRate.rate,
          amount: taxAmount,
          name: taxRate.name
        }]
      }
    } catch (error) {
      logError(error as Error, { context: 'Calculate tax' })
      throw error
    }
  }

  // Get tax rate
  async getTaxRate(country: string, state?: string): Promise<TaxRate | null> {
    const now = new Date()
    for (const rate of this.taxRates.values()) {
      if (rate.country === country && rate.isActive) {
        if (state && rate.state && rate.state !== state) continue
        if (rate.effectiveFrom > now) continue
        if (rate.effectiveTo && rate.effectiveTo < now) continue
        return rate
      }
    }
    return null
  }

  // Create exemption
  async createExemption(
    userId: string,
    country: string,
    reason: string,
    taxNumber?: string,
    validTo?: Date
  ): Promise<TaxExemption> {
    try {
      const { nanoid } = await import('nanoid')
      const exemptionId = nanoid()

      const exemption: TaxExemption = {
        id: exemptionId,
        userId,
        country,
        reason,
        taxNumber,
        validFrom: new Date(),
        validTo,
        isActive: true
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.taxExemption.create({
          data: {
            id: exemptionId,
            userId,
            country,
            reason,
            taxNumber: taxNumber || null,
            validFrom: exemption.validFrom,
            validTo: validTo || null,
            isActive: true
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create tax exemption in database' })
      }

      this.exemptions.set(exemptionId, exemption)
      logInfo(`✅ Created tax exemption ${exemptionId} for user ${userId}`)

      return exemption
    } catch (error) {
      logError(error as Error, { context: 'Create tax exemption' })
      throw error
    }
  }

  // Get exemption
  async getExemption(userId: string, country: string): Promise<TaxExemption | null> {
    const now = new Date()
    for (const exemption of this.exemptions.values()) {
      if (exemption.userId === userId && exemption.country === country && exemption.isActive) {
        if (exemption.validFrom > now) continue
        if (exemption.validTo && exemption.validTo < now) continue
        return exemption
      }
    }
    return null
  }
}

export const taxManager = new TaxManager()

