import { inject } from 'vue'
export const SearchPanel = {
    template: `
        <div class="panel">
            <div class="config-header">
                <button class="btn btn-secondary btn-sm" @click="go('menu')">← 返回</button>
                <h2>🔍 搜索题目</h2>
            </div>
            <div class="search-bar">
                <input type="text" v-model="p.searchQ" @keyup.enter="doSearch" placeholder="搜索用户..." style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid #d1d5db;font-size:0.9rem;">
                <button class="btn btn-primary" @click="doSearch">搜索</button>
            </div>
            <div v-if="p.searchRes.length>0" class="card-list">
                <div v-for="(item,i) in p.searchRes" :key="i" class="puzzle-card">
                    <div class="card-header">
                        <span class="puzzle-id">#{{ item.pid }}</span>
                        <span class="puzzle-size">{{ item.boardSize }}x{{ item.boardSize }}</span>
                    </div>
                    <div class="card-title">{{ item.title || '无标题' }}</div>
                    <div class="card-author" @click="viewUser(item.uid)">👤 {{ item.uname }}</div>
                    <div class="card-actions"><button class="btn btn-primary btn-sm" @click="play(item)">🚀 挑战</button></div>
                </div>
            </div>
            <div v-else class="empty-state"><p>暂无题目</p></div>
        </div>
    `,
    setup() {
        const ctx = inject('ctx')
        const p = ctx.p
        function go(page) { ctx.goPage(page) }
        function doSearch() { ctx.doSearch() }
        function viewUser(uid) { ctx.viewUser(uid) }
        function play(item) { ctx.playPuzzle(item) }
        return { p, go, doSearch, viewUser, play }
    }
}