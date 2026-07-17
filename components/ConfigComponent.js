// ConfigComponent.js - 游戏配置组件
import { GameStateManager } from '../util/GameStateManager.js';

export const ConfigComponent = {
    template: `
        <div class="panel">
            <div class="config-header">
                <button class="btn btn-secondary btn-sm" @click="$emit('back')">← 返回</button>
                <h2>⚙️ 游戏设置</h2>
            </div>
            
            <div class="config-item">
                <label>棋盘大小 N ({{ config.NMin }} - {{ config.NMax }}):</label>
                <div class="input-group">
                    <input type="number" :value="config.N" :min="config.NMin" :max="config.NMax" @input="onNChange">
                    <span class="hint">生成 {{ config.N * config.N }} x {{ config.N * config.N }}</span>
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
            const val = parseInt(e.target.value) || this.config.NMin;
            const validated = GameStateManager.validateN(val, this.config.NMin, this.config.NMax);
            this.$emit('update:config', { ...this.config, N: validated });
        },
        onBlanksChange(e) {
            const val = parseInt(e.target.value) || this.minBlanks;
            const validated = GameStateManager.validateBlanks(val, this.minBlanks, this.maxBlanks);
            this.$emit('update:config', { ...this.config, blanks: validated });
        },
        onModeChange(e) {
            this.$emit('update:config', { ...this.config, mode: e.target.value });
        },
        onErrorLimitChange(e) {
            const val = parseInt(e.target.value) || this.config.errorLimitMin;
            const validated = GameStateManager.validateBlanks(val, this.config.errorLimitMin, this.config.errorLimitMax);
            this.$emit('update:config', { ...this.config, errorLimit: validated });
        },
        onStart() {
            this.$emit('start');
        }
    }
};