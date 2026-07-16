// Cloudflare Pages Functions - 题目 API
export async function onRequest(context) {
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

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    try {
        // 添加题目
        if (request.method === 'POST' && path === '/add') {
            const { userId, username, puzzle, solution, SIZE, BOX_SIZE, title } = await request.json();

            if (!userId || !puzzle || !solution) {
                return new Response(JSON.stringify({
                    success: false, message: '缺少必要参数'
                }), { headers });
            }

            const result = await db.prepare(
                `INSERT INTO puzzles (user_id, username, title, puzzle_data, solution_data, size, box_size, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                userId, username,
                title || `${username}的题目`,
                JSON.stringify(puzzle), JSON.stringify(solution),
                SIZE, BOX_SIZE, Date.now()
            ).run();

            return new Response(JSON.stringify({
                success: true, puzzleId: Number(result.meta.last_row_id)
            }), { headers });
        }

        // 获取所有题目
        if (request.method === 'GET' && path === '/all') {
            const puzzles = await db.prepare(
                'SELECT * FROM puzzles ORDER BY created_at DESC'
            ).all();

            const results = puzzles.results.map(p => ({
                id: p.id,
                userId: p.user_id,
                username: p.username,
                title: p.title,
                puzzle: JSON.parse(p.puzzle_data),
                solution: JSON.parse(p.solution_data),
                SIZE: p.size,
                BOX_SIZE: p.box_size,
                createdAt: p.created_at
            }));

            return new Response(JSON.stringify({
                success: true, puzzles: results
            }), { headers });
        }

        // 搜索题目
        if (request.method === 'GET' && path === '/search') {
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

            const results = puzzles.results.map(p => ({
                id: p.id,
                userId: p.user_id,
                username: p.username,
                title: p.title,
                puzzle: JSON.parse(p.puzzle_data),
                solution: JSON.parse(p.solution_data),
                SIZE: p.size,
                BOX_SIZE: p.box_size,
                createdAt: p.created_at
            }));

            return new Response(JSON.stringify({
                success: true, puzzles: results
            }), { headers });
        }

        // 随机获取一道题目
        if (request.method === 'GET' && path === '/random') {
            const puzzle = await db.prepare(
                'SELECT * FROM puzzles ORDER BY RANDOM() LIMIT 1'
            ).first();

            if (puzzle) {
                const result = {
                    id: puzzle.id,
                    userId: puzzle.user_id,
                    username: puzzle.username,
                    title: puzzle.title,
                    puzzle: JSON.parse(puzzle.puzzle_data),
                    solution: JSON.parse(puzzle.solution_data),
                    SIZE: puzzle.size,
                    BOX_SIZE: puzzle.box_size,
                    createdAt: puzzle.created_at
                };
                return new Response(JSON.stringify({
                    success: true, puzzle: result
                }), { headers });
            }

            return new Response(JSON.stringify({
                success: true, puzzle: null
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