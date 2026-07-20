export async function onRequestGet({request, env}) {
    const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
    try {
        const url = new URL(request.url)
        const uid = url.searchParams.get('uid')
        if (!uid) return new Response(JSON.stringify({ ok: false, msg: '缺少用户ID' }), { headers: H })
        const user = await env.DB.prepare('SELECT uname FROM users WHERE uid = ?').bind(uid).first()
        if (!user) return new Response(JSON.stringify({ ok: false, msg: '用户不存在' }), { headers: H })
        const puzzles = await env.DB.prepare('SELECT * FROM puzzles WHERE uid = ? ORDER BY created_at DESC').bind(uid).all()
        const records = await env.DB.prepare('SELECT * FROM records WHERE uid = ? ORDER BY created_at DESC').bind(uid).all()
        return new Response(JSON.stringify({ ok: true, user: { uname: user.uname, puzzles: puzzles.results, records: records.results } }), { headers: H })
    } catch (e) {
        return new Response(JSON.stringify({ ok: false, msg: e.message }), { status: 500, headers: H })
    }
}