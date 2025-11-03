import mongoose from 'mongoose'
import Redis from 'ioredis'
import { Pool } from 'pg'

// Environment variables with defaults
const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/matrix-platform',
    options: {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_TIMEOUT || '5000'),
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000'),
      family: 4, // Use IPv4, skip trying IPv6
      bufferMaxEntries: 0,
      bufferCommands: false,
    }
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'matrix:',
  },
  postgresql: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'matrix_platform',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'password',
    max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '5000'),
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
  }
}

// MongoDB Connection
class MongoDBManager {
  private static instance: MongoDBManager
  private isConnected = false

  static getInstance(): MongoDBManager {
    if (!MongoDBManager.instance) {
      MongoDBManager.instance = new MongoDBManager()
    }
    return MongoDBManager.instance
  }

  async connect(): Promise<void> {
    if (this.isConnected) return

    try {
      await mongoose.connect(config.mongodb.uri, config.mongodb.options)
      
      mongoose.connection.on('connected', () => {
        console.log('✅ MongoDB connected successfully')
        this.isConnected = true
      })

      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error)
        this.isConnected = false
      })

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected')
        this.isConnected = false
      })

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect()
        process.exit(0)
      })

    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return
    
    try {
      await mongoose.connection.close()
      console.log('🔌 MongoDB connection closed')
      this.isConnected = false
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error)
    }
  }

  getStatus(): { connected: boolean; readyState: number } {
    return {
      connected: this.isConnected,
      readyState: mongoose.connection.readyState
    }
  }
}

// Redis Connection
class RedisManager {
  private static instance: RedisManager
  private client: Redis | null = null
  private isConnected = false

  static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager()
    }
    return RedisManager.instance
  }

  async connect(): Promise<Redis> {
    if (this.client && this.isConnected) return this.client

    try {
      this.client = new Redis(config.redis)

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully')
        this.isConnected = true
      })

      this.client.on('error', (error) => {
        console.error('❌ Redis connection error:', error)
        this.isConnected = false
      })

      this.client.on('close', () => {
        console.log('⚠️ Redis connection closed')
        this.isConnected = false
      })

      await this.client.ping()
      return this.client

    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client) return

    try {
      await this.client.quit()
      console.log('🔌 Redis connection closed')
      this.isConnected = false
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error)
    }
  }

  getClient(): Redis | null {
    return this.client
  }

  getStatus(): { connected: boolean; client: boolean } {
    return {
      connected: this.isConnected,
      client: !!this.client
    }
  }
}

// PostgreSQL Connection (for financial data, transactions)
class PostgreSQLManager {
  private static instance: PostgreSQLManager
  private pool: Pool | null = null
  private isConnected = false

  static getInstance(): PostgreSQLManager {
    if (!PostgreSQLManager.instance) {
      PostgreSQLManager.instance = new PostgreSQLManager()
    }
    return PostgreSQLManager.instance
  }

  async connect(): Promise<Pool> {
    if (this.pool && this.isConnected) return this.pool

    try {
      this.pool = new Pool(config.postgresql)

      this.pool.on('connect', () => {
        console.log('✅ PostgreSQL connected successfully')
        this.isConnected = true
      })

      this.pool.on('error', (error) => {
        console.error('❌ PostgreSQL connection error:', error)
        this.isConnected = false
      })

      // Test connection
      const client = await this.pool.connect()
      await client.query('SELECT NOW()')
      client.release()

      return this.pool

    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (!this.pool) return

    try {
      await this.pool.end()
      console.log('🔌 PostgreSQL connection closed')
      this.isConnected = false
    } catch (error) {
      console.error('❌ Error closing PostgreSQL connection:', error)
    }
  }

  getPool(): Pool | null {
    return this.pool
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) throw new Error('PostgreSQL not connected')
    
    const start = Date.now()
    const result = await this.pool.query(text, params)
    const duration = Date.now() - start
    
    console.log('📊 Query executed', { text, duration, rows: result.rowCount })
    return result
  }

  getStatus(): { connected: boolean; pool: boolean } {
    return {
      connected: this.isConnected,
      pool: !!this.pool
    }
  }
}

// Database Health Check
export async function healthCheck(): Promise<{
  mongodb: { status: string; details?: any }
  redis: { status: string; details?: any }
  postgresql: { status: string; details?: any }
}> {
  const health = {
    mongodb: { status: 'disconnected' as string, details: undefined as any },
    redis: { status: 'disconnected' as string, details: undefined as any },
    postgresql: { status: 'disconnected' as string, details: undefined as any }
  }

  // MongoDB Health
  try {
    const mongoManager = MongoDBManager.getInstance()
    const mongoStatus = mongoManager.getStatus()
    
    if (mongoStatus.connected) {
      const stats = await mongoose.connection.db.stats()
      health.mongodb = {
        status: 'connected',
        details: {
          readyState: mongoStatus.readyState,
          collections: stats.collections,
          dataSize: stats.dataSize,
          indexSize: stats.indexSize
        }
      }
    }
  } catch (error) {
    health.mongodb = { status: 'error', details: { error: error.message } }
  }

  // Redis Health
  try {
    const redisManager = RedisManager.getInstance()
    const redisClient = redisManager.getClient()
    
    if (redisClient) {
      const info = await redisClient.info('memory')
      health.redis = {
        status: 'connected',
        details: {
          connected: redisManager.getStatus().connected,
          memoryUsage: info.split('\r\n').find(line => line.startsWith('used_memory_human:'))?.split(':')[1]
        }
      }
    }
  } catch (error) {
    health.redis = { status: 'error', details: { error: error.message } }
  }

  // PostgreSQL Health
  try {
    const pgManager = PostgreSQLManager.getInstance()
    const pool = pgManager.getPool()
    
    if (pool) {
      const result = await pgManager.query('SELECT version(), current_database(), current_user')
      health.postgresql = {
        status: 'connected',
        details: {
          connected: pgManager.getStatus().connected,
          version: result.rows[0].version,
          database: result.rows[0].current_database,
          user: result.rows[0].current_user,
          totalConnections: pool.totalCount,
          idleConnections: pool.idleCount,
          waitingConnections: pool.waitingCount
        }
      }
    }
  } catch (error) {
    health.postgresql = { status: 'error', details: { error: error.message } }
  }

  return health
}

// Initialize all database connections
export async function initializeDatabases(): Promise<void> {
  console.log('🚀 Initializing database connections...')

  try {
    // Connect to MongoDB
    const mongoManager = MongoDBManager.getInstance()
    await mongoManager.connect()

    // Connect to Redis
    const redisManager = RedisManager.getInstance()
    await redisManager.connect()

    // Connect to PostgreSQL (optional for now)
    if (process.env.POSTGRES_ENABLED === 'true') {
      const pgManager = PostgreSQLManager.getInstance()
      await pgManager.connect()
    }

    console.log('✅ All database connections initialized successfully')

  } catch (error) {
    console.error('❌ Failed to initialize database connections:', error)
    throw error
  }
}

// Export managers
export const mongoManager = MongoDBManager.getInstance()
export const redisManager = RedisManager.getInstance()
export const postgresManager = PostgreSQLManager.getInstance()

// Export for direct use
export { mongoose, Redis, Pool }