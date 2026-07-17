// CreatePuzzleComponent.js - 出题组件（先出题再解题）
import { SudokuGameHelper } from '../SudokuGameHelper.js';
import { PuzzleStorage } from '../api.js';
import { SudokuGridHelper } from '../util/SudokuGrid.js';
import { FormatUtils } from '../util/FormatUtils.js';
import { BoardMixin } from '../util/BoardMixin.js';

export const CreatePuzzleComponent = {
    mixins: [BoardMixin],
    template: `
        <div class="panel">
            <div class="config-header">
                <button class="btn btn-secondary btn-sm" @click="$emit('back')">← 返回</button>
                <h2>✏️ {{ mode === 'edit' ? '出题 - 点击格子输入数字' : '🧩 解题' }}</h2>
            </div>
            
            <div v-if="mode === 'edit'" class="config-item">
                <label>宫格大小 N:</label>
                <div class="input-group">
                    <input type="number" v-model.number="puzzleN" :min="2" :max="6" @change="initBoard">
                    <span class="hint">{{ size }} x {{ size }} 的棋盘</span>
                </div>
            </div>
            
            <div v-if="mode === 'edit'" class="config-item">
                <label>题目标题（可选）:</label>
                <div class="input-group">
                    <input type="text" v-model="puzzleTitle" placeholder="给题目起个名字" style="width:100%;max-width:300px;">
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
            
            <div v-if="mode === 'edit'" class="create-actions">
                <button class="btn btn-secondary" @click="fillExample">填入示例</button>
                <button class="btn btn-secondary" @click="clearBoard">清空</button>
                <button class="btn btn-primary" @click="startSolving" :disabled="!hasPuzzle">✅ 开始解题</button>
            </div>
            <div v-else class="create-actions">
                <button class="btn btn-secondary" @click="mode = 'edit'">← 返回修改题目</button>
                <button class="btn btn-primary" @click="submitPuzzle" :disabled="!isComplete">📤 提交题目</button>
            </div>
            
            <div v-if="message" class="auth-message" :class="{ success: message.includes('成功') || message.includes('通过') }">{{ message }}</div>
            
            <div class="victory-overlay" v-if="showVictory">
                <div class="victory-dialog">
                    <h3>🎉 恭喜完成！</h3>
                    <p>你成功解开了自己出的数独！</p>
                    <button class="btn btn-primary" @click="submitPuzzle">📤 提交题目</button>
                    <button class="btn btn-secondary" style="margin-top:8px;" @click="mode = 'edit'">返回修改</button>
                </div>
            </div>
        </div>
    `,
    props: {
        currentUser: { type: Object, required: true },
        editPuzzleData: { type: Object, default: null }
    },
    emits: ['back', 'saved'],
    data() {
        return {
            mode: 'edit',
            puzzleTitle: '',
            puzzleN: 3,
            message: '',
            board: [],
            gameBoard: [],
            selectedRow: null,
            selectedCol: null,
            historyMap: {},
            stepPointer: -1,
            showVictory: false,
            stats: null,
            submittedPuzzleId: null
        };
    },
    computed: {
        hasPuzzle() {
            if (!this.board.length) return false;
            return this.board.some(row => row.some(cell => cell > 0));
        },
        isComplete() {
            if (!this.gameBoard.length) return false;
            return SudokuGridHelper.checkComplete(this.gameBoard, this.size);
        },
        passRate() {
            return FormatUtils.calcPassRate(this.stats);
        }
    },
    methods: {
        // ===== BoardMixin 实现 =====
        _getBoard() {
            if (this.mode === 'edit') {
                return this.board.map(row => row.map(v => ({ value: v, editable: true, conflict: false, given: false })));
            }
            return this.gameBoard;
        },
        _getSelectedRow() { return this.selectedRow; },
        _getSelectedCol() { return this.selectedCol; },
        _onCellClick(row, col) {
            if (this.mode === 'solve' && this.gameBoard[row][col].given) return;
            this.selectedRow = row;
            this.selectedCol = col;
            this._renderBoard();
        },
        _onInputNumber(num) { this.inputNumber(num); },
        _onClearSelected() { this.clearSelected(); },
        _onHistoryNavigate() { this._renderBoard(); },
        _onSaveState(newHistoryMap, newStepPointer) {
            this.historyMap = newHistoryMap;
            this.stepPointer = newStepPointer;
        },
        _onMovePointer(targetStep) {
            this.stepPointer = targetStep;
            const result = SudokuGameHelper.navigateHistory(this._getBoard(), this.historyMap, targetStep, this.size, this.boxSize);
            if (result) {
                this._onHistoryNavigate(result.messages);
                this.$nextTick(() => this._renderBoard());
            }
        },

        // ===== 初始化 =====
        initBoard() {
            const size = this.size;
            this.board = Array.from({ length: size }, () => Array(size).fill(0));
            this.selectedRow = null;
            this.selectedCol = null;
            this.mode = 'edit';
            this.showVictory = false;
            this.stats = null;
            this.submittedPuzzleId = null;
            this.historyMap = {};
            this.stepPointer = -1;
            this._renderBoard();
        },

        // ===== 输入操作 =====
        inputNumber(num) {
            if (this.selectedRow === null || this.selectedCol === null) return;
            const r = this.selectedRow, c = this.selectedCol;
            
            if (this.mode === 'edit') {
                this.board[r][c] = (this.board[r][c] === num) ? 0 : num;
            } else {
                if (this.gameBoard[r][c].given) return;
                this._saveState();
                this.gameBoard[r][c].value = (this.gameBoard[r][c].value === num) ? 0 : num;
                this.gameBoard[r][c].conflict = false;
                SudokuGridHelper.updateConflictsLocal(this.gameBoard, r, c, this.boxSize, this.size);
                if (SudokuGridHelper.checkComplete(this.gameBoard, this.size)) {
                    this.showVictory = true;
                }
            }
            this._renderBoard();
        },
        clearSelected() {
            if (this.selectedRow === null || this.selectedCol === null) return;
            const r = this.selectedRow, c = this.selectedCol;
            if (this.mode === 'edit') {
                this.board[r][c] = 0;
            } else {
                if (this.gameBoard[r][c].given) return;
                this._saveState();
                this.gameBoard[r][c].value = 0;
                this.gameBoard[r][c].conflict = false;
            }
            this._renderBoard();
        },

        // ===== 编辑操作 =====
        clearBoard() {
            const size = this.size;
            this.board = Array.from({ length: size }, () => Array(size).fill(0));
            this.selectedRow = null;
            this.selectedCol = null;
            this.mode = 'edit';
            this.showVictory = false;
            this._renderBoard();
        },
        fillExample() {
            this.puzzleN = 3;
            this.initBoard();
            const example = [
                [5,3,0,0,7,0,0,0,0],
                [6,0,0,1,9,5,0,0,0],
                [0,9,8,0,0,0,0,6,0],
                [8,0,0,0,6,0,0,0,3],
                [4,0,0,8,0,3,0,0,1],
                [7,0,0,0,2,0,0,0,6],
                [0,6,0,0,0,0,2,8,0],
                [0,0,0,4,1,9,0,0,5],
                [0,0,0,0,8,0,0,7,9]
            ];
            this.board = example.map(row => [...row]);
            this._renderBoard();
        },
        startSolving() {
            this.gameBoard = this.board.map(row =>
                row.map(v => ({
                    value: v,
                    editable: v === 0,
                    conflict: false,
                    given: v !== 0
                }))
            );
            this.historyMap = {};
            this.stepPointer = -1;
            this.selectedRow = null;
            this.selectedCol = null;
            this.showVictory = false;
            this.mode = 'solve';
            this._renderBoard();
        },

        // ===== 历史 =====
        undo() { this._onUndo(); },
        redo() { this._onRedo(); },

        // ===== 统计 =====
        async loadStats(puzzleId) {
            this.stats = await PuzzleStorage.getStats(puzzleId);
        },

        // ===== 提交 =====
        async submitPuzzle() {
            this.message = '';
            const puzzle = this.board.map(row => [...row]);
            if (!this.hasPuzzle) { this.message = '请在棋盘上输入数字'; return; }
            const solution = this.gameBoard.map(row => row.map(cell => cell.value));
            // 检查是否所有格子都已填满且无冲突
            const allFilled = solution.every(row => row.every(v => v > 0));
            if (!allFilled) { this.message = '请先完成解题再提交'; return; }
            this.message = '正在保存...';

            let saveResult;
            if (this.submittedPuzzleId) {
                saveResult = await PuzzleStorage.update(
                    this.submittedPuzzleId, this.currentUser.id,
                    puzzle, solution, this.size, this.boxSize,
                    this.puzzleTitle || undefined
                );
            } else {
                saveResult = await PuzzleStorage.add(
                    this.currentUser.id, this.currentUser.username,
                    puzzle, solution, this.size, this.boxSize,
                    this.puzzleTitle || undefined
                );
            }

            if (saveResult.success) {
                this.message = this.submittedPuzzleId
                    ? '✅ 题目修改成功！所有挑战数据已重置'
                    : '✅ 题目保存成功！题目ID: ' + saveResult.puzzle.id;
                await new Promise(r => setTimeout(r, 1500));
                this.$emit('saved');
            } else {
                this.message = saveResult.message || '保存失败，请重试';
            }
        }
    },
    mounted() {
        // 必须在 _bindCanvas 之前设置 canvasId
        this._canvasId = 'createCanvas';
        
        if (this.editPuzzleData) {
            const puzzleData = this.editPuzzleData;
            const puzzleStr = puzzleData.puzzle_data || puzzleData.puzzle;
            let puzzle;
            if (typeof puzzleStr === 'string') {
                try { puzzle = JSON.parse(puzzleStr); } catch (e) { puzzle = []; }
            } else {
                puzzle = puzzleStr;
            }
            if (Array.isArray(puzzle) && puzzle.length > 0) {
                const n = Math.round(Math.sqrt(puzzle.length));
                this.puzzleN = n;
                this.puzzleTitle = puzzleData.title || '';
                this.board = puzzle.map(row => [...row]);
                this.submittedPuzzleId = puzzleData.id;
                this.loadStats(puzzleData.id);
            }
        } else {
            this.initBoard();
        }
        this._bindCanvas();
        this._bindKeyboard();
    },
    beforeUnmount() {
        this._unbindKeyboard();
        this._unbindCanvas();
    }
};