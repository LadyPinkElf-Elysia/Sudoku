export async function onRequestPost({request, env}) {
    const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
    try {
        const { uid, pid, won, elapsed, attempts } = await request.json()
        if (!uid) return new Response(JSON.stringify({ ok: false, msg: '缺少用户ID' }), { headers: H })
        await env.DB.prepare('INSERT INTO records (uid, pid, won, elapsed, attempts, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(uid, pid || null, won ? 1 : 0, elapsed || 0, attempts || 0, Date.now()).run()
        return new Response(JSON.stringify({ ok: true }), { headers: H })
    } catch (e) {
        return new Response(JSON.stringify({ ok: false, msg: e.message }), { status: 500, headers: H })
    }
}