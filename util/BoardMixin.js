// BoardMixin.js - 棋盘组件通用逻辑（缩放、Canvas、键盘、历史）
import { SudokuGameHelper } from '../SudokuGameHelper.js';
import { handleSudokuKeyDown } from './SudokuRenderer.js';
import { CanvasBoard } from './CanvasBoard.js';

export const BoardMixin = {
    props: {
        zoom: { type: Number, default: 1.0 }
    },
    emits: ['update:zoom'],
    computed: {
        boxSize() { return this.config?.N || this.puzzleN || 3; },
        size() { return this.boxSize * this.boxSize; },
        getSizeLabel() { const s = this.size; return s > 0 ? s + '×' + s : '配置中'; },
        stepKeys() { return Object.keys(this.historyMap || {}).map(Number).sort((a, b) => a - b); }
    },
    methods: {
        // ===== 缩放 =====
        zoomIn() {
            const newZoom = Math.min(3.0, this.zoom + 0.1);
            this.$emit('update:zoom', newZoom);
            this.$nextTick(() => this._renderBoard());
        },
        zoomOut() {
            const newZoom = Math.max(0.5, this.zoom - 0.1);
            this.$emit('update:zoom', newZoom);
            this.$nextTick(() => this._renderBoard());
        },

        // ===== Canvas 渲染 =====
        _renderBoard() {
            const canvasId = this._canvasId || 'sudokuCanvas';
            const board = this._getBoard();
            if (!board || !board.length) return;
            CanvasBoard.render(canvasId, board, this.size, this.boxSize, this._getSelectedRow(), this._getSelectedCol(), this.zoom);
        },
        _onCanvasClick(e) {
            const canvasId = this._canvasId || 'sudokuCanvas';
            const pos = CanvasBoard.getCellFromClick(e, canvasId, this.size);
            if (pos) this._onCellClick(pos.row, pos.col);
        },
        _bindCanvas() {
            const canvasId = this._canvasId || 'sudokuCanvas';
            this._clickHandler = (e) => this._onCanvasClick(e);
            this.$nextTick(() => {
                CanvasBoard.bindClick(this._clickHandler, canvasId);
                this._renderBoard();
            });
        },
        _unbindCanvas() {
            const canvasId = this._canvasId || 'sudokuCanvas';
            if (this._clickHandler) {
                CanvasBoard.unbindClick(this._clickHandler, canvasId);
                this._clickHandler = null;
            }
        },

        // ===== 键盘 =====
        _bindKeyboard() { document.addEventListener('keydown', this._handleKeyDown); },
        _unbindKeyboard() { document.removeEventListener('keydown', this._handleKeyDown); },
        _handleKeyDown(e) {
            const state = this._getGameState ? this._getGameState() : {};
            handleSudokuKeyDown(e, {
                started: true, isGenerating: state.isGenerating || false, complete: state.complete || false, over: state.over || false,
                SIZE: this.size, selectedRow: this._getSelectedRow(), selectedCol: this._getSelectedCol()
            }, {
                inputNumber: (num) => this._onInputNumber(num),
                clearSelected: () => this._onClearSelected(),
                selectCell: (r, c) => this._onCellClick(r, c),
                undo: () => this._onUndo(),
                redo: () => this._onRedo()
            });
        },

        // ===== 历史记录 =====
        _saveState() {
            const result = SudokuGameHelper.saveState(this.historyMap, this.stepPointer, this._getBoard());
            this._onSaveState(result.newHistoryMap, result.newStepPointer);
        },
        _movePointer(targetStep) {
            this._onMovePointer(targetStep);
        },
        _onUndo() { if (this.stepPointer > 0) this._movePointer(this.stepPointer - 1); },
        _onRedo() { if (this.historyMap[this.stepPointer + 1]) this._movePointer(this.stepPointer + 1); },

        // ===== 子类需实现的方法 =====
        _getBoard() { return []; },
        _getSelectedRow() { return null; },
        _getSelectedCol() { return null; },
        _onCellClick(row, col) {},
        _onInputNumber(num) {},
        _onClearSelected() {},
        _onHistoryNavigate(messages) {},
        _onSaveState(newHistoryMap, newStepPointer) {},
        _onMovePointer(targetStep) {}
    },
    // mounted/beforeUnmount 由子组件手动调用 _bindCanvas/_bindKeyboard
    // 因为子组件需要在 mounted 中先设置 _canvasId 再绑定
};