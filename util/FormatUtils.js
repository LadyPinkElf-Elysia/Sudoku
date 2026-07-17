// FormatUtils.js - 通用工具（格式化 + 页面常量 + 游戏状态）
export const Pages = Object.freeze({
    LOGIN: 'login',
    MAIN_MENU: 'mainMenu',
    CONFIG: 'config',
    GAME: 'game',
    CREATE_PUZZLE: 'createPuzzle',
    SEARCH_PUZZLES: 'searchPuzzles',
    MY_PUZZLES: 'myPuzzles'
});

export class FormatUtils {
    static formatTime(seconds) {
        if (!seconds || seconds <= 0) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    static calcPassRate(stats) {
        if (!stats || stats.totalChallenges === 0) return '暂无';
        const rate = (stats.completedChallenges / stats.totalChallenges * 100).toFixed(1);
        return rate + '%';
    }

    // ===== 游戏状态 =====
    static createDefaultState() {
        return {
            started: false, errors: 0, over: false, complete: false,
            board: [], selectedRow: null, selectedCol: null,
            conflictMessages: [], hintMessage: '',
            isGenerating: false, hintsRemaining: -1,
            startTime: null, elapsedTime: 0
        };
    }

    static createDefaultConfig() {
        return {
            boxSize: 3, boxSizeMin: 3, boxSizeMax: 6,
            blanks: null, mode: 'infinite',
            errorLimit: 0, errorLimitMin: 0, errorLimitMax: 99
        };
    }

    static calcBlanksRange(N) {
        if (!N) return { min: 0, max: 0 };
        const total = N * N * N * N;
        return { min: Math.ceil(total * 0.10), max: Math.floor(total * 0.40) };
    }
}