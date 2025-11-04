import { initializeDatabases, mongoManager, postgresManager } from '../database/connection'
import { User, UserRole } from '../models/User'
import { Project, ProjectStatus } from '../models/Project'
import bcrypt from 'bcryptjs'

// Migration interface
interface Migration {
  version: string
  name: string
  up: () => Promise<void>
  down: () => Promise<void>
}

// Migration tracking
interface MigrationRecord {
  version: string
  name: string
  executedAt: Date
  success: boolean
  error?: string
}

class MigrationManager {
  private migrations: Migration[] = []
  
  constructor() {
    this.registerMigrations()
  }

  private registerMigrations() {
    // Initial migration - create admin user and indexes
    this.migrations.push({
      version: '001',
      name: 'Initial setup - Admin user and indexes',
      up: async () => {
        console.log('🚀 Running initial setup migration...')
        
        // Create default admin user
        const adminExists = await User.findOne({ email: 'admin@matrix-platform.com' })
        
        if (!adminExists) {
          const adminUser = new User({
            email: 'admin@matrix-platform.com',
            username: 'admin',
            password: 'Admin123!@#',
            role: UserRole.SUPER_ADMIN,
            isActive: true,
            isEmailVerified: true,
            profile: {
              firstName: 'System',
              lastName: 'Administrator',
              bio: 'Default system administrator account'
            },
            preferences: {
              theme: 'dark',
              language: 'en',
              timezone: 'UTC'
            },
            subscription: {
              plan: 'enterprise',
              status: 'active'
            }
          })
          
          await adminUser.save()
          console.log('✅ Default admin user created')
        }

        // Create MongoDB indexes
        await this.createMongoIndexes()
        
        // Create PostgreSQL tables if enabled
        if (process.env.POSTGRES_ENABLED === 'true') {
          await this.createPostgresTables()
        }
        
        console.log('✅ Initial setup completed')
      },
      down: async () => {
        console.log('⚠️ Rolling back initial setup...')
        await User.deleteOne({ email: 'admin@matrix-platform.com' })
        console.log('✅ Initial setup rollback completed')
      }
    })

    // Add user preferences migration
    this.migrations.push({
      version: '002',
      name: 'Add user preferences and security features',
      up: async () => {
        console.log('🚀 Adding user preferences and security features...')
        
        // Update existing users with new fields
        await User.updateMany(
          { 'preferences.theme': { $exists: false } },
          {
            $set: {
              'preferences.theme': 'auto',
              'preferences.language': 'en',
              'preferences.timezone': 'UTC',
              'preferences.notifications.email': true,
              'preferences.notifications.push': true,
              'preferences.notifications.inApp': true,
              'security.twoFactorEnabled': false,
              'security.loginAttempts': 0,
              'security.lastPasswordChange': new Date()
            }
          }
        )
        
        console.log('✅ User preferences and security features added')
      },
      down: async () => {
        console.log('⚠️ Removing user preferences and security features...')
        await User.updateMany(
          {},
          {
            $unset: {
              'preferences': '',
              'security.twoFactorEnabled': '',
              'security.loginAttempts': '',
              'security.lastPasswordChange': ''
            }
          }
        )
        console.log('✅ User preferences rollback completed')
      }
    })

    // Project analytics migration
    this.migrations.push({
      version: '003',
      name: 'Add project analytics and billing',
      up: async () => {
        console.log('🚀 Adding project analytics and billing...')
        
        await Project.updateMany(
          { 'analytics.totalViews': { $exists: false } },
          {
            $set: {
              'analytics.totalViews': 0,
              'analytics.totalDeployments': 0,
              'analytics.averageBuildTime': 0,
              'analytics.successRate': 100,
              'billing.plan': 'free',
              'billing.usage.builds': 0,
              'billing.usage.bandwidth': 0,
              'billing.usage.storage': 0,
              'billing.usage.functions': 0,
              'billing.limits.buildsPerMonth': 100,
              'billing.limits.bandwidthPerMonth': 100 * 1024 * 1024 * 1024,
              'billing.limits.storageLimit': 1024 * 1024 * 1024,
              'billing.limits.functionsLimit': 10
            }
          }
        )
        
        console.log('✅ Project analytics and billing added')
      },
      down: async () => {
        console.log('⚠️ Removing project analytics and billing...')
        await Project.updateMany(
          {},
          {
            $unset: {
              'analytics': '',
              'billing': ''
            }
          }
        )
        console.log('✅ Project analytics rollback completed')
      }
    })
  }

