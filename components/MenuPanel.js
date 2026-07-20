import { inject } from 'vue'
import { PAGE } from '../config.js'
export const MenuPanel = {
    template: `
        <div class="main-menu">
            <div class="menu-header">
                <h2>🧩 数独</h2>
                <div class="user-info">
                    <span>👤 {{ ctx.currentUser.val?.uname || '游客' }}</span>
                    <button class="btn btn-secondary btn-sm" @click="ctx.doLogout()">退出</button>
                </div>
            </div>
            <div class="menu-section">
                <h3>🎮 游戏模式</h3>
                <div class="menu-options">
                    <div class="menu-card" @click="go('config')">
                        <div class="menu-card-icon">🤖</div>
                        <div class="menu-card-title">系统随机生成</div>
                        <div class="menu-card-desc">由系统自动生成数独题目</div>
                    </div>
                </div>
            </div>
            <div class="menu-section">
                <h3>📝 题目管理</h3>
                <div class="menu-options">
                    <div class="menu-card" @click="create">
                        <div class="menu-card-icon">✏️</div>
                        <div class="menu-card-title">出题</div>
                        <div class="menu-card-desc">创建自己的数独题目</div>
                    </div>
                    <div class="menu-card" @click="myPuzzles">
                        <div class="menu-card-icon">📋</div>
                        <div class="menu-card-title">我的题目</div>
                        <div class="menu-card-desc">查看和修改自己出的题目</div>
                    </div>
                    <div class="menu-card" @click="go('search')">
                        <div class="menu-card-icon">🔍</div>
                        <div class="menu-card-title">搜索题目</div>
                        <div class="menu-card-desc">搜索并挑战其他用户的题目</div>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const ctx = inject('ctx')
        function go(page) { ctx.goPage(page) }
        function create() {
            if (ctx.currentUser.val?.isGuest) {
                alert('⚠️ 游客模式无法出题，请登录或注册账号后使用此功能')
                return
            }
            ctx.initCreate()
        }
        function myPuzzles() { ctx.goPage(PAGE.MY_PUZZLES); ctx.loadMyPuzzles() }
        return { ctx, go, create, myPuzzles }
    }
}