// ConfigComponent.js - 游戏配置组件
export const ConfigComponent = {
    template: `
        <div class="config-panel">
            <div class="config-header">
                <button class="btn btn-secondary btn-sm" @click="$emit('back')">← 返回</button>
                <h2>⚙️ 游戏设置</h2>
            </div>
            
            <div class="config-item">
                <label>棋盘大小 N ({{ config.NMin }} - {{ config.NMax }}):</label>
                <div class="input-group">
                    <input type="number" v-model.number="config.N" :min="config.NMin" :max="config.NMax">
                    <span class="hint">生成 {{ config.N * config.N }} x {{ config.N * config.N }}</span>
                </div>
            </div>
            <div class="config-item">
                <label>挖空数量 ({{ minBlanks }} ~ {{ maxBlanks }}):</label>
                <div class="input-group">
                    <input type="number" v-model.number="config.blanks" :min="minBlanks" :max="maxBlanks">
                </div>
            </div>
            <div class="config-item">
                <label>游戏模式:</label>
                <div class="input-group">
                    <select v-model="config.mode">
                        <option value="infinite">♾️ 无限试错模式</option>
                        <option value="limited">⚖️ 有限犯错模式</option>
                    </select>
                </div>
            </div>
            <div class="config-item" v-if="config.mode === 'limited'">
                <label>允许的最大错误次数 ({{ config.errorLimitMin }} - {{ config.errorLimitMax }}):</label>
                <div class="input-group">
                    <input type="number" v-model.number="config.errorLimit" :min="config.errorLimitMin" :max="config.errorLimitMax">
                </div>
            </div>
            <button class="btn btn-primary btn-block" @click="$emit('start')">🚀 开始游戏</button>
        </div>
    `,
    props: {
        config: { type: Object, required: true },
        minBlanks: { type: Number, default: 0 },
        maxBlanks: { type: Number, default: 0 }
    },
    emits: ['start', 'back']
};