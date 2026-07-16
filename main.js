// main.js
const { createApp, markRaw } = Vue;
import { SudokuGameHelper } from './SudokuGameHelper.js';
import { SudokuGridHelper } from './util/SudokuGridHelper.js';
import { SudokuRenderer } from './util/SudokuRenderer.js';
import { handleSudokuKeyDown } from './util/SudokuKeyboard.js';

// Web Worker 管理
let sudokuWorker = null;
const getWorker = () => {
    if (!sudokuWorker) {
        sudokuWorker = new Worker(`./util/SudokuWorker.js?t=${Date.now()}`, { type: 'module' });
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
            this.config.N = Math.max(this.config.NMin, Math.min(this.config.NMax, this.config.N));
            if (this.config.blanks < this.minBlanks) this.config.blanks = this.minBlanks; 
            if (this.config.blanks > this.maxBlanks) this.config.blanks = this.maxBlanks; 
        },
        'config.blanks'() {
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
            // 计算点击位置在 Canvas 逻辑坐标中的位置
            // rect.width 是缩放后的 CSS 宽度，displaySize 是逻辑宽度
            const displaySize = Math.floor(canvas.parentElement.clientWidth * 0.95);
            const scale = rect.width / displaySize; // 实际 CSS 尺寸 / 逻辑尺寸
            const x = (e.clientX - rect.left) / scale;
            const y = (e.clientY - rect.top) / scale;
            const cellSize = displaySize / this.SIZE;
            const row = Math.floor(y / cellSize);
            const col = Math.floor(x / cellSize);
            if (row >= 0 && row < this.SIZE && col >= 0 && col < this.SIZE) this.selectCell(row, col);
        },
        _applyBoard(puzzle) {
            this.game.board = markRaw(SudokuGameHelper.createBoard(puzzle));
            this.game.selectedRow = null; this.game.selectedCol = null;
            this.game.conflictMessages = [];
            this.historyMap = {}; this.stepPointer = -1;
            this.game.hintMessage = ''; this.zoom = 1.0;
            this.game.isGenerating = false;
            this.saveState();
        },
        _setupCanvas() {
            this.$nextTick(() => {
                const canvas = document.getElementById('sudokuCanvas');
                if(canvas) { canvas.removeEventListener('click', this.onCanvasClick); canvas.addEventListener('click', this.onCanvasClick); }
                this.renderCanvas();
            });
        },
        startGame() {
            if (this.game.isGenerating) return;
            
            let blanks = this.config.blanks !== null ? this.config.blanks : this.minBlanks;
            blanks = Math.max(this.minBlanks, Math.min(this.maxBlanks, blanks));
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
            
            const handleMessage = (e) => {
                if (e.data.type === 'generateComplete' && e.data.success) {
                    this._applyBoard(e.data.puzzle);
                    worker.removeEventListener('message', handleMessage);
                    worker.removeEventListener('error', handleError);
                    this._setupCanvas();
                } else if (e.data.type === 'generateError') {
                    console.error('Worker generation error:', e.data.error);
                    this.game.isGenerating = false;
                    worker.removeEventListener('message', handleMessage);
                    worker.removeEventListener('error', handleError);
                    this._generateSynchronous();
                }
            };
            
            const handleError = (error) => {
                console.error('Worker error:', error);
                this.game.isGenerating = false;
                worker.removeEventListener('message', handleMessage);
                worker.removeEventListener('error', handleError);
                this._generateSynchronous();
            };
            
            worker.addEventListener('message', handleMessage);
            worker.addEventListener('error', handleError);
            
            worker.postMessage({
                type: 'generate',
                BOX_SIZE: this.BOX_SIZE,
                SIZE: this.SIZE,
                blanks: this.config.blanks
            });
        },
        
        _generateSynchronous() {
            const puzzle = SudokuGameHelper.generateSync(this.BOX_SIZE, this.SIZE, this.config.blanks);
            this._applyBoard(puzzle);
            this._setupCanvas();
        },
        resetGame() {
            if (this.game.isGenerating) return;
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
            this.stepPointer = targetStep;
            const result = SudokuGameHelper.navigateHistory(this.game.board, this.historyMap, targetStep, this.SIZE, this.BOX_SIZE);
            if (!result) return;
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
            this.game.hintMessage = SudokuGameHelper.getHintMessage(
                this.game.board, this.game.selectedRow, this.game.selectedCol, this.BOX_SIZE, this.SIZE
            );
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
            
            if (SudokuGridHelper.checkComplete(this.game.board, this.SIZE)) {
                this.game.complete = true;
                this.game.selectedRow = null;
                this.game.selectedCol = null;
                this.game.hintMessage = '';
            }
            this.renderCanvas();
        },
        inputNumber(num) { this._operateCell(cell => { cell.value = (cell.value === num) ? 0 : num; }); },
        clearSelected() { this._operateCell(cell => { cell.value = 0; }); },
        zoomIn() { if (this.zoom < 3.0) this.zoom += 0.1; this.renderCanvas(); },
        zoomOut() { if (this.zoom > 0.5) this.zoom -= 0.1; this.renderCanvas(); },
        handleKeyDown(e) {
            handleSudokuKeyDown(e, {
                started: this.game.started,
                isGenerating: this.game.isGenerating,
                complete: this.game.complete,
                over: this.game.over,
                SIZE: this.SIZE,
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
    mounted() { 
        this.config.blanks = this.minBlanks; 
        document.addEventListener('keydown', this.handleKeyDown);
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.handleKeyDown);
        if (sudokuWorker) sudokuWorker.terminate();
    }
});
app.mount('#app');