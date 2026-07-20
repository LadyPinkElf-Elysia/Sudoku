// main.js - 入口
import { createApp, provide } from 'vue'
import { useGame } from './useGame.js'
import { LoginPanel } from './components/LoginPanel.js'
import { MenuPanel } from './components/MenuPanel.js'
import { ConfigPanel } from './components/ConfigPanel.js'
import { GamePanel } from './components/GamePanel.js'
import { CreatePanel } from './components/CreatePanel.js'
import { SearchPanel } from './components/SearchPanel.js'
import { MyPuzzlesPanel } from './components/MyPuzzlesPanel.js'

const app = createApp({
    setup() {
        const ctx = useGame()
        provide('ctx', ctx)
        return { p: ctx.p }
    }
})

app.component('LoginPanel', LoginPanel)
app.component('MenuPanel', MenuPanel)
app.component('ConfigPanel', ConfigPanel)
app.component('GamePanel', GamePanel)
app.component('CreatePanel', CreatePanel)
app.component('SearchPanel', SearchPanel)
app.component('MyPuzzlesPanel', MyPuzzlesPanel)
app.mount('#app')