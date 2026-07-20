export async function onRequestPost({request, env}) {
    const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
    try {
        const { uname, upwd } = await request.json()
        if (!uname || !upwd) return new Response(JSON.stringify({ ok: false, msg: '请输入用户名和密码' }), { headers: H })
        const exist = await env.DB.prepare('SELECT uid FROM users WHERE uname = ?').bind(uname).first()
        if (exist) return new Response(JSON.stringify({ ok: false, msg: '用户名已存在' }), { headers: H })
        const r = await env.DB.prepare('INSERT INTO users (uname, upwd, created_at) VALUES (?, ?, ?)').bind(uname, upwd, Date.now()).run()
        return new Response(JSON.stringify({ ok: true, uid: Number(r.meta.last_row_id) }), { headers: H })
    } catch (e) {
        return new Response(JSON.stringify({ ok: false, msg: e.message }), { status: 500, headers: H })
    }
}