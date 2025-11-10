// 认证模块
export const API_BASE = '';
let tempUserEmail = '';
let modalControlsInitialized = false;
let loginPromptOverlay = null;
let toastContainer = null;
let toastStylesInjected = false;

export function getAuthToken() {
    return localStorage.getItem('token');
}

export function isAuthenticated() {
    return !!getAuthToken();
}

// 显示错误提示
function showError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);

    if (input) {
        input.classList.add('error');
        // 输入时移除错误状态
        input.addEventListener('input', function clearError() {
            input.classList.remove('error');
            if (error) {
                error.classList.remove('show');
            }
            input.removeEventListener('input', clearError);
        }, { once: true });
    }

    if (error) {
        error.textContent = message;
        error.classList.add('show');
        setTimeout(() => {
            error.classList.remove('show');
        }, 3000);
    }
}

// 清除所有错误状态
function clearErrors() {
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
}

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
    // 检查必要的元素是否存在
    const sendCodeBtnCheck = document.getElementById('send-code-btn');
    const emailInputCheck = document.getElementById('email-input');
    const emailFormCheck = document.getElementById('email-form');

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
            if (!input) return;

            const revealing = input.type === 'password';
            input.type = revealing ? 'text' : 'password';
            this.classList.toggle('is-active', revealing);
            this.setAttribute('aria-label', revealing ? '隐藏密码' : '显示密码');
            this.setAttribute('aria-pressed', revealing ? 'true' : 'false');
        });
    });

    // 发送验证码
    if (sendCodeBtnCheck) {
        sendCodeBtnCheck.addEventListener('click', async function (e) {
            e.preventDefault();

            const emailInput = document.getElementById('email-input');
            const email = emailInput ? emailInput.value.trim() : '';

            if (!email || !email.includes('@')) {
                showError('email-input', 'email-error', '请输入正确的邮箱地址');
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

                if (!response.ok) {
                    throw new Error(`服务器错误: ${response.status}`);
                }

                const data = await response.json();

                if (data.success) {
                    startCountdown(this);
                } else {
                    throw new Error(data.error || '发送失败');
                }
            } catch (error) {
                this.disabled = false;
                this.textContent = '重新发送';
                showError('email-input', 'email-error', error.message);
            }
        });
    }

    // 邮箱验证表单提交
    if (emailFormCheck) {
        emailFormCheck.addEventListener('submit', async function (e) {
            e.preventDefault();

            const email = document.getElementById('email-input').value;
            const code = document.getElementById('code-input').value;

            if (!code || code.length !== 6) {
                showError('code-input', 'code-error', '请输入6位验证码');
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
                    tempUserEmail = email;
                    clearErrors();

                    if (data.isNewUser) {
                        // 新用户,显示注册信息填写页面
                        const emailDisplay = document.getElementById('user-email-display');
                        if (emailDisplay) emailDisplay.textContent = email;

                        const emailStep = document.getElementById('email-step');
                        const registerStep = document.getElementById('register-step');
                        const authTitle = document.getElementById('auth-title');

                        if (emailStep) emailStep.classList.add('hidden');
                        if (registerStep) registerStep.classList.remove('hidden');
                        if (authTitle) authTitle.textContent = '完善信息';
                    } else {
                        // 老用户,显示密码验证页面
                        const emailDisplay = document.getElementById('login-email-display');
                        if (emailDisplay) emailDisplay.textContent = email;

                        const emailStep = document.getElementById('email-step');
                        const loginStep = document.getElementById('login-step');
                        const authTitle = document.getElementById('auth-title');

                        if (emailStep) emailStep.classList.add('hidden');
                        if (loginStep) loginStep.classList.remove('hidden');
                        if (authTitle) authTitle.textContent = '输入密码';
                    }
                } else {
                    throw new Error(data.error || '验证失败');
                }
            } catch (error) {
                showError('code-input', 'code-error', error.message);
            }
        });
    }

    // 老用户密码登录表单提交
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const password = document.getElementById('login-password-input').value;

            if (password.length < 6) {
                showError('login-password-input', 'login-password-error', '密码至少需要6位');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: tempUserEmail,
                        password
                    })
                });

                const data = await response.json();

                if (data.success) {
                    clearErrors();
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('token', data.token);

                    closeModal();
                    updateAuthUI();
                } else {
                    throw new Error(data.error || '密码错误');
                }
            } catch (error) {
                showError('login-password-input', 'login-password-error', error.message);
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
                showError('nickname-input', 'nickname-error', '请输入昵称');
                return;
            }

            if (password.length < 6) {
                showError('password-input', 'password-error', '密码至少需要6位');
                return;
            }

            if (password !== confirmPassword) {
                showError('password-input', 'password-error', '两次密码输入不一致');
                showError('confirm-password-input', 'confirm-password-error', '两次密码输入不一致');
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
                    clearErrors();
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('token', data.token);

                    closeModal();
                    updateAuthUI();
                } else {
                    throw new Error(data.error || '注册失败');
                }
            } catch (error) {
                showError('nickname-input', 'nickname-error', error.message);
            }
        });
    }

    // 初始化认证UI状态
    updateAuthUI();
    setupAuthModalControls();
}

