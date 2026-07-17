// api.js - API 封装（合并 PuzzleStorage + UserSystem）

// ===== 用户系统 =====
export class UserSystem {
    static async register(username, password) {
        try {
            const res = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            return await res.json();
        } catch (e) {
            console.error('注册失败:', e);
            return { success: false, message: '网络错误，请重试' };
        }
    }

    static async login(username, password) {
        try {
            const res = await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            return await res.json();
        } catch (e) {
            console.error('登录失败:', e);
            return { success: false, message: '网络错误，请重试' };
        }
    }

    static async searchUsers(query) {
        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            return data.users || [];
        } catch (e) {
            console.error('搜索用户失败:', e);
            return [];
        }
    }

    static async getUserInfo(id) {
        try {
            const res = await fetch(`/api/users/search?q=${id}`);
            const data = await res.json();
            return data.users?.[0] || null;
        } catch (e) {
            console.error('获取用户信息失败:', e);
            return null;
        }
    }
}

// ===== 题目存储 =====
export class PuzzleStorage {
    static async add(userId, username, puzzle, solution, SIZE, BOX_SIZE, title) {
        try {
            const res = await fetch('/api/puzzles/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    username,
                    puzzle: JSON.stringify(puzzle),
                    solution: JSON.stringify(solution),
                    size: SIZE,
                    box_size: BOX_SIZE,
                    title: title || ''
                })
            });
            return await res.json();
        } catch (e) {
            console.error('保存题目失败:', e);
            return { success: false, message: '网络错误，请重试' };
        }
    }

    static async getAll() {
        try {
            const res = await fetch('/api/puzzles/all');
            const data = await res.json();
            return data.puzzles || [];
        } catch (e) {
            console.error('获取题目列表失败:', e);
            return [];
        }
    }

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

    static async recordChallenge(puzzleId, userId, username, completed) {
        try {
            const res = await fetch('/api/puzzles/challenge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ puzzleId, userId, username, completed })
            });
            return await res.json();
        } catch (e) {
            console.error('记录挑战失败:', e);
            return { success: false };
        }
    }

    static async getStats(puzzleId) {
        try {
            const res = await fetch(`/api/puzzles/stats?id=${puzzleId}`);
            const data = await res.json();
            return data.stats || { totalChallenges: 0, completedChallenges: 0 };
        } catch (e) {
            console.error('获取统计失败:', e);
            return { totalChallenges: 0, completedChallenges: 0 };
        }
    }
}
