// GameStateManager.js - 游戏状态管理（静态方法，通用）
import { BoardManager } from './BoardManager.js';

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
            isGenerating: false,
            hintsRemaining: -1, // -1 表示无限提示
            startTime: null,
            elapsedTime: 0
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
        const board = BoardManager.createBoardFromPuzzle(puzzle);
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

        // 使用 BoardManager 操作格子
        const result = BoardManager.operateCell(game.board, row, col, updateFn, {
            boxSize: config.N,
            size: config.N * config.N,
            history
        });
        if (!result) return null;

        let newGame = { ...game, board: result.board, conflictMessages: result.conflictMessages, hintMessage: '' };

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
        if (result.complete) {
            newGame.complete = true;
            newGame.selectedRow = null;
            newGame.selectedCol = null;
            newGame.hintMessage = '';
        }

        return { newGame, newHistoryMap: result.historyMap, newStepPointer: result.stepPointer };
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

}
