// main.js
import { createApp } from 'vue';
import { SudokuEngine } from './util/SudokuEngine.js';
import { SudokuHistory } from './util/SudokuHistory.js';
import { SudokuGridHelper } from './util/SudokuGridHelper.js';

const BLANK_CONFIG = {
    3: { easy: 22, medium: 29, hard: 34 },
    4: { easy: 60, medium: 75, hard: 85 },
    5: { easy: 130, medium: 155, hard: 175 }
};

const app = createApp({
    data() {
        return {
            currentBoxSize: 3,
            currentDifficulty: 'medium',
            BOX_SIZE: 0,
            SIZE: 0,
            blanks: 0,
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
            if (size === 9) return '9×9 标准';
            if (size === 16) return '16×16 进阶';
            if (size === 25) return '25×25 专家';
            return `${size}×${size}`;
        },
        stepKeys() {
            return Object.keys(this.historyMap).map(Number).sort((a, b) => a - b);
        }
    },
    watch: {
        currentBoxSize() {
            if (this.isGenerating) return;
            this.newGame();
        },
        currentDifficulty() {
            if (this.isGenerating) return;
            this.newGame();
        }
    },
    methods: {
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
        initGame() {
            if (this.isGenerating) return;
            
            this.isGenerating = true;

            this.BOX_SIZE = parseInt(this.currentBoxSize);
            this.SIZE = this.BOX_SIZE * this.BOX_SIZE;
            this.blanks = BLANK_CONFIG[this.BOX_SIZE][this.currentDifficulty];

            // 极速生成，完全不卡
            const solution = SudokuEngine.generateSolution(this.BOX_SIZE, this.SIZE);
            const puzzle = SudokuEngine.createPuzzle(solution, this.blanks);
            
            this.board = puzzle.map(row => row.map(val => ({ value: val, editable: val === 0, conflict: false })));
            this.selectedRow = null; this.selectedCol = null;
            this.gameComplete = false; this.conflictMessages = [];
            this.historyMap = {}; this.stepPointer = -1;
            this.hintMessage = '';
            
            this.saveState();
            this.isGenerating = false;
        },
        selectCell(r, c) { this.selectedRow = r; this.selectedCol = c; this.hintMessage = ''; },
        _operateCell(updateFn) {
            if (this.gameComplete || this.selectedRow === null || this.isGenerating) return;
            const cell = this.board[this.selectedRow][this.selectedCol];
            if (!cell.editable) return;
            this.saveState();
            updateFn(cell);
            this.updateConflicts();
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
        },
        newGame() {
            if (this.isGenerating) return;
            this.initGame();
        }
    },
    mounted() { this.newGame(); }
});

app.mount('#app');