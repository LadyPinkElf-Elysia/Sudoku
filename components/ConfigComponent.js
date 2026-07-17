// ConfigComponent.js - 游戏配置组件
export const ConfigComponent = {
    template: `
        <div class="panel">
            <div class="config-header">
                <button class="btn btn-secondary btn-sm" @click="$emit('back')">← 返回</button>
                <h2>⚙️ 游戏设置</h2>
            </div>
            
            <div class="config-item">
                <label>棋盘大小 ({{ config.boxSizeMin }} - {{ config.boxSizeMax }}):</label>
                <div class="input-group">
                    <input type="number" :value="config.boxSize" :min="config.boxSizeMin" :max="config.boxSizeMax" @input="onNChange">
                    <span class="hint">生成 {{ config.boxSize * config.boxSize }} x {{ config.boxSize * config.boxSize }}</span>
                </div>
            </div>
            <div class="config-item">
                <label>挖空数量 ({{ minBlanks }} ~ {{ maxBlanks }}):</label>
                <div class="input-group">
                    <input type="number" :value="config.blanks" :min="minBlanks" :max="maxBlanks" @input="onBlanksChange">
                </div>
            </div>
            <div class="config-item">
                <label>游戏模式:</label>
                <div class="input-group">
                    <select :value="config.mode" @change="onModeChange">
                        <option value="infinite">♾️ 无限试错模式</option>
                        <option value="limited">⚖️ 有限犯错模式</option>
                    </select>
                </div>
            </div>
            <div class="config-item" v-if="config.mode === 'limited'">
                <label>允许的最大错误次数 ({{ config.errorLimitMin }} - {{ config.errorLimitMax }}):</label>
                <div class="input-group">
                    <input type="number" :value="config.errorLimit" :min="config.errorLimitMin" :max="config.errorLimitMax" @input="onErrorLimitChange">
                </div>
            </div>
            <button class="btn btn-primary btn-block" @click="onStart">🚀 开始游戏</button>
        </div>
    `,
    props: {
        config: { type: Object, required: true },
        minBlanks: { type: Number, default: 0 },
        maxBlanks: { type: Number, default: 0 }
    },
    emits: ['start', 'back', 'update:config'],
    methods: {
        onNChange(e) {
            const val = parseInt(e.target.value) || this.config.boxSizeMin;
            this.$emit('update:config', { ...this.config, boxSize: Math.max(this.config.boxSizeMin, Math.min(this.config.boxSizeMax, val)) });
        },
        onBlanksChange(e) {
            const val = parseInt(e.target.value) || this.minBlanks;
            this.$emit('update:config', { ...this.config, blanks: Math.max(this.minBlanks, Math.min(this.maxBlanks, val)) });
        },
        onModeChange(e) {
            this.$emit('update:config', { ...this.config, mode: e.target.value });
        },
        onErrorLimitChange(e) {
            const val = parseInt(e.target.value) || this.config.errorLimitMin;
            this.$emit('update:config', { ...this.config, errorLimit: Math.max(this.config.errorLimitMin, Math.min(this.config.errorLimitMax, val)) });
        },
        onStart() {
            this.$emit('start');
        }
    }
};