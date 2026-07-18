// api.js - API 封装（合并 PuzzleStorage + UserSystem）
// 接口约定：所有 API 请求和返回都使用此文件定义的格式

// ===== 接口约定 =====
// 请求体字段名（与后端 functions 完全一致）
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

// 返回的题目数据格式（前后端统一）
export function normalizePuzzle(puzzle) {
    if (!puzzle) return null;
    return {
        id: puzzle.id,
        title: puzzle.title || '',
        size: puzzle.size || 9,
        user_id: puzzle.user_id,
        username: puzzle.username || '',
        puzzle_data: puzzle.puzzle_data,
        created_at: puzzle.created_at,
        stats: puzzle.stats || null
    };
}

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
            return { success: false, message: '网络错误，请重试' };
        }
    }

    static async searchUsers(query) {
        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            return data.users || [];
        } catch (e) {
            return [];
        }
    }

    static async getUserInfo(id) {
        try {
            const res = await fetch(`/api/users/search?q=${id}`);
            const data = await res.json();
            return data.users?.[0] || null;
        } catch (e) {
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
            return { success: false, message: '网络错误，请重试' };
        }
    }

    static async getAll() {
        try {
            const res = await fetch('/api/puzzles/all');
            const data = await res.json();
            return (data.puzzles || []).map(normalizePuzzle);
        } catch (e) {
            return [];
        }
    }

    static async getRandom() {
        try {
            const res = await fetch('/api/puzzles/random');
            const data = await res.json();
            return normalizePuzzle(data.puzzle || null);
        } catch (e) {
            return null;
        }
    }

    static async search(query) {
        try {
            const res = await fetch(`/api/puzzles/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            return (data.puzzles || []).map(normalizePuzzle);
        } catch (e) {
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
            return { success: false };
        }
    }

    static async getStats(puzzleId) {
        try {
            const res = await fetch(`/api/puzzles/stats?id=${puzzleId}`);
            const data = await res.json();
            return data.stats || { totalChallenges: 0, completedChallenges: 0 };
        } catch (e) {
            return { totalChallenges: 0, completedChallenges: 0 };
        }
    }

    static async getByUser(userId) {
        try {
            const res = await fetch(`/api/puzzles/byuser?userId=${userId}`);
            const data = await res.json();
            return (data.puzzles || []).map(normalizePuzzle);
        } catch (e) {
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
            return { success: false, message: '网络错误，请重试' };
        }
    }
}