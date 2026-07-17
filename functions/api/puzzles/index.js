// Cloudflare Pages Functions - 题目 API

// 数据库字段名枚举（唯一来源：与 schema.sql 完全一致）
const DB = {
    // puzzles 表
    P: {
        TABLE: 'puzzles',
        ID: 'id',
        USER_ID: 'user_id',
        USERNAME: 'username',
        TITLE: 'title',
        PUZZLE_DATA: 'puzzle_data',
        SOLUTION_DATA: 'solution_data',
        SIZE: 'size',
        BOX_SIZE: 'box_size',
        CREATED_AT: 'created_at'
    },
    // challenges 表
    C: {
        TABLE: 'challenges',
        ID: 'id',
        PUZZLE_ID: 'puzzle_id',
        USER_ID: 'user_id',
        USERNAME: 'username',
        COMPLETED: 'completed',
        ELAPSED_TIME: 'elapsed_time',
        CREATED_AT: 'created_at'
    }
};

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

export async function onRequestPost(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/puzzles', '');
    const db = env.DB;

    try {
        if (path === '/add') {
            const { userId, username, puzzle, solution, SIZE, BOX_SIZE, title } = await request.json();
            if (!userId || !puzzle || !solution) {
                return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), { headers });
            }
            const result = await db.prepare(
                `INSERT INTO ${DB.P.TABLE} (${DB.P.USER_ID}, ${DB.P.USERNAME}, ${DB.P.PUZZLE_DATA}, ${DB.P.SOLUTION_DATA}, ${DB.P.SIZE}, ${DB.P.BOX_SIZE}, ${DB.P.TITLE}, ${DB.P.CREATED_AT}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(userId, username || '', puzzle, solution, SIZE || 3, BOX_SIZE || 3, title || '', Date.now()).run();
            return new Response(JSON.stringify({ success: true, puzzle: { id: Number(result.meta.last_row_id) } }), { headers });
        }

        if (path === '/challenge') {
            const { puzzleId, userId, username, completed, elapsedTime } = await request.json();
            if (!puzzleId || !userId) {
                return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), { headers });
            }
            await db.prepare(
                `INSERT INTO ${DB.C.TABLE} (${DB.C.PUZZLE_ID}, ${DB.C.USER_ID}, ${DB.C.USERNAME}, ${DB.C.COMPLETED}, ${DB.C.ELAPSED_TIME}, ${DB.C.CREATED_AT}) VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(puzzleId, userId, username || '', completed ? 1 : 0, elapsedTime || 0, Date.now()).run();
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        if (path === '/update') {
            const { puzzleId, userId, puzzle, solution, SIZE, BOX_SIZE, title } = await request.json();
            if (!puzzleId || !userId || !puzzle || !solution) {
                return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), { headers });
            }
            const existing = await db.prepare(
                `SELECT * FROM ${DB.P.TABLE} WHERE ${DB.P.ID} = ? AND ${DB.P.USER_ID} = ?`
            ).bind(puzzleId, userId).first();
            if (!existing) {
                return new Response(JSON.stringify({ success: false, message: '无权修改此题目' }), { headers });
            }
            await db.prepare(
                `UPDATE ${DB.P.TABLE} SET ${DB.P.PUZZLE_DATA} = ?, ${DB.P.SOLUTION_DATA} = ?, ${DB.P.SIZE} = ?, ${DB.P.BOX_SIZE} = ?, ${DB.P.TITLE} = ?, ${DB.P.CREATED_AT} = ? WHERE ${DB.P.ID} = ?`
            ).bind(puzzle, solution, SIZE || 3, BOX_SIZE || 3, title || '', Date.now(), puzzleId).run();
            await db.prepare(`DELETE FROM ${DB.C.TABLE} WHERE ${DB.C.PUZZLE_ID} = ?`).bind(puzzleId).run();
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        return new Response(JSON.stringify({ success: false, message: 'Not Found' }), { status: 404, headers });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
    }
}

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/puzzles', '');
    const db = env.DB;

    try {
        if (path === '/all') {
            const puzzles = await db.prepare(`SELECT * FROM ${DB.P.TABLE} ORDER BY ${DB.P.CREATED_AT} DESC`).all();
            return new Response(JSON.stringify({ success: true, puzzles: puzzles.results }), { headers });
        }

        if (path === '/search') {
            const query = url.searchParams.get('q') || '';
            let puzzles;
            if (query === '') {
                puzzles = await db.prepare(`SELECT * FROM ${DB.P.TABLE} ORDER BY ${DB.P.CREATED_AT} DESC`).all();
            } else {
                const idNum = parseInt(query);
                if (!isNaN(idNum)) {
                    puzzles = await db.prepare(
                        `SELECT * FROM ${DB.P.TABLE} WHERE ${DB.P.ID} = ? OR ${DB.P.USER_ID} = ? OR ${DB.P.USERNAME} LIKE ? OR ${DB.P.TITLE} LIKE ?`
                    ).bind(idNum, idNum, `%${query}%`, `%${query}%`).all();
                } else {
                    puzzles = await db.prepare(
                        `SELECT * FROM ${DB.P.TABLE} WHERE ${DB.P.USERNAME} LIKE ? OR ${DB.P.TITLE} LIKE ?`
                    ).bind(`%${query}%`, `%${query}%`).all();
                }
            }
            return new Response(JSON.stringify({ success: true, puzzles: puzzles.results }), { headers });
        }

        if (path === '/random') {
            const puzzle = await db.prepare(`SELECT * FROM ${DB.P.TABLE} ORDER BY RANDOM() LIMIT 1`).first();
            return new Response(JSON.stringify({ success: true, puzzle: puzzle || null }), { headers });
        }

        if (path === '/byuser') {
            const userId = url.searchParams.get('userId');
            if (!userId) {
                return new Response(JSON.stringify({ success: false, message: '缺少用户ID' }), { headers });
            }
            const puzzles = await db.prepare(
                `SELECT * FROM ${DB.P.TABLE} WHERE ${DB.P.USER_ID} = ? ORDER BY ${DB.P.CREATED_AT} DESC`
            ).bind(userId).all();
            return new Response(JSON.stringify({ success: true, puzzles: puzzles.results }), { headers });
        }

        if (path === '/stats') {
            const puzzleId = url.searchParams.get('id');
            if (!puzzleId) {
                return new Response(JSON.stringify({ success: false, message: '缺少题目ID' }), { headers });
            }
            const totalResult = await db.prepare(
                `SELECT COUNT(*) as count FROM ${DB.C.TABLE} WHERE ${DB.C.PUZZLE_ID} = ?`
            ).bind(puzzleId).first();
            const completedResult = await db.prepare(
                `SELECT COUNT(*) as count FROM ${DB.C.TABLE} WHERE ${DB.C.PUZZLE_ID} = ? AND ${DB.C.COMPLETED} = 1`
            ).bind(puzzleId).first();
            const avgTimeResult = await db.prepare(
                `SELECT AVG(${DB.C.ELAPSED_TIME}) as avg_time FROM ${DB.C.TABLE} WHERE ${DB.C.PUZZLE_ID} = ? AND ${DB.C.COMPLETED} = 1 AND ${DB.C.ELAPSED_TIME} > 0`
            ).bind(puzzleId).first();
            return new Response(JSON.stringify({
                success: true,
                stats: {
                    totalChallenges: Number(totalResult.count),
                    completedChallenges: Number(completedResult.count),
                    avgTime: avgTimeResult?.avg_time ? Math.round(Number(avgTimeResult.avg_time)) : 0
                }
            }), { headers });
        }

        return new Response(JSON.stringify({ success: false, message: 'Not Found' }), { status: 404, headers });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
    }
}

export async function onRequestOptions(context) {
    return new Response(null, { headers });
}