  private async createMongoIndexes() {
    console.log('📊 Creating MongoDB indexes...')
    
    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true })
    await User.collection.createIndex({ username: 1 }, { unique: true })
    await User.collection.createIndex({ role: 1, isActive: 1 })
    await User.collection.createIndex({ 'subscription.plan': 1, 'subscription.status': 1 })
    await User.collection.createIndex({ createdAt: -1 })
    await User.collection.createIndex({ lastActiveAt: -1 })
    await User.collection.createIndex({ deletedAt: 1 }, { sparse: true })

    // Project indexes
    await Project.collection.createIndex({ slug: 1 }, { unique: true })
    await Project.collection.createIndex({ owner: 1, status: 1 })
    await Project.collection.createIndex({ 'team.members.user': 1 })
    await Project.collection.createIndex({ status: 1, isPublic: 1 })
    await Project.collection.createIndex({ tags: 1 })
    await Project.collection.createIndex({ createdAt: -1 })
    await Project.collection.createIndex({ 'analytics.lastDeployment': -1 })
    await Project.collection.createIndex({ deletedAt: 1 }, { sparse: true })

    console.log('✅ MongoDB indexes created')
  }

  private async createPostgresTables() {
    console.log('🐘 Creating PostgreSQL tables...')
    
    const pgManager = postgresManager
    
    // Billing transactions table
    await pgManager.query(`
      CREATE TABLE IF NOT EXISTS billing_transactions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(24) NOT NULL,
        project_id VARCHAR(24),
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(20) NOT NULL,
        stripe_payment_intent_id VARCHAR(255),
        description TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Usage analytics table
    await pgManager.query(`
      CREATE TABLE IF NOT EXISTS usage_analytics (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(24) NOT NULL,
        project_id VARCHAR(24),
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Audit logs table
    await pgManager.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(24),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(24),
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes
    await pgManager.query('CREATE INDEX IF NOT EXISTS idx_billing_user_id ON billing_transactions(user_id)')
    await pgManager.query('CREATE INDEX IF NOT EXISTS idx_billing_created_at ON billing_transactions(created_at)')
    await pgManager.query('CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage_analytics(user_id)')
    await pgManager.query('CREATE INDEX IF NOT EXISTS idx_usage_created_at ON usage_analytics(created_at)')
    await pgManager.query('CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id)')
    await pgManager.query('CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at)')

    console.log('✅ PostgreSQL tables created')
  }

  async getMigrationStatus(): Promise<MigrationRecord[]> {
    try {
      // Check if migrations collection exists
      const collections = await mongoManager.getStatus()
      if (!collections.connected) {
        throw new Error('MongoDB not connected')
      }

      // Get migration records from MongoDB
      const db = (await import('mongoose')).connection.db
      const migrationsCollection = db.collection('migrations')
      
      return await migrationsCollection.find({}).sort({ version: 1 }).toArray()
    } catch (error) {
      console.error('Error getting migration status:', error)
      return []
    }
  }

  async recordMigration(migration: Migration, success: boolean, error?: string) {
    try {
      const db = (await import('mongoose')).connection.db
      const migrationsCollection = db.collection('migrations')
      
      await migrationsCollection.insertOne({
        version: migration.version,
        name: migration.name,
        executedAt: new Date(),
        success,
        error
      })
    } catch (err) {
      console.error('Error recording migration:', err)
    }
  }

  async runMigrations() {
    console.log('🔄 Starting database migrations...')
    
    const executedMigrations = await this.getMigrationStatus()
    const executedVersions = new Set(executedMigrations.map(m => m.version))

    for (const migration of this.migrations) {
      if (executedVersions.has(migration.version)) {
        console.log(`⏭️ Skipping migration ${migration.version} - already executed`)
        continue
      }

      try {
        console.log(`▶️ Running migration ${migration.version}: ${migration.name}`)
        await migration.up()
        await this.recordMigration(migration, true)
        console.log(`✅ Migration ${migration.version} completed successfully`)
      } catch (error) {
        console.error(`❌ Migration ${migration.version} failed:`, error)
        await this.recordMigration(migration, false, error.message)
        throw error
      }
    }

    console.log('🎉 All migrations completed successfully!')
  }

  async rollbackMigration(version: string) {
    console.log(`🔄 Rolling back migration ${version}...`)
    
    const migration = this.migrations.find(m => m.version === version)
    if (!migration) {
      throw new Error(`Migration ${version} not found`)
    }

    try {
      await migration.down()
      
      // Remove migration record
      const db = (await import('mongoose')).connection.db
      const migrationsCollection = db.collection('migrations')
      await migrationsCollection.deleteOne({ version })
      
      console.log(`✅ Migration ${version} rolled back successfully`)
    } catch (error) {
      console.error(`❌ Rollback failed for migration ${version}:`, error)
      throw error
    }
  }

  async seedData() {
    console.log('🌱 Seeding initial data...')
    
    // Create sample projects for demo
    const adminUser = await User.findOne({ email: 'admin@matrix-platform.com' })
    if (!adminUser) {
      throw new Error('Admin user not found')
    }

    const sampleProjects = [
      {
        name: 'Sample React App',
        slug: 'sample-react-app',
        description: 'A sample React application for demonstration',
        owner: adminUser._id,
        framework: {
          type: 'react',
          version: '18.0.0',
          buildCommand: 'npm run build',
          outputDirectory: 'dist'
        },
        status: ProjectStatus.ACTIVE,
        isPublic: true,
        tags: ['react', 'javascript', 'demo']
      },
      {
        name: 'Next.js Portfolio',
        slug: 'nextjs-portfolio',
        description: 'A Next.js portfolio website',
        owner: adminUser._id,
        framework: {
          type: 'nextjs',
          version: '14.0.0',
          buildCommand: 'npm run build',
          outputDirectory: '.next'
        },
        status: ProjectStatus.ACTIVE,
        isPublic: true,
        tags: ['nextjs', 'react', 'portfolio']
      }
    ]

    for (const projectData of sampleProjects) {
      const existingProject = await Project.findOne({ slug: projectData.slug })
      if (!existingProject) {
        const project = new Project(projectData)
        await project.save()
        console.log(`✅ Created sample project: ${projectData.name}`)
      }
    }

    console.log('🌱 Data seeding completed!')
  }
}

// Export migration manager
export const migrationManager = new MigrationManager()

// CLI commands
export async function migrate() {
  try {
    await initializeDatabases()
    await migrationManager.runMigrations()
    process.exit(0)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

export async function rollback(version: string) {
  try {
    await initializeDatabases()
    await migrationManager.rollbackMigration(version)
    process.exit(0)
  } catch (error) {
    console.error('Rollback failed:', error)
    process.exit(1)
  }
}

export async function seed() {
  try {
    await initializeDatabases()
    await migrationManager.seedData()
    process.exit(0)
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  }
}

// If run directly
if (require.main === module) {
  const command = process.argv[2]
  const version = process.argv[3]

  switch (command) {
    case 'migrate':
      migrate()
      break
    case 'rollback':
      if (!version) {
        console.error('Please provide migration version to rollback')
        process.exit(1)
      }
      rollback(version)
      break
    case 'seed':
      seed()
      break
    default:
      console.log('Available commands: migrate, rollback <version>, seed')
      process.exit(1)
  }
}