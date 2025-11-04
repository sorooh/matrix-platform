/**
 * Enhanced S3 Integration
 * Phase 2: Integration Hub - Enhanced S3 integration
 * Global-Ready Architecture
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { logger } from '../../config/logger'
import { config } from '../../config/app'
import { Readable } from 'stream'

// Enhanced S3 client
let s3Client: S3Client | null = null

function getS3Client(): S3Client | null {
  if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
    logger.warn('AWS credentials not configured')
    return null
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey
      }
    })
  }

  return s3Client
}

export async function uploadFile(
  key: string,
  content: Buffer | string | Readable,
  contentType: string = 'application/octet-stream',
  bucket?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = getS3Client()
    if (!client) {
      return { success: false, error: 'S3 not configured' }
    }

    const bucketName = bucket || config.aws.s3Bucket || config.aws.snapshotS3Bucket
    if (!bucketName) {
      return { success: false, error: 'S3 bucket not configured' }
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: contentType
    })

    await client.send(command)

    // Generate CDN URL if configured
    const url = config.cdn.url
      ? `${config.cdn.url}/${key}`
      : `https://${bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`

    logger.info(`S3 file uploaded: ${key}`, { bucket: bucketName, url })

    return { success: true, url }
  } catch (error: any) {
    logger.error('S3 uploadFile error:', error)
    return { success: false, error: error.message }
  }
}

export async function getFileUrl(
  key: string,
  expiresIn: number = 3600,
  bucket?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = getS3Client()
    if (!client) {
      return { success: false, error: 'S3 not configured' }
    }

    const bucketName = bucket || config.aws.s3Bucket || config.aws.snapshotS3Bucket
    if (!bucketName) {
      return { success: false, error: 'S3 bucket not configured' }
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    })

    const url = await getSignedUrl(client, command, { expiresIn })

    return { success: true, url }
  } catch (error: any) {
    logger.error('S3 getFileUrl error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteFile(
  key: string,
  bucket?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getS3Client()
    if (!client) {
      return { success: false, error: 'S3 not configured' }
    }

    const bucketName = bucket || config.aws.s3Bucket || config.aws.snapshotS3Bucket
    if (!bucketName) {
      return { success: false, error: 'S3 bucket not configured' }
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    })

    await client.send(command)

    logger.info(`S3 file deleted: ${key}`, { bucket: bucketName })

    return { success: true }
  } catch (error: any) {
    logger.error('S3 deleteFile error:', error)
    return { success: false, error: error.message }
  }
}
