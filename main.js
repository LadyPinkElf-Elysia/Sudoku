// main.js
const { createApp } = Vue;
import { SudokuEngine } from './util/SudokuEngine.js';
import { SudokuHistory } from './util/SudokuHistory.js';
import { SudokuGridHelper } from './util/SudokuGridHelper.js';

const app = createApp({
    data() {
        return {
            // --- 游戏配置数据 ---
            configN: 3,
            configBlanks: null,
            configMode: 'infinite',
            configErrorLimit: 0,
            
            // --- 当前游戏状态 ---
            gameStarted: false,
            errors: 0,
            gameOver: false,

            BOX_SIZE: 0,
            SIZE: 0,
            board: [],
            selectedRow: null,
            selectedCol: null,
            gameComplete: false,
            conflictMessages: [],
            historyMap: {},
            stepPointer: -1,
            hintMessage: '',
            isGenerating: false
        };
    },
    computed: {
        getSizeLabel() {
            const size = this.SIZE;
            return `${size}×${size}`;
        },
        stepKeys() {
            return Object.keys(this.historyMap).map(Number).sort((a, b) => a - b);
        },
        minBlanks() {
            if (!this.configN) return 0;
            const total = this.configN * this.configN * this.configN * this.configN;
            return Math.ceil(total * 0.10);
        },
        maxBlanks() {
            if (!this.configN) return 0;
            const total = this.configN * this.configN * this.configN * this.configN;
            return Math.floor(total * 0.40);
        }
    },
    watch: {
        configN() {
            if (this.configBlanks < this.minBlanks) this.configBlanks = this.minBlanks;
            if (this.configBlanks > this.maxBlanks) this.configBlanks = this.maxBlanks;
        }
    },
    methods: {
        // === 配置面板触发 ===
        startGame() {
            const totalCells = this.configN * this.configN * this.configN * this.configN;
            let blanks = this.configBlanks;
            if (blanks < this.minBlanks) blanks = this.minBlanks;
            if (blanks > this.maxBlanks) blanks = this.maxBlanks;
            this.configBlanks = blanks;

            this.errors = 0;
            this.gameOver = false;
            this.gameComplete = false;
            this.gameStarted = true;

            this.BOX_SIZE = this.configN;
            this.SIZE = this.configN * this.configN;
            this.isGenerating = true;

            const solution = SudokuEngine.generateSolution(this.BOX_SIZE, this.SIZE);
            const puzzle = SudokuEngine.createPuzzle(solution, this.configBlanks);
            
            this.board = puzzle.map(row => row.map(val => ({ value: val, editable: val === 0, conflict: false })));
            this.selectedRow = null; this.selectedCol = null;
            this.conflictMessages = [];
            this.historyMap = {}; this.stepPointer = -1;
            this.hintMessage = '';
            
            this.isGenerating = false;
            this.saveState();
        },
        
        // === 游戏逻辑 ===
        resetGame() {
            this.gameStarted = false;
            this.hintMessage = '';
        },
        getGridSnapshot() {
            return SudokuGridHelper.getGridSnapshot(this.board);
        },
        applyGrid(gridData) {
            SudokuGridHelper.applyGrid(this.board, gridData);
            SudokuGridHelper.clearConflicts(this.board);
            this.updateConflicts();
            this.checkComplete();
            this.selectedRow = null; this.selectedCol = null;
            this.hintMessage = '';
        },
        saveState() {
            const result = SudokuHistory.push(this.historyMap, this.stepPointer, this.getGridSnapshot());
            this.historyMap = result.newHistoryMap;
            this.stepPointer = result.newStepPointer;
            this.hintMessage = '';
        },
        movePointer(targetStep) {
            const result = SudokuHistory.goTo(this.historyMap, targetStep);
            if (result) {
                this.stepPointer = result.targetStep;
                this.applyGrid(result.targetGrid);
            }
        },
        undo() { this.movePointer(this.stepPointer - 1); },
        redo() { this.movePointer(this.stepPointer + 1); },
        giveHint() {
            if (this.isGenerating) return;
            if (this.selectedRow === null || this.selectedCol === null) {
                this.hintMessage = '💡 请先在棋盘上点击选中一个空格';
                return;
            }
            const row = this.selectedRow, col = this.selectedCol;
            const cell = this.board[row][col];
            if (!cell.editable) {
                this.hintMessage = '💡 此格是初始题目，不可编辑';
                return;
            }
            if (cell.value !== 0) {
                this.hintMessage = '💡 此格已填入数字';
                return;
            }
            const candidates = SudokuEngine.getLegalCandidates(
                this.getGridSnapshot(), row, col, this.BOX_SIZE, this.SIZE
            );
            if (candidates.length === 0) {
                this.hintMessage = '💡 此格当前没有任何合法数字可以填入，请检查盘面是否有冲突';
            } else {
                this.hintMessage = `💡 此格可以填：${candidates.join('、')}`;
            }
        },
        selectCell(r, c) { this.selectedRow = r; this.selectedCol = c; this.hintMessage = ''; },
        
        _operateCell(updateFn) {
            if (this.gameComplete || this.gameOver || this.selectedRow === null || this.isGenerating) return;
            const cell = this.board[this.selectedRow][this.selectedCol];
            if (!cell.editable) return;
            
            this.saveState();
            updateFn(cell);
            this.updateConflicts();

            // === 核心修改：仅在有限模式下增加错误计数 ===
            if (cell.conflict && this.configMode === 'limited') {
                this.errors++;
                // 若为有限模式且已超过上限
                if (this.errors > this.configErrorLimit) {
                    this.gameOver = true;
                    this.selectedRow = null;
                    this.selectedCol = null;
                    return;
                }
            }
            this.checkComplete();
        },

        inputNumber(num) {
            this._operateCell(cell => {
                cell.value = (cell.value === num) ? 0 : num;
            });
        },
        clearSelected() {
            this._operateCell(cell => {
                cell.value = 0;
            });
        },

        updateConflicts() {
            const grid = this.getGridSnapshot();
            const conflictMap = Array.from({ length: this.SIZE }, () => Array(this.SIZE).fill(false));
            const messages = [];
            const regions = SudokuGridHelper.generateRegions(this.BOX_SIZE, this.SIZE);
            for (let region of regions) {
                const result = SudokuEngine.checkRegion(grid, region.r1, region.c1, region.r2, region.c2);
                result.conflicts.forEach(p => conflictMap[p.r][p.c] = true);
                [...new Set(result.duplicateValues)].forEach(val => {
                    messages.push(`${region.label}有重复的数字 ${val}`);
                });
            }
            SudokuGridHelper.syncConflicts(this.board, conflictMap);
            this.conflictMessages = messages;
        },
        checkComplete() {
            if (SudokuGridHelper.checkComplete(this.board, this.SIZE)) {
                this.gameComplete = true;
                this.selectedRow = null; this.selectedCol = null;
                this.hintMessage = '';
            }
        }
    },
    mounted() { 
        this.configBlanks = this.minBlanks; 
    }
});

app.mount('#app');