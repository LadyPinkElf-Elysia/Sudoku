// functions/api/puzzles.js - 题目 API
const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }

export async function onRequest(context) {
    const { request, env } = context
    const url = new URL(request.url)
    const path = url.pathname.replace('/api/puzzles', '')
    const db = env.DB

    if (request.method === 'OPTIONS') return new Response(null, { headers: H })

    try {
        // POST /api/puzzles/add
        if (request.method === 'POST' && path === '/add') {
            const { uid, puzzle, solution, title, boardSize } = await request.json()
            if (!uid || !puzzle || !solution) return new Response(JSON.stringify({ ok: false, msg: '缺少必要参数' }), { headers: H })
            const r = await db.prepare('INSERT INTO puzzles (uid, puzzle, solution, title, board_size, created_at) VALUES (?, ?, ?, ?, ?, ?)')
                .bind(uid, puzzle, solution, title || '', boardSize || 3, Date.now()).run()
            return new Response(JSON.stringify({ ok: true, pid: Number(r.meta.last_row_id) }), { headers: H })
        }

        // POST /api/puzzles/delete
        if (request.method === 'POST' && path === '/delete') {
            const { pid, uid } = await request.json()
            if (!pid || !uid) return new Response(JSON.stringify({ ok: false, msg: '缺少必要参数' }), { headers: H })
            const exist = await db.prepare('SELECT pid FROM puzzles WHERE pid = ? AND uid = ?').bind(pid, uid).first()
            if (!exist) return new Response(JSON.stringify({ ok: false, msg: '无权删除' }), { headers: H })
            await db.prepare('DELETE FROM records WHERE pid = ?').bind(pid).run()
            await db.prepare('DELETE FROM puzzles WHERE pid = ?').bind(pid).run()
            return new Response(JSON.stringify({ ok: true }), { headers: H })
        }

        // GET /api/puzzles/all
        if (request.method === 'GET' && path === '/all') {
            const puzzles = await db.prepare('SELECT * FROM puzzles ORDER BY created_at DESC').all()
            return new Response(JSON.stringify({ ok: true, puzzles: puzzles.results }), { headers: H })
        }

        // GET /api/puzzles/byuser?uid=X
        if (request.method === 'GET' && path === '/byuser') {
            const uid = url.searchParams.get('uid')
            if (!uid) return new Response(JSON.stringify({ ok: false, msg: '缺少用户ID' }), { headers: H })
            const puzzles = await db.prepare('SELECT * FROM puzzles WHERE uid = ? ORDER BY created_at DESC').bind(uid).all()
            return new Response(JSON.stringify({ ok: true, puzzles: puzzles.results }), { headers: H })
        }

        // GET /api/puzzles/search?q=X
        if (request.method === 'GET' && path === '/search') {
            const q = url.searchParams.get('q') || ''
            let puzzles
            if (!q) {
                puzzles = await db.prepare('SELECT * FROM puzzles ORDER BY created_at DESC').all()
            } else {
                const idNum = parseInt(q)
                if (!isNaN(idNum)) {
                    puzzles = await db.prepare('SELECT * FROM puzzles WHERE pid = ? OR uid = ? OR title LIKE ?').bind(idNum, idNum, `%${q}%`).all()
                } else {
                    puzzles = await db.prepare('SELECT * FROM puzzles WHERE title LIKE ?').bind(`%${q}%`).all()
                }
            }
            return new Response(JSON.stringify({ ok: true, puzzles: puzzles.results }), { headers: H })
        }

        return new Response(JSON.stringify({ ok: false, msg: 'Not Found' }), { status: 404, headers: H })
    } catch (e) {
        return new Response(JSON.stringify({ ok: false, msg: e.message }), { status: 500, headers: H })
    }
}