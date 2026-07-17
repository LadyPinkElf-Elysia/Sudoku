// CreatePuzzleComponent.js - 出题组件（纯 UI 层，所有操作 emit 给父组件）
import { FormatUtils } from '../util/FormatUtils.js';
import { BoardMixin } from '../util/BoardMixin.js';

export const CreatePuzzleComponent = {
    mixins: [BoardMixin],
    template: `
        <div class="panel">
            <div class="config-header">
                <button class="btn btn-secondary btn-sm" @click="$emit('back')">← 返回</button>
                <h2>✏️ {{ createPuzzleMode === 'edit' ? '出题 - 点击格子输入数字' : '🧩 解题' }}</h2>
            </div>
            
            <div v-if="createPuzzleMode === 'edit'" class="config-item">
                <label>宫格大小 N:</label>
                <div class="input-group">
                    <input type="number" :value="puzzleN" :min="2" :max="6" @change="$emit('update:puzzleN', parseInt($event.target.value) || 3)">
                    <span class="hint">{{ size }} x {{ size }} 的棋盘</span>
                </div>
            </div>
            
            <div v-if="createPuzzleMode === 'edit'" class="config-item">
                <label>题目标题（可选）:</label>
                <div class="input-group">
                    <input type="text" :value="puzzleTitle" @input="$emit('update:puzzleTitle', $event.target.value)" placeholder="给题目起个名字" style="width:100%;max-width:300px;">
                </div>
            </div>

            <div v-if="stats" class="stats-bar">
                <span class="stat-item">👥 挑战人数: {{ stats.totalChallenges }}</span>
                <span class="stat-item">✅ 通过人数: {{ stats.completedChallenges }}</span>
                <span class="stat-item">📊 通过率: {{ passRate }}</span>
                <span class="stat-item" v-if="stats.avgTime > 0">⏱️ 平均用时: {{ FormatUtils.formatTime(stats.avgTime) }}</span>
            </div>

            <div class="zoom-controls" style="margin-bottom:8px;">
                <button class="zoom-btn" @click="zoomOut" :disabled="zoom <= 0.5">−</button>
                <span class="zoom-text">{{ Math.round(zoom * 100) || 100 }}%</span>
                <button class="zoom-btn" @click="zoomIn" :disabled="zoom >= 3">+</button>
            </div>
            
            <div class="board-scroll-container">
                <div class="board-wrapper" :style="{ width: (100 * zoom) + '%', height: (100 * zoom) + '%', transform: 'scale(' + zoom + ')', transformOrigin: '0 0' }">
                    <canvas id="createCanvas" class="board-canvas"></canvas>
                </div>
            </div>
            
            <div class="num-pad-wrapper">
                <div class="num-grid" :style="{ gridTemplateColumns: 'repeat(' + boxSize + ', minmax(0, 1fr))' }">
                    <button v-for="n in size" :key="n" class="num-btn" @click="inputNumber(n)">{{ n }}</button>
                </div>
                <button class="num-btn clear-btn" @click="clearSelected"></button>
                <div class="action-row">
                    <button class="action-btn" @click="undo" :disabled="stepPointer <= 0" title="撤回">↩️</button>
                    <button class="action-btn" @click="redo" :disabled="!historyMap[stepPointer + 1]" title="重做">↪️</button>
                </div>
            </div>
            
            <div v-if="createPuzzleMode === 'edit'" class="create-actions">
                <button class="btn btn-secondary" @click="$emit('clear-board')">清空</button>
                <button class="btn btn-primary" @click="$emit('start-solving')" :disabled="!hasPuzzle">✅ 开始解题</button>
            </div>
            <div v-else class="create-actions">
                <button class="btn btn-secondary" @click="$emit('back-to-edit')">← 返回修改题目</button>
                <button class="btn btn-primary" @click="submitPuzzle" :disabled="!isComplete">📤 提交题目</button>
            </div>
            
            <div v-if="createMessage && !submitSuccess" class="auth-message">{{ createMessage }}</div>
            
            <div class="victory-overlay" v-if="showVictory">
                <div class="victory-dialog">
                    <h3>🎉 恭喜完成！</h3>
                    <p>你成功解开了自己出的数独！</p>
                    <button class="btn btn-primary" @click="submitPuzzle">📤 提交题目</button>
                    <button class="btn btn-secondary" style="margin-top:8px;" @click="$emit('back-to-edit')">返回修改</button>
                </div>
            </div>

            <div class="victory-overlay" v-if="submittedPuzzleId && submitSuccess">
                <div class="victory-dialog">
                    <h3>✅ 提交成功！</h3>
                    <p>题目已成功保存</p>
                    <button class="btn btn-primary" @click="$emit('back')">返回主页面</button>
                </div>
            </div>
        </div>
    `,
    props: {
        currentUser: { type: Object, required: true },
        createPuzzleMode: { type: String, default: 'edit' },
        puzzleTitle: { type: String, default: '' },
        puzzleN: { type: Number, default: 3 },
        createMessage: { type: String, default: '' },
        board: { type: Array, default: () => [] },
        gameBoard: { type: Array, default: () => [] },
        selectedRow: { type: Number, default: null },
        selectedCol: { type: Number, default: null },
        historyMap: { type: Object, default: () => ({}) },
        stepPointer: { type: Number, default: -1 },
        showVictory: { type: Boolean, default: false },
        stats: { type: Object, default: null }
    },
    emits: [
        'back', 'saved',
        'update:puzzleN', 'update:puzzleTitle', 'update:zoom',
        'cell-click', 'input-number', 'clear-selected', 'undo', 'redo',
        'clear-board', 'start-solving', 'back-to-edit',
        'submit-puzzle', 'submit-error'
    ],
    computed: {
        hasPuzzle() {
            if (!this.board.length) return false;
            return this.board.some(row => row.some(cell => cell > 0));
        },
        isComplete() {
            if (!this.gameBoard.length) return false;
            return this.gameBoard.every(row => row.every(cell => cell.value > 0 && !cell.conflict));
        },
        passRate() {
            return FormatUtils.calcPassRate(this.stats);
        },
        submitSuccess() {
            return this.createMessage && this.createMessage.includes('成功');
        }
    },
    methods: {
        // ===== BoardMixin 实现（只读，不修改数据） =====
        _getBoard() {
            if (this.createPuzzleMode === 'edit') {
                return this.board.map(row => row.map(v => ({ value: v, editable: true, conflict: false, given: false })));
            }
            return this.gameBoard;
        },
        _getSelectedRow() { return this.selectedRow; },
        _getSelectedCol() { return this.selectedCol; },
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
        submitPuzzle() {
            const puzzle = this.board.map(row => [...row]);
            if (!puzzle.some(row => row.some(cell => cell > 0))) {
                this.$emit('submit-error', '请在棋盘上输入数字');
                return;
            }
            const solution = this.gameBoard.map(row => row.map(cell => cell.value));
            if (!solution.every(row => row.every(v => v > 0))) {
                this.$emit('submit-error', '请先完成解题再提交');
                return;
            }
            this.$emit('submit-puzzle', { puzzle, solution, title: this.puzzleTitle || undefined });
        }
    },
    watch: {
        board: { handler() { this.$nextTick(() => this._renderBoard()); }, deep: true },
        gameBoard: { handler() { this.$nextTick(() => this._renderBoard()); }, deep: true },
        selectedRow() { this.$nextTick(() => this._renderBoard()); },
        selectedCol() { this.$nextTick(() => this._renderBoard()); }
    },
    mounted() {
        this._canvasId = 'createCanvas';
        this._bindCanvas();
        this._bindKeyboard();
    },
    beforeUnmount() {
        this._unbindKeyboard();
        this._unbindCanvas();
    }
};
