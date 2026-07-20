// functions/api/records.js - 游玩记录 API
const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }

export async function onRequest(context) {
    const { request, env } = context
    const url = new URL(request.url)
    const path = url.pathname.replace('/api/records', '')
    const db = env.DB

    if (request.method === 'OPTIONS') return new Response(null, { headers: H })

    try {
        // POST /api/records/add
        if (request.method === 'POST' && path === '/add') {
            const { uid, pid, won, elapsed, attempts } = await request.json()
            if (!uid) return new Response(JSON.stringify({ ok: false, msg: '缺少用户ID' }), { headers: H })
            await db.prepare('INSERT INTO records (uid, pid, won, elapsed, attempts, created_at) VALUES (?, ?, ?, ?, ?, ?)')
                .bind(uid, pid || null, won ? 1 : 0, elapsed || 0, attempts || 0, Date.now()).run()
            return new Response(JSON.stringify({ ok: true }), { headers: H })
        }

        // GET /api/records/byuser?uid=X
        if (request.method === 'GET' && path === '/byuser') {
            const uid = url.searchParams.get('uid')
            if (!uid) return new Response(JSON.stringify({ ok: false, msg: '缺少用户ID' }), { headers: H })
            const records = await db.prepare('SELECT * FROM records WHERE uid = ? ORDER BY created_at DESC').bind(uid).all()
            return new Response(JSON.stringify({ ok: true, records: records.results }), { headers: H })
        }

        return new Response(JSON.stringify({ ok: false, msg: 'Not Found' }), { status: 404, headers: H })
    } catch (e) {
        return new Response(JSON.stringify({ ok: false, msg: e.message }), { status: 500, headers: H })
    }
}