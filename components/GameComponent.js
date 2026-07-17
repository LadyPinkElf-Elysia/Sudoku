// GameComponent.js - 游戏组件（纯 UI 层，所有操作 emit 给父组件）
import { FormatUtils } from '../util/FormatUtils.js';
import { BoardMixin } from '../util/BoardMixin.js';

export const GameComponent = {
    mixins: [BoardMixin],
    template: `
        <div class="game-area">
            <div class="status-bar">
                <div class="status-left">
                    <button class="btn btn-secondary btn-sm" @click="$emit('back')">← 返回</button>
                    <h2>🧩 {{ getSizeLabel }}</h2>
                </div>
                <div class="zoom-controls">
                    <button class="zoom-btn" @click="zoomOut" :disabled="zoom <= 0.5">−</button>
                    <span class="zoom-text">{{ Math.round(zoom * 100) || 100 }}%</span>
                    <button class="zoom-btn" @click="zoomIn" :disabled="zoom >= 3">+</button>
                </div>
                <div class="status-right">
                    <span class="hint-count" v-if="game.hintsRemaining >= 0">
                        💡 提示: {{ game.hintsRemaining }}
                    </span>
                    <span class="error-count" v-if="config.mode === 'limited'">
                        ❌ 错误: {{ game.errors }} / {{ config.errorLimit }}
                    </span>
                    <span class="timer" v-if="game.started && !game.complete && !game.over">
                        ⏱️ {{ formattedTime }}
                    </span>
                    <button class="btn btn-secondary" @click="$emit('reset')">🔄 重设</button>
                </div>
            </div>

            <div class="board-scroll-container">
                <div class="board-wrapper" :style="{ width: (100 * zoom) + '%', height: (100 * zoom) + '%', transform: 'scale(' + zoom + ')', transformOrigin: '0 0' }">
                    <canvas id="sudokuCanvas" class="board-canvas"></canvas>
                </div>
            </div>

            <div class="num-pad-wrapper">
                <div class="num-grid" :style="{ gridTemplateColumns: 'repeat(' + boxSize + ', minmax(0, 1fr))' }">
                    <button v-for="n in size" :key="n" class="num-btn" @click="inputNumber(n)">{{ n }}</button>
                </div>
                <button class="num-btn clear-btn" @click="clearSelected"></button>
                
                <div class="action-row">
                    <button class="action-btn" @click="undo" :disabled="stepPointer <= 0 || game.isGenerating" title="撤回">↩️</button>
                    <button class="action-btn" @click="redo" :disabled="!historyMap[stepPointer + 1] || game.isGenerating" title="重做">↪️</button>
                    <button class="action-btn" @click="giveHint" :disabled="game.isGenerating || (game.hintsRemaining === 0)" title="提示">💡</button>
                </div>

                <div class="history-steps-container" v-if="stepKeys.length > 1">
                    <div v-for="step in stepKeys" :key="step" class="step-block" :class="{ active: stepPointer === step }" @click="movePointer(step)">第{{ step + 1 }}步</div>
                </div>
            </div>

            <div v-if="game.hintMessage" class="hint-box">{{ game.hintMessage }}</div>
            <div v-if="game.conflictMessages.length > 0" class="conflict-box">
                <strong>⚠️ 冲突提示：</strong>
                <ul>
                    <li v-for="msg in game.conflictMessages" :key="msg">{{ msg }}</li>
                </ul>
            </div>
            
            <div class="victory-overlay" v-if="game.complete">
                <div class="victory-dialog">
                    <h3>🎉 恭喜完成！</h3>
                    <p>你成功解开了 {{ size }}x{{ size }} 的数独！</p>
                    <p v-if="game.elapsedTime > 0">⏱️ 用时: {{ FormatUtils.formatTime(game.elapsedTime) }}</p>
                    <button class="btn btn-primary" @click="$emit('back')">返回菜单</button>
                </div>
            </div>

            <div class="victory-overlay" v-if="game.over && !game.complete">
                <div class="victory-dialog" style="border: 2px solid #b91c1c;">
                    <h3 style="color: #b91c1c;">💀 游戏失败</h3>
                    <p>错误次数已超过设定的上限 ({{ config.errorLimit }}次)。</p>
                    <button class="btn btn-primary" style="background: #b91c1c;" @click="$emit('reset')">重新开始</button>
                </div>
            </div>

            <div class="loading-overlay" v-if="game.isGenerating">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">正在生成数独谜题...</div>
                </div>
            </div>
        </div>
    `,
    props: {
        game: { type: Object, required: true },
        config: { type: Object, required: true },
        historyMap: { type: Object, default: () => ({}) },
        stepPointer: { type: Number, default: -1 }
    },
    emits: [
        'back', 'reset',
        'update:game', 'update:historyMap', 'update:stepPointer',
        'input-number', 'clear-selected', 'undo', 'redo', 'move-pointer', 'give-hint',
        'cell-click'
    ],
    computed: {
        formattedTime() {
            if (!this.game.startTime) return '00:00';
            const elapsed = Math.floor((Date.now() - this.game.startTime) / 1000);
            return FormatUtils.formatTime(elapsed);
        }
    },
    methods: {
        // ===== BoardMixin 实现（只读，不修改数据） =====
        _getBoard() { return this.game.board; },
        _getGameState() { return this.game; },
        _getSelectedRow() { return this.game.selectedRow; },
        _getSelectedCol() { return this.game.selectedCol; },
        _onCellClick(row, col) {
            this.$emit('cell-click', row, col);
        },
        _onInputNumber(num) { this.inputNumber(num); },
        _onClearSelected() { this.clearSelected(); },
        _onHistoryNavigate() { this.$nextTick(() => this._renderBoard()); },
        _onSaveState() {},
        _onMovePointer() {},
        _onUndo() { this.undo(); },
        _onRedo() { this.redo(); },

        // ===== 用户操作 → emit 给父组件 =====
        inputNumber(num) { this.$emit('input-number', num); },
        clearSelected() { this.$emit('clear-selected'); },
        undo() { this.$emit('undo'); },
        redo() { this.$emit('redo'); },
        movePointer(step) { this.$emit('move-pointer', step); },
        giveHint() { this.$emit('give-hint'); }
    },
    watch: {
        game: {
            handler() { this.$nextTick(() => this._renderBoard()); },
            deep: true
        },
        'config.boxSize'() { this.$nextTick(() => this._renderBoard()); }
    },
    mounted() {
        this._bindCanvas();
        this._bindKeyboard();
    },
    beforeUnmount() {
        this._unbindKeyboard();
        this._unbindCanvas();
    }
};
