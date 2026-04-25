(function () {
    'use strict';

    // ============ DOM元素缓存 ============
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginMessage = document.getElementById('login-message');
    const registerMessage = document.getElementById('register-message');
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const tabIndicator = document.getElementById('tab-indicator');
    const authTabsWrapper = document.querySelector('.auth-tabs-wrapper');
    const authTabs = document.querySelector('.auth-tabs');
    const particlesContainer = document.getElementById('particles-container');
    const allAppleBtns = document.querySelectorAll('.apple-btn');
    const allPasswordToggles = document.querySelectorAll('.password-toggle');

    // ============ 粒子系统 ============
    function createParticle() {
        if (!particlesContainer) return;
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = Math.random() * 4 + 2;
        const startX = Math.random() * 100;
        const duration = Math.random() * 8 + 8;
        const delay = Math.random() * 6;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = startX + '%';
        particle.style.bottom = '-20px';
        particle.style.animationDuration = duration + 's';
        particle.style.animationDelay = delay + 's';
        particle.style.opacity = Math.random() * 0.4 + 0.25;
        particlesContainer.appendChild(particle);

        // 动画结束后移除粒子
        const totalDuration = (duration + delay) * 1000;
        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
            }
        }, totalDuration + 200);
    }

    function spawnParticles(count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => createParticle(), Math.random() * 400);
        }
    }

    // 初始生成粒子
    if (particlesContainer && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
        spawnParticles(12);
        // 持续补充粒子
        setInterval(() => {
            if (particlesContainer.children.length < 20) {
                spawnParticles(4);
            }
        }, 3500);
    }

    // ============ 标签滑动指示器 ============
    function updateTabIndicator() {
        if (!tabIndicator || !authTabs) return;
        const activeTab = authTabs.querySelector('.nav-link.active');
        if (!activeTab) return;

        const tabRect = activeTab.getBoundingClientRect();
        const tabsRect = authTabs.getBoundingClientRect();

        tabIndicator.style.left = (tabRect.left - tabsRect.left) + 'px';
        tabIndicator.style.width = tabRect.width + 'px';
    }

    // 监听Bootstrap标签切换事件
    if (loginTab) {
        loginTab.addEventListener('shown.bs.tab', function () {
            updateTabIndicator();
        });
    }
    if (registerTab) {
        registerTab.addEventListener('shown.bs.tab', function () {
            updateTabIndicator();
        });
    }

    // 初始化和窗口大小改变时更新
    updateTabIndicator();
    window.addEventListener('resize', updateTabIndicator);
    window.addEventListener('orientationchange', function () {
        setTimeout(updateTabIndicator, 150);
    });

    // ============ 按钮阻尼动画 ============
    function applyButtonDamping(btn) {
        let isPressed = false;
        let animationFrameId = null;

        const startPress = function (e) {
            if (btn.classList.contains('loading')) return;
            isPressed = true;
            btn.style.transition =
                'transform 0.2s ' + getComputedStyle(document.documentElement).getPropertyValue('--transition-spring').trim() ||
                'cubic-bezier(0.34, 1.56, 0.64, 1)';
        };

        const endPress = function (e) {
            if (!isPressed) return;
            isPressed = false;
            btn.style.transition =
                'transform 0.45s ' + getComputedStyle(document.documentElement).getPropertyValue('--transition-spring').trim() ||
                'cubic-bezier(0.34, 1.56, 0.64, 1)';
            btn.style.transform = 'scale(1)';
            if (animationFrameId) clearTimeout(animationFrameId);
            animationFrameId = setTimeout(() => {
                btn.style.transition = '';
                btn.style.transform = '';
            }, 450);
        };

        const cancelPress = function (e) {
            if (!isPressed) return;
            isPressed = false;
            btn.style.transition =
                'transform 0.35s ' + getComputedStyle(document.documentElement).getPropertyValue('--transition-spring').trim() ||
                'cubic-bezier(0.34, 1.56, 0.64, 1)';
            btn.style.transform = 'scale(1)';
            if (animationFrameId) clearTimeout(animationFrameId);
            animationFrameId = setTimeout(() => {
                btn.style.transition = '';
                btn.style.transform = '';
            }, 350);
        };

        btn.addEventListener('mousedown', startPress, { passive: true });
        btn.addEventListener('touchstart', startPress, { passive: true });
        btn.addEventListener('mouseup', endPress);
        btn.addEventListener('touchend', endPress);
        btn.addEventListener('mouseleave', cancelPress);
        btn.addEventListener('touchcancel', cancelPress);
    }

    allAppleBtns.forEach(applyButtonDamping);

    // ============ 密码可见性切换 ============
    allPasswordToggles.forEach(function (toggleBtn) {
        toggleBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const parentFloating = toggleBtn.closest('.form-floating');
            const input = parentFloating ? parentFloating.querySelector('input') : null;
            if (!input) return;

            const icon = toggleBtn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                if (icon) {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                }
                toggleBtn.style.color = 'var(--apple-blue)';
            } else {
                input.type = 'password';
                if (icon) {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
                toggleBtn.style.color = '';
            }
            // 切换时给按钮一个微小的弹性动画
            toggleBtn.style.transform = 'translateY(-50%) scale(0.85)';
            setTimeout(() => {
                toggleBtn.style.transform = 'translateY(-50%) scale(1)';
            }, 150);
        });
    });

    // ============ 密码匹配实时检查(注册表单) ============
    const registerPassword = document.getElementById('register-password');
    const registerConfirmPassword = document.getElementById('register-confirm-password');
    const passwordMatchIcon = document.querySelector('.password-match-icon');

    function checkPasswordMatch() {
        if (!registerPassword || !registerConfirmPassword || !passwordMatchIcon) return;
        const pass = registerPassword.value;
        const confirm = registerConfirmPassword.value;

        passwordMatchIcon.classList.remove('match', 'mismatch');

        if (confirm.length === 0) {
            passwordMatchIcon.textContent = '';
            passwordMatchIcon.style.opacity = '0';
            return;
        }

        if (pass === confirm) {
            passwordMatchIcon.textContent = '✓';
            passwordMatchIcon.classList.add('match');
            passwordMatchIcon.style.opacity = '1';
            registerConfirmPassword.style.borderColor = 'var(--apple-green)';
            registerConfirmPassword.style.boxShadow = '0 0 0 3px rgba(52, 199, 89, 0.12)';
        } else {
            passwordMatchIcon.textContent = '✗';
            passwordMatchIcon.classList.add('mismatch');
            passwordMatchIcon.style.opacity = '1';
            registerConfirmPassword.style.borderColor = 'var(--apple-red)';
            registerConfirmPassword.style.boxShadow = '0 0 0 3px rgba(255, 59, 48, 0.1)';
        }
    }

    if (registerPassword && registerConfirmPassword) {
        registerPassword.addEventListener('input', checkPasswordMatch);
        registerConfirmPassword.addEventListener('input', checkPasswordMatch);

        registerConfirmPassword.addEventListener('blur', function () {
            setTimeout(() => {
                if (registerConfirmPassword.value.length === 0) {
                    registerConfirmPassword.style.borderColor = '';
                    registerConfirmPassword.style.boxShadow = '';
                    if (passwordMatchIcon) {
                        passwordMatchIcon.style.opacity = '0';
                    }
                }
            }, 200);
        });

        registerConfirmPassword.addEventListener('focus', function () {
            if (registerConfirmPassword.value.length > 0) {
                checkPasswordMatch();
            }
        });
    }

    // ============ 显示消息 ============
    function showMessage(messageEl, text, type) {
        if (!messageEl) return;
        messageEl.textContent = text;
        messageEl.className = 'message mt-3 ' + type + ' show';
        clearTimeout(messageEl._hideTimeout);
        messageEl._hideTimeout = setTimeout(() => {
            messageEl.classList.remove('show');
            messageEl.className = 'message mt-3';
        }, 4000);
    }

    // ============ 输入框抖动动画 ============
    function shakeElement(el) {
        if (!el) return;
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
        el.addEventListener(
            'animationend',
            function () {
                el.classList.remove('shake');
            }, { once: true }
        );
    }

    // ============ 表单提交处理 ============
    function setButtonLoading(btn, isLoading) {
        if (!btn) return;
        if (isLoading) {
            btn.classList.add('loading');
            btn.disabled = true;
        } else {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    // 登录表单提交
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const username = document.getElementById('login-username');
            const password = document.getElementById('login-password');
            const submitBtn = loginForm.querySelector('.apple-btn');
            let hasError = false;

            if (!username.value.trim()) {
                shakeElement(username.closest('.input-group-apple') || username);
                showMessage(loginMessage, '请输入用户名', 'error');
                hasError = true;
            }
            if (!password.value.trim()) {
                shakeElement(password.closest('.input-group-apple') || password);
                if (!hasError) showMessage(loginMessage, '请输入密码', 'error');
                hasError = true;
            }
            if (hasError) return;

            setButtonLoading(submitBtn, true);
            showMessage(loginMessage, '', '');
            loginMessage.className = 'message mt-3';

            setTimeout(() => {
                setButtonLoading(submitBtn, false);
                if (username.value.trim().length >= 2 && password.value.trim().length >= 3) {
                    showMessage(loginMessage, '✓ 登录成功，正在跳转...', 'success');
                } else {
                    showMessage(loginMessage, '用户名或密码错误', 'error');
                    shakeElement(submitBtn);
                }
            }, 1500 + Math.random() * 600);
        });
    }

    // 注册表单提交
    if (registerForm) {
        registerForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const username = document.getElementById('register-username');
            const email = document.getElementById('register-email');
            const password = registerPassword;
            const confirmPassword = registerConfirmPassword;
            const agreeTerms = document.getElementById('agree-terms');
            const submitBtn = registerForm.querySelector('.apple-btn');
            let hasError = false;
            const errorMessages = [];

            if (!username.value.trim()) {
                shakeElement(username.closest('.input-group-apple') || username);
                errorMessages.push('请输入用户名');
                hasError = true;
            }
            if (!email.value.trim()) {
                shakeElement(email.closest('.input-group-apple') || email);
                errorMessages.push('请输入邮箱');
                hasError = true;
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
                shakeElement(email.closest('.input-group-apple') || email);
                errorMessages.push('邮箱格式不正确');
                hasError = true;
            }
            if (!password.value.trim()) {
                shakeElement(password.closest('.input-group-apple') || password);
                errorMessages.push('请输入密码');
                hasError = true;
            } else if (password.value.trim().length < 6) {
                shakeElement(password.closest('.input-group-apple') || password);
                errorMessages.push('密码至少需要6个字符');
                hasError = true;
            }
            if (password.value !== confirmPassword.value) {
                shakeElement(confirmPassword.closest('.input-group-apple') || confirmPassword);
                errorMessages.push('两次密码输入不一致');
                hasError = true;
            }
            if (!agreeTerms.checked) {
                shakeElement(agreeTerms.closest('.form-check') || agreeTerms);
                errorMessages.push('请同意服务条款');
                hasError = true;
            }

            if (hasError) {
                showMessage(registerMessage, errorMessages[0], 'error');
                return;
            }

            setButtonLoading(submitBtn, true);
            showMessage(registerMessage, '', '');
            registerMessage.className = 'message mt-3';

            setTimeout(() => {
                setButtonLoading(submitBtn, false);
                showMessage(registerMessage, '✓ 注册成功！欢迎加入EduSmart', 'success');
                setTimeout(() => {
                    if (loginTab) loginTab.click();
                    registerForm.reset();
                    if (passwordMatchIcon) {
                        passwordMatchIcon.style.opacity = '0';
                        passwordMatchIcon.classList.remove('match', 'mismatch');
                    }
                    if (confirmPassword) {
                        confirmPassword.style.borderColor = '';
                        confirmPassword.style.boxShadow = '';
                    }
                }, 1800);
            }, 1600 + Math.random() * 500);
        });
    }

    // ============ 输入框焦点增强 ============
    document.querySelectorAll('.input-group-apple .form-control').forEach(function (input) {
        input.addEventListener('focus', function () {
            const group = input.closest('.input-group-apple');
            if (group && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                group.style.transform = 'translateY(-2px)';
                group.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
            }
        });

        input.addEventListener('blur', function () {
            const group = input.closest('.input-group-apple');
            if (group) {
                group.style.transform = 'translateY(0)';
                group.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)';
            }
        });
    });

    // ============ 键盘导航增强 ============
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'BUTTON')) {
                activeEl.blur();
            }
        }
    });

    // ============ 初始化完成 ============
    console.log('%c🍎 EduSmart %c登录页面已就绪 %c— 苹果风格设计 + 自定义背景',
        'font-size:16px;font-weight:700;color:#007AFF;',
        'font-size:13px;color:#636366;',
        'font-size:11px;color:#AEAEB2;');
    console.log('%c🖼️ 背景图片: image.png | 流动光球 · 阻尼按钮 · 毛玻璃卡片',
        'font-size:11px;color:#8E8E93;letter-spacing:0.5px;');

})();