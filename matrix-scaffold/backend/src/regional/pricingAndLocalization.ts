/**
 * Phase 9 - Regional Pricing & Localization
 * 
 * Multi-region pricing and localization
 * - Dynamic pricing by currency and location
 * - Multi-language support
 * - Automatic local tax application
 * - Region-specific customization
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type SupportedLanguage = 'en' | 'ar' | 'nl' | 'zh' | 'fr' | 'de' | 'es' | 'ja'
export type SupportedCurrency = 'USD' | 'EUR' | 'AED' | 'CNY' | 'GBP' | 'JPY' | 'SAR' | 'INR'
export type TaxRegion = 'EU' | 'US' | 'GCC' | 'ASIA' | 'OTHER'
export type Timezone = 'UTC' | 'America/New_York' | 'Europe/London' | 'Asia/Dubai' | 'Asia/Shanghai' | 'Asia/Tokyo'

export interface RegionalPricing {
  id: string
  region: string
  currency: SupportedCurrency
  basePrice: number
  currencyMultiplier: number
  taxRate: number
  taxType: string // VAT | GST | Sales Tax
  localPrice: number
  effectiveDate: Date
  expiresAt?: Date
}

export interface Localization {
  id: string
  region: string
  language: SupportedLanguage
  timezone: Timezone
  dateFormat: string
  timeFormat: string
  currencyFormat: string
  numberFormat: string
  translations: Record<string, string>
}

export interface RegionalConfig {
  id: string
  region: string
  currency: SupportedCurrency
  language: SupportedLanguage
  timezone: Timezone
  taxRegion: TaxRegion
  taxRate: number
  pricing: RegionalPricing
  localization: Localization
  createdAt: Date
  updatedAt: Date
}

class RegionalPricingAndLocalization {
  private regionalConfigs: Map<string, RegionalConfig> = new Map()
  private pricing: Map<string, RegionalPricing> = new Map()
  private localizations: Map<string, Localization> = new Map()

  async initialize() {
    logInfo('Initializing Regional Pricing & Localization...')

    // Initialize default regional configs
    await this.initializeDefaultConfigs()

    logInfo('✅ Regional Pricing & Localization initialized')
  }

  // Initialize default configs
  private async initializeDefaultConfigs(): Promise<void> {
    const defaultConfigs: Omit<RegionalConfig, 'id' | 'pricing' | 'localization' | 'createdAt' | 'updatedAt'>[] = [
      {
        region: 'EU',
        currency: 'EUR',
        language: 'en',
        timezone: 'Europe/London',
        taxRegion: 'EU',
        taxRate: 20 // VAT
      },
      {
        region: 'US',
        currency: 'USD',
        language: 'en',
        timezone: 'America/New_York',
        taxRegion: 'US',
        taxRate: 8 // Sales Tax
      },
      {
        region: 'GCC',
        currency: 'AED',
        language: 'ar',
        timezone: 'Asia/Dubai',
        taxRegion: 'GCC',
        taxRate: 5 // VAT
      },
      {
        region: 'ASIA',
        currency: 'CNY',
        language: 'zh',
        timezone: 'Asia/Shanghai',
        taxRegion: 'ASIA',
        taxRate: 13 // GST
      }
    ]

    for (const config of defaultConfigs) {
      const configId = nanoid()
      const now = new Date()

      // Create pricing
      const pricingId = nanoid()
      const pricing: RegionalPricing = {
        id: pricingId,
        region: config.region,
        currency: config.currency,
        basePrice: 100, // Base price in USD
        currencyMultiplier: this.getCurrencyMultiplier(config.currency),
        taxRate: config.taxRate,
        taxType: this.getTaxType(config.taxRegion),
        localPrice: this.calculateLocalPrice(100, config.currency, config.taxRate),
        effectiveDate: now
      }

      // Create localization
      const localizationId = nanoid()
      const localization: Localization = {
        id: localizationId,
        region: config.region,
        language: config.language,
        timezone: config.timezone,
        dateFormat: this.getDateFormat(config.language),
        timeFormat: this.getTimeFormat(config.language),
        currencyFormat: this.getCurrencyFormat(config.currency),
        numberFormat: this.getNumberFormat(config.language),
        translations: this.getDefaultTranslations(config.language)
      }

      const regionalConfig: RegionalConfig = {
        id: configId,
        ...config,
        pricing,
        localization,
        createdAt: now,
        updatedAt: now
      }

      this.regionalConfigs.set(configId, regionalConfig)
      this.pricing.set(pricingId, pricing)
      this.localizations.set(localizationId, localization)
    }
  }

  // Get currency multiplier
  private getCurrencyMultiplier(currency: SupportedCurrency): number {
    const multipliers: Record<SupportedCurrency, number> = {
      USD: 1.0,
      EUR: 0.92,
      AED: 3.67,
      CNY: 7.2,
      GBP: 0.79,
      JPY: 150,
      SAR: 3.75,
      INR: 83
    }
    return multipliers[currency] || 1.0
  }

  // Get tax type
  private getTaxType(taxRegion: TaxRegion): string {
    const taxTypes: Record<TaxRegion, string> = {
      EU: 'VAT',
      US: 'Sales Tax',
      GCC: 'VAT',
      ASIA: 'GST',
      OTHER: 'Tax'
    }
    return taxTypes[taxRegion] || 'Tax'
  }

  // Calculate local price
  private calculateLocalPrice(basePrice: number, currency: SupportedCurrency, taxRate: number): number {
    const multiplier = this.getCurrencyMultiplier(currency)
    const priceWithTax = basePrice * multiplier * (1 + taxRate / 100)
    return Math.round(priceWithTax * 100) / 100
  }

  // Get date format
  private getDateFormat(language: SupportedLanguage): string {
    const formats: Record<SupportedLanguage, string> = {
      en: 'MM/DD/YYYY',
      ar: 'DD/MM/YYYY',
      nl: 'DD-MM-YYYY',
      zh: 'YYYY-MM-DD',
      fr: 'DD/MM/YYYY',
      de: 'DD.MM.YYYY',
      es: 'DD/MM/YYYY',
      ja: 'YYYY/MM/DD'
    }
    return formats[language] || 'MM/DD/YYYY'
  }

  // Get time format
  private getTimeFormat(language: SupportedLanguage): string {
    const formats: Record<SupportedLanguage, string> = {
      en: '12h',
      ar: '12h',
      nl: '24h',
      zh: '24h',
      fr: '24h',
      de: '24h',
      es: '24h',
      ja: '24h'
    }
    return formats[language] || '12h'
  }

  // Get currency format
  private getCurrencyFormat(currency: SupportedCurrency): string {
    const formats: Record<SupportedCurrency, string> = {
      USD: '$0.00',
      EUR: '€0.00',
      AED: '0.00 د.إ',
      CNY: '¥0.00',
      GBP: '£0.00',
      JPY: '¥0',
      SAR: '0.00 ر.س',
      INR: '₹0.00'
    }
    return formats[currency] || '$0.00'
  }

  // Get number format
  private getNumberFormat(language: SupportedLanguage): string {
    const formats: Record<SupportedLanguage, string> = {
      en: '1,234.56',
      ar: '1٬234.56',
      nl: '1.234,56',
      zh: '1,234.56',
      fr: '1 234,56',
      de: '1.234,56',
      es: '1.234,56',
      ja: '1,234.56'
    }
    return formats[language] || '1,234.56'
  }

  // Get default translations
  private getDefaultTranslations(language: SupportedLanguage): Record<string, string> {
    const translations: Record<SupportedLanguage, Record<string, string>> = {
      en: {
        'welcome': 'Welcome',
        'dashboard': 'Dashboard',
        'settings': 'Settings',
        'logout': 'Logout'
      },
      ar: {
        'welcome': 'مرحباً',
        'dashboard': 'لوحة التحكم',
        'settings': 'الإعدادات',
        'logout': 'تسجيل الخروج'
      },
      nl: {
        'welcome': 'Welkom',
        'dashboard': 'Dashboard',
        'settings': 'Instellingen',
        'logout': 'Uitloggen'
      },
      zh: {
        'welcome': '欢迎',
        'dashboard': '仪表板',
        'settings': '设置',
        'logout': '登出'
      },
      fr: {
        'welcome': 'Bienvenue',
        'dashboard': 'Tableau de bord',
        'settings': 'Paramètres',
        'logout': 'Déconnexion'
      },
      de: {
        'welcome': 'Willkommen',
        'dashboard': 'Dashboard',
        'settings': 'Einstellungen',
        'logout': 'Abmelden'
      },
      es: {
        'welcome': 'Bienvenido',
        'dashboard': 'Panel',
        'settings': 'Configuración',
        'logout': 'Cerrar sesión'
      },
      ja: {
        'welcome': 'ようこそ',
        'dashboard': 'ダッシュボード',
        'settings': '設定',
        'logout': 'ログアウト'
      }
    }
    return translations[language] || translations.en
  }

  // Get regional config
  async getRegionalConfig(region: string): Promise<RegionalConfig | null> {
    for (const config of this.regionalConfigs.values()) {
      if (config.region === region) {
        return config
      }
    }
    return null
  }

  // Calculate price for region
  async calculatePrice(
    basePrice: number,
    region: string
  ): Promise<{ price: number; currency: SupportedCurrency; tax: number; total: number }> {
    try {
      const config = await this.getRegionalConfig(region)
      if (!config) {
        throw new Error(`Region ${region} not found`)
      }

      const multiplier = config.pricing.currencyMultiplier
      const price = basePrice * multiplier
      const tax = price * (config.taxRate / 100)
      const total = price + tax

      return {
        price: Math.round(price * 100) / 100,
        currency: config.currency,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(total * 100) / 100
      }
    } catch (error) {
      logError(error as Error, { context: 'Calculate price' })
      throw error
    }
  }

  // Get localization
  async getLocalization(region: string): Promise<Localization | null> {
    for (const localization of this.localizations.values()) {
      if (localization.region === region) {
        return localization
      }
    }
    return null
  }

  // Translate text
  async translate(text: string, language: SupportedLanguage): Promise<string> {
    for (const localization of this.localizations.values()) {
      if (localization.language === language) {
        return localization.translations[text] || text
      }
    }
    return text
  }
}

export const regionalPricingAndLocalization = new RegionalPricingAndLocalization()

