// MainMenuComponent.js - 主菜单组件
export const MainMenuComponent = {
    template: `
        <div class="main-menu">
            <div class="menu-header">
                <h2>🧩 数独</h2>
                <div class="user-info">
                    <span>👤 {{ currentUser.username }} (ID: {{ currentUser.id }})</span>
                    <button class="btn btn-secondary btn-sm" @click="$emit('logout')">退出</button>
                </div>
            </div>
            
            <div class="menu-section">
                <h3>🎮 游戏模式</h3>
                <div class="menu-options">
                    <div class="menu-card" @click="$emit('startSystemGame')">
                        <div class="menu-card-icon">🤖</div>
                        <div class="menu-card-title">系统随机生成</div>
                        <div class="menu-card-desc">由系统自动生成数独题目</div>
                    </div>
                    <div class="menu-card" @click="$emit('startRandomUserPuzzle')">
                        <div class="menu-card-icon">🎲</div>
                        <div class="menu-card-title">随机挑战用户题目</div>
                        <div class="menu-card-desc">从所有用户创建的题目中随机选择一道</div>
                    </div>
                </div>
            </div>
            
            <div class="menu-section">
                <h3>📝 题目管理</h3>
                <div class="menu-options">
                    <div class="menu-card" @click="handleCreatePuzzle">
                        <div class="menu-card-icon">✏️</div>
                        <div class="menu-card-title">出题</div>
                        <div class="menu-card-desc">创建自己的数独题目</div>
                    </div>
                    <div class="menu-card" @click="$emit('searchPuzzles')">
                        <div class="menu-card-icon">🔍</div>
                        <div class="menu-card-title">搜索题目</div>
                        <div class="menu-card-desc">搜索并挑战其他用户的题目</div>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: {
        currentUser: { type: Object, required: true }
    },
    emits: ['startSystemGame', 'startRandomUserPuzzle', 'createPuzzle', 'searchPuzzles', 'logout'],
    computed: {
        isGuest() { return this.currentUser && this.currentUser.isGuest; }
    },
    methods: {
        handleCreatePuzzle() {
            if (this.isGuest) {
                alert('⚠️ 游客模式无法出题，请登录或注册账号后使用此功能');
                return;
            }
            this.$emit('createPuzzle');
        }
    }
};