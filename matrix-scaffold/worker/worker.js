const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')
let sharp
try {
  sharp = require('sharp')
} catch (e) {
  sharp = null
}
let Jimp
try {
  Jimp = require('jimp')
} catch (e) {
  Jimp = null
}
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const S3_BUCKET = process.env.SNAPSHOT_S3_BUCKET || process.env.S3_BUCKET || ''
const s3Client = S3_BUCKET ? new S3Client({}) : null

const base = path.join(__dirname, '..', 'matrix-scaffold', 'storage')
const qDir = path.join(base, 'queue')
const metaDir = path.join(base, 'meta')

// configuration (env)
const MAX_CONCURRENCY = Math.max(1, parseInt(process.env.SNAPSHOT_MAX_CONCURRENCY || '1', 10))
const RETRY_COUNT = Math.max(0, parseInt(process.env.SNAPSHOT_RETRY_COUNT || '2', 10))
const RETRY_DELAY_MS = Math.max(200, parseInt(process.env.SNAPSHOT_RETRY_DELAY_MS || '1000', 10))

let stopping = false
const inProgress = new Set()

process.on('SIGINT', async () => {
  console.log(JSON.stringify({ level: 'info', msg: 'shutdown.signal', signal: 'SIGINT' }))
  stopping = true
})
process.on('SIGTERM', async () => {
  console.log(JSON.stringify({ level: 'info', msg: 'shutdown.signal', signal: 'SIGTERM' }))
  stopping = true
})

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
  const metaPath = path.join(metaDir, `${id}.json`)
  let attempt = 0
  let lastErr = null
  while (attempt <= RETRY_COUNT) {
    attempt += 1
    let browser = null
    try {
      console.log(JSON.stringify({ level: 'info', msg: 'job.attempt_start', id, app, attempt }))
      browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] })
      const page = await browser.newPage()
      const url = `http://localhost:3000/apps/${app}`
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 })
      const png = path.join(outDir, 'preview.png')
      const thumb = path.join(outDir, 'thumb.jpg')
      const htmlPath = path.join(outDir, 'preview.html')
      // full page screenshot
      await page.screenshot({ path: png, fullPage: true })
      // Always try to produce a proper JPEG thumbnail. Prefer sharp (native),
      // fall back to Jimp (pure JS). If neither is available we'll write the
      // viewport screenshot buffer as a last-resort file (may be PNG data).
      try {
        if (sharp) {
          await sharp(png).resize({ width: 400 }).jpeg({ quality: 78 }).toFile(thumb)
        } else {
          await page.setViewport({ width: 400, height: 300 })
          const buf = await page.screenshot({ fullPage: false })
          if (Jimp) {
            const img = await Jimp.read(buf)
            await img.resize(400, Jimp.AUTO).quality(78).writeAsync(thumb)
          } else {
            // last resort: write PNG buffer to thumb.png (avoid writing PNG bytes into .jpg)
            const thumbPng = path.join(outDir, 'thumb.png')
            fs.writeFileSync(thumbPng, buf)
          }
        }
      } catch (e) {
        // If sharp processing failed after writing preview.png, try a secondary
        // fallback: capture viewport and convert with available tool.
          try {
          await page.setViewport({ width: 400, height: 300 })
          const buf = await page.screenshot({ fullPage: false })
          if (sharp) {
            await sharp(buf).jpeg({ quality: 78 }).toFile(thumb)
          } else if (Jimp) {
            const img = await Jimp.read(buf)
            await img.resize(400, Jimp.AUTO).quality(78).writeAsync(thumb)
          } else {
            const thumbPng = path.join(outDir, 'thumb.png')
            fs.writeFileSync(thumbPng, buf)
          }
        } catch (e2) {
          // ignore thumbnail errors
        }
      }
      const html = await page.content()
      fs.writeFileSync(htmlPath, html, 'utf8')

      // If we only produced a fallback PNG thumbnail, try to convert it to
      // a proper JPEG `thumb.jpg` now. Prefer `sharp` then `Jimp` so CI that
      // includes the pure-JS fallback (Jimp) will still produce a .jpg.
      try {
        const thumbPngPath = path.join(outDir, 'thumb.png')
        // `thumb` variable is defined above as the .jpg path
        if (!fs.existsSync(thumb) && fs.existsSync(thumbPngPath)) {
          if (sharp) {
            await sharp(thumbPngPath).jpeg({ quality: 78 }).toFile(thumb)
            // remove png fallback to keep storage tidy
            try { fs.unlinkSync(thumbPngPath) } catch (e) {}
          } else if (Jimp) {
            const img = await Jimp.read(thumbPngPath)
            await img.quality(78).writeAsync(thumb)
            try { fs.unlinkSync(thumbPngPath) } catch (e) {}
          }
        }
      } catch (convErr) {
        // conversion failed; leave whatever thumbnail exists
      }

      try { await browser.close() } catch(e){}
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  meta.status = 'completed'
  meta.pngPath = png
  // prefer jpg thumb, fall back to png thumb if present
  const thumbPngPath = path.join(outDir, 'thumb.png')
  if (fs.existsSync(thumb)) meta.thumbPath = thumb
  else if (fs.existsSync(thumbPngPath)) meta.thumbPath = thumbPngPath
  else meta.thumbPath = undefined
  meta.htmlPath = htmlPath

      if (s3Client && S3_BUCKET) {
        const pngKey = `snapshots/${id}/preview.png`
        const htmlKey = `snapshots/${id}/preview.html`
        const thumbKey = `snapshots/${id}/thumb.jpg`
        const pngBody = fs.readFileSync(png)
        await s3Client.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: pngKey, Body: pngBody, ContentType: 'image/png' }))
        const htmlBody = Buffer.from(html, 'utf8')
        await s3Client.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: htmlKey, Body: htmlBody, ContentType: 'text/html; charset=utf-8' }))
        try {
          const pngUrl = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: S3_BUCKET, Key: pngKey }), { expiresIn: 3600 })
          const htmlUrl = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: S3_BUCKET, Key: htmlKey }), { expiresIn: 3600 })
          meta.pngUrl = pngUrl
          meta.htmlUrl = htmlUrl
          // upload thumb if available; prefer jpg key but fall back to png key
          const thumbPngKey = `snapshots/${id}/thumb.png`
          if (fs.existsSync(thumb)) {
            const thumbUrl = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: S3_BUCKET, Key: thumbKey }), { expiresIn: 3600 })
            meta.thumbUrl = thumbUrl
          } else if (fs.existsSync(thumbPngPath)) {
            const thumbUrl = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: S3_BUCKET, Key: thumbPngKey }), { expiresIn: 3600 })
            meta.thumbUrl = thumbUrl
          }
        } catch (e) {
          meta.pngUrl = `s3://${S3_BUCKET}/${pngKey}`
          meta.htmlUrl = `s3://${S3_BUCKET}/${htmlKey}`
          if (fs.existsSync(thumb)) meta.thumbUrl = `s3://${S3_BUCKET}/${thumbKey}`
          else if (fs.existsSync(thumbPngPath)) meta.thumbUrl = `s3://${S3_BUCKET}/${thumbPngKey}`
        }
      }

      fs.writeFileSync(metaPath, JSON.stringify(meta), 'utf8')
      lastErr = null
      break
    } catch (err) {
      lastErr = err
      console.error(JSON.stringify({ level: 'warn', msg: 'job.attempt_failed', id, app, attempt, error: String(err) }))
      try {
        const m2 = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
        m2.lastAttempt = attempt
        fs.writeFileSync(metaPath, JSON.stringify(m2), 'utf8')
      } catch (e) {}
      if (attempt <= RETRY_COUNT) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
        continue
      }
    } finally {
      // continue to next attempt or finish
    }
  }
  if (lastErr) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
      meta.status = 'failed'
      meta.error = String(lastErr)
      fs.writeFileSync(metaPath, JSON.stringify(meta), 'utf8')
    } catch(e){}
  }
  // remove queue file
  try { fs.unlinkSync(p) } catch(e){}
}

async function loop() {
  while (!stopping) {
    const items = listQueue()
    if (items.length === 0) {
      await new Promise(r => setTimeout(r, 1000))
      continue
    }
    for (const f of items) {
      if (stopping) break
      if (inProgress.has(f)) continue
      // throttle concurrency
      while (inProgress.size >= MAX_CONCURRENCY) {
        await new Promise(r => setTimeout(r, 200))
        if (stopping) break
      }
      inProgress.add(f)
      // run in background
      processJob(f).then(() => {
        inProgress.delete(f)
      }).catch((err) => {
        inProgress.delete(f)
        console.error(JSON.stringify({ level: 'error', msg: 'job.process_failed', file: f, error: String(err) }))
      })
    }
    // short delay before scanning again
    await new Promise(r => setTimeout(r, 200))
  }
  // graceful shutdown: wait for in-progress jobs
  console.log(JSON.stringify({ level: 'info', msg: 'shutdown.waiting', active: inProgress.size }))
  while (inProgress.size > 0) {
    await new Promise(r => setTimeout(r, 500))
  }
  console.log(JSON.stringify({ level: 'info', msg: 'shutdown.complete' }))
}

console.log('Worker starting, watching', qDir)
loop().catch(err => { console.error(err); process.exit(1) })
