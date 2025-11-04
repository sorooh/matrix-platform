import mongoose, { Schema, Document, Types } from 'mongoose'

// Project Status Enum
export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

// Deployment Status
export enum DeploymentStatus {
  PENDING = 'pending',
  BUILDING = 'building',
  DEPLOYING = 'deploying',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Environment Types
export enum EnvironmentType {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  PREVIEW = 'preview'
}

// Project Interface
export interface IProject extends Document {
  _id: Types.ObjectId
  name: string
  slug: string
  description?: string
  owner: Types.ObjectId
  team: {
    members: Array<{
      user: Types.ObjectId
      role: 'owner' | 'admin' | 'developer' | 'viewer'
      addedAt: Date
      addedBy: Types.ObjectId
    }>
    invitations: Array<{
      email: string
      role: 'admin' | 'developer' | 'viewer'
      token: string
      expiresAt: Date
      invitedBy: Types.ObjectId
      createdAt: Date
    }>
  }
  repository: {
    provider: 'github' | 'gitlab' | 'bitbucket' | 'manual'
    url?: string
    branch: string
    lastCommit?: {
      sha: string
      message: string
      author: string
      timestamp: Date
    }
    webhookId?: string
    deployKey?: string
  }
  framework: {
    type: 'react' | 'vue' | 'angular' | 'nextjs' | 'nuxtjs' | 'static' | 'custom'
    version?: string
    buildCommand?: string
    outputDirectory?: string
    installCommand?: string
    devCommand?: string
  }
  settings: {
    domain?: {
      custom?: string
      subdomain: string
      ssl: boolean
    }
    environment: {
      variables: Array<{
        key: string
        value: string
        encrypted: boolean
        environments: EnvironmentType[]
      }>
    }
    build: {
      nodeVersion: string
      timeout: number // in minutes
      ignoreCommands?: string[]
    }
    security: {
      passwordProtection?: {
        enabled: boolean
        password?: string
      }
      ipWhitelist?: string[]
      basicAuth?: {
        enabled: boolean
        username?: string
        password?: string
      }
    }
  }
  deployments: Array<{
    id: string
    status: DeploymentStatus
    environment: EnvironmentType
    version: string
    commit: {
      sha: string
      message: string
      author: string
    }
    url?: string
    previewUrl?: string
    logs?: string
    buildTime?: number // in seconds
    size?: number // in bytes
    createdAt: Date
    startedAt?: Date
    completedAt?: Date
    failedAt?: Date
    createdBy: Types.ObjectId
  }>
  analytics: {
    totalViews: number
    totalDeployments: number
    lastDeployment?: Date
    averageBuildTime: number
    successRate: number
  }
  billing: {
    plan: 'free' | 'pro' | 'enterprise'
    usage: {
      builds: number
      bandwidth: number // in bytes
      storage: number // in bytes
      functions: number
    }
    limits: {
      buildsPerMonth: number
      bandwidthPerMonth: number
      storageLimit: number
      functionsLimit: number
    }
  }
  status: ProjectStatus
  isPublic: boolean
  tags: string[]
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

// Project Schema
const ProjectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  team: {
    members: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        enum: ['owner', 'admin', 'developer', 'viewer'],
        required: true
      },
      addedAt: {
        type: Date,
        default: Date.now
      },
      addedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    }],
    invitations: [{
      email: {
        type: String,
        required: true,
        lowercase: true
      },
      role: {
        type: String,
        enum: ['admin', 'developer', 'viewer'],
        required: true
      },
      token: {
        type: String,
        required: true,
        unique: true
      },
      expiresAt: {
        type: Date,
        required: true
      },
      invitedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  repository: {
    provider: {
      type: String,
      enum: ['github', 'gitlab', 'bitbucket', 'manual'],
      default: 'manual'
    },
    url: { type: String },
    branch: {
      type: String,
      default: 'main'
    },
    lastCommit: {
      sha: { type: String },
      message: { type: String },
      author: { type: String },
      timestamp: { type: Date }
    },
    webhookId: { type: String },
    deployKey: { type: String }
  },
  framework: {
    type: {
      type: String,
      enum: ['react', 'vue', 'angular', 'nextjs', 'nuxtjs', 'static', 'custom'],
      default: 'static'
    },
    version: { type: String },
    buildCommand: { type: String },
    outputDirectory: { type: String },
    installCommand: { type: String },
    devCommand: { type: String }
  },
  settings: {
    domain: {
      custom: { type: String },
      subdomain: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
      },
      ssl: {
        type: Boolean,
        default: true
      }
    },
    environment: {
      variables: [{
        key: {
          type: String,
          required: true
        },
        value: {
          type: String,
          required: true
        },
        encrypted: {
          type: Boolean,
          default: false
        },
        environments: [{
          type: String,
          enum: Object.values(EnvironmentType)
        }]
      }]
    },
    build: {
      nodeVersion: {
        type: String,
        default: '18'
      },
      timeout: {
        type: Number,
        default: 10,
        min: 1,
        max: 60
      },
      ignoreCommands: [{ type: String }]
    },
    security: {
      passwordProtection: {
        enabled: { type: Boolean, default: false },
        password: { type: String }
      },
      ipWhitelist: [{ type: String }],
      basicAuth: {
        enabled: { type: Boolean, default: false },
        username: { type: String },
        password: { type: String }
      }
    }
  },
  deployments: [{
    id: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(DeploymentStatus),
      required: true
    },
    environment: {
      type: String,
      enum: Object.values(EnvironmentType),
      required: true
    },
    version: {
      type: String,
      required: true
    },
    commit: {
      sha: { type: String, required: true },
      message: { type: String, required: true },
      author: { type: String, required: true }
    },
    url: { type: String },
    previewUrl: { type: String },
    logs: { type: String },
    buildTime: { type: Number },
    size: { type: Number },
    createdAt: {
      type: Date,
      default: Date.now
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    failedAt: { type: Date },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }],
  analytics: {
    totalViews: { type: Number, default: 0 },
    totalDeployments: { type: Number, default: 0 },
    lastDeployment: { type: Date },
    averageBuildTime: { type: Number, default: 0 },
    successRate: { type: Number, default: 100 }
  },
  billing: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    usage: {
      builds: { type: Number, default: 0 },
      bandwidth: { type: Number, default: 0 },
      storage: { type: Number, default: 0 },
      functions: { type: Number, default: 0 }
    },
    limits: {
      buildsPerMonth: { type: Number, default: 100 },
      bandwidthPerMonth: { type: Number, default: 100 * 1024 * 1024 * 1024 }, // 100GB
      storageLimit: { type: Number, default: 1024 * 1024 * 1024 }, // 1GB
      functionsLimit: { type: Number, default: 10 }
    }
  },
  status: {
    type: String,
    enum: Object.values(ProjectStatus),
    default: ProjectStatus.DRAFT,
    index: true
  },
  isPublic: {
    type: Boolean,
    default: false,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  deletedAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  collection: 'projects'
})

