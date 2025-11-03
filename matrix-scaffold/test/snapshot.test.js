const request = require('supertest')

const base = 'http://localhost:3000'

describe('POST /api/snapshot/:app', () => {
  jest.setTimeout(30000)

  test('creates a snapshot job and eventually completes', async () => {
    const app = 'admin-dashboard'
    const res = await request(base).post(`/api/snapshot/${app}`).send()
    expect([202,200]).toContain(res.status)
    const id = res.body.id
    expect(id).toBeDefined()

    let meta
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500))
      const r = await request(base).get(`/api/snapshots/${id}`)
      if (r.status === 200) {
        meta = r.body
        if (meta.status === 'completed') break
      }
    }
    expect(meta).toBeDefined()
    expect(meta.status).toBe('completed')
    expect(meta.pngPath).toBeDefined()
    expect(meta.htmlPath).toBeDefined()
  })
})
