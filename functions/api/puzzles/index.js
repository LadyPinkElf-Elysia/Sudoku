// Cloudflare Pages Functions - 题目 API
// 所有字段名使用 Fields.js 中的枚举

// 内联字段名枚举（避免 import 在 Cloudflare Workers 中失效）
const F = {
    PUZZLE_ID: 'puzzleId',
    USER_ID: 'userId',
    USERNAME: 'username',
    TITLE: 'title',
    PUZZLE_DATA: 'puzzleData',
    SOLUTION_DATA: 'solutionData',
    BOARD_SIZE: 'boardSize',
    CREATED_AT: 'createdAt',
    CHALLENGE_ID: 'challengeId',
    IS_COMPLETED: 'isCompleted',
    ELAPSED_TIME: 'elapsedTime'
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
            const body = await request.json();
            const userId = body[F.USER_ID], username = body[F.USERNAME];
            const puzzleData = body[F.PUZZLE_DATA], solutionData = body[F.SOLUTION_DATA];
            const boardSize = body[F.BOARD_SIZE], title = body[F.TITLE];
            if (!userId || !puzzleData || !solutionData) {
                return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), { headers });
            }
            const result = await db.prepare(
                `INSERT INTO puzzles (user_id, username, puzzle_data, solution_data, board_size, title, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(userId, username || '', puzzleData, solutionData, boardSize || 3, title || '', Date.now()).run();
            return new Response(JSON.stringify({ success: true, puzzle: { [F.PUZZLE_ID]: Number(result.meta.last_row_id) } }), { headers });
        }

        if (path === '/delete') {
            const body = await request.json();
            const puzzleId = body[F.PUZZLE_ID], userId = body[F.USER_ID];
            if (!puzzleId || !userId) {
                return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), { headers });
            }
            const existing = await db.prepare(
                `SELECT * FROM puzzles WHERE _id = ? AND user_id = ?`
            ).bind(puzzleId, userId).first();
            if (!existing) {
                return new Response(JSON.stringify({ success: false, message: '无权删除此题目' }), { headers });
            }
            await db.prepare(`DELETE FROM challenges WHERE puzzle_id = ?`).bind(puzzleId).run();
            await db.prepare(`DELETE FROM puzzles WHERE _id = ?`).bind(puzzleId).run();
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        if (path === '/challenge') {
            const body = await request.json();
            const puzzleId = body[F.PUZZLE_ID], userId = body[F.USER_ID];
            const username = body[F.USERNAME], completed = body[F.IS_COMPLETED], elapsedTime = body[F.ELAPSED_TIME];
            if (!puzzleId || !userId) {
                return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), { headers });
            }
            await db.prepare(
                `INSERT INTO challenges (puzzle_id, user_id, username, is_completed, elapsed_time, created_at) VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(puzzleId, userId, username || '', completed ? 1 : 0, elapsedTime || 0, Date.now()).run();
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        if (path === '/update') {
            const body = await request.json();
            const puzzleId = body[F.PUZZLE_ID], userId = body[F.USER_ID];
            const puzzleData = body[F.PUZZLE_DATA], solutionData = body[F.SOLUTION_DATA];
            const boardSize = body[F.BOARD_SIZE], title = body[F.TITLE];
            if (!puzzleId || !userId || !puzzleData || !solutionData) {
                return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), { headers });
            }
            const existing = await db.prepare(
                `SELECT * FROM puzzles WHERE _id = ? AND user_id = ?`
            ).bind(puzzleId, userId).first();
            if (!existing) {
                return new Response(JSON.stringify({ success: false, message: '无权修改此题目' }), { headers });
            }
            await db.prepare(
                `UPDATE puzzles SET puzzle_data = ?, solution_data = ?, board_size = ?, title = ?, created_at = ? WHERE _id = ?`
            ).bind(puzzleData, solutionData, boardSize || 3, title || '', Date.now(), puzzleId).run();
            await db.prepare(`DELETE FROM challenges WHERE puzzle_id = ?`).bind(puzzleId).run();
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
            const puzzles = await db.prepare(`SELECT * FROM puzzles ORDER BY created_at DESC`).all();
            return new Response(JSON.stringify({ success: true, puzzles: puzzles.results }), { headers });
        }

        if (path === '/search') {
            const query = url.searchParams.get('q') || '';
            let puzzles;
            if (query === '') {
                puzzles = await db.prepare(`SELECT * FROM puzzles ORDER BY created_at DESC`).all();
            } else {
                const idNum = parseInt(query);
                if (!isNaN(idNum)) {
                    puzzles = await db.prepare(
                        `SELECT * FROM puzzles WHERE _id = ? OR user_id = ? OR username LIKE ? OR title LIKE ?`
                    ).bind(idNum, idNum, `%${query}%`, `%${query}%`).all();
                } else {
                    puzzles = await db.prepare(
                        `SELECT * FROM puzzles WHERE username LIKE ? OR title LIKE ?`
                    ).bind(`%${query}%`, `%${query}%`).all();
                }
            }
            return new Response(JSON.stringify({ success: true, puzzles: puzzles.results }), { headers });
        }

        if (path === '/random') {
            const puzzle = await db.prepare(`SELECT * FROM puzzles ORDER BY RANDOM() LIMIT 1`).first();
            return new Response(JSON.stringify({ success: true, puzzle: puzzle || null }), { headers });
        }

        if (path === '/byuser') {
            const userId = url.searchParams.get('userId');
            if (!userId) {
                return new Response(JSON.stringify({ success: false, message: '缺少用户ID' }), { headers });
            }
            const puzzles = await db.prepare(
                `SELECT * FROM puzzles WHERE user_id = ? ORDER BY created_at DESC`
            ).bind(userId).all();
            return new Response(JSON.stringify({ success: true, puzzles: puzzles.results }), { headers });
        }

        if (path === '/stats') {
            const puzzleId = url.searchParams.get('id');
            if (!puzzleId) {
                return new Response(JSON.stringify({ success: false, message: '缺少题目ID' }), { headers });
            }
            const totalResult = await db.prepare(
                `SELECT COUNT(*) as count FROM challenges WHERE puzzle_id = ?`
            ).bind(puzzleId).first();
            const completedResult = await db.prepare(
                `SELECT COUNT(*) as count FROM challenges WHERE puzzle_id = ? AND is_completed = 1`
            ).bind(puzzleId).first();
            const avgTimeResult = await db.prepare(
                `SELECT AVG(elapsed_time) as avg_time FROM challenges WHERE puzzle_id = ? AND is_completed = 1 AND elapsed_time > 0`
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