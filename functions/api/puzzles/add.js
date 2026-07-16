// Cloudflare Pages Functions - 添加题目
export async function onRequestPost(context) {
    const { request, env } = context;
    const db = env.DB;

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    try {
        const { userId, username, puzzle, solution, SIZE, BOX_SIZE, title } = await request.json();

        if (!userId || !puzzle || !solution) {
            return new Response(JSON.stringify({
                success: false, message: '缺少必要参数'
            }), { headers });
        }

        const result = await db.prepare(
            'INSERT INTO puzzles (userId, username, puzzle, solution, SIZE, BOX_SIZE, title, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(userId, username || '', puzzle, solution, SIZE || 3, BOX_SIZE || 3, title || '', Date.now()).run();

        return new Response(JSON.stringify({
            success: true,
            puzzle: { id: Number(result.meta.last_row_id) }
        }), { headers });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false, message: error.message
        }), { status: 500, headers });
    }
}