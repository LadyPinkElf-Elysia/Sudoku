import { inject } from 'vue'
export const MyPuzzlesPanel = {
    template: `
        <div class="panel">
            <div class="config-header">
                <button class="btn btn-secondary btn-sm" @click="go('menu')">← 返回</button>
                <h2>📋 我的题目</h2>
            </div>
            <div v-if="!cu?.puzzles?.length" class="empty-state"><p>还没有出过题目</p></div>
            <div v-if="cu?.puzzles?.length" class="card-list">
                <div v-for="(puz,i) in cu.puzzles" :key="i" class="my-puzzle-card">
                    <div class="card-header">
                        <span class="puzzle-id">#{{ i }}</span>
                        <span class="puzzle-size">{{ puz.boardSize }}x{{ puz.boardSize }}</span>
                    </div>
                    <div class="card-title">{{ puz.title || '无标题' }}</div>
                    <div class="card-actions">
                        <button class="btn btn-secondary btn-sm" @click="edit(i)">✏️ 修改</button>
                        <button class="btn btn-secondary btn-sm" @click="del(i)">🗑️ 删除</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const ctx = inject('ctx')
        const p = ctx.p
        const cu = ctx.currentUser.val
        function go(page) { ctx.goPage(page) }
        function edit(i) { ctx.editPuzzle(i) }
        function del(i) { if (confirm('确定删除？')) { ctx.delPuzzle(i) } }
        return { p, cu, go, edit, del }
    }
}