const fs = require('fs')
const puppeteer = require('puppeteer')
// note: script expects Node.js 18+ which provides global `fetch`

async function waitForUrl(url, timeout = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('timeout waiting for ' + url)
}

async function main() {
  const apiBase = process.env.API_BASE || 'http://localhost:3000'
  console.log('Using API base', apiBase)
  await waitForUrl(apiBase + '/api/apps', 15000)
  const appsRes = await fetch(apiBase + '/api/apps')
  const apps = await appsRes.json()
  const slug = (apps && apps[0] && apps[0].slug) || 'admin-dashboard'

  console.log('Triggering run for', slug)
  const runRes = await fetch(apiBase + '/api/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ app: slug }),
  })
  const runData = await runRes.json()
  const id = runData.id
  if (!id) throw new Error('no job id')

  console.log('Polling job', id)
  let job
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500))
    const r = await fetch(`${apiBase}/api/jobs/${id}`)
    if (r.status === 200) {
      job = await r.json()
      if (job.status === 'completed') break
    }
  }
  if (!job || job.status !== 'completed') throw new Error('job did not complete')

  const previewUrl = `${apiBase.replace(/\/+$/, '')}/apps/${slug}`
  console.log('Opening preview', previewUrl)

  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  await page.goto(previewUrl, { waitUntil: 'networkidle2', timeout: 10000 })
  const demoDir = __dirname + '/../demo'
  try { fs.mkdirSync(demoDir) } catch(e){}
  const pngPath = demoDir + '/demo.png'
  const htmlPath = demoDir + '/demo.html'
  await page.screenshot({ path: pngPath, fullPage: true })
  const html = await page.content()
  fs.writeFileSync(htmlPath, html, 'utf8')
  await browser.close()
  console.log('Saved demo:', pngPath, htmlPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
