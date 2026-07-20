// fields.js - 统一字段名枚举（数据库、API、内部数据共用）
export const F = Object.freeze({
    // 用户
    UID: 'uid',
    UNAME: 'uname',
    UPWD: 'upwd',
    // 题目
    PID: 'pid',
    PUZZLE: 'puzzle',
    SOLUTION: 'solution',
    TITLE: 'title',
    BOARD_SIZE: 'boardSize',
    CREATED_AT: 'createdAt',
    // 记录
    RID: 'rid',
    WON: 'won',
    ELAPSED: 'elapsed',
    ATTEMPTS: 'attempts',
    // 内部棋盘
    VAL: 'value',
    ED: 'editable',
    CON: 'conflict',
    GV: 'given',
})