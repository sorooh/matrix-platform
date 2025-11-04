/**
 * Sanitization Utilities
 * Global-Ready Architecture with input sanitization
 */

export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return ''
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/\0/g, '') // Remove null bytes
}

export function sanitizeObject(obj: any, maxDepth: number = 5, currentDepth: number = 0): any {
  if (currentDepth >= maxDepth) return null
  if (obj === null || obj === undefined) return null
  if (typeof obj === 'string') return sanitizeString(obj)
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, maxDepth, currentDepth + 1))
  }
  const sanitized: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const sanitizedKey = sanitizeString(key, 100)
      sanitized[sanitizedKey] = sanitizeObject(obj[key], maxDepth, currentDepth + 1)
    }
  }
  return sanitized
}

export function sanitizeRequestData(data: any): any {
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization']
  const sanitized = sanitizeObject(data)

  if (typeof sanitized === 'object' && sanitized !== null) {
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        delete sanitized[field]
      }
    }
  }

  return sanitized
}

