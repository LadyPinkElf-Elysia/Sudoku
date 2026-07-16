// CreatePuzzleComponent.js - 出题组件（先出题再解题）
import { SudokuGameHelper } from './SudokuGameHelper.js';
import { PuzzleStorage } from './PuzzleStorage.js';
import { SudokuRenderer } from './util/SudokuRenderer.js';
import { SudokuGridHelper } from './util/SudokuGridHelper.js';
import { handleSudokuKeyDown } from './util/SudokuKeyboard.js';

export const CreatePuzzleComponent = {
    template: `
        <div class="create-puzzle-panel">
            <div class="config-header">
                <button class="btn btn-secondary btn-sm" @click="$emit('back')">← 返回</button>
                <h2>✏️ {{ mode === 'edit' ? '出题 - 点击格子输入数字' : '🧩 解题' }}</h2>
            </div>
            
            <div v-if="mode === 'edit'" class="config-item">
                <label>宫格大小 N:</label>
                <div class="input-group">
                    <input type="number" v-model.number="puzzleN" :min="2" :max="6" @change="initBoard">
                    <span class="hint">{{ SIZE }} x {{ SIZE }} 的棋盘</span>
                </div>
            </div>
            
            <div v-if="mode === 'edit'" class="config-item">
                <label>题目标题（可选）:</label>
                <div class="input-group">
                    <input type="text" v-model="puzzleTitle" placeholder="给题目起个名字" style="width:100%;max-width:300px;">
                </div>
            </div>
            
            <div class="board-scroll-container">
                <div class="board-wrapper" style="width:100%;height:100%">
                    <canvas id="createCanvas" class="board-canvas"></canvas>
                </div>
            </div>
            
            <div class="num-pad-wrapper">
                <div class="num-grid" :style="{ gridTemplateColumns: 'repeat(' + BOX_SIZE + ', minmax(0, 1fr))' }">
                    <button v-for="n in SIZE" :key="n" class="num-btn" @click="inputNumber(n)">{{ n }}</button>
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
        currentUser: { type: Object, required: true }
    },
    emits: ['back'],
    data() {
        return {
            mode: 'edit', // 'edit' | 'solve'
            puzzleTitle: '',
            puzzleN: 3,
            message: '',
            board: [],
            gameBoard: [],
            selectedRow: null,
            selectedCol: null,
            historyMap: {},
            stepPointer: -1,
            showVictory: false
        };
    },
    computed: {
        SIZE() { return this.puzzleN * this.puzzleN; },
        BOX_SIZE() { return this.puzzleN; },
        hasPuzzle() {
            if (!this.board.length) return false;
            return this.board.some(row => row.some(cell => cell > 0));
        },
        isComplete() {
            if (!this.gameBoard.length) return false;
            return SudokuGridHelper.checkComplete(this.gameBoard, this.SIZE);
        }
    },
    methods: {
        initBoard() {
            const size = this.SIZE;
            this.board = Array.from({ length: size }, () => Array(size).fill(0));
            this.selectedRow = null;
            this.selectedCol = null;
            this.mode = 'edit';
            this.showVictory = false;
            this.$nextTick(() => this.renderCanvas());
        },
        renderCanvas() {
            const canvas = document.getElementById('createCanvas');
            if (!canvas) return;
            const board = this.mode === 'edit'
                ? this.board.map(row => row.map(v => ({ value: v, editable: true, conflict: false, given: false })))
                : this.gameBoard;
            SudokuRenderer.draw(canvas, board, this.SIZE, this.BOX_SIZE, this.selectedRow, this.selectedCol, 1.0);
        },
        onCanvasClick(e) {
            const canvas = document.getElementById('createCanvas');
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const displaySize = Math.floor(canvas.parentElement.clientWidth * 0.95);
            const scale = rect.width / displaySize;
            const x = (e.clientX - rect.left) / scale;
            const y = (e.clientY - rect.top) / scale;
            const cellSize = displaySize / this.SIZE;
            const row = Math.floor(y / cellSize);
            const col = Math.floor(x / cellSize);
            if (row >= 0 && row < this.SIZE && col >= 0 && col < this.SIZE) {
                // 解题模式下不可编辑 given 格子
                if (this.mode === 'solve' && this.gameBoard[row][col].given) return;
                this.selectedRow = row;
                this.selectedCol = col;
                this.renderCanvas();
            }
        },
        inputNumber(num) {
            if (this.selectedRow === null || this.selectedCol === null) return;
            const r = this.selectedRow, c = this.selectedCol;
            
            if (this.mode === 'edit') {
                // 出题模式：点击切换数字
                this.board[r][c] = (this.board[r][c] === num) ? 0 : num;
            } else {
                // 解题模式：不可编辑 given 格子
                if (this.gameBoard[r][c].given) return;
                // 保存历史
                this.saveState();
                this.gameBoard[r][c].value = (this.gameBoard[r][c].value === num) ? 0 : num;
                this.gameBoard[r][c].conflict = false;
                // 检查冲突
                const messages = SudokuGridHelper.updateConflictsLocal(this.gameBoard, r, c, this.BOX_SIZE, this.SIZE);
                // 检查完成
                if (SudokuGridHelper.checkComplete(this.gameBoard, this.SIZE)) {
                    this.showVictory = true;
                }
            }
            this.renderCanvas();
        },
        clearSelected() {
            if (this.selectedRow === null || this.selectedCol === null) return;
            const r = this.selectedRow, c = this.selectedCol;
            if (this.mode === 'edit') {
                this.board[r][c] = 0;
            } else {
                if (this.gameBoard[r][c].given) return;
                this.saveState();
                this.gameBoard[r][c].value = 0;
                this.gameBoard[r][c].conflict = false;
            }
            this.renderCanvas();
        },
        clearBoard() {
            const size = this.SIZE;
            this.board = Array.from({ length: size }, () => Array(size).fill(0));
            this.selectedRow = null;
            this.selectedCol = null;
            this.mode = 'edit';
            this.showVictory = false;
            this.renderCanvas();
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
            this.$nextTick(() => this.renderCanvas());
        },
        startSolving() {
            // 将题目转换为游戏棋盘（given 格子不可编辑）
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
            this.$nextTick(() => this.renderCanvas());
        },
        saveState() {
            const result = SudokuGameHelper.saveState(this.historyMap, this.stepPointer, this.gameBoard);
            this.historyMap = result.newHistoryMap;
            this.stepPointer = result.newStepPointer;
        },
        undo() {
            if (this.stepPointer <= 0) return;
            this.stepPointer--;
            const result = SudokuGameHelper.navigateHistory(this.gameBoard, this.historyMap, this.stepPointer, this.SIZE, this.BOX_SIZE);
            if (result) {
                this.selectedRow = null;
                this.selectedCol = null;
                this.renderCanvas();
            }
        },
        redo() {
            if (!this.historyMap[this.stepPointer + 1]) return;
            this.stepPointer++;
            const result = SudokuGameHelper.navigateHistory(this.gameBoard, this.historyMap, this.stepPointer, this.SIZE, this.BOX_SIZE);
            if (result) {
                this.selectedRow = null;
                this.selectedCol = null;
                this.renderCanvas();
            }
        },
        async submitPuzzle() {
            this.message = '';
            
            const puzzle = this.board.map(row => [...row]);
            
            if (!this.hasPuzzle) {
                this.message = '请在棋盘上输入题目';
                return;
            }
            
            const SIZE = puzzle.length;
            const BOX_SIZE = this.puzzleN;
            
            // 从解题结果中提取参考答案
            const solution = this.gameBoard.map(row => row.map(cell => cell.value));
            
            // 验证参考答案是否完整
            if (!SudokuGridHelper.checkComplete(solution, SIZE)) {
                this.message = '请先完成解题再提交';
                return;
            }
            
            // 保存题目
            this.message = '正在保存...';
            const saveResult = await PuzzleStorage.add(
                this.currentUser.id,
                this.currentUser.username,
                puzzle,
                solution,
                SIZE,
                BOX_SIZE,
                this.puzzleTitle || undefined
            );
            
            if (saveResult.success) {
                this.message = '✅ 题目保存成功！题目ID: ' + saveResult.puzzle.id;
                this.clearBoard();
                this.puzzleTitle = '';
            } else {
                this.message = saveResult.message || '保存失败，请重试';
            }
        },
        handleKeyDown(e) {
            handleSudokuKeyDown(e, {
                started: true,
                isGenerating: false,
                complete: false,
                over: false,
                SIZE: this.SIZE,
                selectedRow: this.selectedRow,
                selectedCol: this.selectedCol
            }, {
                inputNumber: (num) => this.inputNumber(num),
                clearSelected: () => this.clearSelected(),
                selectCell: (r, c) => {
                    if (this.mode === 'solve' && this.gameBoard[r][c].given) return;
                    this.selectedRow = r;
                    this.selectedCol = c;
                    this.renderCanvas();
                },
                undo: () => this.undo(),
                redo: () => this.redo()
            });
        }
    },
    mounted() {
        this.initBoard();
        this.$nextTick(() => {
            const canvas = document.getElementById('createCanvas');
            if (canvas) {
                canvas.addEventListener('click', (e) => this.onCanvasClick(e));
            }
        });
        document.addEventListener('keydown', this.handleKeyDown);
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.handleKeyDown);
        const canvas = document.getElementById('createCanvas');
        if (canvas) canvas.removeEventListener('click', this.onCanvasClick);
    }
};