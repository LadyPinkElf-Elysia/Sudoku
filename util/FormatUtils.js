// FormatUtils.js - 通用工具（格式化 + 页面常量）
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
}