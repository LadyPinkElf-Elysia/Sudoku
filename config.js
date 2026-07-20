// config.js - 常量配置
export const PAGE = {
    LOGIN: 'login',
    MENU: 'menu',
    CONFIG: 'config',
    GAME: 'game',
    CREATE: 'create',
    SEARCH: 'search',
    MY_PUZZLES: 'myPuzzles',
}

export const STATUS = {
    IDLE: 'idle',
    PLAYING: 'playing',
    GENERATING: 'generating',
    WON: 'won',
    LOST: 'lost',
}

export const MODE = {
    NONE: 'none',
    GAME: 'game',
    CREATE: 'create',
}

export const DEFAULTS = {
    config: { boxSize: 3, blanks: 10, mode: 'infinite', errLimit: 0 },
}