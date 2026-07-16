// Cloudflare Pages Functions - 搜索用户
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
        let users;

        if (query === '') {
            users = await db.prepare(
                'SELECT id, username FROM users ORDER BY id'
            ).all();
        } else {
            const idNum = parseInt(query);
            if (!isNaN(idNum)) {
                users = await db.prepare(
                    'SELECT id, username FROM users WHERE id = ? OR username LIKE ?'
                ).bind(idNum, `%${query}%`).all();
            } else {
                users = await db.prepare(
                    'SELECT id, username FROM users WHERE username LIKE ?'
                ).bind(`%${query}%`).all();
            }
        }

        return new Response(JSON.stringify({
            success: true, users: users.results
        }), { headers });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false, message: error.message
        }), { status: 500, headers });
    }
}