// Indexes for performance
ProjectSchema.index({ owner: 1, status: 1 })
ProjectSchema.index({ 'team.members.user': 1 })
ProjectSchema.index({ slug: 1, deletedAt: 1 })
ProjectSchema.index({ status: 1, isPublic: 1 })
ProjectSchema.index({ tags: 1 })
ProjectSchema.index({ createdAt: -1 })
ProjectSchema.index({ 'analytics.lastDeployment': -1 })
ProjectSchema.index({ deletedAt: 1 }, { sparse: true })

// Pre-save middleware
ProjectSchema.pre('save', function(next) {
  // Generate slug from name if not provided
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
  
  // Set subdomain if not provided
  if (!this.settings?.domain?.subdomain) {
    this.settings = this.settings || {}
    this.settings.domain = this.settings.domain || {}
    this.settings.domain.subdomain = this.slug
  }
  
  next()
})

// Methods
ProjectSchema.methods.addTeamMember = function(userId: Types.ObjectId, role: string, addedBy: Types.ObjectId) {
  this.team.members.push({
    user: userId,
    role,
    addedAt: new Date(),
    addedBy
  })
  return this.save()
}

ProjectSchema.methods.removeTeamMember = function(userId: Types.ObjectId) {
  this.team.members = this.team.members.filter(
    member => !member.user.equals(userId)
  )
  return this.save()
}

ProjectSchema.methods.hasAccess = function(userId: Types.ObjectId, requiredRole?: string) {
  const member = this.team.members.find(m => m.user.equals(userId))
  if (!member) return false
  
  if (!requiredRole) return true
  
  const roleHierarchy = ['viewer', 'developer', 'admin', 'owner']
  const userRoleIndex = roleHierarchy.indexOf(member.role)
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)
  
  return userRoleIndex >= requiredRoleIndex
}

ProjectSchema.methods.softDelete = function() {
  this.deletedAt = new Date()
  this.status = ProjectStatus.DELETED
  return this.save()
}

// Static methods
ProjectSchema.statics.findByOwner = function(userId: Types.ObjectId) {
  return this.find({ owner: userId, deletedAt: null })
}

ProjectSchema.statics.findBySlug = function(slug: string) {
  return this.findOne({ slug, deletedAt: null })
}

ProjectSchema.statics.findByTeamMember = function(userId: Types.ObjectId) {
  return this.find({
    'team.members.user': userId,
    deletedAt: null
  })
}

// Export model
export const Project = mongoose.model<IProject>('Project', ProjectSchema)