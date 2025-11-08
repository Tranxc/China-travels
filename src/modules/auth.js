// 认证模块
const API_BASE = '';
let tempUserEmail = ''; // 临时存储验证通过的邮箱

// 初始化认证UI
export function initAuthUI() {
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAuth);
    } else {
        setupAuth();
    }
}

function setupAuth() {
    // 发送验证码倒计时
    function startCountdown(button) {
        let seconds = 60;
        button.disabled = true;
        const originalText = button.textContent;

        const timer = setInterval(() => {
            button.textContent = `${seconds}秒后重试`;
            seconds--;

            if (seconds < 0) {
                clearInterval(timer);
                button.disabled = false;
                button.textContent = originalText;
            }
        }, 1000);
    }

    // 密码显示/隐藏切换
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input && input.type === 'password') {
                input.type = 'text';
                this.textContent = '🙈';
            } else if (input) {
                input.type = 'password';
                this.textContent = '👁️';
            }
        });
    });

    // 发送验证码
    const sendCodeBtn = document.getElementById('send-code-btn');
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', async function () {
            const email = document.getElementById('email-input').value;

            if (!email || !email.includes('@')) {
                alert('请输入正确的邮箱地址');
                return;
            }

            try {
                this.disabled = true;
                this.textContent = '发送中...';

                const response = await fetch(`${API_BASE}/api/auth/send-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (data.success) {
                    alert('✅ 验证码已发送!\n\n📧 请查收邮箱(含垃圾箱)\n⏱️ 10分钟内有效');
                    startCountdown(this);
                } else {
                    throw new Error(data.error || '发送失败');
                }
            } catch (error) {
                alert('❌ ' + error.message);
                this.disabled = false;
                this.textContent = '发送验证码';
            }
        });
    }

    // 邮箱验证表单提交
    const emailForm = document.getElementById('email-form');
    if (emailForm) {
        emailForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const email = document.getElementById('email-input').value;
            const code = document.getElementById('code-input').value;

            if (!code || code.length !== 6) {
                alert('请输入6位验证码');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/api/auth/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, code })
                });

                const data = await response.json();

                if (data.success) {
                    if (data.isNewUser) {
                        // 新用户,显示注册信息填写页面
                        tempUserEmail = email;
                        const emailDisplay = document.getElementById('user-email-display');
                        if (emailDisplay) emailDisplay.textContent = email;

                        const emailStep = document.getElementById('email-step');
                        const registerStep = document.getElementById('register-step');
                        const authTitle = document.getElementById('auth-title');

                        if (emailStep) emailStep.classList.add('hidden');
                        if (registerStep) registerStep.classList.remove('hidden');
                        if (authTitle) authTitle.textContent = '完善信息';
                    } else {
                        // 老用户,直接登录成功
                        localStorage.setItem('user', JSON.stringify(data.user));
                        localStorage.setItem('token', data.token);

                        alert('🎉 登录成功!');
                        closeModal();
                        updateAuthUI();
                    }
                } else {
                    throw new Error(data.error || '验证失败');
                }
            } catch (error) {
                alert('❌ ' + error.message);
            }
        });
    }

    // 完成注册表单提交
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const nickname = document.getElementById('nickname-input').value.trim();
            const password = document.getElementById('password-input').value;
            const confirmPassword = document.getElementById('confirm-password-input').value;

            if (!nickname) {
                alert('请输入昵称');
                return;
            }

            if (password.length < 6) {
                alert('密码至少需要6位');
                return;
            }

            if (password !== confirmPassword) {
                alert('两次密码输入不一致');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/api/auth/complete-register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: tempUserEmail,
                        nickname,
                        password
                    })
                });

                const data = await response.json();

                if (data.success) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('token', data.token);

                    alert('🎉 注册成功!');
                    closeModal();
                    updateAuthUI();
                } else {
                    throw new Error(data.error || '注册失败');
                }
            } catch (error) {
                alert('❌ ' + error.message);
            }
        });
    }

    // 初始化认证UI状态
    updateAuthUI();
}

// 关闭弹窗
function closeModal() {
    const modal = document.getElementById('auth-modal');
    const backdrop = document.querySelector('.backdrop');

    if (modal) modal.classList.add('hidden');
    if (backdrop) backdrop.classList.add('hidden');

    // 重置表单
    const emailForm = document.getElementById('email-form');
    const registerForm = document.getElementById('register-form');
    const emailStep = document.getElementById('email-step');
    const registerStep = document.getElementById('register-step');
    const authTitle = document.getElementById('auth-title');

    if (emailForm) emailForm.reset();
    if (registerForm) registerForm.reset();
    if (emailStep) emailStep.classList.remove('hidden');
    if (registerStep) registerStep.classList.add('hidden');
    if (authTitle) authTitle.textContent = '邮箱验证';
}

// 更新认证UI
function updateAuthUI() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const loginBtn = document.querySelector('.btn-open-auth');

    if (user && loginBtn) {
        loginBtn.textContent = user.nickname || user.email.split('@')[0];
        loginBtn.onclick = (e) => {
            e.preventDefault();
            if (confirm('确定要退出登录吗?')) {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                location.reload();
            }
        };
    }
}