export function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    const backdrop = document.querySelector('.backdrop');

    if (!modal || !backdrop) return;

    modal.classList.remove('hidden');
    backdrop.classList.remove('hidden');
}

export function clearAuthSession() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
}

export function showLoginPrompt(message = '请先登录以继续...') {
    if (loginPromptOverlay) {
        const messageEl = loginPromptOverlay.querySelector('.custom-confirm-message');
        if (messageEl) messageEl.textContent = message;
        loginPromptOverlay.classList.add('active');
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'custom-confirm-overlay login-required-overlay';

    const box = document.createElement('div');
    box.className = 'custom-confirm-box';

    const title = document.createElement('div');
    title.className = 'custom-confirm-title';
    title.textContent = '登录提醒';

    const msg = document.createElement('div');
    msg.className = 'custom-confirm-message';
    msg.textContent = message;

    const buttons = document.createElement('div');
    buttons.className = 'custom-confirm-buttons';

    const loginBtn = document.createElement('button');
    loginBtn.className = 'confirm-btn-yes';
    loginBtn.textContent = '立即登录';
    loginBtn.onclick = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
        loginPromptOverlay = null;
        openAuthModal();
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'confirm-btn-no';
    cancelBtn.textContent = '取消';
    cancelBtn.onclick = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
        loginPromptOverlay = null;
    };

    buttons.appendChild(loginBtn);
    buttons.appendChild(cancelBtn);

    box.appendChild(title);
    box.appendChild(msg);
    box.appendChild(buttons);
    overlay.appendChild(box);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
            loginPromptOverlay = null;
        }
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
    loginPromptOverlay = overlay;
}

export function ensureAuthenticated(options = {}) {
    const { message } = options || {};
    const token = getAuthToken();
    if (token) return token;
    showLoginPrompt(message);
    return null;
}

function ensureToastContainer() {
    if (toastContainer) return toastContainer;

    if (!toastStylesInjected) {
        const style = document.createElement('style');
        style.textContent = `
.toast-container { position: fixed; top: 16px; right: 16px; display: flex; flex-direction: column; gap: 10px; z-index: 11000; pointer-events: none; }
.toast-message { min-width: 200px; max-width: 340px; padding: 12px 18px; border-radius: 8px; color: #fff; font-size: 14px; line-height: 1.4; box-shadow: 0 8px 20px rgba(0,0,0,0.15); opacity: 0; transform: translateY(-8px); transition: opacity .25s ease, transform .25s ease; pointer-events: auto; }
.toast-message.show { opacity: 1; transform: translateY(0); }
.toast-info { background: rgba(60, 60, 60, 0.92); }
.toast-success { background: rgba(46, 125, 50, 0.92); }
.toast-error { background: rgba(211, 72, 72, 0.95); }
.toast-warning { background: rgba(196, 140, 30, 0.95); }
`;
        document.head.appendChild(style);
        toastStylesInjected = true;
    }

    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
    return toastContainer;
}

export function showToast(message, options = {}) {
    if (!message) return;
    const { type = 'info', duration = 3200 } = options;
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    const removeToast = () => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
            if (!container.childElementCount) {
                if (container.parentElement) {
                    container.parentElement.removeChild(container);
                }
                toastContainer = null;
            }
        }, 250);
    };

    const hideTimer = setTimeout(removeToast, duration);

    toast.addEventListener('click', () => {
        clearTimeout(hideTimer);
        removeToast();
    });
}

