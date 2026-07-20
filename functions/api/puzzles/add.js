export async function onRequestPost({request, env}) {
    const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
    try {
        const { uid, puzzle, solution, title, boardSize } = await request.json()
        if (!uid || !puzzle || !solution) return new Response(JSON.stringify({ ok: false, msg: '缺少必要参数' }), { headers: H })
        const r = await env.DB.prepare('INSERT INTO puzzles (uid, puzzle, solution, title, board_size, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(uid, puzzle, solution, title || '', boardSize || 3, Date.now()).run()
        return new Response(JSON.stringify({ ok: true, pid: Number(r.meta.last_row_id) }), { headers: H })
    } catch (e) {
        return new Response(JSON.stringify({ ok: false, msg: e.message }), { status: 500, headers: H })
    }
}