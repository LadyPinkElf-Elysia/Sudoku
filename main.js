// main.js
const { createApp, markRaw } = Vue;
import { SudokuEngine } from './util/SudokuEngine.js';
import { SudokuGridHelper } from './util/SudokuGridHelper.js';
import { SudokuRenderer } from './util/SudokuRenderer.js';
import { SudokuGameHelper } from './util/SudokuGameHelper.js';

const app = createApp({
    data() {
        return {
            // 【核心改动】所有配置及限制全在 config 里集中管理
            config: {
                N: 3,
                NMin: 3,     // 棋盘大小下限
                NMax: 6,     // 棋盘大小上限
                blanks: null,
                mode: 'infinite',
                errorLimit: 0,
                errorLimitMin: 0, // 最大错误次数下限
                errorLimitMax: 99 // 最大错误次数上限
            },
            game: {
                started: false, errors: 0, over: false, complete: false,
                board: [], selectedRow: null, selectedCol: null,
                conflictMessages: [], hintMessage: '', isGenerating: false
            },
            historyMap: {}, stepPointer: -1, zoom: 1.0,
            BOX_SIZE: 0, SIZE: 0
        };
    },
    computed: {
        getSizeLabel() {
            const size = this.SIZE;
            return size > 0 ? `${size}×${size}` : '配置中';
        },
        stepKeys() {
            return Object.keys(this.historyMap).map(Number).sort((a, b) => a - b);
        },
        minBlanks() {
            if (!this.config.N) return 0;
            const total = this.config.N * this.config.N * this.config.N * this.config.N;
            return Math.ceil(total * 0.10);
        },
        maxBlanks() {
            if (!this.config.N) return 0;
            const total = this.config.N * this.config.N * this.config.N * this.config.N;
            return Math.floor(total * 0.40);
        }
    },
    watch: {
        'config.N'() {
            if (this.config.blanks < this.minBlanks) this.config.blanks = this.minBlanks;
            if (this.config.blanks > this.maxBlanks) this.config.blanks = this.maxBlanks;
        }
    },
    methods: {
        renderCanvas() {
            const canvas = document.getElementById('sudokuCanvas');
            if (!canvas) return;
            SudokuRenderer.draw(canvas, this.game.board, this.SIZE, this.BOX_SIZE, this.game.selectedRow, this.game.selectedCol);
        },
        onCanvasClick(e) {
            const canvas = document.getElementById('sudokuCanvas');
            if (!canvas || this.game.isGenerating) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
            const row = Math.floor(y / (canvas.height / this.SIZE));
            const col = Math.floor(x / (canvas.width / this.SIZE));
            if (row >= 0 && row < this.SIZE && col >= 0 && col < this.SIZE) this.selectCell(row, col);
        },
        startGame() {
            let blanks = this.config.blanks;
            if (blanks < this.minBlanks) blanks = this.minBlanks;
            if (blanks > this.maxBlanks) blanks = this.maxBlanks;
            this.config.blanks = blanks;
            this.game.errors = 0; this.game.over = false; this.game.complete = false;
            this.game.started = true; this.game.isGenerating = true;
            this.BOX_SIZE = this.config.N; this.SIZE = this.config.N * this.config.N;
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
                if(canvas) {
                    canvas.removeEventListener('click', this.onCanvasClick);
                    canvas.addEventListener('click', this.onCanvasClick);
                }
                this.renderCanvas();
            });
        },
        resetGame() {
            this.game.started = false; this.game.hintMessage = '';
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
            if (this.historyMap[targetStep]) {
                this.stepPointer = targetStep;
                const result = SudokuGameHelper.applyHistory(this.game.board, this.historyMap[targetStep], this.SIZE, this.BOX_SIZE);
                this.game.conflictMessages = result.messages;
                this.game.selectedRow = null; this.game.selectedCol = null;
                this.game.hintMessage = '';
                this.renderCanvas();
            }
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
            if (!cell.editable) { this.game.hintMessage = '💡 此格是初始题目，不可编辑'; return; }
            if (cell.value !== 0) { this.game.hintMessage = '💡 此格已填入数字'; return; }
            const result = SudokuGameHelper.getHint(this.game.board, row, col, this.BOX_SIZE, this.SIZE);
            this.game.hintMessage = result.candidates.length === 0 ? '💡 此格当前没有任何合法数字可以填入，请检查盘面是否有冲突' : `💡 此格可以填：${result.candidates.join('、')}`;
        },
        selectCell(r, c) {
            this.game.selectedRow = r; this.game.selectedCol = c;
            this.game.hintMessage = '';
            this.renderCanvas();
        },
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
                this.game.selectedRow = null; this.game.selectedCol = null;
                this.game.hintMessage = '';
            }
        },
        zoomIn() { if (this.zoom < 3.0) this.zoom += 0.1; this.renderCanvas(); },
        zoomOut() { if (this.zoom > 0.5) this.zoom -= 0.1; this.renderCanvas(); }
    },
    mounted() { this.config.blanks = this.minBlanks; }
});
app.mount('#app');