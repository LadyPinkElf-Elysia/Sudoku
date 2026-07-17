// ConfigComponent.js - 游戏配置组件
import { GameStateManager } from '../util/GameStateManager.js';

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
                    <input type="number" v-model.number="localN" :min="config.NMin" :max="config.NMax" @input="onNChange">
                    <span class="hint">生成 {{ localN * localN }} x {{ localN * localN }}</span>
                </div>
            </div>
            <div class="config-item">
                <label>挖空数量 ({{ minBlanks }} ~ {{ maxBlanks }}):</label>
                <div class="input-group">
                    <input type="number" v-model.number="localBlanks" :min="minBlanks" :max="maxBlanks" @input="onBlanksChange">
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
            <button class="btn btn-primary btn-block" @click="onStart">🚀 开始游戏</button>
        </div>
    `,
    props: {
        config: { type: Object, required: true },
        minBlanks: { type: Number, default: 0 },
        maxBlanks: { type: Number, default: 0 }
    },
    emits: ['start', 'back'],
    data() {
        return {
            localN: this.config.N,
            localBlanks: this.config.blanks !== null ? this.config.blanks : this.minBlanks
        };
    },
    watch: {
        'config.N'(val) { this.localN = val; },
        'config.blanks'(val) { this.localBlanks = val !== null ? val : this.minBlanks; }
    },
    methods: {
        onNChange() {
            this.localN = GameStateManager.validateN(this.localN || this.config.NMin, this.config.NMin, this.config.NMax);
            this.config.N = this.localN;
        },
        onBlanksChange() {
            this.localBlanks = GameStateManager.validateBlanks(this.localBlanks || this.minBlanks, this.minBlanks, this.maxBlanks);
            this.config.blanks = this.localBlanks;
        },
        onStart() {
            this.config.N = this.localN;
            this.config.blanks = this.localBlanks;
            this.$emit('start');
        }
    }
};
