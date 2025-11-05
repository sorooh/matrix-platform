/**
 * Phase 8.3 - Multi-Currency Management
 * 
 * Professional multi-currency support
 * - Real-time exchange rates
 * - Currency conversion
 * - Multi-currency pricing
 * - Currency preference management
 * - Exchange rate history
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY' | 'INR' | 'AUD' | 'CAD' | 'SGD' | 'AED' | 'SAR' | 'BTC' | 'ETH' | 'USDT'

export interface ExchangeRate {
  id: string
  from: Currency
  to: Currency
  rate: number
  source: string
  timestamp: Date
}

export interface CurrencyConfig {
  id: string
  userId?: string
  partnerId?: string
  defaultCurrency: Currency
  supportedCurrencies: Currency[]
  autoConvert: boolean
  metadata: Record<string, any>
}

class CurrencyManager {
  private exchangeRates: Map<string, ExchangeRate> = new Map()
  private currencyConfigs: Map<string, CurrencyConfig> = new Map()

  async initialize() {
    logInfo('Initializing Multi-Currency Management...')

    // Load exchange rates cache
    await this.updateExchangeRates()

    // Update exchange rates every hour
    setInterval(() => {
      this.updateExchangeRates()
    }, 60 * 60 * 1000) // 1 hour

    logInfo('✅ Multi-Currency Management initialized')
  }

  // Update exchange rates
  private async updateExchangeRates(): Promise<void> {
    try {
      // In production, fetch from external API (e.g., ExchangeRate-API, Fixer.io)
      // For now, use mock rates
      const baseCurrency: Currency = 'USD'
      const currencies: Currency[] = ['EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD', 'SGD', 'AED', 'SAR', 'BTC', 'ETH', 'USDT']
      
      // Mock exchange rates (in production, fetch from API)
      const rates: Record<Currency, number> = {
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        JPY: 149.5,
        CNY: 7.23,
        INR: 83.2,
        AUD: 1.52,
        CAD: 1.35,
        SGD: 1.34,
        AED: 3.67,
        SAR: 3.75,
        BTC: 0.000024,
        ETH: 0.00038,
        USDT: 1
      }

      const now = new Date()
      for (const currency of currencies) {
        const rateKey = `${baseCurrency}_${currency}`
        const rate: ExchangeRate = {
          id: nanoid(),
          from: baseCurrency,
          to: currency,
          rate: rates[currency],
          source: 'internal',
          timestamp: now
        }
        this.exchangeRates.set(rateKey, rate)
      }

      logInfo(`✅ Updated exchange rates for ${currencies.length} currencies`)
    } catch (error) {
      logError(error as Error, { context: 'Update exchange rates' })
    }
  }

  // Get exchange rate
  async getExchangeRate(from: Currency, to: Currency): Promise<number> {
    if (from === to) return 1

    // Try direct rate
    const directKey = `${from}_${to}`
    const directRate = this.exchangeRates.get(directKey)
    if (directRate) {
      return directRate.rate
    }

    // Try reverse rate
    const reverseKey = `${to}_${from}`
    const reverseRate = this.exchangeRates.get(reverseKey)
    if (reverseRate) {
      return 1 / reverseRate.rate
    }

    // Convert through USD
    const fromToUsd = await this.getExchangeRate(from, 'USD')
    const usdToTo = await this.getExchangeRate('USD', to)
    return fromToUsd * usdToTo
  }

  // Convert currency
  async convertCurrency(
    amount: number,
    from: Currency,
    to: Currency
  ): Promise<number> {
    if (from === to) return amount

    const rate = await this.getExchangeRate(from, to)
    return amount * rate
  }

  // Set currency config
  async setCurrencyConfig(
    userId: string,
    defaultCurrency: Currency,
    supportedCurrencies: Currency[],
    autoConvert: boolean = true
  ): Promise<CurrencyConfig> {
    try {
      const configId = `${userId}_currency`
      
      const config: CurrencyConfig = {
        id: configId,
        userId,
        defaultCurrency,
        supportedCurrencies,
        autoConvert,
        metadata: {}
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.currencyConfig.upsert({
          where: { id: configId },
          create: {
            id: configId,
            userId,
            defaultCurrency,
            supportedCurrencies,
            autoConvert
          },
          update: {
            defaultCurrency,
            supportedCurrencies,
            autoConvert
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Set currency config in database' })
      }

      this.currencyConfigs.set(configId, config)
      logInfo(`✅ Set currency config for user ${userId}`)

      return config
    } catch (error) {
      logError(error as Error, { context: 'Set currency config' })
      throw error
    }
  }

  // Get currency config
  async getCurrencyConfig(userId: string): Promise<CurrencyConfig | null> {
    const configId = `${userId}_currency`
    return this.currencyConfigs.get(configId) || null
  }

  // Format currency
  formatCurrency(amount: number, currency: Currency, locale: string = 'en-US'): string {
    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency === 'BTC' || currency === 'ETH' || currency === 'USDT' ? 'USD' : currency,
        minimumFractionDigits: currency === 'JPY' ? 0 : 2,
        maximumFractionDigits: currency === 'JPY' ? 0 : 2
      })
      return formatter.format(amount) + (currency === 'BTC' || currency === 'ETH' || currency === 'USDT' ? ` ${currency}` : '')
    } catch (error) {
      return `${amount} ${currency}`
    }
  }
}

export const currencyManager = new CurrencyManager()

