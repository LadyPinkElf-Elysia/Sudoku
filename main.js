// main.js - 应用入口（单一数据源，只负责修改数据）
const { createApp } = Vue;
import { Pages, FormatUtils } from './util/FormatUtils.js';
import { BoardManager } from './util/BoardManager.js';
import { F } from './util/Fields.js';
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
            config: FormatUtils.createDefaultConfig(),
            game: FormatUtils.createDefaultState(),
            historyMap: {},
            stepPointer: -1,
            zoom: 1.0,
            currentPuzzleData: null,
            editPuzzleData: null,
            viewUserId: null,
            createPuzzleMode: 'edit',
            puzzleTitle: '',
            puzzleBoxSize: 3,
            createMessage: '',
            createBoard: [],
            createGameBoard: [],
            createSelectedRow: null,
            createSelectedCol: null,
            createHistoryMap: {},
            createStepPointer: -1,
            createShowVictory: false,
            createSubmitted: false,
            createStats: null,
            submittedPuzzleId: null,
            searchQuery: '',
            searchResults: [],
            searchMessage: '',
            myPuzzles: [],
            myPuzzlesMessage: '',
            myPuzzlesLoading: false,
            loginMessage: ''
        };
    },
    computed: {
        blanksRange() { return FormatUtils.calcBlanksRange(this.config.boxSize); },
        boxSize() { return this.config.boxSize; },
        size() { return this.config.boxSize * this.config.boxSize; },
        createBoxSize() { return this.puzzleBoxSize; },
        createSize() { return this.puzzleBoxSize * this.puzzleBoxSize; }
    },
    watch: {
        'config.boxSize'(val) {
            this.config.boxSize = Math.max(this.config.boxSizeMin, Math.min(this.config.boxSizeMax, val));
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
        goToPage(page) { this.page = page; },

        _formatStats(stats) {
            return {
                totalChallenges: stats.totalChallenges,
                completedChallenges: stats.completedChallenges,
                passRate: stats.totalChallenges > 0 ? (stats.completedChallenges / stats.totalChallenges * 100).toFixed(1) + '%' : '暂无',
                avgTime: stats.avgTime || 0,
                avgTimeFormatted: stats.avgTime > 0 ? Math.floor(stats.avgTime / 60) + '分' + (stats.avgTime % 60) + '秒' : ''
            };
        },
        _parsePuzzleStr(puzzleData) {
            const str = puzzleData.puzzle_data || puzzleData.puzzle;
            if (!str) return [];
            let parsed = str;
            while (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (e) { return []; }
            }
            return Array.isArray(parsed) ? parsed : [];
        },
        _resetCreateState() {
            this.createPuzzleMode = 'edit';
            this.puzzleTitle = '';
            this.puzzleBoxSize = 3;
            this.createMessage = '';
            this.createBoard = [];
            this.createGameBoard = [];
            this.createSelectedRow = null;
            this.createSelectedCol = null;
            this.createHistoryMap = {};
            this.createStepPointer = -1;
            this.createShowVictory = false;
            this.createSubmitted = false;
            this.createStats = null;
            this.submittedPuzzleId = null;
        },

        // ===== 登录/注册 =====
        async onDoLogin(credentials) {
            const result = await UserSystem.login(credentials.username, credentials.password);
            if (result.success) { this.currentUser = result.user; this.goToPage(Pages.MAIN_MENU); }
            else { this.loginMessage = result.message; }
        },
        async onDoRegister(credentials) {
            const result = await UserSystem.register(credentials.username, credentials.password);
            if (result.success) { this.currentUser = result.user; this.goToPage(Pages.MAIN_MENU); }
            else { this.loginMessage = result.message || '注册失败，请重试'; }
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
            const puzzles = await PuzzleStorage.getAll();
            this.searchResults = await this._loadPuzzleStats(puzzles);
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
                this.puzzleBoxSize = Math.round(Math.sqrt(parsed.length));
                this.puzzleTitle = puzzle.title || '';
                this.createBoard = parsed.map(row => [...row]);
                this.submittedPuzzleId = puzzle[F.PUZZLE_ID];
                PuzzleStorage.getStats(puzzle[F.PUZZLE_ID]).then(s => this.createStats = this._formatStats(s));
            }
            this.goToPage(Pages.CREATE_PUZZLE);
        },

        // ===== CreatePuzzle 操作 =====
        _initCreateBoard() { this.createBoard = BoardManager.createEmptyBoard(this.createSize); },
        _createOperateCell(num) {
            if (this.createSelectedRow === null || this.createSelectedCol === null) return;
            const r = this.createSelectedRow, c = this.createSelectedCol;
            if (this.createPuzzleMode === 'edit') {
                const result = BoardManager.operateCell(this.createBoard, r, c, num, { isNumberBoard: true });
                if (result) this.createBoard = result.board;
            } else {
                if (this.createGameBoard[r][c].given) return;
                const result = BoardManager.operateCell(this.createGameBoard, r, c, num, {
                    boxSize: this.createBoxSize,
                    size: this.createSize,
                    history: { historyMap: this.createHistoryMap, stepPointer: this.createStepPointer }
                });
                if (!result) return;
                this.createGameBoard = result.board;
                this.createHistoryMap = result.historyMap;
                this.createStepPointer = result.stepPointer;
                if (result.complete) this.createShowVictory = true;
            }
        },
        onCreateCellClick(row, col) {
            if (this.createPuzzleMode === 'solve' && this.createGameBoard[row]?.[col]?.given) return;
            this.createSelectedRow = row;
            this.createSelectedCol = col;
        },
        onCreateInputNumber(num) { this._createOperateCell(num); },
        onCreateClearSelected() { this._createOperateCell(0); },
        onCreateUndo() { if (this.createStepPointer > 0) this._moveCreatePointer(this.createStepPointer - 1); },
        onCreateRedo() { if (this.createHistoryMap[this.createStepPointer + 1]) this._moveCreatePointer(this.createStepPointer + 1); },
        _moveCreatePointer(targetStep) {
            this.createStepPointer = targetStep;
            const board = BoardManager.serializeBoard(this.createGameBoard, true);
            const result = BoardManager.navigateHistory(board, this.createHistoryMap, targetStep, this.createBoxSize, this.createSize);
            if (result) this.createGameBoard = result.board;
        },
        onCreateClearBoard() {
            this._initCreateBoard();
            this.createSelectedRow = null;
            this.createSelectedCol = null;
            this.createPuzzleMode = 'edit';
            this.createShowVictory = false;
        },
        onCreateStartSolving() {
            this.createGameBoard = BoardManager.createBoardFromPuzzle(this.createBoard);
            this.createHistoryMap = {};
            this.createStepPointer = -1;
            this.createSelectedRow = null;
            this.createSelectedCol = null;
            this.createShowVictory = false;
            this.createPuzzleMode = 'solve';
        },
        onCreateBackToEdit() { this.createPuzzleMode = 'edit'; this.createShowVictory = false; },
        async onCreateSubmitPuzzle({ puzzle, solution, title }) {
            this.createShowVictory = false;
            const saveFn = this.submittedPuzzleId
                ? PuzzleStorage.update(this.submittedPuzzleId, this.currentUser.id, puzzle, solution, this.createSize, this.createBoxSize, title)
                : PuzzleStorage.add(this.currentUser.id, this.currentUser.username, puzzle, solution, this.createSize, this.createBoxSize, title);
            const saveResult = await saveFn;
            if (saveResult.success) {
                if (saveResult.puzzle) this.submittedPuzzleId = saveResult.puzzle[F.PUZZLE_ID];
                this.createSubmitted = true;
                this.createMessage = 'success';
            } else {
                this.createMessage = saveResult.message || '保存失败';
                this.createSubmitted = false;
            }
        },

        // ===== 搜索题目 =====
        async onSearch() {
            const puzzles = await PuzzleStorage.search(this.searchQuery);
            this.searchResults = await this._loadPuzzleStats(puzzles);
        },
        _isValidPuzzle(puzzle) {
            const str = puzzle.puzzle_data || puzzle.puzzle;
            if (!str) return false;
            let parsed = str;
            // 处理可能的双重 JSON 编码
            while (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (e) { return false; }
            }
            return Array.isArray(parsed) && parsed.length > 0 && parsed.every(row => Array.isArray(row) && row.length === parsed.length);
        },
        async _loadPuzzleStats(puzzles) {
            const validPuzzles = [];
            for (const puzzle of puzzles) {
                if (!this._isValidPuzzle(puzzle)) {
                    await PuzzleStorage.delete(puzzle[F.PUZZLE_ID], puzzle[F.USER_ID]);
                    continue;
                }
                const stats = await PuzzleStorage.getStats(puzzle[F.PUZZLE_ID]);
                puzzle.stats = this._formatStats(stats);
                validPuzzles.push(puzzle);
            }
            return validPuzzles;
        },

        // ===== 我的题目 =====
        async _loadMyPuzzles() {
            this.myPuzzlesLoading = true;
            const targetUserId = (this.viewUserId !== null && this.viewUserId !== this.currentUser.id) ? this.viewUserId : this.currentUser.id;
            const puzzles = await PuzzleStorage.getByUser(targetUserId);
            this.myPuzzles = await this._loadPuzzleStats(puzzles);
            this.myPuzzlesLoading = false;
        },
        async onDeletePuzzle(puzzle) {
            const result = await PuzzleStorage.delete(puzzle[F.PUZZLE_ID], this.currentUser.id);
            if (result.success) {
                this.myPuzzlesMessage = '题目已成功删除';
                await this._loadMyPuzzles();
            } else {
                this.myPuzzlesMessage = result.message || '删除失败';
            }
        },

        // ===== 游戏启动 =====
        async startFromConfig() {
            if (this.game.isGenerating) return;
            this.game = { ...FormatUtils.createDefaultState(), isGenerating: true, hintsRemaining: -1 };
            this.currentPuzzleData = null;
            this.goToPage(Pages.GAME);
            try {
                const puzzle = await BoardManager.generate(this.boxSize, this.size, this.config.blanks);
                this._applyBoard(puzzle);
            } catch (e) {
                console.error('生成失败:', e);
                this._applyBoard(BoardManager.generateSync(this.boxSize, this.size, this.config.blanks));
            }
        },
        _applyBoard(puzzle) {
            const init = BoardManager.initGame(puzzle);
            this.game = { ...this.game, ...init, isGenerating: false, started: true, startTime: Date.now() };
            this.historyMap = init.historyMap;
            this.stepPointer = init.stepPointer;
            this.zoom = init.zoom;
        },

        // ===== 用户题目 =====
        startUserPuzzle(puzzleData) {
            this.currentPuzzleData = puzzleData;
            const puzzle = this._parsePuzzleStr(puzzleData);
            const size = puzzleData.size || puzzleData.SIZE || (puzzle.length > 0 ? puzzle.length : 9);
            const n = Math.round(Math.sqrt(size));
            this.config.boxSize = Math.max(2, Math.min(6, n || 3));
            const hintsRemaining = (n > 0 ? (n - 1) * (n - 1) : 4);
            this.game = { ...BoardManager.applyPuzzle(this.game, puzzle), hintsRemaining, startTime: Date.now() };
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
            BoardManager.abort();
            this.game = { ...FormatUtils.createDefaultState(), hintMessage: '' };
            this.goToPage(Pages.MAIN_MENU);
        },

        // ===== 游戏操作 =====
        onCellClick(row, col) { this.game = { ...this.game, selectedRow: row, selectedCol: col, hintMessage: '' }; },
        onInputNumber(num) { this._operateCell(num); },
        onClearSelected() { this._operateCell(0); },
        _operateCell(num) {
            const result = BoardManager.operateGameCell(this.game, this.config, this.game.selectedRow, this.game.selectedCol, num, {
                historyMap: this.historyMap, stepPointer: this.stepPointer
            });
            if (!result) return;
            this.historyMap = result.newHistoryMap;
            this.stepPointer = result.newStepPointer;
            this.game = result.newGame;
            this._recordChallengeIfComplete();
        },
        onUndo() { if (this.stepPointer > 0) this._movePointer(this.stepPointer - 1); },
        onRedo() { if (this.historyMap[this.stepPointer + 1]) this._movePointer(this.stepPointer + 1); },
        _movePointer(targetStep) {
            this.stepPointer = targetStep;
            const result = BoardManager.navigateHistory(this.game.board, this.historyMap, targetStep, this.boxSize, this.size);
            if (result) { this.game = { ...this.game, board: result.board, conflictMessages: result.messages, selectedRow: null, selectedCol: null, hintMessage: '' }; }
        },
        onGiveHint() {
            if (this.game.isGenerating || this.game.hintsRemaining === 0) return;
            const msg = BoardManager.getHint(this.game.board, this.game.selectedRow, this.game.selectedCol, this.boxSize, this.size);
            const newHints = this.game.hintsRemaining > 0 ? this.game.hintsRemaining - 1 : this.game.hintsRemaining;
            this.game = { ...this.game, hintMessage: msg, hintsRemaining: newHints };
        },
        _recordChallengeIfComplete() {
            if (this.game.complete && this.currentPuzzleData && this.currentUser) {
                const elapsedTime = this.game.startTime ? Math.floor((Date.now() - this.game.startTime) / 1000) : 0;
                this.game.elapsedTime = elapsedTime;
                PuzzleStorage.recordChallenge(this.currentPuzzleData.id, this.currentUser.id, this.currentUser.username, true, elapsedTime);
            }
        }
    },
    mounted() { this.config.blanks = this.blanksRange.min; }
});

app.component('login-component', LoginComponent);
app.component('main-menu-component', MainMenuComponent);
app.component('config-component', ConfigComponent);
app.component('create-puzzle-component', CreatePuzzleComponent);
app.component('search-puzzles-component', SearchPuzzlesComponent);
app.component('my-puzzles-component', MyPuzzlesComponent);
app.component('game-component', GameComponent);

app.mount('#app');