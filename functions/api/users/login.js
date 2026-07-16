// Cloudflare Pages Functions - 用户登录
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
        const { username, password } = await request.json();

        if (!username || !password) {
            return new Response(JSON.stringify({
                success: false, message: '请输入用户名和密码'
            }), { headers });
        }

        const user = await db.prepare(
            'SELECT id, username FROM users WHERE username = ? AND password = ?'
        ).bind(username, password).first();

        if (user) {
            return new Response(JSON.stringify({
                success: true, user: { id: user.id, username: user.username }
            }), { headers });
        }
        return new Response(JSON.stringify({
            success: false, message: '用户名或密码错误'
        }), { headers });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false, message: error.message
        }), { status: 500, headers });
    }
}