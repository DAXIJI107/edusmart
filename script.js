// js/script.js
(function() {
    function showMessage(elementId, message, isSuccess) {
        const element = document.getElementById(elementId);
        if (!element) return;
        element.textContent = message;
        element.className = 'message ' + (isSuccess ? 'success' : 'error');
        element.style.display = 'block';
    }

    function setupLoginForm() {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) {
            console.error('找不到登录表单');
            return;
        }
        console.log('登录表单已绑定');
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>登录中...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                    credentials: 'include'
                });
                const data = await response.json();
                if (data.success) {
                    if (data.user) {
                        localStorage.setItem('userData', JSON.stringify(data.user));
                    }
                    showMessage('login-message', '登录成功！正在跳转...', true);
                    setTimeout(() => { window.location.href = '/home'; }, 1000);
                } else {
                    showMessage('login-message', data.message || '登录失败', false);
                }
            } catch (error) {
                showMessage('login-message', '网络错误，请重试', false);
            } finally {
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>登录';
                submitBtn.disabled = false;
            }
        });
    }

    function setupRegisterForm() {
        const registerForm = document.getElementById('register-form');
        if (!registerForm) return;
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('register-username').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            if (password !== confirmPassword) {
                showMessage('register-message', '两次输入的密码不一致', false);
                return;
            }
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                const data = await res.json();
                if (data.success) {
                    showMessage('register-message', '注册成功！请登录', true);
                    registerForm.reset();
                    document.querySelector('#login-tab').click();
                } else {
                    showMessage('register-message', data.message || '注册失败', false);
                }
            } catch (err) {
                showMessage('register-message', '注册失败，请重试', false);
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    window.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('/index') || window.location.pathname === '/') {
            setupLoginForm();
            setupRegisterForm();
        }
    });
})();