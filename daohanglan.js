function loadNavigation() {
    fetch('daohanglan.html')
        .then(response => {
            if (!response.ok) throw new Error('导航栏加载失败');
            return response.text();
        })
        .then(data => {
            const navContainer = document.createElement('div');
            navContainer.id = 'nav-container';
            navContainer.innerHTML = data;
            document.body.insertBefore(navContainer, document.body.firstChild);
            
            highlightCurrentPage();
            initMobileMenu();
            initNavbarScroll();
            
            // 绑定退出按钮
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    localStorage.removeItem('userData');
                    document.cookie = 'userData=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    window.location.href = 'index.html';
                });
            }
        })
        .catch(err => {
            console.error('导航栏加载失败:', err);
            createFallbackNavigation();
        });
}







// 初始化导航栏功能
function initNavigation() {
    // 设置当前页面高亮
    highlightCurrentPage();
    
    // 移动端菜单切换
    initMobileMenu();
    
    // 导航栏滚动效果
    initNavbarScroll();
}

// 设置当前页面高亮
function highlightCurrentPage() {
    const currentPage = window.location.pathname.split('/').pop() || 'home.html';
    const navLinks = document.querySelectorAll('.navbar a');
    
    navLinks.forEach(link => {
        // 移除所有active类
        link.classList.remove('text-primary', 'font-medium', 'nav-active');
        link.classList.add('text-gray-600', 'hover:text-primary');
        
        // 获取链接的文件名
        const linkHref = link.getAttribute('href');
        const linkPage = linkHref ? linkHref.split('/').pop() : '';
        
        // 如果当前页面匹配链接，设置高亮
        if (currentPage === linkPage) {
            link.classList.add('text-primary', 'font-medium');
            link.classList.remove('text-gray-600', 'hover:text-primary');
        }
    });
}

// 移动端菜单初始化
function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.md\\:hidden.text-gray-600');
    const navMenu = document.querySelector('.hidden.md\\:flex');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('hidden');
            navMenu.classList.toggle('flex');
            navMenu.classList.toggle('absolute');
            navMenu.classList.toggle('top-full');
            navMenu.classList.toggle('left-0');
            navMenu.classList.toggle('right-0');
            navMenu.classList.toggle('bg-white');
            navMenu.classList.toggle('shadow-lg');
            navMenu.classList.toggle('p-4');
            navMenu.classList.toggle('flex-col');
            navMenu.classList.toggle('space-y-4');
        });
    }
}

// 导航栏滚动效果
function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 10) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
        });
    }
}
document.addEventListener('DOMContentLoaded', loadNavigation);