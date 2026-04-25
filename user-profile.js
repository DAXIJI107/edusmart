class UserProfile {
    constructor() {
        this.profile = this.getDefaultProfile();
        this.loadFromLocalStorage();
    }

    getDefaultProfile() {
        return {
            id: null,
            username: '用户',
            nickname: '',
            name: '',
            email: '',
            phone: '',
            avatar: 'https://robohash.org/student1',
            studyStats: { studyHours: 0, completedCourses: 0, knowledgeMastery: 0, correctAnswers: 0,
                studyEfficiency: 0, continuousDays: 0 }
        };
    }

    loadFromLocalStorage() {
        try {
            const stored = JSON.parse(localStorage.getItem('userData'));
            if (stored && stored.id) {
                this.profile = { ...this.getDefaultProfile(), ...stored };
            } else {
                this.profile = this.getDefaultProfile();
            }
        } catch (e) {
            console.error('加载用户数据失败');
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('userData', JSON.stringify(this.profile));
    }

    // 从后端获取最新数据（强制刷新）
    async fetchAndSync() {
        try {
            const res = await fetch('/api/auth/user', { credentials: 'include' });
            const data = await res.json();
            if (data.success && data.user) {
                this.profile = { ...this.profile, ...data.user };
                this.saveToLocalStorage();
                this.updateUI();
                return true;
            }
        } catch (e) {
            console.error('同步用户数据失败');
        }
        return false;
    }

    updateProfile(updates) {
        this.profile = { ...this.profile, ...updates };
        this.saveToLocalStorage();
        this.updateUI();
        // 可选：同步到后端
        // fetch('/api/user/profile', { method: 'PUT', ... })
    }

    getProfile() { return this.profile; }

    updateUI() {
        // 更新导航栏用户名
        const navUser = document.getElementById('nav-username');
        if (navUser) {
            navUser.textContent = this.profile.nickname || this.profile.username || this.profile.name || '用户';
        }
        // 更新头像
        const avatarImg = document.getElementById('avatar-image');
        if (avatarImg && this.profile.avatar) {
            avatarImg.src = this.profile.avatar;
        }
        // 更新用户页面（如果在个人中心）
        this.updateProfilePage();
        // 触发自定义事件，供其他脚本监听
        document.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: this.profile }));
    }

    updateProfilePage() {
        // 仅当在 user.html 时执行
        if (!document.querySelector('.profile-page')) return;
        // 更新表单字段和统计（与原有逻辑类似，此处略）
        // 可直接调用 user.html 中已有的填充函数，或完整重绘
        // 为避免冲突，将 user.html 的内嵌脚本改为监听 userProfileUpdated 事件
    }
}

// 全局实例
window.userProfile = new UserProfile();

// 页面加载时，如果非登录页且本地无数据，自动同步
if (!window.location.pathname.includes('/index')) {
    window.addEventListener('DOMContentLoaded', async () => {
        if (!localStorage.getItem('userData')) {
            await window.userProfile.fetchAndSync();
        } else {
            window.userProfile.loadFromLocalStorage();
            window.userProfile.updateUI();
        }
    });
}