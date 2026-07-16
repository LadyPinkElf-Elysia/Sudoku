// Cloudflare Pages Functions - 随机获取一道题目
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
        const puzzle = await db.prepare(
            'SELECT * FROM puzzles ORDER BY RANDOM() LIMIT 1'
        ).first();
        return new Response(JSON.stringify({
            success: true, puzzle: puzzle || null
        }), { headers });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false, message: error.message
        }), { status: 500, headers });
    }
}