import { inject, ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { Grid } from '../utils/grid.js'
import { Generator } from '../utils/generator.js'
export const GamePanel = {
    template: `
        <div class="game-area">
            <div class="status-bar">
                <div class="status-left">
                    <button class="btn btn-secondary btn-sm" @click="back">← 返回</button>
                    <h2>{{ sizeLabel }}</h2>
                </div>
                <div class="zoom-controls">
                    <button class="zoom-btn" @click="zoomOut" :disabled="zoom<=0.5">−</button>
                    <span class="zoom-text">{{ Math.round(zoom*100) }}%</span>
                    <button class="zoom-btn" @click="zoomIn" :disabled="zoom>=3">+</button>
                </div>
                <div class="status-right">
                    <button class="btn btn-secondary" @click="reset">🔄 重设</button>
                </div>
            </div>
            <div class="board-scroll-container">
                <div class="board-wrapper" :style="{width:(100*zoom)+'%',height:(100*zoom)+'%',transform:'scale('+zoom+')',transformOrigin:'0 0'}">
                    <canvas id="gameCanvas" class="board-canvas"></canvas>
                </div>
            </div>
            <div class="num-pad-wrapper">
                <div class="num-grid" :style="{gridTemplateColumns:'repeat('+boxSize+',minmax(0,1fr))'}">
                    <button v-for="n in size" :key="n" class="num-btn" @click="input(n)">{{ n }}</button>
                </div>
                <button class="num-btn clear-btn" @click="input(0)">✕</button>
                <div class="action-row">
                    <button class="action-btn" @click="undo" :disabled="ctx.p.stepPtr<=0">↩</button>
                    <button class="action-btn" @click="redo" :disabled="!ctx.p.history[ctx.p.stepPtr+1]">↪</button>
                    <button class="action-btn" @click="hint">💡</button>
                </div>
            </div>
            <div v-if="ctx.p.msg.text" class="hint-box">{{ ctx.p.msg.text }}</div>
            <div class="loading-overlay" v-if="ctx.p.status==='generating'">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">正在生成...</div>
                    <button class="btn btn-secondary" style="margin-top:16px;color:#fff;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.5);" @click="cancelGen">取消</button>
                </div>
            </div>
            <div class="victory-overlay" v-if="ctx.p.status==='won'">
                <div class="victory-dialog"><h3>🎉 恭喜完成！</h3><button class="btn btn-primary" @click="back">返回菜单</button></div>
            </div>
        </div>
    `,
    setup() {
        const ctx = inject('ctx')
        const zoom = ref(1)
        const size = computed(() => ctx.p.board.length || 9)
        const boxSize = computed(() => Math.round(Math.sqrt(size.value)))
        const sizeLabel = computed(() => size.value + '×' + size.value)

        function render() {
            Grid.render('gameCanvas', ctx.p.board, size.value, boxSize.value, ctx.p.sel[0], ctx.p.sel[1], zoom.value)
        }

        // 监听 board 变化自动重绘
        watch(() => ctx.p.board, () => setTimeout(render, 50), { deep: true })
        watch(() => ctx.p.status, (v) => { if (v === 'playing') setTimeout(render, 50) })

        function clickHandler(e) {
            const pos = Grid.clickPos(e, 'gameCanvas', size.value)
            if (pos) { ctx.p.sel = pos; render() }
        }
        function keyHandler(e) {
            Grid.keyDown(e, {
                started: ctx.p.status === 'playing',
                generating: ctx.p.status === 'generating',
                complete: ctx.p.status === 'won',
                over: false,
                SIZE: size.value,
                sr: ctx.p.sel[0], sc: ctx.p.sel[1]
            }, {
                input: (n) => { ctx.inputNum(n); render() },
                clear: () => { ctx.inputNum(0); render() },
                move: (r, c) => { ctx.p.sel = [r, c]; render() },
                undo: () => { ctx.undo(); render() },
                redo: () => { ctx.redo(); render() },
            })
        }
        function input(n) { ctx.inputNum(n); render() }
        function hint() { ctx.giveHint() }
        function cancelGen() { ctx.startGame = null; Generator.abort(); ctx.p.status = 'idle'; ctx.goPage('menu') }
        function back() { ctx.goPage('menu') }
        function reset() { ctx.goPage('menu') }
        function zoomIn() { zoom.value = Math.min(3, zoom.value + 0.1); render() }
        function zoomOut() { zoom.value = Math.max(0.5, zoom.value - 0.1); render() }

        onMounted(() => {
            setTimeout(render, 100)
            document.addEventListener('click', clickHandler)
            document.addEventListener('keydown', keyHandler)
        })
        onBeforeUnmount(() => {
            document.removeEventListener('click', clickHandler)
            document.removeEventListener('keydown', keyHandler)
        })

        return { ctx, zoom, size, boxSize, sizeLabel, input, undo:()=>{ctx.undo();render()}, redo:()=>{ctx.redo();render()}, hint, cancelGen, back, reset, zoomIn, zoomOut }
    }
}