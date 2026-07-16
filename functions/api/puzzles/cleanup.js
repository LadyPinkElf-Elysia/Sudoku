// Cloudflare Pages Functions - 清理无效题目
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
        // 删除无效的题目（puzzle_data 是空数组或只有 0 的）
        const result = await db.prepare(
            "DELETE FROM puzzles WHERE puzzle_data = '[[0,0,0],[0,0,0],[0,0,0]]' OR puzzle_data = '[]' OR puzzle_data IS NULL"
        ).run();

        return new Response(JSON.stringify({
            success: true,
            deleted: Number(result.meta.changes),
            message: `已删除 ${Number(result.meta.changes)} 条无效题目`
        }), { headers });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false, message: error.message
        }), { status: 500, headers });
    }
}