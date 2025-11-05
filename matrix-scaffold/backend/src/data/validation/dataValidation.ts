/**
 * Phase 10.5 - Data Validation
 * 
 * Data validation system
 * - Validation rules
 * - Schema validation
 * - Data quality checks
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../../config/logger'

export interface ValidationRule {
  id: string
  name: string
  resourceType: string
  field: string
  type: 'required' | 'format' | 'range' | 'custom'
  rule: string // Regex or validation function
  message: string
  isActive: boolean
  createdAt: Date
}

export interface ValidationResult {
  id: string
  resourceId: string
  resourceType: string
  valid: boolean
  errors: {
    field: string
    message: string
  }[]
  validatedAt: Date
}

class DataValidation {
  private rules: Map<string, ValidationRule> = new Map()
  private results: Map<string, ValidationResult> = new Map()

  async initialize() {
    logInfo('Initializing Data Validation...')
    logInfo('✅ Data Validation initialized')
  }

  async validate(
    resourceId: string,
    resourceType: string,
    data: any
  ): Promise<ValidationResult> {
    const id = nanoid()
    const errors: { field: string; message: string }[] = []

    for (const rule of this.rules.values()) {
      if (!rule.isActive) continue
      if (rule.resourceType !== resourceType) continue

      const value = data[rule.field]
      if (!this.validateField(value, rule)) {
        errors.push({ field: rule.field, message: rule.message })
      }
    }

    const result: ValidationResult = {
      id,
      resourceId,
      resourceType,
      valid: errors.length === 0,
      errors,
      validatedAt: new Date()
    }
    this.results.set(id, result)
    return result
  }

  private validateField(value: any, rule: ValidationRule): boolean {
    switch (rule.type) {
      case 'required':
        return value !== undefined && value !== null && value !== ''
      case 'format':
        return new RegExp(rule.rule).test(value)
      default:
        return true
    }
  }
}

export const dataValidation = new DataValidation()

