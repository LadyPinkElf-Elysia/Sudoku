export async function onRequestPost({request, env}) {
    const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
    try {
        const { pid, uid } = await request.json()
        if (!pid || !uid) return new Response(JSON.stringify({ ok: false, msg: '缺少必要参数' }), { headers: H })
        const exist = await env.DB.prepare('SELECT pid FROM puzzles WHERE pid = ? AND uid = ?').bind(pid, uid).first()
        if (!exist) return new Response(JSON.stringify({ ok: false, msg: '无权删除' }), { headers: H })
        await env.DB.prepare('DELETE FROM records WHERE pid = ?').bind(pid).run()
        await env.DB.prepare('DELETE FROM puzzles WHERE pid = ?').bind(pid).run()
        return new Response(JSON.stringify({ ok: true }), { headers: H })
    } catch (e) {
        return new Response(JSON.stringify({ ok: false, msg: e.message }), { status: 500, headers: H })
    }
}