/**
 * Phase 8.6 - Advanced Search & Filtering
 * 
 * Professional search capabilities
 * - Full-text search
 * - Advanced filtering
 * - Bulk operations
 * - Export capabilities
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type SearchIndex = 'invoices' | 'subscriptions' | 'apps' | 'users' | 'developers' | 'partners' | 'contracts'
export type FilterOperator = 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in'
export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'pdf'

export interface SearchFilter {
  field: string
  operator: FilterOperator
  value: any
}

export interface SearchQuery {
  query?: string
  filters?: SearchFilter[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface SearchResult<T = any> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BulkOperation {
  id: string
  type: 'update' | 'delete' | 'export' | 'suspend' | 'activate'
  items: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: any
  createdAt: Date
  completedAt?: Date
}

class AdvancedSearch {
  private searchIndices: Map<SearchIndex, Map<string, any>> = new Map()
  private bulkOperations: Map<string, BulkOperation> = new Map()

  async initialize() {
    logInfo('Initializing Advanced Search & Filtering...')
    logInfo('✅ Advanced Search & Filtering initialized')
  }

  // Index document
  async indexDocument(index: SearchIndex, id: string, document: any): Promise<void> {
    try {
      if (!this.searchIndices.has(index)) {
        this.searchIndices.set(index, new Map())
      }

      const indexMap = this.searchIndices.get(index)!
      indexMap.set(id, document)

      logInfo(`✅ Indexed document ${id} in ${index}`)
    } catch (error) {
      logError(error as Error, { context: 'Index document' })
    }
  }

  // Search
  async search<T = any>(
    index: SearchIndex,
    query: SearchQuery
  ): Promise<SearchResult<T>> {
    try {
      const indexMap = this.searchIndices.get(index) || new Map()
      let items: T[] = Array.from(indexMap.values())

      // Apply text search
      if (query.query) {
        const searchTerm = query.query.toLowerCase()
        items = items.filter((item: any) => {
          const text = JSON.stringify(item).toLowerCase()
          return text.includes(searchTerm)
        })
      }

      // Apply filters
      if (query.filters && query.filters.length > 0) {
        for (const filter of query.filters) {
          items = this.applyFilter(items, filter)
        }
      }

      // Apply sorting
      if (query.sortBy) {
        items.sort((a: any, b: any) => {
          const aValue = a[query.sortBy!]
          const bValue = b[query.sortBy!]
          const order = query.sortOrder === 'desc' ? -1 : 1
          
          if (aValue < bValue) return -1 * order
          if (aValue > bValue) return 1 * order
          return 0
        })
      }

      // Apply pagination
      const page = query.page || 1
      const limit = query.limit || 50
      const total = items.length
      const totalPages = Math.ceil(total / limit)
      const start = (page - 1) * limit
      const end = start + limit
      const paginatedItems = items.slice(start, end)

      return {
        items: paginatedItems,
        total,
        page,
        limit,
        totalPages
      }
    } catch (error) {
      logError(error as Error, { context: 'Search' })
      throw error
    }
  }

  // Apply filter
  private applyFilter<T>(items: T[], filter: SearchFilter): T[] {
    return items.filter((item: any) => {
      const fieldValue = item[filter.field]
      
      switch (filter.operator) {
        case 'equals':
          return fieldValue === filter.value
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase())
        case 'gt':
          return fieldValue > filter.value
        case 'lt':
          return fieldValue < filter.value
        case 'gte':
          return fieldValue >= filter.value
        case 'lte':
          return fieldValue <= filter.value
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(fieldValue)
        case 'not_in':
          return Array.isArray(filter.value) && !filter.value.includes(fieldValue)
        default:
          return true
      }
    })
  }

  // Bulk operation
  async bulkOperation(
    type: 'update' | 'delete' | 'export' | 'suspend' | 'activate',
    items: string[],
    index: SearchIndex,
    updates?: Record<string, any>
  ): Promise<BulkOperation> {
    try {
      const operationId = nanoid()
      const now = new Date()

      const operation: BulkOperation = {
        id: operationId,
        type,
        items,
        status: 'processing',
        createdAt: now
      }

      this.bulkOperations.set(operationId, operation)

      // Process operation
      await this.processBulkOperation(operationId, type, items, index, updates)

      return operation
    } catch (error) {
      logError(error as Error, { context: 'Bulk operation' })
      throw error
    }
  }

  // Process bulk operation
  private async processBulkOperation(
    operationId: string,
    type: 'update' | 'delete' | 'export' | 'suspend' | 'activate',
    items: string[],
    index: SearchIndex,
    updates?: Record<string, any>
  ): Promise<void> {
    try {
      const operation = this.bulkOperations.get(operationId)
      if (!operation) return

      const indexMap = this.searchIndices.get(index) || new Map()
      const results: any[] = []

      for (const itemId of items) {
        try {
          if (type === 'delete') {
            indexMap.delete(itemId)
            results.push({ id: itemId, status: 'deleted' })
          } else if (type === 'update' && updates) {
            const item = indexMap.get(itemId)
            if (item) {
              const updated = { ...item, ...updates }
              indexMap.set(itemId, updated)
              results.push({ id: itemId, status: 'updated' })
            }
          } else if (type === 'export') {
            const item = indexMap.get(itemId)
            if (item) {
              results.push(item)
            }
          } else if (type === 'suspend' || type === 'activate') {
            const item = indexMap.get(itemId)
            if (item) {
              const updated = { ...item, status: type === 'suspend' ? 'suspended' : 'active' }
              indexMap.set(itemId, updated)
              results.push({ id: itemId, status: updated.status })
            }
          }
        } catch (error) {
          results.push({ id: itemId, status: 'failed', error: (error as Error).message })
        }
      }

      operation.status = 'completed'
      operation.result = results
      operation.completedAt = new Date()

      this.bulkOperations.set(operationId, operation)
      logInfo(`✅ Completed bulk operation ${operationId}: ${type} on ${items.length} items`)
    } catch (error) {
      logError(error as Error, { context: 'Process bulk operation' })
    }
  }

  // Export data
  async exportData(
    index: SearchIndex,
    query: SearchQuery,
    format: ExportFormat
  ): Promise<string> {
    try {
      const results = await this.search(index, { ...query, limit: 10000 })
      
      if (format === 'csv') {
        return this.exportToCSV(results.items)
      } else if (format === 'json') {
        return JSON.stringify(results.items, null, 2)
      } else if (format === 'xlsx') {
        return this.exportToXLSX(results.items)
      } else if (format === 'pdf') {
        return this.exportToPDF(results.items)
      }

      return ''
    } catch (error) {
      logError(error as Error, { context: 'Export data' })
      throw error
    }
  }

  // Export to CSV
  private exportToCSV(items: any[]): string {
    if (items.length === 0) return ''
    
    const headers = Object.keys(items[0])
    const rows = items.map(item => 
      headers.map(header => {
        const value = item[header]
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      }).join(',')
    )

    return [headers.join(','), ...rows].join('\n')
  }

  // Export to XLSX
  private exportToXLSX(items: any[]): string {
    // In production, use xlsx library
    return JSON.stringify(items)
  }

  // Export to PDF
  private exportToPDF(items: any[]): string {
    // In production, use PDF library
    return JSON.stringify(items)
  }

  // Get bulk operation
  async getBulkOperation(operationId: string): Promise<BulkOperation | null> {
    return this.bulkOperations.get(operationId) || null
  }
}

export const advancedSearch = new AdvancedSearch()

