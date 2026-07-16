// main.js
const { createApp, markRaw } = Vue;
import { SudokuEngine } from './util/SudokuEngine.js';
import { SudokuGameHelper } from './util/SudokuGameHelper.js';
import { SudokuGridHelper } from './util/SudokuGridHelper.js';
import { SudokuRenderer } from './util/SudokuRenderer.js';

// Web Worker 管理
let sudokuWorker = null;
const getWorker = () => {
    if (!sudokuWorker) {
        sudokuWorker = new Worker('./util/SudokuWorker.js', { type: 'module' });
    }
    return sudokuWorker;
};

const app = createApp({
    data() {
        return {
            config: { N: 3, NMin: 3, NMax: 6, blanks: null, mode: 'infinite', errorLimit: 0, errorLimitMin: 0, errorLimitMax: 99 },
            game: { started: false, errors: 0, over: false, complete: false, board: [], selectedRow: null, selectedCol: null, conflictMessages: [], hintMessage: '', isGenerating: false },
            historyMap: {}, stepPointer: -1, zoom: 1.0, BOX_SIZE: 0, SIZE: 0
        };
    },
    computed: {
        getSizeLabel() { const size = this.SIZE; return size > 0 ? `${size}×${size}` : '配置中'; },
        stepKeys() { return Object.keys(this.historyMap).map(Number).sort((a, b) => a - b); },
        minBlanks() { if (!this.config.N) return 0; const total = this.config.N * this.config.N * this.config.N * this.config.N; return Math.ceil(total * 0.10); },
        maxBlanks() { if (!this.config.N) return 0; const total = this.config.N * this.config.N * this.config.N * this.config.N; return Math.floor(total * 0.40); }
    },
    watch: { 
        'config.N'() { 
            // 限制 N 在有效范围内
            this.config.N = Math.max(this.config.NMin, Math.min(this.config.NMax, this.config.N));
            if (this.config.blanks < this.minBlanks) this.config.blanks = this.minBlanks; 
            if (this.config.blanks > this.maxBlanks) this.config.blanks = this.maxBlanks; 
        },
        'config.blanks'() {
            // 限制挖空数量在有效范围内
            this.config.blanks = Math.max(this.minBlanks, Math.min(this.maxBlanks, this.config.blanks));
        }
    },
    methods: {
        renderCanvas() {
            const canvas = document.getElementById('sudokuCanvas');
            if (!canvas) return;
            SudokuRenderer.draw(canvas, this.game.board, this.SIZE, this.BOX_SIZE, this.game.selectedRow, this.game.selectedCol, this.zoom);
        },
        onCanvasClick(e) {
            const canvas = document.getElementById('sudokuCanvas');
            if (!canvas || this.game.isGenerating) return;
            const rect = canvas.getBoundingClientRect();
            // 计算点击位置在逻辑坐标系中的位置（已考虑 DPR 和 zoom）
            const x = (e.clientX - rect.left) / this.zoom;
            const y = (e.clientY - rect.top) / this.zoom;
            const displaySize = Math.floor(canvas.parentElement.clientWidth * 0.95);
            const cellSize = displaySize / this.SIZE;
            const row = Math.floor(y / cellSize);
            const col = Math.floor(x / cellSize);
            if (row >= 0 && row < this.SIZE && col >= 0 && col < this.SIZE) this.selectCell(row, col);
        },
        startGame() {
            if (this.game.isGenerating) return;
            
            let blanks = Math.max(this.minBlanks, Math.min(this.maxBlanks, this.config.blanks));
            this.config.blanks = blanks;
            this.game.errors = 0;
            this.game.over = false;
            this.game.complete = false;
            this.game.started = true;
            this.game.isGenerating = true;
            this.BOX_SIZE = this.config.N;
            this.SIZE = this.config.N * this.config.N;
            
            // 终止并重建 Worker
            if (sudokuWorker) sudokuWorker.terminate();
            sudokuWorker = null;
            const worker = getWorker();
            
            // Set up worker message handler
            const handleMessage = (e) => {
                if (e.data.type === 'generateComplete' && e.data.success) {
                    const puzzle = e.data.puzzle;
                    this.game.board = markRaw(puzzle.map(row => row.map(val => ({ value: val, editable: val === 0, conflict: false }))));
                    this.game.selectedRow = null; this.game.selectedCol = null;
                    this.game.conflictMessages = [];
                    this.historyMap = {}; this.stepPointer = -1;
                    this.game.hintMessage = ''; this.zoom = 1.0;
                    this.game.isGenerating = false;
                    this.saveState();
                    
                    // Remove handler after completion
                    worker.removeEventListener('message', handleMessage);
                    worker.removeEventListener('error', handleError);
                    
                    this.$nextTick(() => {
                        const canvas = document.getElementById('sudokuCanvas');
                        if(canvas) { canvas.removeEventListener('click', this.onCanvasClick); canvas.addEventListener('click', this.onCanvasClick); }
                        this.renderCanvas();
                    });
                }
            };
            
            const handleError = (error) => {
                console.error('Worker error:', error);
                this.game.isGenerating = false;
                worker.removeEventListener('message', handleMessage);
                worker.removeEventListener('error', handleError);
                // Fallback to synchronous generation if worker fails
                this._generateSynchronous();
            };
            
            worker.addEventListener('message', handleMessage);
            worker.addEventListener('error', handleError);
            
            // Send generation request to worker
            worker.postMessage({
                type: 'generate',
                BOX_SIZE: this.BOX_SIZE,
                SIZE: this.SIZE,
                blanks: this.config.blanks
            });
        },
        
        _generateSynchronous() {
            // Fallback synchronous generation (original method)
            const solution = SudokuEngine.generateSolution(this.BOX_SIZE, this.SIZE);
            const puzzle = SudokuEngine.createPuzzle(solution, this.config.blanks);
            this.game.board = markRaw(puzzle.map(row => row.map(val => ({ value: val, editable: val === 0, conflict: false }))));
            this.game.selectedRow = null; this.game.selectedCol = null;
            this.game.conflictMessages = [];
            this.historyMap = {}; this.stepPointer = -1;
            this.game.hintMessage = ''; this.zoom = 1.0;
            this.game.isGenerating = false;
            this.saveState();
            this.$nextTick(() => {
                const canvas = document.getElementById('sudokuCanvas');
                if(canvas) { canvas.removeEventListener('click', this.onCanvasClick); canvas.addEventListener('click', this.onCanvasClick); }
                this.renderCanvas();
            });
        },
        resetGame() {
            this.game.started = false;
            this.game.hintMessage = '';
            const canvas = document.getElementById('sudokuCanvas');
            if (canvas) canvas.removeEventListener('click', this.onCanvasClick);
        },
        saveState() {
            const result = SudokuGameHelper.saveState(this.historyMap, this.stepPointer, this.game.board);
            this.historyMap = result.newHistoryMap;
            this.stepPointer = result.newStepPointer;
            this.game.hintMessage = '';
        },
        movePointer(targetStep) {
            if (!this.historyMap[targetStep]) return;
            this.stepPointer = targetStep;
            const result = SudokuGameHelper.applyHistory(this.game.board, this.historyMap[targetStep], this.SIZE, this.BOX_SIZE);
            this.game.conflictMessages = result.messages;
            this.game.selectedRow = null;
            this.game.selectedCol = null;
            this.game.hintMessage = '';
            this.renderCanvas();
        },
        undo() { this.movePointer(this.stepPointer - 1); },
        redo() { this.movePointer(this.stepPointer + 1); },
        giveHint() {
            if (this.game.isGenerating) return;
            if (this.game.selectedRow === null || this.game.selectedCol === null) {
                this.game.hintMessage = '💡 请先在棋盘上点击选中一个空格';
                return;
            }
            const row = this.game.selectedRow, col = this.game.selectedCol;
            const cell = this.game.board[row][col];
            if (!cell.editable) {
                this.game.hintMessage = '💡 此格是初始题目，不可编辑';
                return;
            }
            if (cell.value !== 0) {
                this.game.hintMessage = '💡 此格已填入数字';
                return;
            }
            const result = SudokuGameHelper.getHint(this.game.board, row, col, this.BOX_SIZE, this.SIZE);
            this.game.hintMessage = result.candidates.length === 0
                ? '💡 此格当前没有任何合法数字可以填入，请检查盘面是否有冲突'
                : `💡 此格可以填：${result.candidates.join('、')}`;
        },
        selectCell(r, c) { this.game.selectedRow = r; this.game.selectedCol = c; this.game.hintMessage = ''; this.renderCanvas(); },
        _operateCell(updateFn) {
            if (this.game.complete || this.game.over || this.game.selectedRow === null || this.game.isGenerating) return;
            const row = this.game.selectedRow, col = this.game.selectedCol;
            const cell = this.game.board[row][col];
            if (!cell.editable) return;
            this.saveState();
            updateFn(cell);
            this.game.conflictMessages = SudokuGridHelper.updateConflictsLocal(this.game.board, row, col, this.BOX_SIZE, this.SIZE);
            if (cell.conflict && this.config.mode === 'limited') {
                this.game.errors++;
                if (this.game.errors > this.config.errorLimit) {
                    this.game.over = true;
                    this.game.selectedRow = null;
                    this.game.selectedCol = null;
                }
            }
            this.checkComplete();
            this.renderCanvas();
        },
        inputNumber(num) { this._operateCell(cell => { cell.value = (cell.value === num) ? 0 : num; }); },
        clearSelected() { this._operateCell(cell => { cell.value = 0; }); },
        checkComplete() {
            if (SudokuGridHelper.checkComplete(this.game.board, this.SIZE)) {
                this.game.complete = true;
                this.game.selectedRow = null;
                this.game.selectedCol = null;
                this.game.hintMessage = '';
            }
        },
        zoomIn() { if (this.zoom < 3.0) this.zoom += 0.1; this.renderCanvas(); },
        zoomOut() { if (this.zoom > 0.5) this.zoom -= 0.1; this.renderCanvas(); },
        handleKeyDown(e) {
            // 游戏中才响应键盘事件
            if (!this.game.started || this.game.isGenerating || this.game.complete || this.game.over) return;
            
            const key = e.key;
            if (key >= '1' && key <= '9') {
                const num = parseInt(key);
                if (num <= this.SIZE) {
                    this.inputNumber(num);
                }
            } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
                this.clearSelected();
            } else if (key === 'ArrowUp' && this.game.selectedRow !== null) {
                e.preventDefault();
                const newRow = Math.max(0, this.game.selectedRow - 1);
                this.selectCell(newRow, this.game.selectedCol);
            } else if (key === 'ArrowDown' && this.game.selectedRow !== null) {
                e.preventDefault();
                const newRow = Math.min(this.SIZE - 1, this.game.selectedRow + 1);
                this.selectCell(newRow, this.game.selectedCol);
            } else if (key === 'ArrowLeft' && this.game.selectedCol !== null) {
                e.preventDefault();
                const newCol = Math.max(0, this.game.selectedCol - 1);
                this.selectCell(this.game.selectedRow, newCol);
            } else if (key === 'ArrowRight' && this.game.selectedCol !== null) {
                e.preventDefault();
                const newCol = Math.min(this.SIZE - 1, this.game.selectedCol + 1);
                this.selectCell(this.game.selectedRow, newCol);
            } else if (key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (e.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
            } else if (key === 'y' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.redo();
            }
        }
    },
    mounted() { 
        this.config.blanks = this.minBlanks; 
        // 添加键盘事件监听
        document.addEventListener('keydown', this.handleKeyDown);
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.handleKeyDown);
        if (sudokuWorker) {
            sudokuWorker.terminate();
        }
    }
});
app.mount('#app');
