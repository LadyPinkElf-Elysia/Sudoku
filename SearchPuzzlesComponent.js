// SearchPuzzlesComponent.js - 搜索题目组件
import { PuzzleStorage } from './PuzzleStorage.js';

export const SearchPuzzlesComponent = {
    template: `
        <div class="search-puzzles-panel">
            <div class="config-header">
                <button class="btn btn-secondary btn-sm" @click="$emit('back')">← 返回</button>
                <h2>🔍 搜索题目</h2>
            </div>
            
            <div class="search-bar">
                <input type="text" v-model="searchQuery" @keyup.enter="doSearch" placeholder="搜索题目ID、用户ID、用户名或标题..." style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid #d1d5db;font-size:0.9rem;">
                <button class="btn btn-primary" @click="doSearch">搜索</button>
            </div>
            
            <div v-if="message" class="auth-message" :class="{ success: message.includes('找到') }">{{ message }}</div>
            
            <div v-if="searchResults.length > 0" class="search-results">
                    <div v-for="puzzle in searchResults" :key="puzzle.id" class="puzzle-card" @click="$emit('startPuzzle', puzzle)">
                        <div class="puzzle-card-header">
                            <span class="puzzle-id">#{{ puzzle.id }}</span>
                            <span class="puzzle-size">{{ puzzle.size || puzzle.SIZE }}×{{ puzzle.size || puzzle.SIZE }}</span>
                        </div>
                        <div class="puzzle-card-title">{{ puzzle.title }}</div>
                        <div class="puzzle-card-author">👤 {{ puzzle.username }} (ID: {{ puzzle.user_id || puzzle.userId }})</div>
                        <div class="puzzle-card-date">{{ new Date(puzzle.created_at || puzzle.createdAt).toLocaleDateString() }}</div>
                    </div>
            </div>
            
            <div v-if="searchResults.length === 0 && message && !message.includes('找到')" class="empty-state">
                <p>暂无题目数据</p>
            </div>
        </div>
    `,
    emits: ['back', 'startPuzzle'],
    data() {
        return {
            searchQuery: '',
            searchResults: [],
            message: ''
        };
    },
    methods: {
        async doSearch() {
            this.message = '搜索中...';
            this.searchResults = await PuzzleStorage.search(this.searchQuery);
            if (this.searchResults.length === 0) {
                this.message = '未找到相关题目';
            } else {
                this.message = '找到 ' + this.searchResults.length + ' 道题目';
            }
        }
    },
    async mounted() {
        // 默认显示所有题目
        this.message = '加载中...';
        this.searchResults = await PuzzleStorage.getAll();
        if (this.searchResults.length > 0) {
            this.message = '共 ' + this.searchResults.length + ' 道题目';
        } else {
            this.message = '暂无题目数据';
        }
    }
};