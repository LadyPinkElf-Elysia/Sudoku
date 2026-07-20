import { inject, ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { Grid } from '../utils/grid.js'
import { MODE } from '../config.js'
export const CreatePanel = {
    template: `
        <div class="panel">
            <div class="config-header">
                <button class="btn btn-secondary btn-sm" @click="back">← 返回</button>
                <h2>{{ isEdit ? '✏️ 出题 - 点击格子输入数字' : '🧩 解题' }}</h2>
            </div>
            <div v-if="isEdit" class="config-item">
                <label>宫格大小:</label>
                <div class="input-group">
                    <input type="number" v-model.number="bs" :min="2" :max="6" @change="resize">
                    <span class="hint">{{ cs }}x{{ cs }}</span>
                </div>
            </div>
            <div v-if="isEdit" class="zoom-controls" style="margin-bottom:8px;">
                <button class="zoom-btn" @click="zoomOut" :disabled="zoom<=0.5">−</button>
                <span class="zoom-text">{{ Math.round(zoom*100) }}%</span>
                <button class="zoom-btn" @click="zoomIn" :disabled="zoom>=3">+</button>
            </div>
            <div class="board-scroll-container">
                <div class="board-wrapper" :style="{width:(100*zoom)+'%',height:(100*zoom)+'%',transform:'scale('+zoom+')',transformOrigin:'0 0'}">
                    <canvas id="createCanvas" class="board-canvas"></canvas>
                </div>
            </div>
            <div class="num-pad-wrapper">
                <div class="num-grid" :style="{gridTemplateColumns:'repeat('+bs+',minmax(0,1fr))'}">
                    <button v-for="n in cs" :key="n" class="num-btn" @click="input(n)">{{ n }}</button>
                </div>
                <button class="num-btn clear-btn" @click="input(0)">✕</button>
                <div class="action-row">
                    <button class="action-btn" @click="undo" :disabled="ctx.p.stepPtr<=0">↩</button>
                    <button class="action-btn" @click="redo" :disabled="!ctx.p.history[ctx.p.stepPtr+1]">↪</button>
                </div>
            </div>
            <div v-if="isEdit" class="create-actions">
                <button class="btn btn-secondary" @click="clearBoard">清空</button>
                <button class="btn btn-primary" @click="solve">✅ 开始解题</button>
            </div>
            <div v-else class="create-actions">
                <button class="btn btn-secondary" @click="backEdit">← 返回修改</button>
                <button class="btn btn-primary" @click="submit" :disabled="!ctx.p.createDone">📤 提交</button>
            </div>
            <div v-if="showSub" class="victory-overlay">
                <div class="victory-dialog"><h3>✅ 提交成功！</h3><button class="btn btn-primary" @click="back">返回主页面</button></div>
            </div>
        </div>
    `,
    setup() {
        const ctx = inject('ctx')
        const zoom = ref(1)
        const bs = ref(3)
        const cs = computed(() => bs.value * bs.value)
        const isEdit = computed(() => ctx.p.mode === MODE.CREATE && !ctx.p.createDone && !ctx.p.board[0]?.[0]?.value)
        const showSub = ref(false)

        function render() {
            const b = ctx.p.board
            if (!b.length) return
            const s = b.length
            const bx = Math.round(Math.sqrt(s))
            Grid.render('createCanvas', b, s, bx, ctx.p.sel[0], ctx.p.sel[1], zoom.value)
        }
        function clickHandler(e) {
            const b = ctx.p.board
            if (!b.length) return
            const pos = Grid.clickPos(e, 'createCanvas', b.length)
            if (pos) { ctx.p.sel = pos; render() }
        }
        function keyHandler(e) {
            const b = ctx.p.board
            if (!b.length) return
            const s = b.length
            Grid.keyDown(e, {
                started: true, generating: false, complete: false, over: false,
                SIZE: s, sr: ctx.p.sel[0], sc: ctx.p.sel[1]
            }, {
                input: (n) => { ctx.inputNum(n); render() },
                clear: () => { ctx.inputNum(0); render() },
                move: (r, c) => { ctx.p.sel = [r, c]; render() },
                undo: () => { ctx.undo(); render() },
                redo: () => { ctx.redo(); render() },
            })
        }
        function input(n) { ctx.inputNum(n); render() }
        function solve() { ctx.startSolve(); setTimeout(render, 50) }
        function submit() {
            ctx.submitCreate('')
            showSub.value = true
        }
        function back() { ctx.backFromCreate() }
        function backEdit() {
            // 从解题回到编辑
            const nb = Grid.toNum(ctx.p.board)
            ctx.p.board = nb
            ctx.p.history = {}
            ctx.p.stepPtr = -1
            ctx.p.createDone = false
        }
        function clearBoard() {
            const s = cs.value
            ctx.p.board = Grid.empty(s)
            ctx.p.history = {}
            ctx.p.stepPtr = -1
            render()
        }
        function resize() { clearBoard() }
        function zoomIn() { zoom.value = Math.min(3, zoom.value + 0.1); render() }
        function zoomOut() { zoom.value = Math.max(0.5, zoom.value - 0.1); render() }

        onMounted(() => {
            setTimeout(render, 50)
            document.addEventListener('click', clickHandler)
            document.addEventListener('keydown', keyHandler)
        })
        onBeforeUnmount(() => {
            document.removeEventListener('click', clickHandler)
            document.removeEventListener('keydown', keyHandler)
        })

        return { ctx, zoom, bs, cs, isEdit, showSub, input, solve, submit, back, backEdit, clearBoard, resize, zoomIn, zoomOut, undo:()=>{ctx.undo();render()}, redo:()=>{ctx.redo();render()} }
    }
}