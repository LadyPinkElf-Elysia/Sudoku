export async function onRequestGet({request, env}) {
    const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
    try {
        const url = new URL(request.url)
        const q = url.searchParams.get('q') || ''
        let puzzles
        if (!q) {
            puzzles = await env.DB.prepare('SELECT * FROM puzzles ORDER BY created_at DESC').all()
        } else {
            const idNum = parseInt(q)
            if (!isNaN(idNum)) {
                puzzles = await env.DB.prepare('SELECT * FROM puzzles WHERE pid = ? OR uid = ? OR title LIKE ?').bind(idNum, idNum, `%${q}%`).all()
            } else {
                puzzles = await env.DB.prepare('SELECT * FROM puzzles WHERE title LIKE ?').bind(`%${q}%`).all()
            }
        }
        return new Response(JSON.stringify({ ok: true, puzzles: puzzles.results }), { headers: H })
    } catch (e) {
        return new Response(JSON.stringify({ ok: false, msg: e.message }), { status: 500, headers: H })
    }
}