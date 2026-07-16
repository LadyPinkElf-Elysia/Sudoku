// Cloudflare Pages Functions - 获取所有题目
export async function onRequestGet(context) {
    const { request, env } = context;
    const db = env.DB;

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    try {
        const puzzles = await db.prepare(
            'SELECT * FROM puzzles ORDER BY created_at DESC'
        ).all();
        return new Response(JSON.stringify({
            success: true, puzzles: puzzles.results
        }), { headers });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false, message: error.message
        }), { status: 500, headers });
    }
}