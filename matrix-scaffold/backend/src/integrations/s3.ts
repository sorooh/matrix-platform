import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

let client: S3Client | null = null
function getClient(): S3Client | null {
  const bucket = process.env.S3_BUCKET || process.env.SNAPSHOT_S3_BUCKET
  if (!bucket) return null
  if (!client) client = new S3Client({})
  return client
}

export async function uploadText(key: string, body: string, contentType = 'text/plain'): Promise<void> {
  const bucket = process.env.S3_BUCKET || process.env.SNAPSHOT_S3_BUCKET
  const c = getClient()
  if (!bucket || !c) return
  try {
    await c.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(body, 'utf8'), ContentType: contentType }))
  } catch {}
}


