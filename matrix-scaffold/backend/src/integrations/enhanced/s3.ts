/**
 * Enhanced S3 Integration
 * Global-Ready Architecture with improved S3 integration
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { logger } from '../../config/logger'
import { config } from '../../config/app'
import { uploadText } from '../s3'

export interface S3UploadOptions {
  bucket?: string
  key: string
  contentType?: string
  metadata?: Record<string, string>
  expiresIn?: number
}

export class EnhancedS3Client {
  private client: S3Client
  private defaultBucket: string

  constructor() {
    if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
      logger.warn('AWS credentials not configured, S3 features disabled')
    }

    this.client = new S3Client({
      region: config.aws.region,
      credentials: config.aws.accessKeyId
        ? {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey
          }
        : undefined
    })

    this.defaultBucket = config.aws.s3Bucket || config.aws.snapshotS3Bucket || ''
  }

  async upload(options: S3UploadOptions, content: string | Buffer): Promise<string> {
    try {
      const bucket = options.bucket || this.defaultBucket
      if (!bucket) {
        throw new Error('S3 bucket not configured')
      }

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: options.key,
        Body: typeof content === 'string' ? Buffer.from(content, 'utf8') : content,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata
      })

      await this.client.send(command)

      // Generate public URL
      const url = `https://${bucket}.s3.${config.aws.region}.amazonaws.com/${options.key}`

      logger.info('S3 upload successful', { bucket, key: options.key, url })
      return url
    } catch (error: any) {
      logger.error('S3 upload failed:', error)
      throw error
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600, bucket?: string): Promise<string> {
    try {
      const bucketName = bucket || this.defaultBucket
      if (!bucketName) {
        throw new Error('S3 bucket not configured')
      }

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key
      })

      const url = await getSignedUrl(this.client, command, { expiresIn })
      return url
    } catch (error: any) {
      logger.error('Failed to generate S3 signed URL:', error)
      throw error
    }
  }

  async delete(key: string, bucket?: string): Promise<boolean> {
    try {
      const bucketName = bucket || this.defaultBucket
      if (!bucketName) {
        throw new Error('S3 bucket not configured')
      }

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key
      })

      await this.client.send(command)
      logger.info('S3 delete successful', { bucket: bucketName, key })
      return true
    } catch (error: any) {
      logger.error('S3 delete failed:', error)
      return false
    }
  }
}

// Singleton instance
export const enhancedS3 = new EnhancedS3Client()

