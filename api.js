// api.js - API 封装（合并 PuzzleStorage + UserSystem）
// 接口约定：所有字段名使用 Fields.js 中的枚举

import { F } from './util/Fields.js';

// ===== 用户系统 =====
export class UserSystem {
    static async register(username, password) {
        try {
            const res = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [F.USERNAME]: username, [F.USER_PASSWORD]: password })
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
                body: JSON.stringify({ [F.USERNAME]: username, [F.USER_PASSWORD]: password })
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
    // 统一返回格式
    static _normalize(puzzle) {
        if (!puzzle) return null;
        return {
            [F.PUZZLE_ID]: puzzle[F.PUZZLE_ID] || puzzle._id,
            [F.TITLE]: puzzle[F.TITLE] || '',
            [F.BOARD_SIZE]: puzzle[F.BOARD_SIZE] || puzzle.board_size || 3,
            [F.USER_ID]: puzzle[F.USER_ID] || puzzle.user_id,
            [F.USERNAME]: puzzle[F.USERNAME] || '',
            [F.PUZZLE_DATA]: puzzle[F.PUZZLE_DATA] || puzzle.puzzle_data,
            [F.CREATED_AT]: puzzle[F.CREATED_AT] || puzzle.created_at,
            stats: puzzle.stats || null
        };
    }

    static async add(userId, username, puzzle, solution, boardSize, title) {
        try {
            const res = await fetch('/api/puzzles/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [F.USER_ID]: userId,
                    [F.USERNAME]: username,
                    [F.PUZZLE_DATA]: JSON.stringify(puzzle),
                    [F.SOLUTION_DATA]: JSON.stringify(solution),
                    [F.BOARD_SIZE]: boardSize,
                    [F.TITLE]: title || ''
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
            return (data.puzzles || []).map(PuzzleStorage._normalize);
        } catch (e) {
            return [];
        }
    }

    static async getRandom() {
        try {
            const res = await fetch('/api/puzzles/random');
            const data = await res.json();
            return PuzzleStorage._normalize(data.puzzle || null);
        } catch (e) {
            return null;
        }
    }

    static async search(query) {
        try {
            const res = await fetch(`/api/puzzles/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            return (data.puzzles || []).map(PuzzleStorage._normalize);
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
                    [F.PUZZLE_ID]: puzzleId,
                    [F.USER_ID]: userId,
                    [F.USERNAME]: username,
                    [F.IS_COMPLETED]: completed,
                    [F.ELAPSED_TIME]: elapsedTime || 0
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
            return (data.puzzles || []).map(PuzzleStorage._normalize);
        } catch (e) {
            return [];
        }
    }

    static async delete(puzzleId, userId) {
        try {
            const res = await fetch('/api/puzzles/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [F.PUZZLE_ID]: puzzleId, [F.USER_ID]: userId })
            });
            return await res.json();
        } catch (e) {
            return { success: false, message: '网络错误，请重试' };
        }
    }

    static async update(puzzleId, userId, puzzle, solution, boardSize, title) {
        try {
            const res = await fetch('/api/puzzles/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [F.PUZZLE_ID]: puzzleId,
                    [F.USER_ID]: userId,
                    [F.PUZZLE_DATA]: JSON.stringify(puzzle),
                    [F.SOLUTION_DATA]: JSON.stringify(solution),
                    [F.BOARD_SIZE]: boardSize,
                    [F.TITLE]: title || ''
                })
            });
            return await res.json();
        } catch (e) {
            return { success: false, message: '网络错误，请重试' };
        }
    }
}