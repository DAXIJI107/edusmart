// agent.js - AI代理前端逻辑
document.addEventListener('DOMContentLoaded', function() {
    // 获取权限设置
    fetch('/api/agent/settings', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // 勾选对应的权限
                console.log('当前权限:', data.permissions);
            }
        });
    
    // 绑定执行按钮（可根据需要添加）
});