// 关闭弹窗
function closeModal() {
    const modal = document.getElementById('auth-modal');
    const backdrop = document.querySelector('.backdrop');

    if (modal) modal.classList.add('hidden');
    if (backdrop) backdrop.classList.add('hidden');

    // 重置表单
    const emailForm = document.getElementById('email-form');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const emailStep = document.getElementById('email-step');
    const loginStep = document.getElementById('login-step');
    const registerStep = document.getElementById('register-step');
    const authTitle = document.getElementById('auth-title');

    if (emailForm) emailForm.reset();
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
    if (emailStep) emailStep.classList.remove('hidden');
    if (loginStep) loginStep.classList.add('hidden');
    if (registerStep) registerStep.classList.add('hidden');
    if (authTitle) authTitle.textContent = '邮箱验证';
}

// 更新认证UI - 创建用户下拉菜单
export function updateAuthUI() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const loginBtns = document.querySelectorAll('.btn-open-auth');

    if (user) {
        loginBtns.forEach(btn => {
            // 如果按钮已经被替换，跳过
            if (!btn || !btn.parentNode) return;

            // 移除登录按钮
            btn.remove();

            // 创建下拉菜单容器
            const dropdown = document.createElement('div');
            dropdown.className = 'user-dropdown';

            // 创建用户按钮
            const userBtn = document.createElement('button');
            userBtn.className = 'user-menu-btn';
            userBtn.textContent = user.nickname || user.email.split('@')[0];

            // 创建下拉菜单
            const menu = document.createElement('div');
            menu.className = 'dropdown-menu';

            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'logout-btn';
            logoutBtn.textContent = '登出';
            logoutBtn.onclick = (e) => {
                e.stopPropagation();
                showLogoutConfirm();
            };

            menu.appendChild(logoutBtn);
            dropdown.appendChild(userBtn);
            dropdown.appendChild(menu);

            // 添加到导航栏
            const nav = btn.parentNode || document.querySelector('.navbar nav');
            if (nav) {
                nav.appendChild(dropdown);
            }

            // 点击按钮切换菜单
            userBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });

            // 点击其他地方关闭菜单
            document.addEventListener('click', () => {
                dropdown.classList.remove('active');
            });
        });
    }
}

// 绑定认证模态框的打开/关闭事件
export function setupAuthModalControls() {
    if (modalControlsInitialized) return;

    const modal = document.getElementById('auth-modal');
    const backdrop = document.querySelector('.backdrop');

    if (!modal || !backdrop) return;

    document.querySelectorAll('.btn-open-auth').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openAuthModal();
        });
    });

    document.querySelectorAll('[data-close-auth]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
    });

    backdrop.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
    });

    const authContent = modal.querySelector('.auth-content');
    if (authContent) {
        authContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    modalControlsInitialized = true;
}

// 显示登出确认弹窗
export function showLogoutConfirm() {
    // 创建确认弹窗
    const overlay = document.createElement('div');
    overlay.className = 'custom-confirm-overlay';

    const box = document.createElement('div');
    box.className = 'custom-confirm-box';

    const title = document.createElement('div');
    title.className = 'custom-confirm-title';
    title.textContent = '登出提示';

    const message = document.createElement('div');
    message.className = 'custom-confirm-message';
    message.textContent = '确定要退出登录吗?';

    const buttons = document.createElement('div');
    buttons.className = 'custom-confirm-buttons';

    const yesBtn = document.createElement('button');
    yesBtn.className = 'confirm-btn-yes';
    yesBtn.textContent = '确定';
    yesBtn.onclick = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        location.reload();
    };

    const noBtn = document.createElement('button');
    noBtn.className = 'confirm-btn-no';
    noBtn.textContent = '取消';
    noBtn.onclick = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    };

    buttons.appendChild(yesBtn);
    buttons.appendChild(noBtn);

    box.appendChild(title);
    box.appendChild(message);
    box.appendChild(buttons);
    overlay.appendChild(box);

    document.body.appendChild(overlay);

    // 触发动画
    setTimeout(() => overlay.classList.add('active'), 10);

    // 点击背景关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        }
    });
}

