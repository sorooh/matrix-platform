const request = require('supertest')

const base = 'http://localhost:3000'

describe('GET /api/snapshots?app=', () => {
  jest.setTimeout(30000)
  test('lists snapshots for an app', async () => {
    const app = 'admin-dashboard'
    const res = await request(base).post(`/api/snapshot/${app}`).send()
    expect([200,202]).toContain(res.status)
    const id = res.body.id
    expect(id).toBeDefined()

    // poll until snapshot meta appears in list
    let list
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500))
      const r = await request(base).get(`/api/snapshots?app=${app}`)
      if (r.status === 200 && Array.isArray(r.body) && r.body.length > 0) {
        list = r.body
        if (list.find((m) => m.id === id)) break
      }
    }
    expect(list).toBeDefined()
    expect(list.find((m) => m.id === id)).toBeDefined()
  })
})
