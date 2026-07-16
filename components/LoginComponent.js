// LoginComponent.js - 登录/注册组件
import { UserSystem } from './UserSystem.js';

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
            
            <button class="btn btn-secondary btn-block" @click="guestLogin">👤 游客模式</button>
            <p class="guest-hint">游客可以搜索和挑战题目，但不能出题</p>
            
            <div v-if="message" class="auth-message" :class="{ success: message.includes('成功') }">{{ message }}</div>
        </div>
    `,
    data() {
        return {
            authTab: 'login',
            loginUsername: '',
            loginPassword: '',
            registerUsername: '',
            registerPassword: '',
            message: ''
        };
    },
    methods: {
        async doLogin() {
            if (!this.loginUsername || !this.loginPassword) {
                this.message = '请输入用户名和密码';
                return;
            }
            this.message = '登录中...';
            const result = await UserSystem.login(this.loginUsername, this.loginPassword);
            if (result.success) {
                this.message = '';
                this.$emit('login', result.user);
            } else {
                this.message = result.message;
            }
        },
        async doRegister() {
            if (!this.registerUsername || !this.registerPassword) {
                this.message = '请输入用户名和密码';
                return;
            }
            this.message = '注册中...';
            const result = await UserSystem.register(this.registerUsername, this.registerPassword);
            if (result.success) {
                this.message = `注册成功！您的ID是 ${result.user.id}`;
                setTimeout(() => {
                    this.$emit('login', result.user);
                }, 1000);
            } else {
                this.message = result.message || '注册失败，请重试';
            }
        },
        guestLogin() {
            this.$emit('login', { id: -1, username: '游客', isGuest: true });
        }
    }
};