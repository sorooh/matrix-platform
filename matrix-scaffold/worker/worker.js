const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const S3_BUCKET = process.env.SNAPSHOT_S3_BUCKET || process.env.S3_BUCKET || ''
const s3Client = S3_BUCKET ? new S3Client({}) : null

const base = path.join(__dirname, '..', 'matrix-scaffold', 'storage')
const qDir = path.join(base, 'queue')
const metaDir = path.join(base, 'meta')

function listQueue() {
  try { return fs.readdirSync(qDir).filter(f => f.endsWith('.json')) } catch(e){ return [] }
}

async function processJob(file) {
  const p = path.join(qDir, file)
  let job
  try { job = JSON.parse(fs.readFileSync(p, 'utf8')) } catch(e){ return }
  const id = job.id
  const app = job.app
  const outDir = path.join(base, id)
  fs.mkdirSync(outDir, { recursive: true })

  // update meta -> processing
  try {
    const metaPath = path.join(metaDir, `${id}.json`)
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    meta.status = 'processing'
    fs.writeFileSync(metaPath, JSON.stringify(meta), 'utf8')
  } catch(e){}

  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    const url = `http://localhost:3000/apps/${app}`
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 })
    const png = path.join(outDir, 'preview.png')
    const htmlPath = path.join(outDir, 'preview.html')
    await page.screenshot({ path: png, fullPage: true })
    const html = await page.content()
    fs.writeFileSync(htmlPath, html, 'utf8')
    await browser.close()
    const metaPath = path.join(metaDir, `${id}.json`)
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    meta.status = 'completed'
    meta.pngPath = png
    meta.htmlPath = htmlPath

    // if S3 configured, upload artifacts and attach URLs
    if (s3Client && S3_BUCKET) {
      const pngKey = `snapshots/${id}/preview.png`
      const htmlKey = `snapshots/${id}/preview.html`
      // upload png
      const pngBody = fs.readFileSync(png)
      await s3Client.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: pngKey, Body: pngBody, ContentType: 'image/png' }))
      // upload html
      const htmlBody = Buffer.from(html, 'utf8')
      await s3Client.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: htmlKey, Body: htmlBody, ContentType: 'text/html; charset=utf-8' }))

      // generate presigned urls (valid 1 hour)
      try {
        const pngUrl = await getSignedUrl(s3Client, new PutObjectCommand({ Bucket: S3_BUCKET, Key: pngKey }), { expiresIn: 3600 })
        const htmlUrl = await getSignedUrl(s3Client, new PutObjectCommand({ Bucket: S3_BUCKET, Key: htmlKey }), { expiresIn: 3600 })
        meta.pngUrl = pngUrl
        meta.htmlUrl = htmlUrl
      } catch (e) {
        // if presign fails, fall back to object path
        meta.pngUrl = `s3://${S3_BUCKET}/${pngKey}`
        meta.htmlUrl = `s3://${S3_BUCKET}/${htmlKey}`
      }
    }

    fs.writeFileSync(metaPath, JSON.stringify(meta), 'utf8')
  } catch (err) {
    const metaPath = path.join(metaDir, `${id}.json`)
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
      meta.status = 'failed'
      meta.error = String(err)
      fs.writeFileSync(metaPath, JSON.stringify(meta), 'utf8')
    } catch(e){}
  } finally {
    // remove queue file
    try { fs.unlinkSync(p) } catch(e){}
  }
}

async function loop() {
  while (true) {
    const items = listQueue()
    if (items.length === 0) {
      await new Promise(r => setTimeout(r, 1000))
      continue
    }
    for (const f of items) {
      try { await processJob(f) } catch(e){ console.error('job error', e) }
    }
  }
}

console.log('Worker starting, watching', qDir)
loop().catch(err => { console.error(err); process.exit(1) })
