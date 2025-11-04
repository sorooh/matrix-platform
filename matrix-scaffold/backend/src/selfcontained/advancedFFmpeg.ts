/**
 * Advanced FFmpeg Integration
 * Phase 7.2: Professional Enhancements
 * Global-Ready Architecture
 */

import { logger } from '../config/logger'
import { eventBus } from '../core/eventBus'
import { ffmpegManager } from './ffmpegManager'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const execAsync = promisify(exec)

export interface VideoProcessingJob {
  id: string
  type: 'edit' | 'merge' | 'overlay' | 'effects' | 'audio' | 'subtitle' | 'thumbnail'
  input: string | string[]
  output: string
  config: Record<string, unknown>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  startedAt: Date
  completedAt?: Date
  error?: string
}

export interface VideoEffect {
  type: 'filter' | 'transition' | 'overlay' | 'text'
  name: string
  params: Record<string, unknown>
}

export interface StreamingConfig {
  type: 'rtmp' | 'hls' | 'dash'
  url: string
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  bitrate?: number
  resolution?: string
}

export class AdvancedFFmpegIntegration {
  private jobs: Map<string, VideoProcessingJob> = new Map()
  private streams: Map<string, StreamingConfig> = new Map()

  /**
   * Initialize Advanced FFmpeg Integration
   */
  async initialize(): Promise<void> {
    try {
      // Ensure output directory exists
      const outputDir = join(process.cwd(), 'storage', 'video', 'processed')
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
      }

      logger.info('Advanced FFmpeg Integration initialized')
    } catch (error: any) {
      logger.error('Advanced FFmpeg Integration initialization failed:', error)
      throw error
    }
  }

  /**
   * Cut video
   */
  async cutVideo(
    input: string,
    output: string,
    config: {
      start: string // HH:MM:SS or seconds
      duration?: string // HH:MM:SS or seconds
      end?: string // HH:MM:SS or seconds
    }
  ): Promise<string> {
    try {
      const jobId = `cut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      logger.info('Starting video cut', {
        jobId,
        input,
        output,
      })

      const job: VideoProcessingJob = {
        id: jobId,
        type: 'edit',
        input,
        output,
        config: {
          start: config.start,
          duration: config.duration,
          end: config.end,
        },
        status: 'processing',
        progress: 0,
        startedAt: new Date(),
      }

      this.jobs.set(jobId, job)

      // Check FFmpeg availability
      const ffmpegStatus = ffmpegManager.getStatus()
      if (!ffmpegStatus?.available) {
        throw new Error('FFmpeg not available')
      }

      // Build FFmpeg command
      let command = `ffmpeg -i "${input}" -ss ${config.start}`
      if (config.duration) {
        command += ` -t ${config.duration}`
      } else if (config.end) {
        command += ` -to ${config.end}`
      }
      command += ` -c copy "${output}"`

      try {
        await execAsync(command, {
          timeout: 300000, // 5 minutes
        })

        job.status = 'completed'
        job.progress = 100
        job.completedAt = new Date()

        logger.info('Video cut completed', {
          jobId,
          output,
        })

        eventBus.publish('deployment.ffmpeg.video.cut', {
          job,
        })

        return jobId
      } catch (error: any) {
        job.status = 'failed'
        job.error = error.message
        job.completedAt = new Date()

        logger.error('Video cut failed:', {
          jobId,
          error: error.message,
        })

        throw error
      }
    } catch (error: any) {
      logger.error('Cut video failed:', error)
      throw error
    }
  }

  /**
   * Merge videos
   */
  async mergeVideos(inputs: string[], output: string): Promise<string> {
    try {
      const jobId = `merge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      logger.info('Starting video merge', {
        jobId,
        inputs: inputs.length,
        output,
      })

      const job: VideoProcessingJob = {
        id: jobId,
        type: 'merge',
        input: inputs,
        output,
        config: {},
        status: 'processing',
        progress: 0,
        startedAt: new Date(),
      }

      this.jobs.set(jobId, job)

      // Check FFmpeg availability
      const ffmpegStatus = ffmpegManager.getStatus()
      if (!ffmpegStatus?.available) {
        throw new Error('FFmpeg not available')
      }

      // Create concat file
      const concatFile = join(process.cwd(), 'storage', 'video', `concat-${jobId}.txt`)
      const concatContent = inputs.map((input) => `file '${input}'`).join('\n')
      await promisify(require('fs').writeFile)(concatFile, concatContent, 'utf-8')

      // Build FFmpeg command
      const command = `ffmpeg -f concat -safe 0 -i "${concatFile}" -c copy "${output}"`

      try {
        await execAsync(command, {
          timeout: 600000, // 10 minutes
        })

        job.status = 'completed'
        job.progress = 100
        job.completedAt = new Date()

        logger.info('Video merge completed', {
          jobId,
          output,
        })

        eventBus.publish('deployment.ffmpeg.video.merged', {
          job,
        })

        return jobId
      } catch (error: any) {
        job.status = 'failed'
        job.error = error.message
        job.completedAt = new Date()

        logger.error('Video merge failed:', {
          jobId,
          error: error.message,
        })

        throw error
      }
    } catch (error: any) {
      logger.error('Merge videos failed:', error)
      throw error
    }
  }

  /**
   * Apply video effects
   */
  async applyEffects(
    input: string,
    output: string,
    effects: VideoEffect[]
  ): Promise<string> {
    try {
      const jobId = `effects-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      logger.info('Starting video effects', {
        jobId,
        input,
        output,
        effects: effects.length,
      })

      const job: VideoProcessingJob = {
        id: jobId,
        type: 'effects',
        input,
        output,
        config: {
          effects,
        },
        status: 'processing',
        progress: 0,
        startedAt: new Date(),
      }

      this.jobs.set(jobId, job)

      // Check FFmpeg availability
      const ffmpegStatus = ffmpegManager.getStatus()
      if (!ffmpegStatus?.available) {
        throw new Error('FFmpeg not available')
      }

      // Build filter complex from effects
      const filters: string[] = []
      for (const effect of effects) {
        switch (effect.type) {
          case 'filter':
            // Apply video filter
            if (effect.name === 'blur') {
              filters.push(`boxblur=${effect.params.intensity || 5}`)
            } else if (effect.name === 'brightness') {
              filters.push(`eq=brightness=${effect.params.value || 0}`)
            }
            break
          case 'overlay':
            // Overlay image/text
            if (effect.params.image) {
              filters.push(`overlay=${effect.params.x || 0}:${effect.params.y || 0}`)
            }
            break
          case 'text':
            // Add text overlay
            if (effect.params.text) {
              filters.push(
                `drawtext=text='${effect.params.text}':x=${effect.params.x || 10}:y=${effect.params.y || 10}:fontsize=${effect.params.fontSize || 24}`
              )
            }
            break
        }
      }

      // Build FFmpeg command
      let command = `ffmpeg -i "${input}"`
      if (filters.length > 0) {
        command += ` -vf "${filters.join(',')}"`
      }
      command += ` "${output}"`

      try {
        await execAsync(command, {
          timeout: 600000, // 10 minutes
        })

        job.status = 'completed'
        job.progress = 100
        job.completedAt = new Date()

        logger.info('Video effects applied', {
          jobId,
          output,
        })

        eventBus.publish('deployment.ffmpeg.video.effects', {
          job,
        })

        return jobId
      } catch (error: any) {
        job.status = 'failed'
        job.error = error.message
        job.completedAt = new Date()

        logger.error('Video effects failed:', {
          jobId,
          error: error.message,
        })

        throw error
      }
    } catch (error: any) {
      logger.error('Apply effects failed:', error)
      throw error
    }
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(
    input: string,
    output: string,
    config?: {
      time?: string // HH:MM:SS or seconds
      width?: number
      height?: number
    }
  ): Promise<string> {
    try {
      const jobId = `thumbnail-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      logger.info('Generating thumbnail', {
        jobId,
        input,
        output,
      })

      const job: VideoProcessingJob = {
        id: jobId,
        type: 'thumbnail',
        input,
        output,
        config: config || {},
        status: 'processing',
        progress: 0,
        startedAt: new Date(),
      }

      this.jobs.set(jobId, job)

      // Check FFmpeg availability
      const ffmpegStatus = ffmpegManager.getStatus()
      if (!ffmpegStatus?.available) {
        throw new Error('FFmpeg not available')
      }

      // Build FFmpeg command
      let command = `ffmpeg -i "${input}"`
      if (config?.time) {
        command += ` -ss ${config.time}`
      }
      command += ' -vframes 1'
      if (config?.width && config?.height) {
        command += ` -vf scale=${config.width}:${config.height}`
      }
      command += ` "${output}"`

      try {
        await execAsync(command, {
          timeout: 60000, // 1 minute
        })

        job.status = 'completed'
        job.progress = 100
        job.completedAt = new Date()

        logger.info('Thumbnail generated', {
          jobId,
          output,
        })

        eventBus.publish('deployment.ffmpeg.thumbnail.generated', {
          job,
        })

        return jobId
      } catch (error: any) {
        job.status = 'failed'
        job.error = error.message
        job.completedAt = new Date()

        logger.error('Thumbnail generation failed:', {
          jobId,
          error: error.message,
        })

        throw error
      }
    } catch (error: any) {
      logger.error('Generate thumbnail failed:', error)
      throw error
    }
  }

  /**
   * Start streaming
   */
  async startStreaming(
    input: string,
    config: StreamingConfig
  ): Promise<string> {
    try {
      const streamId = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      logger.info('Starting streaming', {
        streamId,
        input,
        type: config.type,
        url: config.url,
      })

      // Check FFmpeg availability
      const ffmpegStatus = ffmpegManager.getStatus()
      if (!ffmpegStatus?.available) {
        throw new Error('FFmpeg not available')
      }

      // Build FFmpeg command based on streaming type
      let command = `ffmpeg -i "${input}"`

      switch (config.type) {
        case 'rtmp':
          command += ` -f flv "${config.url}"`
          break
        case 'hls':
          command += ` -f hls -hls_time 2 -hls_list_size 0 "${config.url}/index.m3u8"`
          break
        case 'dash':
          command += ` -f dash -dash_segment_type mp4 "${config.url}/index.mpd"`
          break
      }

      // Set quality/bitrate
      if (config.bitrate) {
        command += ` -b:v ${config.bitrate}k`
      }
      if (config.resolution) {
        command += ` -vf scale=${config.resolution}`
      }

      // Start streaming in background
      const childProcess = exec(command, {
        timeout: 0, // No timeout for streaming
      })

      this.streams.set(streamId, config)

      logger.info('Streaming started', {
        streamId,
        type: config.type,
      })

      eventBus.publish('deployment.ffmpeg.streaming.started', {
        streamId,
        config,
      })

      return streamId
    } catch (error: any) {
      logger.error('Start streaming failed:', error)
      throw error
    }
  }

  /**
   * Stop streaming
   */
  stopStreaming(streamId: string): void {
    try {
      this.streams.delete(streamId)

      logger.info('Streaming stopped', {
        streamId,
      })

      eventBus.publish('deployment.ffmpeg.streaming.stopped', {
        streamId,
      })
    } catch (error: any) {
      logger.error('Stop streaming failed:', error)
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): VideoProcessingJob | null {
    return this.jobs.get(jobId) || null
  }

  /**
   * Get all jobs
   */
  getAllJobs(): VideoProcessingJob[] {
    return Array.from(this.jobs.values())
  }

  /**
   * Get streaming status
   */
  getStreamingStatus(streamId: string): StreamingConfig | null {
    return this.streams.get(streamId) || null
  }

  /**
   * Get all streams
   */
  getAllStreams(): Array<{ streamId: string; config: StreamingConfig }> {
    return Array.from(this.streams.entries()).map(([streamId, config]) => ({
      streamId,
      config,
    }))
  }
}

// Global Advanced FFmpeg Integration
export const advancedFFmpegIntegration = new AdvancedFFmpegIntegration()

