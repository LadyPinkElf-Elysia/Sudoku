// Cloudflare Pages Functions - 用户 API
export async function onRequestPost(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/users', '');
    const db = env.DB;

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    try {
        // 注册
        if (path === '/register') {
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
        }

        // 登录
        if (path === '/login') {
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
        }

        return new Response(JSON.stringify({
            success: false, message: 'Not Found'
        }), { status: 404, headers });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false, message: error.message
        }), { status: 500, headers });
    }
}

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/users', '');
    const db = env.DB;

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    try {
        // 搜索用户
        if (path === '/search') {
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
        }

        return new Response(JSON.stringify({
            success: false, message: 'Not Found'
        }), { status: 404, headers });

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