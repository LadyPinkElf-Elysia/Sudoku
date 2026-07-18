// Fields.js - 统一字段名枚举（数据库、前端请求、返回数据共用）
// 所有地方都引用此枚举，确保字段名完全一致

export const F = Object.freeze({
    // puzzles 表
    PUZZLE_ID: 'puzzleId',       // 主键
    USER_ID: 'userId',           // 用户 ID
    USERNAME: 'username',        // 用户名
    TITLE: 'title',              // 标题
    PUZZLE_DATA: 'puzzleData',   // 题目数据
    SOLUTION_DATA: 'solutionData', // 答案数据
    BOARD_SIZE: 'boardSize',     // 宫格大小
    CREATED_AT: 'createdAt',     // 创建时间

    // challenges 表
    CHALLENGE_ID: 'challengeId', // 主键
    IS_COMPLETED: 'isCompleted', // 是否完成
    ELAPSED_TIME: 'elapsedTime', // 用时

    // 用户表
    USER_PASSWORD: 'password',   // 密码
});