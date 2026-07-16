// Cloudflare Pages Functions - 题目 API
export async function onRequestPost(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/puzzles', '');
    const db = env.DB;

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    try {
        // 添加题目
        if (path === '/add') {
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
    const path = url.pathname.replace('/api/puzzles', '');
    const db = env.DB;

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    try {
        // 获取所有题目
        if (path === '/all') {
            const puzzles = await db.prepare(
                'SELECT * FROM puzzles ORDER BY created_at DESC'
            ).all();
            return new Response(JSON.stringify({
                success: true, puzzles: puzzles.results
            }), { headers });
        }

        // 搜索题目
        if (path === '/search') {
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
                        'SELECT * FROM puzzles WHERE id = ? OR userId = ? OR username LIKE ? OR title LIKE ?'
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
        }

        // 随机获取一道题目
        if (path === '/random') {
            const puzzle = await db.prepare(
                'SELECT * FROM puzzles ORDER BY RANDOM() LIMIT 1'
            ).first();
            return new Response(JSON.stringify({
                success: true, puzzle: puzzle || null
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