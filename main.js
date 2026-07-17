// main.js - 应用入口
const { createApp } = Vue;
import { SudokuGenerator } from './util/SudokuGenerator.js';
import { GameStateManager } from './util/GameStateManager.js';
import { LoginComponent } from './components/LoginComponent.js';
import { MainMenuComponent } from './components/MainMenuComponent.js';
import { ConfigComponent } from './components/ConfigComponent.js';
import { CreatePuzzleComponent } from './components/CreatePuzzleComponent.js';
import { SearchPuzzlesComponent } from './components/SearchPuzzlesComponent.js';
import { GameComponent } from './components/GameComponent.js';

const app = createApp({
    data() {
        return {
            page: 'login',
            currentUser: null,
            config: GameStateManager.createDefaultConfig(),
            game: GameStateManager.createDefaultState(),
            historyMap: {},
            stepPointer: -1,
            zoom: 1.0,
            currentPuzzleData: null
        };
    },
    computed: {
        blanksRange() {
            return GameStateManager.calcBlanksRange(this.config.N);
        },
        minBlanks() { return this.blanksRange.min; },
        maxBlanks() { return this.blanksRange.max; }
    },
    watch: {
        'config.N'(val) {
            this.config.N = GameStateManager.validateN(val, this.config.NMin, this.config.NMax);
            const { min, max } = this.blanksRange;
            if (this.config.blanks < min) this.config.blanks = min;
            if (this.config.blanks > max) this.config.blanks = max;
        },
        'config.blanks'(val) {
            const { min, max } = this.blanksRange;
            this.config.blanks = GameStateManager.validateBlanks(val, min, max);
        }
    },
    methods: {
        // ===== 页面导航 =====
        onLogin(user) { this.currentUser = user; this.page = 'mainMenu'; },
        onLogout() { this.currentUser = null; this.page = 'login'; },
        goToConfig() { this.page = 'config'; },
        goToCreatePuzzle() { this.page = 'createPuzzle'; },
        goToSearchPuzzles() { this.page = 'searchPuzzles'; },
        goToMainMenu() { this.page = 'mainMenu'; },
        startSystemGame() { this.page = 'config'; },

        // ===== 游戏启动 =====
        async startFromConfig() {
            if (this.game.isGenerating) return;

            // 配置值已通过 update:config 事件同步到 this.config
            const BOX_SIZE = this.config.N;
            const SIZE = this.config.N * this.config.N;

            // 重置游戏状态
            this.game = { ...GameStateManager.createDefaultState(), isGenerating: true };
            this.currentPuzzleData = null;
            this.page = 'game';

            try {
                const puzzle = await SudokuGenerator.generate(BOX_SIZE, SIZE, this.config.blanks);
                this._applyBoard(puzzle);
            } catch (e) {
                console.error('生成失败:', e);
                const puzzle = SudokuGenerator.generateSync(BOX_SIZE, SIZE, this.config.blanks);
                this._applyBoard(puzzle);
            }
        },
        _applyBoard(puzzle) {
            const init = GameStateManager.initGame(puzzle);
            this.game = { ...this.game, ...init, isGenerating: false };
            this.historyMap = init.historyMap;
            this.stepPointer = init.stepPointer;
            this.zoom = init.zoom;
        },

        // ===== 用户题目 =====
        startUserPuzzle(puzzleData) {
            this.currentPuzzleData = puzzleData;
            const size = puzzleData.size || puzzleData.SIZE;
            this.config.N = Math.round(Math.sqrt(size));

            let puzzle = puzzleData.puzzle_data || puzzleData.puzzle;
            if (typeof puzzle === 'string') {
                try { puzzle = JSON.parse(puzzle); } catch (e) { console.error('解析题目失败:', e); puzzle = []; }
            }
            if (!Array.isArray(puzzle) || puzzle.length === 0) {
                console.error('无效的题目数据:', puzzleData);
                alert('题目数据无效，无法开始游戏');
                return;
            }

            this.game = GameStateManager.applyPuzzle(this.game, puzzle);
            this.historyMap = {};
            this.stepPointer = -1;
            this.zoom = 1.0;
            this.page = 'game';
        },
        async startRandomUserPuzzle() {
            const { PuzzleStorage } = await import('./api.js');
            const puzzle = await PuzzleStorage.getRandom();
            if (!puzzle) { alert('暂无用户题目'); return; }
            this.startUserPuzzle(puzzle);
        },

        // ===== 游戏重置 =====
        resetGame() {
            if (this.game.isGenerating) return;
            SudokuGenerator.abort();
            this.game = { ...GameStateManager.createDefaultState(), hintMessage: '' };
            this.page = 'mainMenu';
        },

        // ===== 游戏状态更新 =====
        updateGame(newGame) {
            // 记录挑战结果
            if (newGame.complete && this.currentPuzzleData && this.currentUser) {
                import('./api.js').then(({ PuzzleStorage }) => {
                    PuzzleStorage.recordChallenge(
                        this.currentPuzzleData.id,
                        this.currentUser.id,
                        this.currentUser.username,
                        true
                    );
                });
            }
            this.game = newGame;
        },
        updateHistoryMap(newMap) { this.historyMap = newMap; },
        updateStepPointer(newPtr) { this.stepPointer = newPtr; },
        updateZoom(newZoom) { this.zoom = newZoom; },
        updateConfig(newConfig) { this.config = newConfig; }
    },
    mounted() {
        this.config.blanks = this.minBlanks;
    }
});

app.component('login-component', LoginComponent);
app.component('main-menu-component', MainMenuComponent);
app.component('config-component', ConfigComponent);
app.component('create-puzzle-component', CreatePuzzleComponent);
app.component('search-puzzles-component', SearchPuzzlesComponent);
app.component('game-component', GameComponent);

app.mount('#app');