// UserSystem.js - 用户登录系统（API 版，通过 Cloudflare D1）
export class UserSystem {
    // 注册新用户
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

    // 登录验证
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

    // 搜索用户（按ID或用户名）
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

    // 获取用户信息
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