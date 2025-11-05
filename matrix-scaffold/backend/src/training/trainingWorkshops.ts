/**
 * Phase 10.3 - Training & Workshops
 * 
 * Training portal, workshop management, certification system
 * - Training portal
 * - Workshop management
 * - Certification system
 * - Interactive learning
 * - Progress tracking
 * - Resource library
 */

import { nanoid } from 'nanoid'
import { logger, logError, logInfo } from '../config/logger'

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type WorkshopStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'
export type CertificationStatus = 'not_started' | 'in_progress' | 'completed' | 'expired'

export interface TrainingCourse {
  id: string
  title: string
  description: string
  level: CourseLevel
  duration: number // minutes
  modules: CourseModule[]
  prerequisites: string[] // Course IDs
  instructor: string
  price: number
  currency: string
  isFree: boolean
  enrollments: number
  completionRate: number
  rating: number // 0-5
  createdAt: Date
  updatedAt: Date
}

export interface CourseModule {
  id: string
  title: string
  description: string
  order: number
  content: string // Markdown or HTML
  videoUrl?: string
  exercises: string[] // Exercise IDs
  duration: number // minutes
}

export interface Workshop {
  id: string
  title: string
  description: string
  instructor: string
  date: Date
  duration: number // minutes
  maxParticipants: number
  participants: string[] // User IDs
  status: WorkshopStatus
  recordingUrl?: string
  materials: string[] // File URLs
  createdAt: Date
  updatedAt: Date
}

export interface Certification {
  id: string
  userId: string
  courseId: string
  status: CertificationStatus
  progress: number // 0-100
  completedAt?: Date
  expiresAt?: Date
  certificateUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface LearningProgress {
  id: string
  userId: string
  courseId: string
  moduleId?: string
  progress: number // 0-100
  completedModules: string[] // Module IDs
  timeSpent: number // minutes
  lastAccessed: Date
  createdAt: Date
  updatedAt: Date
}

export interface Resource {
  id: string
  title: string
  description: string
  type: 'video' | 'article' | 'ebook' | 'template' | 'code' | 'other'
  category: string
  url: string
  downloads: number
  views: number
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

class TrainingWorkshopsSystem {
  private courses: Map<string, TrainingCourse> = new Map()
  private workshops: Map<string, Workshop> = new Map()
  private certifications: Map<string, Certification> = new Map()
  private progress: Map<string, LearningProgress> = new Map()
  private resources: Map<string, Resource> = new Map()

  async initialize() {
    logInfo('Initializing Training & Workshops System...')

    // Initialize default resources
    await this.initializeDefaultResources()

    logInfo('✅ Training & Workshops System initialized')
  }

