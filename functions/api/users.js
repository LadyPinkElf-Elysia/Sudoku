// functions/api/users.js - 用户 API
const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }

export async function onRequest(context) {
    const { request, env } = context
    const url = new URL(request.url)
    const path = url.pathname.replace('/api/users', '')
    const db = env.DB

    if (request.method === 'OPTIONS') return new Response(null, { headers: H })

    try {
        // POST /api/users/register
        if (request.method === 'POST' && path === '/register') {
            const { uname, upwd } = await request.json()
            if (!uname || !upwd) return new Response(JSON.stringify({ ok: false, msg: '请输入用户名和密码' }), { headers: H })
            const exist = await db.prepare('SELECT uid FROM users WHERE uname = ?').bind(uname).first()
            if (exist) return new Response(JSON.stringify({ ok: false, msg: '用户名已存在' }), { headers: H })
            const r = await db.prepare('INSERT INTO users (uname, upwd, created_at) VALUES (?, ?, ?)').bind(uname, upwd, Date.now()).run()
            return new Response(JSON.stringify({ ok: true, uid: Number(r.meta.last_row_id), msg: '' }), { headers: H })
        }

        // POST /api/users/login
        if (request.method === 'POST' && path === '/login') {
            const { uname, upwd } = await request.json()
            if (!uname || !upwd) return new Response(JSON.stringify({ ok: false, msg: '请输入用户名和密码' }), { headers: H })
            const user = await db.prepare('SELECT uid, uname FROM users WHERE uname = ? AND upwd = ?').bind(uname, upwd).first()
            if (user) return new Response(JSON.stringify({ ok: true, uid: user.uid, msg: '' }), { headers: H })
            return new Response(JSON.stringify({ ok: false, msg: '用户名或密码错误' }), { headers: H })
        }

        // GET /api/users/data?uid=X
        if (request.method === 'GET' && path === '/data') {
            const uid = url.searchParams.get('uid')
            if (!uid) return new Response(JSON.stringify({ ok: false, msg: '缺少用户ID' }), { headers: H })
            const user = await db.prepare('SELECT uname FROM users WHERE uid = ?').bind(uid).first()
            if (!user) return new Response(JSON.stringify({ ok: false, msg: '用户不存在' }), { headers: H })
            const puzzles = await db.prepare('SELECT * FROM puzzles WHERE uid = ? ORDER BY created_at DESC').bind(uid).all()
            const records = await db.prepare('SELECT * FROM records WHERE uid = ? ORDER BY created_at DESC').bind(uid).all()
            return new Response(JSON.stringify({ ok: true, user: { uname: user.uname, puzzles: puzzles.results, records: records.results } }), { headers: H })
        }

        return new Response(JSON.stringify({ ok: false, msg: 'Not Found' }), { status: 404, headers: H })
    } catch (e) {
        return new Response(JSON.stringify({ ok: false, msg: e.message }), { status: 500, headers: H })
    }
}