// MyPuzzlesComponent.js - 我的题目面板
import { PuzzleStorage } from '../api.js';
import { FormatUtils } from '../util/FormatUtils.js';

export const MyPuzzlesComponent = {
    template: `
        <div class="my-puzzles-panel">
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

            <div v-if="puzzles.length > 0" class="my-puzzles-list">
                <div v-for="puzzle in puzzles" :key="puzzle.id" class="my-puzzle-card">
                    <div class="my-puzzle-header">
                        <span class="puzzle-id">#{{ puzzle.id }}</span>
                        <span class="puzzle-size">{{ puzzle.size || puzzle.SIZE }}×{{ puzzle.size || puzzle.SIZE }}</span>
                    </div>
                    <div class="my-puzzle-title">{{ puzzle.title || '无标题' }}</div>
                    <div class="my-puzzle-date">{{ new Date(puzzle.created_at || puzzle.createdAt).toLocaleDateString() }}</div>
                    
                    <!-- 统计数据 -->
                    <div class="my-puzzle-stats" v-if="puzzle.stats">
                        <span>👥 {{ puzzle.stats.totalChallenges }}</span>
                        <span>✅ {{ puzzle.stats.completedChallenges }}</span>
                        <span>📊 {{ puzzle.stats.passRate }}</span>
                        <span v-if="puzzle.stats.avgTime > 0">⏱️ {{ puzzle.stats.avgTimeFormatted }}</span>
                    </div>

                    <div class="my-puzzle-actions" v-if="!isReadonly">
                        <button class="btn btn-secondary btn-sm" @click="editPuzzle(puzzle)">✏️ 修改</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: {
        currentUser: { type: Object, required: true },
        viewUserId: { type: Number, default: null }
    },
    emits: ['back', 'editPuzzle'],
    computed: {
        isReadonly() { return this.viewUserId !== null && this.viewUserId !== this.currentUser.id; },
        targetUserId() { return this.isReadonly ? this.viewUserId : this.currentUser.id; }
    },
    data() {
        return {
            puzzles: [],
            message: '',
            loading: true
        };
    },
    methods: {
        async loadPuzzles() {
            this.loading = true;
            this.puzzles = await PuzzleStorage.getByUser(this.targetUserId);
            
            // 加载每个题目的统计
            for (const puzzle of this.puzzles) {
                const stats = await PuzzleStorage.getStats(puzzle.id);
                puzzle.stats = FormatUtils.formatStats(stats);
            }
            this.loading = false;
        },
        editPuzzle(puzzle) {
            // 如果有挑战数据，确认是否要修改
            if (puzzle.stats && puzzle.stats.totalChallenges > 0) {
                const confirmMsg = `⚠️ 此题目已有 ${puzzle.stats.totalChallenges} 人挑战，${puzzle.stats.completedChallenges} 人通过。\n\n修改后所有挑战数据将被重置，请谨慎操作！\n\n确定要修改吗？`;
                if (!confirm(confirmMsg)) return;
            }
            this.$emit('editPuzzle', puzzle);
        }
    },
    async mounted() {
        await this.loadPuzzles();
    }
};