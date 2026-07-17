// FormatUtils.js - 通用格式化工具（静态方法）
export class FormatUtils {
    /**
     * 格式化秒数为 MM:SS
     */
    static formatTime(seconds) {
        if (!seconds || seconds <= 0) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    /**
     * 计算通过率
     */
    static calcPassRate(stats) {
        if (!stats || stats.totalChallenges === 0) return '暂无';
        const rate = (stats.completedChallenges / stats.totalChallenges * 100).toFixed(1);
        return rate + '%';
    }

    /**
     * 格式化统计对象（添加 passRate 和 avgTimeFormatted）
     */
    static formatStats(stats) {
        if (!stats) return null;
        return {
            totalChallenges: stats.totalChallenges,
            completedChallenges: stats.completedChallenges,
            passRate: FormatUtils.calcPassRate(stats),
            avgTime: stats.avgTime || 0,
            avgTimeFormatted: stats.avgTime > 0 ? FormatUtils.formatTime(stats.avgTime) : ''
        };
    }
}