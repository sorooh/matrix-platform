import mongoose, { Schema, Document, Types } from 'mongoose'
import bcrypt from 'bcryptjs'

// User Roles Enum
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  VIEWER = 'viewer'
}

// User Interface
export interface IUser extends Document {
  _id: Types.ObjectId
  email: string
  username: string
  password: string
  role: UserRole
  isActive: boolean
  isEmailVerified: boolean
  profile: {
    firstName?: string
    lastName?: string
    avatar?: string
    bio?: string
    location?: string
    website?: string
    socialLinks?: {
      github?: string
      linkedin?: string
      twitter?: string
    }
  }
  preferences: {
    theme: 'light' | 'dark' | 'auto'
    language: string
    timezone: string
    notifications: {
      email: boolean
      push: boolean
      inApp: boolean
    }
  }
  security: {
    twoFactorEnabled: boolean
    twoFactorSecret?: string
    backupCodes?: string[]
    lastPasswordChange: Date
    loginAttempts: number
    lockUntil?: Date
  }
  subscription: {
    plan: 'free' | 'pro' | 'enterprise'
    status: 'active' | 'cancelled' | 'expired'
    startDate?: Date
    endDate?: Date
    stripeCustomerId?: string
    stripeSubscriptionId?: string
  }
  usage: {
    projectsCreated: number
    deploymentsThisMonth: number
    storageUsed: number // in bytes
    bandwidthUsed: number // in bytes
  }
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
  lastActiveAt?: Date
  deletedAt?: Date
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>
  generatePasswordResetToken(): string
  isAccountLocked(): boolean
}

// User Schema
const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.VIEWER,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  profile: {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    avatar: { type: String },
    bio: { type: String, maxlength: 500 },
    location: { type: String, trim: true },
    website: { type: String, trim: true },
    socialLinks: {
      github: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      twitter: { type: String, trim: true }
    }
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true }
    }
  },
  security: {
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    backupCodes: [{ type: String }],
    lastPasswordChange: { type: Date, default: Date.now },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active',
      index: true
    },
    startDate: { type: Date },
    endDate: { type: Date },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String }
  },
  usage: {
    projectsCreated: { type: Number, default: 0 },
    deploymentsThisMonth: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 },
    bandwidthUsed: { type: Number, default: 0 }
  },
  lastLoginAt: { type: Date },
  lastActiveAt: { type: Date },
  deletedAt: { type: Date, index: true }
}, {
  timestamps: true,
  collection: 'users'
})

// Indexes for performance
UserSchema.index({ email: 1, isActive: 1 })
UserSchema.index({ username: 1, isActive: 1 })
UserSchema.index({ role: 1, isActive: 1 })
UserSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 })
UserSchema.index({ createdAt: -1 })
UserSchema.index({ lastActiveAt: -1 })
UserSchema.index({ deletedAt: 1 }, { sparse: true })

// Pre-save middleware for password hashing
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    this.security.lastPasswordChange = new Date()
    next()
  } catch (error) {
    next(error as Error)
  }
})

// Methods
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

UserSchema.methods.generatePasswordResetToken = function(): string {
  const crypto = require('crypto')
  return crypto.randomBytes(32).toString('hex')
}

UserSchema.methods.isAccountLocked = function(): boolean {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now())
}

// Virtual for full name
UserSchema.virtual('profile.fullName').get(function() {
  const { firstName, lastName } = this.profile
  if (firstName && lastName) return `${firstName} ${lastName}`
  return firstName || lastName || this.username
})

// Soft delete
UserSchema.methods.softDelete = function() {
  this.deletedAt = new Date()
  this.isActive = false
  return this.save()
}

// Static methods
UserSchema.statics.findActive = function() {
  return this.find({ isActive: true, deletedAt: null })
}

UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase(), deletedAt: null })
}

UserSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username, deletedAt: null })
}

// Export model
export const User = mongoose.model<IUser>('User', UserSchema)