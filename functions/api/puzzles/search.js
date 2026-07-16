// Cloudflare Pages Functions - 搜索题目
export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const db = env.DB;

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    try {
        const query = url.searchParams.get('q') || '';
        let puzzles;

        if (query === '') {
            puzzles = await db.prepare(
                'SELECT * FROM puzzles ORDER BY created_at DESC'
            ).all();
        } else {
            const idNum = parseInt(query);
            if (!isNaN(idNum)) {
                puzzles = await db.prepare(
                    'SELECT * FROM puzzles WHERE id = ? OR user_id = ? OR username LIKE ? OR title LIKE ?'
                ).bind(idNum, idNum, `%${query}%`, `%${query}%`).all();
            } else {
                puzzles = await db.prepare(
                    'SELECT * FROM puzzles WHERE username LIKE ? OR title LIKE ?'
                ).bind(`%${query}%`, `%${query}%`).all();
            }
        }

        return new Response(JSON.stringify({
            success: true, puzzles: puzzles.results
        }), { headers });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false, message: error.message
        }), { status: 500, headers });
    }
}