  // Initialize default resources
  private async initializeDefaultResources(): Promise<void> {
    const defaultResources: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: 'Getting Started Guide',
        description: 'Complete guide to get started with Matrix Platform',
        type: 'article',
        category: 'getting-started',
        url: 'https://docs.matrix.ai/getting-started',
        downloads: 0,
        views: 0,
        tags: ['guide', 'tutorial', 'beginner'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'API Basics Video',
        description: 'Video tutorial on using Matrix APIs',
        type: 'video',
        category: 'api',
        url: 'https://youtube.com/watch?v=matrix-api-basics',
        downloads: 0,
        views: 0,
        tags: ['video', 'api', 'tutorial'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    for (const resource of defaultResources) {
      const resourceId = nanoid()
      const now = new Date()

      const resourceConfig: Resource = {
        id: resourceId,
        ...resource,
        createdAt: now,
        updatedAt: now
      }

      this.resources.set(resourceId, resourceConfig)
    }

    logInfo('✅ Default resources initialized')
  }

  // Create course
  async createCourse(
    title: string,
    description: string,
    level: CourseLevel,
    modules: CourseModule[],
    instructor: string,
    price: number = 0,
    currency: string = 'USD',
    prerequisites: string[] = []
  ): Promise<TrainingCourse> {
    try {
      const courseId = nanoid()
      const now = new Date()
      const duration = modules.reduce((sum, m) => sum + m.duration, 0)

      const course: TrainingCourse = {
        id: courseId,
        title,
        description,
        level,
        duration,
        modules,
        prerequisites,
        instructor,
        price,
        currency,
        isFree: price === 0,
        enrollments: 0,
        completionRate: 0,
        rating: 0,
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.trainingCourse.create({
          data: {
            id: courseId,
            title,
            description,
            level,
            duration,
            modules,
            prerequisites,
            instructor,
            price,
            currency,
            isFree: price === 0,
            enrollments: 0,
            completionRate: 0,
            rating: 0,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create course in database' })
      }

      this.courses.set(courseId, course)

      logInfo(`✅ Created course ${courseId}: ${title}`)

      return course
    } catch (error) {
      logError(error as Error, { context: 'Create course' })
      throw error
    }
  }

  // Enroll in course
  async enrollInCourse(userId: string, courseId: string): Promise<Certification> {
    try {
      const course = this.courses.get(courseId)
      if (!course) throw new Error('Course not found')

      const certificationId = nanoid()
      const now = new Date()

      const certification: Certification = {
        id: certificationId,
        userId,
        courseId,
        status: 'in_progress',
        progress: 0,
        createdAt: now,
        updatedAt: now
      }

      // Create progress tracking
      const progressId = nanoid()
      const progress: LearningProgress = {
        id: progressId,
        userId,
        courseId,
        progress: 0,
        completedModules: [],
        timeSpent: 0,
        lastAccessed: now,
        createdAt: now,
        updatedAt: now
      }

      // Update course enrollments
      course.enrollments++
      this.courses.set(courseId, course)

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.certification.create({
          data: {
            id: certificationId,
            userId,
            courseId,
            status: 'in_progress',
            progress: 0,
            completedAt: null,
            expiresAt: null,
            certificateUrl: null,
            createdAt: now,
            updatedAt: now
          }
        })

        await prisma.learningProgress.create({
          data: {
            id: progressId,
            userId,
            courseId,
            moduleId: null,
            progress: 0,
            completedModules: [],
            timeSpent: 0,
            lastAccessed: now,
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Enroll in course in database' })
      }

      this.certifications.set(certificationId, certification)
      this.progress.set(progressId, progress)

      logInfo(`✅ Enrolled user ${userId} in course ${courseId}`)

      return certification
    } catch (error) {
      logError(error as Error, { context: 'Enroll in course' })
      throw error
    }
  }

  // Update progress
  async updateProgress(
    userId: string,
    courseId: string,
    moduleId: string,
    progress: number
  ): Promise<LearningProgress> {
    try {
      const progressRecord = Array.from(this.progress.values()).find(
        p => p.userId === userId && p.courseId === courseId
      )

      if (!progressRecord) throw new Error('Progress not found')

      progressRecord.progress = progress
      progressRecord.moduleId = moduleId
      progressRecord.lastAccessed = new Date()
      progressRecord.updatedAt = new Date()

      if (progress === 100 && !progressRecord.completedModules.includes(moduleId)) {
        progressRecord.completedModules.push(moduleId)
      }

      // Update certification
      const certification = Array.from(this.certifications.values()).find(
        c => c.userId === userId && c.courseId === courseId
      )

      if (certification) {
        certification.progress = progress
        if (progress === 100) {
          certification.status = 'completed'
          certification.completedAt = new Date()
        }
        certification.updatedAt = new Date()
        this.certifications.set(certification.id, certification)
      }

      // Update database
      try {
        const { prisma } = await import('../config/database')
        await prisma.learningProgress.update({
          where: { id: progressRecord.id },
          data: {
            progress,
            moduleId,
            completedModules: progressRecord.completedModules,
            lastAccessed: progressRecord.lastAccessed,
            updatedAt: progressRecord.updatedAt
          }
        })

        if (certification) {
          await prisma.certification.update({
            where: { id: certification.id },
            data: {
              progress,
              status: certification.status,
              completedAt: certification.completedAt,
              updatedAt: certification.updatedAt
            }
          })
        }
      } catch (error) {
        logError(error as Error, { context: 'Update progress in database' })
      }

      this.progress.set(progressRecord.id, progressRecord)

      logInfo(`✅ Updated progress for user ${userId} in course ${courseId}: ${progress}%`)

      return progressRecord
    } catch (error) {
      logError(error as Error, { context: 'Update progress' })
      throw error
    }
  }

  // Create workshop
  async createWorkshop(
    title: string,
    description: string,
    instructor: string,
    date: Date,
    duration: number,
    maxParticipants: number
  ): Promise<Workshop> {
    try {
      const workshopId = nanoid()
      const now = new Date()

      const workshop: Workshop = {
        id: workshopId,
        title,
        description,
        instructor,
        date,
        duration,
        maxParticipants,
        participants: [],
        status: 'scheduled',
        materials: [],
        createdAt: now,
        updatedAt: now
      }

      // Save to database
      try {
        const { prisma } = await import('../config/database')
        await prisma.workshop.create({
          data: {
            id: workshopId,
            title,
            description,
            instructor,
            date,
            duration,
            maxParticipants,
            participants: [],
            status: 'scheduled',
            recordingUrl: null,
            materials: [],
            createdAt: now,
            updatedAt: now
          }
        })
      } catch (error) {
        logError(error as Error, { context: 'Create workshop in database' })
      }

      this.workshops.set(workshopId, workshop)

      logInfo(`✅ Created workshop ${workshopId}: ${title}`)

      return workshop
    } catch (error) {
      logError(error as Error, { context: 'Create workshop' })
      throw error
    }
  }

  // Get courses
  async getCourses(level?: CourseLevel): Promise<TrainingCourse[]> {
    const courses: TrainingCourse[] = []
    for (const course of this.courses.values()) {
      if (level && course.level !== level) continue
      courses.push(course)
    }
    return courses.sort((a, b) => b.enrollments - a.enrollments)
  }

  // Get user certifications
  async getUserCertifications(userId: string): Promise<Certification[]> {
    const certifications: Certification[] = []
    for (const cert of this.certifications.values()) {
      if (cert.userId === userId) {
        certifications.push(cert)
      }
    }
    return certifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Get resources
  async getResources(category?: string, type?: string): Promise<Resource[]> {
    const resources: Resource[] = []
    for (const resource of this.resources.values()) {
      if (category && resource.category !== category) continue
      if (type && resource.type !== type) continue
      resources.push(resource)
    }
    return resources.sort((a, b) => b.views - a.views)
  }
}

export const trainingWorkshopsSystem = new TrainingWorkshopsSystem()

