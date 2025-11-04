/**
 * Database Configuration
 * Global-Ready Architecture with PostgreSQL + pgvector
 */

import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

// Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

// PostgreSQL Pool for raw queries (pgvector)
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})

// Enable pgvector extension
export async function enablePgVector() {
  try {
    await pgPool.query('CREATE EXTENSION IF NOT EXISTS vector')
    console.log('✅ pgvector extension enabled')
  } catch (error) {
    console.error('❌ Failed to enable pgvector:', error)
    throw error
  }
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('❌ Database health check failed:', error)
    return false
  }
}

// Graceful shutdown
export async function disconnectDatabase() {
  await prisma.$disconnect()
  await pgPool.end()
}

