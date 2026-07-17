// SearchPuzzlesComponent.js - 搜索题目组件（纯 UI 层，API 调用由父组件处理）
export const SearchPuzzlesComponent = {
    template: `
        <div class="panel">
            <div class="config-header">
                <button class="btn btn-secondary btn-sm" @click="$emit('back')">← 返回</button>
                <h2>🔍 搜索题目</h2>
            </div>
            
            <div class="search-bar">
                <input type="text" :value="searchQuery" @input="$emit('update:searchQuery', $event.target.value)" @keyup.enter="$emit('search')" placeholder="搜索题目ID、用户ID、用户名或标题..." style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid #d1d5db;font-size:0.9rem;">
                <button class="btn btn-primary" @click="$emit('search')">搜索</button>
            </div>
            
            <div v-if="displayMessage" class="auth-message" :class="{ success: displayMessage.includes('道题目') }">{{ displayMessage }}</div>
            
            <div v-if="searchResults.length > 0" class="card-list">
                    <div v-for="puzzle in searchResults" :key="puzzle.id" class="puzzle-card" @click="startPuzzle(puzzle)">
                        <div class="card-header">
                            <span class="puzzle-id">#{{ puzzle.id }}</span>
                            <span class="puzzle-size">{{ puzzle.size || puzzle.SIZE }}×{{ puzzle.size || puzzle.SIZE }}</span>
                        </div>
                        <div class="card-title">{{ puzzle.title }}</div>
                        <div class="card-author" @click.stop="$emit('viewUserPuzzles', puzzle.user_id || puzzle.userId)">👤 {{ puzzle.username }} (ID: {{ puzzle.user_id || puzzle.userId }})</div>
                        <div class="card-stats" v-if="puzzle.stats">
                            <span>👥 {{ puzzle.stats.totalChallenges }}</span>
                            <span>✅ {{ puzzle.stats.completedChallenges }}</span>
                            <span>📊 {{ puzzle.stats.passRate }}</span>
                            <span v-if="puzzle.stats.avgTime > 0">⏱️ {{ puzzle.stats.avgTimeFormatted }}</span>
                        </div>
                        <div class="card-date">{{ new Date(puzzle.created_at || puzzle.createdAt).toLocaleDateString() }}</div>
                    </div>
            </div>
            
            <div v-if="searchResults.length === 0 && message && !message.includes('找到')" class="empty-state">
                <p>暂无题目数据</p>
            </div>
        </div>
    `,
    props: {
        searchQuery: { type: String, default: '' },
        searchResults: { type: Array, default: () => [] },
        message: { type: String, default: '' }
    },
    emits: ['back', 'startPuzzle', 'viewUserPuzzles', 'search', 'update:searchQuery', 'startPuzzleError'],
    computed: {
        displayMessage() {
            if (this.message) return this.message;
            if (this.searchResults.length > 0) return '共 ' + this.searchResults.length + ' 道题目';
            return '暂无题目数据';
        }
    },
    methods: {
        startPuzzle(puzzle) {
            const str = puzzle.puzzle_data || puzzle.puzzle;
            let parsed;
            if (typeof str === 'string') {
                try { parsed = JSON.parse(str); } catch (e) { parsed = []; }
            } else {
                parsed = str;
            }
            if (!Array.isArray(parsed) || parsed.length === 0) {
                this.$emit('startPuzzleError', '题目数据无效，无法开始游戏');
                return;
            }
            this.$emit('startPuzzle', puzzle);
        }
    }
};
