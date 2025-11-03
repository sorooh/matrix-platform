const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')

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
