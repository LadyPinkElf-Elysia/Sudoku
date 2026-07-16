// PuzzleStorage.js - 用户题目存储（API 版，通过 Cloudflare D1）
export class PuzzleStorage {
    // 获取所有题目
    static async getAll() {
        try {
            const res = await fetch('/api/puzzles/all');
            const data = await res.json();
            return data.puzzles || [];
        } catch (e) {
            console.error('获取题目失败:', e);
            return [];
        }
    }

    // 添加题目
    static async add(userId, username, puzzle, solution, SIZE, BOX_SIZE, title) {
        try {
            const res = await fetch('/api/puzzles/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, username, puzzle, solution, SIZE, BOX_SIZE, title })
            });
            return await res.json();
        } catch (e) {
            console.error('添加题目失败:', e);
            return { success: false, message: '网络错误，请重试' };
        }
    }

    // 按ID获取题目
    static async getById(id) {
        try {
            const res = await fetch(`/api/puzzles/search?q=${id}`);
            const data = await res.json();
            return data.puzzles?.[0] || null;
        } catch (e) {
            console.error('获取题目失败:', e);
            return null;
        }
    }

    // 搜索题目（按用户ID、用户名、题目ID、标题）
    static async search(query) {
        try {
            const res = await fetch(`/api/puzzles/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            return data.puzzles || [];
        } catch (e) {
            console.error('搜索题目失败:', e);
            return [];
        }
    }

    // 获取某个用户的所有题目
    static async getByUserId(userId) {
        try {
            const res = await fetch(`/api/puzzles/search?q=${userId}`);
            const data = await res.json();
            return data.puzzles?.filter(p => p.user_id === userId) || [];
        } catch (e) {
            console.error('获取用户题目失败:', e);
            return [];
        }
    }

    // 随机获取一道题目
    static async getRandom() {
        try {
            const res = await fetch('/api/puzzles/random');
            const data = await res.json();
            return data.puzzle || null;
        } catch (e) {
            console.error('获取随机题目失败:', e);
            return null;
        }
    }
}