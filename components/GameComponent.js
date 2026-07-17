// GameComponent.js - 游戏组件
import { SudokuGameHelper } from '../SudokuGameHelper.js';
import { handleSudokuKeyDown } from '../util/SudokuRenderer.js';
import { CanvasBoard } from '../util/CanvasBoard.js';
import { GameStateManager } from '../util/GameStateManager.js';

export const GameComponent = {
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
                    <p v-if="game.elapsedTime > 0">⏱️ 用时: {{ formatTime(game.elapsedTime) }}</p>
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

            <!-- 加载中遮罩 -->
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
        stepPointer: { type: Number, default: -1 },
        zoom: { type: Number, default: 1.0 }
    },
    emits: ['back', 'reset', 'update:game', 'update:historyMap', 'update:stepPointer', 'update:zoom'],
    computed: {
        boxSize() { return this.config.N || 3; },
        size() { return (this.config.N || 3) * (this.config.N || 3); },
        getSizeLabel() { const size = this.size; return size > 0 ? size + '×' + size : '配置中'; },
        stepKeys() { return Object.keys(this.historyMap).map(Number).sort((a, b) => a - b); },
        formattedTime() {
            if (!this.game.startTime) return '00:00';
            const elapsed = Math.floor((Date.now() - this.game.startTime) / 1000);
            return this.formatTime(elapsed);
        }
    },
    methods: {
        formatTime(seconds) {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        },
        renderCanvas() {
            CanvasBoard.render('sudokuCanvas', this.game.board, this.size, this.boxSize, this.game.selectedRow, this.game.selectedCol, this.zoom);
        },
        onCanvasClick(e) {
            if (this.game.isGenerating) return;
            const pos = CanvasBoard.getCellFromClick(e, 'sudokuCanvas', this.size);
            if (pos) this.selectCell(pos.row, pos.col);
        },
        saveState() {
            const result = SudokuGameHelper.saveState(this.historyMap, this.stepPointer, this.game.board);
            this.$emit('update:historyMap', result.newHistoryMap);
            this.$emit('update:stepPointer', result.newStepPointer);
            this.$emit('update:game', { ...this.game, hintMessage: '' });
        },
        movePointer(targetStep) {
            this.$emit('update:stepPointer', targetStep);
            const result = SudokuGameHelper.navigateHistory(this.game.board, this.historyMap, targetStep, this.size, this.boxSize);
            if (!result) return;
            this.$emit('update:game', { ...this.game, conflictMessages: result.messages, selectedRow: null, selectedCol: null, hintMessage: '' });
            this.$nextTick(() => this.renderCanvas());
        },
        undo() { this.movePointer(this.stepPointer - 1); },
        redo() { this.movePointer(this.stepPointer + 1); },
        giveHint() {
            if (this.game.isGenerating) return;
            if (this.game.hintsRemaining === 0) return;
            const msg = SudokuGameHelper.getHintMessage(this.game.board, this.game.selectedRow, this.game.selectedCol, this.boxSize, this.size);
            const newHints = this.game.hintsRemaining > 0 ? this.game.hintsRemaining - 1 : this.game.hintsRemaining;
            this.$emit('update:game', { ...this.game, hintMessage: msg, hintsRemaining: newHints });
        },
        selectCell(r, c) {
            this.$emit('update:game', { ...this.game, selectedRow: r, selectedCol: c, hintMessage: '' });
            this.$nextTick(() => this.renderCanvas());
        },
        _operateCell(updateFn) {
            const result = GameStateManager.operateCell(this.game, this.config, this.game.selectedRow, this.game.selectedCol, updateFn, {
                historyMap: this.historyMap,
                stepPointer: this.stepPointer
            });
            if (!result) return;

            this.$emit('update:historyMap', result.newHistoryMap);
            this.$emit('update:stepPointer', result.newStepPointer);
            this.$emit('update:game', result.newGame);
            this.$nextTick(() => this.renderCanvas());
        },
        inputNumber(num) { this._operateCell(cell => { cell.value = (cell.value === num) ? 0 : num; }); },
        clearSelected() { this._operateCell(cell => { cell.value = 0; }); },
        zoomIn() {
            const newZoom = Math.min(3.0, this.zoom + 0.1);
            this.$emit('update:zoom', newZoom);
            this.$nextTick(() => this.renderCanvas());
        },
        zoomOut() {
            const newZoom = Math.max(0.5, this.zoom - 0.1);
            this.$emit('update:zoom', newZoom);
            this.$nextTick(() => this.renderCanvas());
        },
        handleKeyDown(e) {
            handleSudokuKeyDown(e, {
                started: this.game.started,
                isGenerating: this.game.isGenerating,
                complete: this.game.complete,
                over: this.game.over,
                SIZE: this.size,
                selectedRow: this.game.selectedRow,
                selectedCol: this.game.selectedCol
            }, {
                inputNumber: (num) => this.inputNumber(num),
                clearSelected: () => this.clearSelected(),
                selectCell: (r, c) => this.selectCell(r, c),
                undo: () => this.undo(),
                redo: () => this.redo()
            });
        }
    },
    watch: {
        game: {
            handler() { this.$nextTick(() => this.renderCanvas()); },
            deep: true
        },
        'config.N'() { this.$nextTick(() => this.renderCanvas()); }
    },
    mounted() {
        this.$nextTick(() => {
            CanvasBoard.bindClick((e) => this.onCanvasClick(e), 'sudokuCanvas');
            this.renderCanvas();
        });
        document.addEventListener('keydown', this.handleKeyDown);
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.handleKeyDown);
        CanvasBoard.unbindClick(this.onCanvasClick, 'sudokuCanvas');
    }
};