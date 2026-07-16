// Cloudflare Pages Functions - 用户注册
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

        // 检查用户名是否已存在
        const existing = await db.prepare(
            'SELECT id FROM users WHERE username = ?'
        ).bind(username).first();

        if (existing) {
            return new Response(JSON.stringify({
                success: false, message: '用户名已存在'
            }), { headers });
        }

        // 插入新用户
        const result = await db.prepare(
            'INSERT INTO users (username, password, created_at) VALUES (?, ?, ?)'
        ).bind(username, password, Date.now()).run();

        return new Response(JSON.stringify({
            success: true,
            user: { id: Number(result.meta.last_row_id), username }
        }), { headers });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false, message: error.message
        }), { status: 500, headers });
    }
}