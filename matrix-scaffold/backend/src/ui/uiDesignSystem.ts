/**
 * Phase 10.3 - User Interface Design System
 * 
 * Simple, intuitive, and attractive UI design system
 * - Responsive design for all devices
 * - Accessibility features
 * - Multi-language support
 * - Theme customization
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type UITheme = 'light' | 'dark' | 'auto' | 'custom'
export type UILanguage = 'ar' | 'en' | 'nl' | 'cn'
export type AccessibilityLevel = 'basic' | 'enhanced' | 'full'

export interface UIThemeConfig {
  id: string
  name: string
  theme: UITheme
  colors: {
    primary: string
    secondary: string
    background: string
    text: string
    accent: string
  }
  fonts: {
    primary: string
    secondary: string
    size: string
  }
  spacing: {
    unit: number
    scale: number[]
  }
  borderRadius: number
  shadows: boolean
  animations: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UILayoutConfig {
  id: string
  userId: string
  layout: {
    sidebar: 'left' | 'right' | 'hidden'
    header: 'fixed' | 'sticky' | 'static'
    footer: boolean
    grid: {
      columns: number
      gap: number
    }
  }
  widgets: string[] // Widget IDs
  customizations: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface AccessibilityConfig {
  id: string
  userId: string
  level: AccessibilityLevel
  features: {
    highContrast: boolean
    largeText: boolean
    screenReader: boolean
    keyboardNavigation: boolean
    reducedMotion: boolean
    colorBlindMode: boolean
  }
  preferences: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

class UIDesignSystem {
  private themes: Map<string, UIThemeConfig> = new Map()
  private layouts: Map<string, UILayoutConfig> = new Map()
  private accessibilityConfigs: Map<string, AccessibilityConfig> = new Map()

  async initialize() {
    logInfo('Initializing User Interface Design System...')

    // Initialize default themes
    await this.initializeDefaultThemes()

    logInfo('✅ User Interface Design System initialized')
  }

  // Initialize default themes
  private async initializeDefaultThemes(): Promise<void> {
    const defaultThemes: Omit<UIThemeConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Light Theme',
        theme: 'light',
        colors: {
          primary: '#3B82F6',
          secondary: '#8B5CF6',
          background: '#FFFFFF',
          text: '#1F2937',
          accent: '#10B981'
        },
        fonts: {
          primary: 'Inter, sans-serif',
          secondary: 'Roboto, sans-serif',
          size: '16px'
        },
        spacing: {
          unit: 8,
          scale: [4, 8, 12, 16, 24, 32, 48, 64]
        },
        borderRadius: 8,
        shadows: true,
        animations: true
      },
      {
        name: 'Dark Theme',
        theme: 'dark',
        colors: {
          primary: '#60A5FA',
          secondary: '#A78BFA',
          background: '#111827',
          text: '#F9FAFB',
          accent: '#34D399'
        },
        fonts: {
          primary: 'Inter, sans-serif',
          secondary: 'Roboto, sans-serif',
          size: '16px'
        },
        spacing: {
          unit: 8,
          scale: [4, 8, 12, 16, 24, 32, 48, 64]
        },
        borderRadius: 8,
        shadows: true,
        animations: true
      }
    ]

    for (const theme of defaultThemes) {
      const themeId = nanoid()
      const now = new Date()

      const themeConfig: UIThemeConfig = {
        id: themeId,
        ...theme,
        createdAt: now,
        updatedAt: now
      }

      this.themes.set(themeId, themeConfig)
    }
  }

  // Create custom theme
  async createCustomTheme(
    name: string,
    colors: UIThemeConfig['colors'],
    fonts: UIThemeConfig['fonts'],
    spacing: UIThemeConfig['spacing'],
    borderRadius: number = 8,
    shadows: boolean = true,
    animations: boolean = true
  ): Promise<UIThemeConfig> {
    try {
      const themeId = nanoid()
      const now = new Date()

      const theme: UIThemeConfig = {
        id: themeId,
        name,
        theme: 'custom',
        colors,
        fonts,
        spacing,
        borderRadius,
        shadows,
        animations,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.uIThemeConfig.create({
          data: {
            id: themeId,
            name,
            theme: 'custom',
            colors,
            fonts,
            spacing,
            borderRadius,
            shadows,
            animations,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create custom theme in database' })
      }

      this.themes.set(themeId, theme)

      logInfo(`✅ Created custom theme ${themeId}: ${name}`)

      return theme
    } catch (error) {
      logError(error as Error, { context: 'Create custom theme' })
      throw error
    }
  }

  // Save user layout
  async saveUserLayout(
    userId: string,
    layout: UILayoutConfig['layout'],
    widgets: string[] = [],
    customizations: Record<string, any> = {}
  ): Promise<UILayoutConfig> {
    try {
      const layoutId = nanoid()
      const now = new Date()

      const layoutConfig: UILayoutConfig = {
        id: layoutId,
        userId,
        layout,
        widgets,
        customizations,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.uILayoutConfig.create({
          data: {
            id: layoutId,
            userId,
            layout,
            widgets,
            customizations,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Save user layout in database' })
      }

      this.layouts.set(layoutId, layoutConfig)

      logInfo(`✅ Saved user layout ${layoutId} for user ${userId}`)

      return layoutConfig
    } catch (error) {
      logError(error as Error, { context: 'Save user layout' })
      throw error
    }
  }

  // Configure accessibility
  async configureAccessibility(
    userId: string,
    level: AccessibilityLevel,
    features: AccessibilityConfig['features'],
    preferences: Record<string, any> = {}
  ): Promise<AccessibilityConfig> {
    try {
      const configId = nanoid()
      const now = new Date()

      const config: AccessibilityConfig = {
        id: configId,
        userId,
        level,
        features,
        preferences,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.accessibilityConfig.create({
          data: {
            id: configId,
            userId,
            level,
            features,
            preferences,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Configure accessibility in database' })
      }

      this.accessibilityConfigs.set(configId, config)

      logInfo(`✅ Configured accessibility ${configId} for user ${userId}`)

      return config
    } catch (error) {
      logError(error as Error, { context: 'Configure accessibility' })
      throw error
    }
  }

  // Get themes
  async getThemes(theme?: UITheme): Promise<UIThemeConfig[]> {
    const themes: UIThemeConfig[] = []
    for (const themeConfig of this.themes.values()) {
      if (theme && themeConfig.theme !== theme) continue
      themes.push(themeConfig)
    }
    return themes.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Get user layout
  async getUserLayout(userId: string): Promise<UILayoutConfig | null> {
    for (const layout of this.layouts.values()) {
      if (layout.userId === userId) return layout
    }
    return null
  }

  // Get accessibility config
  async getAccessibilityConfig(userId: string): Promise<AccessibilityConfig | null> {
    for (const config of this.accessibilityConfigs.values()) {
      if (config.userId === userId) return config
    }
    return null
  }
}

export const uiDesignSystem = new UIDesignSystem()

