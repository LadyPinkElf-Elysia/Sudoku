// api.js - API 封装（合并 PuzzleStorage + UserSystem）

// 请求体字段名枚举（与后端解构变量名完全一致）
export const REQ = {
    USERNAME: 'username',
    PASSWORD: 'password',
    USER_ID: 'userId',
    PUZZLE: 'puzzle',
    SOLUTION: 'solution',
    SIZE: 'SIZE',
    BOX_SIZE: 'BOX_SIZE',
    TITLE: 'title',
    PUZZLE_ID: 'puzzleId',
    COMPLETED: 'completed',
    ELAPSED_TIME: 'elapsedTime'
};

// ===== 用户系统 =====
export class UserSystem {
    static async register(username, password) {
        try {
            const res = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [REQ.USERNAME]: username, [REQ.PASSWORD]: password })
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
                body: JSON.stringify({ [REQ.USERNAME]: username, [REQ.PASSWORD]: password })
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
                    [REQ.USER_ID]: userId,
                    [REQ.USERNAME]: username,
                    [REQ.PUZZLE]: JSON.stringify(puzzle),
                    [REQ.SOLUTION]: JSON.stringify(solution),
                    [REQ.SIZE]: SIZE,
                    [REQ.BOX_SIZE]: BOX_SIZE,
                    [REQ.TITLE]: title || ''
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

    static async recordChallenge(puzzleId, userId, username, completed, elapsedTime) {
        try {
            const res = await fetch('/api/puzzles/challenge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [REQ.PUZZLE_ID]: puzzleId,
                    [REQ.USER_ID]: userId,
                    [REQ.USERNAME]: username,
                    [REQ.COMPLETED]: completed,
                    [REQ.ELAPSED_TIME]: elapsedTime || 0
                })
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

    static async getByUser(userId) {
        try {
            const res = await fetch(`/api/puzzles/byuser?userId=${userId}`);
            const data = await res.json();
            return data.puzzles || [];
        } catch (e) {
            console.error('获取用户题目失败:', e);
            return [];
        }
    }

    static async delete(puzzleId, userId) {
        try {
            const res = await fetch('/api/puzzles/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [REQ.PUZZLE_ID]: puzzleId, [REQ.USER_ID]: userId })
            });
            return await res.json();
        } catch (e) {
            console.error('删除题目失败:', e);
            return { success: false, message: '网络错误，请重试' };
        }
    }

    static async update(puzzleId, userId, puzzle, solution, SIZE, BOX_SIZE, title) {
        try {
            const res = await fetch('/api/puzzles/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [REQ.PUZZLE_ID]: puzzleId,
                    [REQ.USER_ID]: userId,
                    [REQ.PUZZLE]: JSON.stringify(puzzle),
                    [REQ.SOLUTION]: JSON.stringify(solution),
                    [REQ.SIZE]: SIZE,
                    [REQ.BOX_SIZE]: BOX_SIZE,
                    [REQ.TITLE]: title || ''
                })
            });
            return await res.json();
        } catch (e) {
            console.error('更新题目失败:', e);
            return { success: false, message: '网络错误，请重试' };
        }
    }
}
