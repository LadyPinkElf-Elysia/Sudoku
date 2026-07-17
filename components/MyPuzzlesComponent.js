// MyPuzzlesComponent.js - 我的题目面板（纯 UI 层，API 调用由父组件处理）
export const MyPuzzlesComponent = {
    template: `
        <div class="panel">
            <div class="config-header">
                <button class="btn btn-secondary btn-sm" @click="$emit('back')">← 返回</button>
                <h2>{{ isReadonly ? '👤 用户题目' : '📋 我的题目' }}</h2>
            </div>

            <div v-if="message" class="auth-message" :class="{ success: message.includes('成功') }">{{ message }}</div>

            <div v-if="puzzles.length === 0 && !loading" class="empty-state">
                <p>{{ isReadonly ? '该用户还没有出过题目' : '你还没有出过题目' }}</p>
            </div>

            <div v-if="loading" class="empty-state">
                <p>加载中...</p>
            </div>

            <div v-if="puzzles.length > 0" class="card-list">
                <div v-for="puzzle in puzzles" :key="puzzle.id" class="my-puzzle-card">
                    <div class="card-header">
                        <span class="puzzle-id">#{{ puzzle.id }}</span>
                        <span class="puzzle-size">{{ puzzle.size || puzzle.SIZE }}×{{ puzzle.size || puzzle.SIZE }}</span>
                    </div>
                    <div class="card-title">{{ puzzle.title || '无标题' }}</div>
                    <div class="card-date">{{ new Date(puzzle.created_at || puzzle.createdAt).toLocaleDateString() }}</div>
                    
                    <!-- 统计数据 -->
                    <div class="card-stats" v-if="puzzle.stats">
                        <span>👥 {{ puzzle.stats.totalChallenges }}</span>
                        <span>✅ {{ puzzle.stats.completedChallenges }}</span>
                        <span>📊 {{ puzzle.stats.passRate }}</span>
                        <span v-if="puzzle.stats.avgTime > 0">⏱️ {{ puzzle.stats.avgTimeFormatted }}</span>
                    </div>

                    <div class="card-actions" v-if="!isReadonly">
                        <button class="btn btn-secondary btn-sm" @click="$emit('edit-puzzle', puzzle)">✏️ 修改</button>
                        <button class="btn btn-secondary btn-sm" @click="deletePuzzle(puzzle)">🗑️ 删除</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: {
        currentUser: { type: Object, required: true },
        viewUserId: { type: Number, default: null },
        puzzles: { type: Array, default: () => [] },
        message: { type: String, default: '' },
        loading: { type: Boolean, default: false }
    },
    emits: ['back', 'edit-puzzle', 'delete-puzzle'],
    computed: {
        isReadonly() { return this.viewUserId !== null && this.viewUserId !== this.currentUser.id; }
    },
    methods: {
        deletePuzzle(puzzle) {
            if (confirm(`确定要删除题目 #${puzzle.id} 吗？此操作不可撤销。`)) {
                this.$emit('delete-puzzle', puzzle);
            }
        }
    }
};
