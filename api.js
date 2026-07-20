// api.js - API 封装（与新后端 /api/users.js, /api/puzzles.js 对应）

function norm(p) {
    if (!p) return null
    return {
        puzzleId: p.pid ?? p.puzzleId,
        title: p.title ?? '',
        boardSize: p.board_size ?? p.boardSize ?? 3,
        userId: p.uid ?? p.userId,
        username: p.uname ?? '',
        puzzleData: p.puzzle ?? p.puzzleData,
        createdAt: p.created_at ?? p.createdAt,
    }
}

export const API = {
    async reg(uname, upwd) {
        const r = await fetch('/api/users/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uname, upwd }) })
        return r.json()
    },
    async login(uname, upwd) {
        const r = await fetch('/api/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uname, upwd }) })
        return r.json()
    },
    async getUserData(uid) {
        const r = await fetch(`/api/users/data?uid=${uid}`)
        return r.json()
    },
    async getAllPuzzles() {
        const r = await fetch('/api/puzzles/all')
        const d = await r.json()
        return (d.puzzles || []).map(norm)
    },
    async getPuzzlesByUser(uid) {
        const r = await fetch(`/api/puzzles/byuser?uid=${uid}`)
        const d = await r.json()
        return (d.puzzles || []).map(norm)
    },
    async searchPuzzles(q) {
        const r = await fetch(`/api/puzzles/search?q=${encodeURIComponent(q)}`)
        const d = await r.json()
        return (d.puzzles || []).map(norm)
    },
    async addPuzzle(uid, puzzle, solution, title, boardSize) {
        const r = await fetch('/api/puzzles/add', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, puzzle: JSON.stringify(puzzle), solution: JSON.stringify(solution), title, boardSize })
        })
        return r.json()
    },
    async delPuzzle(pid, uid) {
        const r = await fetch('/api/puzzles/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, uid }) })
        return r.json()
    },
    async addRecord(uid, pid, won, elapsed, attempts) {
        const r = await fetch('/api/records/add', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, pid, won: won ? 1 : 0, elapsed, attempts })
        })
        return r.json()
    },
}