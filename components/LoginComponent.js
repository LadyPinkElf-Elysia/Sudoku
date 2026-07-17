// LoginComponent.js - 登录/注册组件（纯 UI 层，API 调用由父组件处理）
export const LoginComponent = {
    template: `
        <div class="auth-panel">
            <h2>🔐 数独登录</h2>
            
            <div class="auth-tabs">
                <button class="auth-tab" :class="{ active: authTab === 'login' }" @click="authTab = 'login'">登录</button>
                <button class="auth-tab" :class="{ active: authTab === 'register' }" @click="authTab = 'register'">注册</button>
            </div>
            
            <div v-if="authTab === 'login'" class="auth-form">
                <div class="auth-field">
                    <label>用户名</label>
                    <input type="text" v-model="loginUsername" @keyup.enter="doLogin" placeholder="输入用户名">
                </div>
                <div class="auth-field">
                    <label>密码</label>
                    <input type="password" v-model="loginPassword" @keyup.enter="doLogin" placeholder="输入密码">
                </div>
                <button class="btn btn-primary btn-block" @click="doLogin">登录</button>
            </div>
            
            <div v-if="authTab === 'register'" class="auth-form">
                <div class="auth-field">
                    <label>用户名</label>
                    <input type="text" v-model="registerUsername" @keyup.enter="doRegister" placeholder="设置用户名">
                </div>
                <div class="auth-field">
                    <label>密码</label>
                    <input type="password" v-model="registerPassword" @keyup.enter="doRegister" placeholder="设置密码">
                </div>
                <button class="btn btn-primary btn-block" @click="doRegister">注册</button>
            </div>
            
            <div class="auth-divider">
                <span>或</span>
            </div>
            
            <button class="btn btn-secondary btn-block" @click="$emit('guest')">👤 游客模式</button>
            <p class="guest-hint">游客可以搜索和挑战题目，但不能出题</p>
            
            <div v-if="message" class="auth-message" :class="{ success: message.includes('成功') }">{{ message }}</div>
        </div>
    `,
    props: {
        message: { type: String, default: '' }
    },
    emits: ['login', 'register', 'guest', 'login-error', 'register-error'],
    data() {
        return {
            authTab: 'login',
            loginUsername: '',
            loginPassword: '',
            registerUsername: '',
            registerPassword: ''
        };
    },
    methods: {
        doLogin() {
            if (!this.loginUsername || !this.loginPassword) {
                this.$emit('login-error', '请输入用户名和密码');
                return;
            }
            this.$emit('login', { username: this.loginUsername, password: this.loginPassword });
        },
        doRegister() {
            if (!this.registerUsername || !this.registerPassword) {
                this.$emit('register-error', '请输入用户名和密码');
                return;
            }
            this.$emit('register', { username: this.registerUsername, password: this.registerPassword });
        }
    }
};