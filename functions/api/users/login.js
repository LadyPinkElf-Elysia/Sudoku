export async function onRequestPost({request, env}) {
    const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
    try {
        const { uname, upwd } = await request.json()
        if (!uname || !upwd) return new Response(JSON.stringify({ ok: false, msg: '请输入用户名和密码' }), { headers: H })
        const user = await env.DB.prepare('SELECT uid, uname FROM users WHERE uname = ? AND upwd = ?').bind(uname, upwd).first()
        if (user) return new Response(JSON.stringify({ ok: true, uid: user.uid }), { headers: H })
        return new Response(JSON.stringify({ ok: false, msg: '用户名或密码错误' }), { headers: H })
    } catch (e) {
        return new Response(JSON.stringify({ ok: false, msg: e.message }), { status: 500, headers: H })
    }
}