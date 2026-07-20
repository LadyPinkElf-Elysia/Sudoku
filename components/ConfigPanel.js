import { ref, inject, computed } from 'vue'
export const ConfigPanel = {
    template: `
        <div class="panel">
            <div class="config-header">
                <button class="btn btn-secondary btn-sm" @click="back">← 返回</button>
                <h2>⚙️ 游戏设置</h2>
            </div>
            <div class="config-item">
                <label>宫格大小 ({{ minB }} - {{ maxB }}):</label>
                <div class="input-group">
                    <input type="number" v-model.number="boxSize" :min="minB" :max="maxB">
                    <span class="hint">{{ size }}x{{ size }}</span>
                </div>
            </div>
            <div class="config-item">
                <label>挖空数 ({{ minK }} - {{ maxK }}):</label>
                <div class="input-group">
                    <input type="number" v-model.number="blanks" :min="minK" :max="maxK">
                </div>
            </div>
            <button class="btn btn-primary btn-block" @click="start">🚀 开始游戏</button>
        </div>
    `,
    setup() {
        const ctx = inject('ctx')
        const boxSize = ref(3)
        const blanks = ref(10)
        const minB = 3, maxB = 6
        const size = computed(() => boxSize.value * boxSize.value)
        const total = computed(() => size.value * size.value)
        const minK = computed(() => Math.ceil(total.value * 0.1))
        const maxK = computed(() => Math.floor(total.value * 0.4))
        function back() { ctx.goPage('menu') }
        function start() {
            ctx.setConfig({ boxSize: boxSize.value, blanks: blanks.value })
            ctx.startGame()
        }
        return { ctx, boxSize, blanks, minB, maxB, size, minK, maxK, back, start }
    }
}