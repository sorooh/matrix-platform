/**
 * Parser
 * Phase 6: AI Crawler & Simulation Environment
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'

export interface ParsedContent {
  title?: string
  content: string
  html?: string
  links: string[]
  images: string[]
  metadata: Record<string, string>
  structuredData?: Record<string, unknown>
}

export class Parser {
  /**
   * Parse HTML content
   */
  parseHTML(html: string, baseUrl: string): ParsedContent {
    try {
      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : undefined

      // Extract text content (simplified - in production, use proper HTML parser)
      const textContent = this.extractTextContent(html)

      // Extract links
      const links = this.extractLinks(html, baseUrl)

      // Extract images
      const images = this.extractImages(html, baseUrl)

      // Extract metadata
      const metadata = this.extractMetadata(html)

      // Extract structured data (JSON-LD, Microdata, etc.)
      const structuredData = this.extractStructuredData(html)

      return {
        title,
        content: textContent,
        html,
        links,
        images,
        metadata,
        structuredData,
      }
    } catch (error: any) {
      logger.error('HTML parsing failed:', error)
      throw error
    }
  }

  /**
   * Extract text content from HTML
   */
  private extractTextContent(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ')

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim()

    return text
  }

  /**
   * Extract links from HTML
   */
  private extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = []
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
    let match

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1]
      try {
        const absoluteUrl = new URL(href, baseUrl).href
        links.push(absoluteUrl)
      } catch {
        // Invalid URL, skip
      }
    }

    return [...new Set(links)] // Remove duplicates
  }

  /**
   * Extract images from HTML
   */
  private extractImages(html: string, baseUrl: string): string[] {
    const images: string[] = []
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    let match

    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1]
      try {
        const absoluteUrl = new URL(src, baseUrl).href
        images.push(absoluteUrl)
      } catch {
        // Invalid URL, skip
      }
    }

    return [...new Set(images)] // Remove duplicates
  }

  /**
   * Extract metadata from HTML
   */
  private extractMetadata(html: string): Record<string, string> {
    const metadata: Record<string, string> = {}
    const metaRegex = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi
    let match

    while ((match = metaRegex.exec(html)) !== null) {
      const name = match[1]
      const content = match[2]
      metadata[name] = content
    }

    return metadata
  }

  /**
   * Extract structured data (JSON-LD, Microdata)
   */
  private extractStructuredData(html: string): Record<string, unknown> | undefined {
    try {
      // Extract JSON-LD
      const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
      const jsonLdData: unknown[] = []
      let match

      while ((match = jsonLdRegex.exec(html)) !== null) {
        try {
          const jsonData = JSON.parse(match[1])
          jsonLdData.push(jsonData)
        } catch {
          // Invalid JSON, skip
        }
      }

      if (jsonLdData.length > 0) {
        return {
          '@context': 'https://schema.org',
          '@graph': jsonLdData,
        }
      }
    } catch (error: any) {
      logger.debug('Structured data extraction failed:', error)
    }

    return undefined
  }

  /**
   * Clean and normalize URL
   */
  normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      // Remove fragment
      urlObj.hash = ''
      // Normalize path
      urlObj.pathname = urlObj.pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
      return urlObj.href
    } catch {
      return url
    }
  }

  /**
   * Validate URL
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

// Global Parser
export const parser = new Parser()

