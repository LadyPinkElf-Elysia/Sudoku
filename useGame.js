// useGame.js - 核心组合式函数
import { reactive } from 'vue'
import { PAGE, STATUS, MODE, DEFAULTS } from './config.js'
import { Grid } from './utils/grid.js'
import { Generator } from './utils/generator.js'
import { API } from './api.js'

export function useGame() {
    // ===== 用户系统 =====
    const users = reactive([])
    const currentUser = reactive({ val: null })

    // ===== 玩家（所有状态集成于此） =====
    const p = reactive({
        page: PAGE.LOGIN,
        mode: MODE.NONE,
        status: STATUS.IDLE,
        board: [],
        history: {},
        stepPtr: -1,
        sel: [null, null],
        msg: { text: '', conflicts: [] },
        createDone: false,
        createSubmitted: false,
        createEditIdx: null,
        // === 游戏配置（集成到 p） ===
        config: { ...DEFAULTS.config },
        // === 搜索（集成到 p） ===
        searchQ: '',
        searchRes: [],
        // === 列表（集成到 p） ===
        listLoading: false,
    })

    // ===== 页面切换 =====
    function goPage(page) { p.page = page }

    // ===== 登录 =====
    function doLogin(uname, upwd) {
        const u = users.find(u => u.uname === uname && u.upwd === btoa(upwd))
        if (u) {
            currentUser.val = u
            p.msg.text = ''
            goPage(PAGE.MENU)
        } else {
            p.msg.text = '用户名或密码错误'
        }
    }
    function doRegister(uname, upwd) {
        if (users.find(u => u.uname === uname)) {
            p.msg.text = '用户名已存在'
            return
        }
        const u = { uname, upwd: btoa(upwd), puzzles: [], records: [] }
        users.push(u)
        currentUser.val = u
        p.msg.text = ''
        goPage(PAGE.MENU)
    }
    function guestLogin() {
        currentUser.val = { uname: '游客', puzzles: [], records: [], isGuest: true }
        goPage(PAGE.MENU)
    }
    function doLogout() {
        currentUser.val = null
        p.msg.text = ''
        goPage(PAGE.LOGIN)
    }

    // ===== 游戏 =====
    function setConfig(cfg) { Object.assign(p.config, cfg) }

    async function startGame() {
        p.status = STATUS.GENERATING
        p.msg.text = ''
        goPage(PAGE.GAME)
        const B = p.config.boxSize
        const S = B * B
        const puzzle = await Generator.generate(B, S, p.config.blanks)
        p.mode = MODE.GAME
        p.status = STATUS.PLAYING
        p.board = Grid.fromPuzzle(puzzle)
        p.history = {}
        p.stepPtr = -1
        p.sel = [null, null]
        p.msg = { text: '', conflicts: [] }
    }

    function inputNum(num) {
        if (p.status !== STATUS.PLAYING) return
        const [r, c] = p.sel
        if (r == null || c == null) return

        if (p.mode === MODE.CREATE && p.board[0]?.[0]?.value === undefined) {
            const nb = Grid.clone(p.board)
            nb[r][c] = (nb[r][c] === num) ? 0 : num
            p.board = nb
        } else {
            const nb = Grid.clone(p.board)
            const snap = nb.map(r => r.map(c => ({ value: c.value, editable: c.editable })))
            const ptr = p.stepPtr + 1
            p.history = { ...p.history, [ptr]: snap }
            Object.keys(p.history).map(Number).forEach(k => { if (k > ptr) delete p.history[k] })
            p.stepPtr = ptr
            nb[r][c].value = (nb[r][c].value === num) ? 0 : num
            p.board = nb
            const B = Math.round(Math.sqrt(nb.length))
            Grid.conflict(p.board, r, c, B, nb.length)
            if (Grid.done(p.board)) {
                p.status = STATUS.WON
                p.msg.text = '🎉 恭喜完成！'
                if (p.mode === MODE.CREATE) p.createDone = true
            }
        }
    }

    function jump(step) {
        if (step < 0 || step > p.stepPtr) return
        const snap = p.history[step]
        if (!snap) return
        const nb = Grid.clone(p.board)
        for (let r = 0; r < nb.length; r++) for (let c = 0; c < nb.length; c++) {
            nb[r][c].value = snap[r][c].value
            nb[r][c].editable = snap[r][c].editable
            nb[r][c].conflict = false
        }
        p.board = nb
        p.stepPtr = step
    }
    function undo() { if (p.stepPtr > 0) jump(p.stepPtr - 1) }
    function redo() { if (p.history[p.stepPtr + 1]) jump(p.stepPtr + 1) }

    function giveHint() {
        if (p.status !== STATUS.PLAYING) return
        const [r, c] = p.sel
        if (r == null) { p.msg.text = '💡 请先点击选中一个空格'; return }
        const cell = p.board[r]?.[c]
        if (!cell) return
        if (!cell.editable) { p.msg.text = '💡 此格是初始题目'; return }
        if (cell.value !== 0) { p.msg.text = '💡 此格已填入数字'; return }
        const g = Grid.toNum(p.board)
        const B = Math.round(Math.sqrt(g.length))
        const cand = Grid.cand(g, r, c, B, g.length)
        p.msg.text = cand.length ? `💡 此格可以填：${cand.join('、')}` : '💡 此格无合法数字'
    }

    // ===== 出题 =====
    function initCreate() {
        const B = 3
        p.mode = MODE.CREATE
        p.status = STATUS.PLAYING
        p.board = Grid.empty(B * B)
        p.history = {}
        p.stepPtr = -1
        p.sel = [null, null]
        p.msg = { text: '', conflicts: [] }
        p.createDone = false
        p.createSubmitted = false
        p.createEditIdx = null
        goPage(PAGE.CREATE)
    }

    function editPuzzle(idx) {
        const puz = currentUser.val?.puzzles?.[idx]
        if (!puz) return
        initCreate()
        p.board = puz.puzzle.map(r => [...r])
        p.createEditIdx = idx
    }

    function startSolve() {
        const numBoard = p.board[0]?.[0]?.value === undefined ? p.board : Grid.toNum(p.board)
        p.board = Grid.fromPuzzle(numBoard)
        p.history = {}
        p.stepPtr = -1
        p.sel = [null, null]
        p.msg = { text: '', conflicts: [] }
        p.createDone = false
    }

    function submitCreate(title) {
        const numBoard = Grid.toNum(p.board)
        let puzzle = numBoard
        if (p.stepPtr >= 0 && p.history[0]) {
            puzzle = p.history[0].map(r => r.map(c => c.value ?? c))
        }
        const solution = numBoard
        const data = { puzzle, solution, title: title || '', boardSize: Math.round(Math.sqrt(numBoard.length)) }
        if (p.createEditIdx != null) {
            currentUser.val.puzzles[p.createEditIdx] = data
        } else {
            currentUser.val.puzzles.push(data)
        }
        p.createSubmitted = true
        p.msg.text = 'success'
    }

    function backFromCreate() {
        p.mode = MODE.NONE
        goPage(PAGE.MENU)
    }

    // ===== 搜索 =====
    function doSearch() {
        const q = p.searchQ.toLowerCase()
        const all = []
        users.forEach(u => {
            u.puzzles.forEach((puz, i) => {
                all.push({ ...puz, pid: i, uid: users.indexOf(u), uname: u.uname })
            })
        })
        p.searchRes = all.filter(puz =>
            (puz.title || '').toLowerCase().includes(q) ||
            (puz.uname || '').toLowerCase().includes(q) ||
            String(puz.pid).includes(q)
        )
    }

    // ===== 我的题目 =====
    function loadMyPuzzles() {
        p.listLoading = true
        setTimeout(() => { p.listLoading = false }, 100)
    }

    function delPuzzle(idx) {
        if (!currentUser.val?.puzzles) return
        currentUser.val.puzzles.splice(idx, 1)
    }

    // ===== 挑战题目 =====
    function playPuzzle(puzzle) {
        const puz = puzzle.puzzle || puzzle.puzzle_data
        if (!puz || !Array.isArray(puz)) return
        p.mode = MODE.GAME
        p.status = STATUS.PLAYING
        p.board = (puzzle.board || Grid.fromPuzzle(puz))
        p.history = {}
        p.stepPtr = -1
        p.sel = [null, null]
        p.msg = { text: '', conflicts: [] }
        goPage(PAGE.GAME)
    }

    function viewUser(uid) {
        const u = users[uid]
        if (u) {
            currentUser.val = u
            loadMyPuzzles()
            goPage(PAGE.MY_PUZZLES)
        }
    }

    // ===== 返回 =====
    return {
        users, currentUser, p,
        goPage,
        doLogin, doRegister, guestLogin, doLogout,
        setConfig, startGame,
        inputNum, undo, redo, giveHint, jump,
        initCreate, editPuzzle, startSolve, submitCreate, backFromCreate,
        doSearch, loadMyPuzzles, delPuzzle,
        playPuzzle, viewUser,
    }
}