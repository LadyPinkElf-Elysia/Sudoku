import { ref, inject } from 'vue'
export const LoginPanel = {
    template: `
        <div class="auth-panel">
            <h2>🔐 数独</h2>
            <div class="auth-tabs">
                <button class="auth-tab" :class="{active:tab==='login'}" @click="tab='login'">登录</button>
                <button class="auth-tab" :class="{active:tab==='register'}" @click="tab='register'">注册</button>
            </div>
            <div v-if="tab==='login'" class="auth-form">
                <div class="auth-field"><label>用户名</label><input type="text" v-model="uname" @keyup.enter="login" placeholder="输入用户名"></div>
                <div class="auth-field"><label>密码</label><input type="password" v-model="upwd" @keyup.enter="login" placeholder="输入密码"></div>
                <button class="btn btn-primary btn-block" @click="login">登录</button>
            </div>
            <div v-if="tab==='register'" class="auth-form">
                <div class="auth-field"><label>用户名</label><input type="text" v-model="uname" @keyup.enter="register" placeholder="设置用户名"></div>
                <div class="auth-field"><label>密码</label><input type="password" v-model="upwd" @keyup.enter="register" placeholder="设置密码"></div>
                <button class="btn btn-primary btn-block" @click="register">注册</button>
            </div>
            <div class="auth-divider"><span>或</span></div>
            <button class="btn btn-secondary btn-block" @click="guest">👤 游客模式</button>
            <div v-if="ctx.p.msg.text && tab==='login'" class="auth-message">{{ ctx.p.msg.text }}</div>
            <div v-if="ctx.p.msg.text && tab==='register'" class="auth-message">{{ ctx.p.msg.text }}</div>
        </div>
    `,
    setup() {
        const ctx = inject('ctx')
        const tab = ref('login')
        const uname = ref('')
        const upwd = ref('')
        function login() { ctx.doLogin(uname.value, upwd.value) }
        function register() { ctx.doRegister(uname.value, upwd.value) }
        function guest() { ctx.guestLogin() }
        return { ctx, tab, uname, upwd, login, register, guest }
    }
}