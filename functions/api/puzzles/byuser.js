// Cloudflare Pages Functions - 获取用户的所有题目
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
        const userId = url.searchParams.get('userId');
        if (!userId) {
            return new Response(JSON.stringify({
                success: false, message: '缺少用户ID'
            }), { headers });
        }

        const puzzles = await db.prepare(
            'SELECT * FROM puzzles WHERE user_id = ? ORDER BY created_at DESC'
        ).bind(userId).all();

        return new Response(JSON.stringify({
            success: true, puzzles: puzzles.results
        }), { headers });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false, message: error.message
        }), { status: 500, headers });
    }
}

export async function onRequestOptions(context) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
    return new Response(null, { headers });
}
