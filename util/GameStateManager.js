// GameStateManager.js - 游戏状态管理（静态方法，通用）
import { SudokuGameHelper } from '../SudokuGameHelper.js';
import { SudokuGridHelper } from './SudokuGrid.js';

export class GameStateManager {
    /**
     * 创建默认游戏状态
     */
    static createDefaultState() {
        return {
            started: false,
            errors: 0,
            over: false,
            complete: false,
            board: [],
            selectedRow: null,
            selectedCol: null,
            conflictMessages: [],
            hintMessage: '',
            isGenerating: false
        };
    }

    /**
     * 创建默认配置
     */
    static createDefaultConfig() {
        return {
            N: 3,
            NMin: 3,
            NMax: 6,
            blanks: null,
            mode: 'infinite',
            errorLimit: 0,
            errorLimitMin: 0,
            errorLimitMax: 99
        };
    }

    /**
     * 初始化游戏（从谜题创建棋盘）
     */
    static initGame(puzzle) {
        const board = SudokuGameHelper.createBoard(puzzle);
        return {
            board,
            selectedRow: null,
            selectedCol: null,
            conflictMessages: [],
            hintMessage: '',
            historyMap: {},
            stepPointer: -1,
            zoom: 1.0
        };
    }

    /**
     * 应用谜题到游戏状态
     */
    static applyPuzzle(state, puzzle) {
        const init = GameStateManager.initGame(puzzle);
        return {
            ...state,
            ...init,
            errors: 0,
            over: false,
            complete: false,
            started: true,
            isGenerating: false
        };
    }

    /**
     * 操作格子（输入数字/清除）
     * @param {Object} game - 游戏状态
     * @param {Object} config - 配置
     * @param {number} row - 行
     * @param {number} col - 列
     * @param {Function} updateFn - 更新函数，接收 cell 对象
     * @param {Object} history - { historyMap, stepPointer }
     * @returns {Object} { newGame, newHistoryMap, newStepPointer }
     */
    static operateCell(game, config, row, col, updateFn, history) {
        if (game.complete || game.over || row === null || col === null || game.isGenerating) return null;
        const cell = game.board[row][col];
        if (!cell.editable) return null;

        // 保存历史
        const { newHistoryMap, newStepPointer } = SudokuGameHelper.saveState(
            history.historyMap, history.stepPointer, game.board
        );

        // 执行操作
        updateFn(cell);

        // 更新冲突
        const messages = SudokuGridHelper.updateConflictsLocal(
            game.board, row, col, config.BOX_SIZE || config.N, config.SIZE || config.N * config.N
        );

        let newGame = { ...game, conflictMessages: messages, hintMessage: '' };

        // 错误计数（有限模式）
        if (cell.conflict && config.mode === 'limited') {
            newGame.errors++;
            if (newGame.errors > config.errorLimit) {
                newGame.over = true;
                newGame.selectedRow = null;
                newGame.selectedCol = null;
            }
        }

        // 检查完成
        const size = config.SIZE || config.N * config.N;
        if (SudokuGridHelper.checkComplete(game.board, size)) {
            newGame.complete = true;
            newGame.selectedRow = null;
            newGame.selectedCol = null;
            newGame.hintMessage = '';
        }

        return { newGame, newHistoryMap, newStepPointer };
    }

    /**
     * 计算最小/最大挖空数
     */
    static calcBlanksRange(N) {
        if (!N) return { min: 0, max: 0 };
        const total = N * N * N * N;
        return {
            min: Math.ceil(total * 0.10),
            max: Math.floor(total * 0.40)
        };
    }

    /**
     * 验证配置中的 N 值
     */
    static validateN(N, NMin, NMax) {
        return Math.max(NMin, Math.min(NMax, N));
    }

    /**
     * 验证配置中的 blanks 值
     */
    static validateBlanks(blanks, min, max) {
        return Math.max(min, Math.min(max, blanks));
    }
}