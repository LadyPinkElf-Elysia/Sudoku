// useGame.js - 核心组合式函数
import { reactive } from 'vue'
import { PAGE, STATUS, MODE, DEFAULTS } from './config.js'
import { Grid } from './utils/grid.js'
import { Generator } from './utils/generator.js'
import { API } from './api.js'

export function useGame() {
    const users = reactive([])
    const currentUser = reactive({ val: null })

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
        config: { ...DEFAULTS.config },
        searchQ: '',
        searchRes: [],
        listLoading: false,
    })

    function goPage(page) { p.page = page }

    // ===== 登录：调用后端 API =====
    async function doLogin(uname, upwd) {
        const d = await API.login(uname, upwd)
        if (d.ok) {
            // 从后端加载用户数据
            const data = await API.getUserData(d.uid)
            if (data.ok) {
                const u = { uname: data.user.uname, puzzles: data.user.puzzles || [], records: data.user.records || [] }
                users.push(u)
                currentUser.val = u
            } else {
                currentUser.val = { uname, puzzles: [], records: [] }
            }
            p.msg.text = ''
            goPage(PAGE.MENU)
        } else {
            p.msg.text = d.msg || '用户名或密码错误'
        }
    }

    async function doRegister(uname, upwd) {
        const d = await API.reg(uname, upwd)
        if (d.ok) {
            const u = { uname, puzzles: [], records: [] }
            users.push(u)
            currentUser.val = u
            p.msg.text = ''
            goPage(PAGE.MENU)
        } else {
            p.msg.text = d.msg || '注册失败'
        }
    }

    function guestLogin() {
        currentUser.val = { uname: '游客', puzzles: [], records: [], isGuest: true }
        goPage(PAGE.MENU)
    }

    function doLogout() {
        currentUser.val = null
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

    // ===== 出题：提交时调用后端 API =====
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
        p.board = (typeof puz.puzzle === 'string' ? JSON.parse(puz.puzzle) : puz.puzzle).map(r => [...r])
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

    async function submitCreate(title) {
        const numBoard = Grid.toNum(p.board)
        let puzzle = numBoard
        if (p.stepPtr >= 0 && p.history[0]) {
            puzzle = p.history[0].map(r => r.map(c => c.value ?? c))
        }
        const solution = numBoard
        const boardSize = Math.round(Math.sqrt(numBoard.length))
        
        // 调用后端 API 保存
        if (currentUser.val && !currentUser.val.isGuest) {
            const d = await API.addPuzzle(users.indexOf(currentUser.val) + 1, puzzle, solution, title || '', boardSize)
            if (d.ok) {
                // 同步到本地
                const data = { puzzle, solution, title: title || '', boardSize }
                if (p.createEditIdx != null) {
                    currentUser.val.puzzles[p.createEditIdx] = data
                } else {
                    currentUser.val.puzzles.push(data)
                }
            }
        } else {
            // 游客模式：仅本地保存
            const data = { puzzle, solution, title: title || '', boardSize }
            if (p.createEditIdx != null) {
                currentUser.val.puzzles[p.createEditIdx] = data
            } else {
                currentUser.val.puzzles.push(data)
            }
        }
        p.createSubmitted = true
        p.msg.text = 'success'
    }

    function backFromCreate() {
        p.mode = MODE.NONE
        goPage(PAGE.MENU)
    }

    // ===== 搜索：从后端获取 =====
    async function doSearch() {
        const results = await API.searchPuzzles(p.searchQ)
        p.searchRes = results.map(r => ({
            ...r,
            puzzle: typeof r.puzzleData === 'string' ? JSON.parse(r.puzzleData) : r.puzzleData,
            uname: r.username || '',
        }))
    }

    // ===== 我的题目：从后端加载 =====
    async function loadMyPuzzles() {
        if (!currentUser.val || currentUser.val.isGuest) return
        p.listLoading = true
        // 从后端重新加载
        const results = await API.getPuzzlesByUser(users.indexOf(currentUser.val) + 1)
        currentUser.val.puzzles = results.map(r => ({
            puzzle: typeof r.puzzleData === 'string' ? JSON.parse(r.puzzleData) : r.puzzleData,
            solution: null,
            title: r.title || '',
            boardSize: r.boardSize || 3,
        }))
        p.listLoading = false
    }

    async function delPuzzle(idx) {
        if (!currentUser.val?.puzzles) return
        // 调用后端删除
        if (!currentUser.val.isGuest) {
            const pid = idx + 1  // 简单映射
            await API.delPuzzle(pid, users.indexOf(currentUser.val) + 1)
        }
        currentUser.val.puzzles.splice(idx, 1)
    }

    function playPuzzle(puzzle) {
        const puz = puzzle.puzzle || puzzle.puzzleData
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