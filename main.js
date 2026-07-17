// main.js - 应用入口（单一数据源，只负责修改数据）
const { createApp } = Vue;
import { Pages } from './util/Pages.js';
import { SudokuGenerator } from './util/SudokuGenerator.js';
import { GameStateManager } from './util/GameStateManager.js';
import { SudokuGameHelper } from './util/SudokuGameHelper.js';
import { SudokuGridHelper } from './util/SudokuGrid.js';
import { PuzzleStorage, UserSystem } from './api.js';
import { LoginComponent } from './components/LoginComponent.js';
import { MainMenuComponent } from './components/MainMenuComponent.js';
import { ConfigComponent } from './components/ConfigComponent.js';
import { CreatePuzzleComponent } from './components/CreatePuzzleComponent.js';
import { SearchPuzzlesComponent } from './components/SearchPuzzlesComponent.js';
import { MyPuzzlesComponent } from './components/MyPuzzlesComponent.js';
import { GameComponent } from './components/GameComponent.js';

const app = createApp({
    data() {
        return {
            page: Pages.LOGIN,
            currentUser: null,
            config: GameStateManager.createDefaultConfig(),
            game: GameStateManager.createDefaultState(),
            historyMap: {},
            stepPointer: -1,
            zoom: 1.0,
            currentPuzzleData: null,
            editPuzzleData: null,
            viewUserId: null,
            // CreatePuzzle 数据
            createPuzzleMode: 'edit',
            puzzleTitle: '',
            puzzleN: 3,
            createMessage: '',
            createBoard: [],
            createGameBoard: [],
            createSelectedRow: null,
            createSelectedCol: null,
            createHistoryMap: {},
            createStepPointer: -1,
            createShowVictory: false,
            createStats: null,
            submittedPuzzleId: null,
            // SearchPuzzles 数据
            searchQuery: '',
            searchResults: [],
            searchMessage: '',
            // MyPuzzles 数据
            myPuzzles: [],
            myPuzzlesMessage: '',
            myPuzzlesLoading: false,
            // Login 数据
            loginMessage: ''
        };
    },
    computed: {
        blanksRange() {
            return GameStateManager.calcBlanksRange(this.config.N);
        },
        boxSize() { return this.config.N; },
        size() { return this.config.N * this.config.N; },
        createBoxSize() { return this.puzzleN; },
        createSize() { return this.puzzleN * this.puzzleN; }
    },
    watch: {
        'config.N'(val) {
            this.config.N = Math.max(this.config.NMin, Math.min(this.config.NMax, val));
            const { min, max } = this.blanksRange;
            if (this.config.blanks < min) this.config.blanks = min;
            if (this.config.blanks > max) this.config.blanks = max;
        },
        'config.blanks'(val) {
            const { min, max } = this.blanksRange;
            this.config.blanks = Math.max(min, Math.min(max, val));
        }
    },
    methods: {
        // ===== 公共页面切换 =====
        goToPage(page) { this.page = page; },

        // ===== 通用工具 =====
        _formatStats(stats) {
            return {
                totalChallenges: stats.totalChallenges,
                completedChallenges: stats.completedChallenges,
                passRate: stats.totalChallenges > 0
                    ? (stats.completedChallenges / stats.totalChallenges * 100).toFixed(1) + '%'
                    : '暂无',
                avgTime: stats.avgTime || 0,
                avgTimeFormatted: stats.avgTime > 0
                    ? Math.floor(stats.avgTime / 60) + '分' + (stats.avgTime % 60) + '秒'
                    : ''
            };
        },
        _parsePuzzleStr(puzzleData) {
            const str = puzzleData.puzzle_data || puzzleData.puzzle;
            if (typeof str === 'string') {
                try { return JSON.parse(str); } catch (e) { return []; }
            }
            return str;
        },
        _resetCreateState() {
            this.createPuzzleMode = 'edit';
            this.puzzleTitle = '';
            this.puzzleN = 3;
            this.createMessage = '';
            this.createBoard = [];
            this.createGameBoard = [];
            this.createSelectedRow = null;
            this.createSelectedCol = null;
            this.createHistoryMap = {};
            this.createStepPointer = -1;
            this.createShowVictory = false;
            this.createStats = null;
            this.submittedPuzzleId = null;
        },

        // ===== 登录/注册 =====
        async onDoLogin(credentials) {
            const result = await UserSystem.login(credentials.username, credentials.password);
            if (result.success) {
                this.currentUser = result.user;
                this.goToPage(Pages.MAIN_MENU);
            } else {
                this.loginMessage = result.message;
            }
        },
        async onDoRegister(credentials) {
            const result = await UserSystem.register(credentials.username, credentials.password);
            if (result.success) {
                this.currentUser = result.user;
                this.goToPage(Pages.MAIN_MENU);
            } else {
                this.loginMessage = result.message || '注册失败，请重试';
            }
        },
        onGuestLogin() {
            this.currentUser = { id: -1, username: '游客', isGuest: true };
            this.goToPage(Pages.MAIN_MENU);
        },

        // ===== 页面导航 =====
        onLogout() { this.currentUser = null; this.goToPage(Pages.LOGIN); },
        goToCreatePuzzle() {
            this.editPuzzleData = null;
            this._resetCreateState();
            this._initCreateBoard();
            this.goToPage(Pages.CREATE_PUZZLE);
        },
        async goToSearchPuzzles() {
            this.searchQuery = '';
            this.searchResults = await PuzzleStorage.getAll();
            await this._loadPuzzleStats(this.searchResults);
            this.goToPage(Pages.SEARCH_PUZZLES);
        },
        async goToMyPuzzles() {
            this.viewUserId = null;
            await this._loadMyPuzzles();
            this.goToPage(Pages.MY_PUZZLES);
        },
        async viewUserPuzzles(userId) {
            this.viewUserId = userId;
            await this._loadMyPuzzles();
            this.goToPage(Pages.MY_PUZZLES);
        },
        goToMainMenu() { this.viewUserId = null; this.goToPage(Pages.MAIN_MENU); },
        editPuzzle(puzzle) {
            this.editPuzzleData = puzzle;
            this._resetCreateState();
            const parsed = this._parsePuzzleStr(puzzle);
            if (Array.isArray(parsed) && parsed.length > 0) {
                this.puzzleN = Math.round(Math.sqrt(parsed.length));
                this.puzzleTitle = puzzle.title || '';
                this.createBoard = parsed.map(row => [...row]);
                this.submittedPuzzleId = puzzle.id;
                PuzzleStorage.getStats(puzzle.id).then(s => this.createStats = this._formatStats(s));
            }
            this.goToPage(Pages.CREATE_PUZZLE);
        },

        // ===== CreatePuzzle 操作 =====
        _initCreateBoard() {
            const size = this.createSize;
            this.createBoard = Array.from({ length: size }, () => Array(size).fill(0));
        },
        _serializeCreateBoard(includeMeta = false) {
            return this.createGameBoard.map(row => row.map(cell => {
                const base = { value: cell.value, editable: cell.editable };
                return includeMeta ? { ...base, conflict: false, given: cell.given } : base;
            }));
        },
        _createOperateCell(updateFn) {
            if (this.createSelectedRow === null || this.createSelectedCol === null) return;
            const r = this.createSelectedRow, c = this.createSelectedCol;
            if (this.createPuzzleMode === 'edit') {
                updateFn(this.createBoard[r], c);
            } else {
                if (this.createGameBoard[r][c].given) return;
                const result = SudokuGameHelper.saveState(this.createHistoryMap, this.createStepPointer,
                    this._serializeCreateBoard());
                this.createHistoryMap = result.newHistoryMap;
                this.createStepPointer = result.newStepPointer;
                updateFn(this.createGameBoard[r], c);
                this.createGameBoard[r][c].conflict = false;
                SudokuGridHelper.updateConflictsLocal(this.createGameBoard, r, c, this.createBoxSize, this.createSize);
                if (SudokuGridHelper.checkComplete(this.createGameBoard, this.createSize)) {
                    this.createShowVictory = true;
                }
            }
        },
        onCreateCellClick(row, col) {
            if (this.createPuzzleMode === 'solve' && this.createGameBoard[row]?.[col]?.given) return;
            this.createSelectedRow = row;
            this.createSelectedCol = col;
        },
        onCreateInputNumber(num) {
            this._createOperateCell((row, c) => { row[c] = (row[c] === num) ? 0 : num; });
        },
        onCreateClearSelected() {
            this._createOperateCell((row, c) => { row[c] = 0; });
        },
        onCreateUndo() {
            if (this.createStepPointer > 0) this._moveCreatePointer(this.createStepPointer - 1);
        },
        onCreateRedo() {
            if (this.createHistoryMap[this.createStepPointer + 1]) this._moveCreatePointer(this.createStepPointer + 1);
        },
        _moveCreatePointer(targetStep) {
            this.createStepPointer = targetStep;
            const board = this._serializeCreateBoard(true);
            const result = SudokuGameHelper.navigateHistory(board, this.createHistoryMap, targetStep, this.createBoxSize, this.createSize);
            if (result) this.createGameBoard = board;
        },
        onCreateClearBoard() {
            this._initCreateBoard();
            this.createSelectedRow = null;
            this.createSelectedCol = null;
            this.createPuzzleMode = 'edit';
            this.createShowVictory = false;
        },
        onCreateStartSolving() {
            this.createGameBoard = this.createBoard.map(row =>
                row.map(v => ({ value: v, editable: v === 0, conflict: false, given: v !== 0 }))
            );
            this.createHistoryMap = {};
            this.createStepPointer = -1;
            this.createSelectedRow = null;
            this.createSelectedCol = null;
            this.createShowVictory = false;
            this.createPuzzleMode = 'solve';
        },
        onCreateBackToEdit() {
            this.createPuzzleMode = 'edit';
            this.createShowVictory = false;
        },
        async onCreateSubmitPuzzle({ puzzle, solution, title }) {
            const saveFn = this.submittedPuzzleId
                ? PuzzleStorage.update(this.submittedPuzzleId, this.currentUser.id, puzzle, solution, this.createSize, this.createBoxSize, title)
                : PuzzleStorage.add(this.currentUser.id, this.currentUser.username, puzzle, solution, this.createSize, this.createBoxSize, title);
            const saveResult = await saveFn;
            if (saveResult.success) {
                if (saveResult.puzzle) this.submittedPuzzleId = saveResult.puzzle.id;
            } else {
                this.createMessage = saveResult.message || '保存失败';
            }
        },

        // ===== 搜索题目 =====
        async onSearch() {
            this.searchResults = await PuzzleStorage.search(this.searchQuery);
            await this._loadPuzzleStats(this.searchResults);
        },
        async _loadPuzzleStats(puzzles) {
            for (const puzzle of puzzles) {
                const stats = await PuzzleStorage.getStats(puzzle.id);
                puzzle.stats = this._formatStats(stats);
            }
        },

        // ===== 我的题目 =====
        async _loadMyPuzzles() {
            this.myPuzzlesLoading = true;
            const targetUserId = (this.viewUserId !== null && this.viewUserId !== this.currentUser.id)
                ? this.viewUserId
                : this.currentUser.id;
            this.myPuzzles = await PuzzleStorage.getByUser(targetUserId);
            await this._loadPuzzleStats(this.myPuzzles);
            this.myPuzzlesLoading = false;
        },

        // ===== 游戏启动 =====
        async startFromConfig() {
            if (this.game.isGenerating) return;
            this.game = { ...GameStateManager.createDefaultState(), isGenerating: true, hintsRemaining: -1 };
            this.currentPuzzleData = null;
            this.goToPage(Pages.GAME);
            try {
                const puzzle = await SudokuGenerator.generate(this.boxSize, this.size, this.config.blanks);
                this._applyBoard(puzzle);
            } catch (e) {
                console.error('生成失败:', e);
                this._applyBoard(SudokuGenerator.generateSync(this.boxSize, this.size, this.config.blanks));
            }
        },
        _applyBoard(puzzle) {
            const init = GameStateManager.initGame(puzzle);
            this.game = { ...this.game, ...init, isGenerating: false, started: true, startTime: Date.now() };
            this.historyMap = init.historyMap;
            this.stepPointer = init.stepPointer;
            this.zoom = init.zoom;
        },

        // ===== 用户题目 =====
        startUserPuzzle(puzzleData) {
            this.currentPuzzleData = puzzleData;
            const size = puzzleData.size || puzzleData.SIZE;
            const n = Math.round(Math.sqrt(size));
            this.config.N = n;
            const puzzle = this._parsePuzzleStr(puzzleData);
            const hintsRemaining = (n - 1) * (n - 1);
            this.game = { ...GameStateManager.applyPuzzle(this.game, puzzle), hintsRemaining, startTime: Date.now() };
            this.historyMap = {};
            this.stepPointer = -1;
            this.zoom = 1.0;
            this.goToPage(Pages.GAME);
        },
        async startRandomUserPuzzle() {
            const puzzle = await PuzzleStorage.getRandom();
            if (puzzle) this.startUserPuzzle(puzzle);
        },

        // ===== 游戏重置 =====
        resetGame() {
            if (this.game.isGenerating) return;
            SudokuGenerator.abort();
            this.game = { ...GameStateManager.createDefaultState(), hintMessage: '' };
            this.goToPage(Pages.MAIN_MENU);
        },

        // ===== 游戏操作（由子组件 emit 触发，统一修改数据） =====
        onCellClick(row, col) {
            this.game = { ...this.game, selectedRow: row, selectedCol: col, hintMessage: '' };
        },
        onInputNumber(num) {
            this._operateCell(cell => { cell.value = (cell.value === num) ? 0 : num; });
        },
        onClearSelected() {
            this._operateCell(cell => { cell.value = 0; });
        },
        _operateCell(updateFn) {
            const result = GameStateManager.operateCell(this.game, this.config, this.game.selectedRow, this.game.selectedCol, updateFn, {
                historyMap: this.historyMap,
                stepPointer: this.stepPointer
            });
            if (!result) return;
            this.historyMap = result.newHistoryMap;
            this.stepPointer = result.newStepPointer;
            this.game = result.newGame;
            this._recordChallengeIfComplete();
        },
        onUndo() {
            if (this.stepPointer > 0) this._movePointer(this.stepPointer - 1);
        },
        onRedo() {
            if (this.historyMap[this.stepPointer + 1]) this._movePointer(this.stepPointer + 1);
        },
        _movePointer(targetStep) {
            this.stepPointer = targetStep;
            const result = SudokuGameHelper.navigateHistory(this.game.board, this.historyMap, targetStep, this.boxSize, this.size);
            if (result) {
                this.game = { ...this.game, conflictMessages: result.messages, selectedRow: null, selectedCol: null, hintMessage: '' };
            }
        },
        onGiveHint() {
            if (this.game.isGenerating || this.game.hintsRemaining === 0) return;
            const msg = SudokuGameHelper.getHintMessage(this.game.board, this.game.selectedRow, this.game.selectedCol, this.boxSize, this.size);
            const newHints = this.game.hintsRemaining > 0 ? this.game.hintsRemaining - 1 : this.game.hintsRemaining;
            this.game = { ...this.game, hintMessage: msg, hintsRemaining: newHints };
        },
        _recordChallengeIfComplete() {
            if (this.game.complete && this.currentPuzzleData && this.currentUser) {
                const elapsedTime = this.game.startTime ? Math.floor((Date.now() - this.game.startTime) / 1000) : 0;
                this.game.elapsedTime = elapsedTime;
                PuzzleStorage.recordChallenge(
                    this.currentPuzzleData.id,
                    this.currentUser.id,
                    this.currentUser.username,
                    true,
                    elapsedTime
                );
            }
        }
    },
    mounted() {
        this.config.blanks = this.blanksRange.min;
    }
});

app.component('login-component', LoginComponent);
app.component('main-menu-component', MainMenuComponent);
app.component('config-component', ConfigComponent);
app.component('create-puzzle-component', CreatePuzzleComponent);
app.component('search-puzzles-component', SearchPuzzlesComponent);
app.component('my-puzzles-component', MyPuzzlesComponent);
app.component('game-component', GameComponent);

app.mount('#app');