// iot.js - 硬件互联前端逻辑
function simulatePrint() {
    alert('模拟3D打印开始，正在向服务器发送操作日志...');
    fetch('/api/iot/analyze-operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            deviceId: 'printer-001',
            operationLog: { action: 'print', model: 'cube', time: Date.now() }
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const logDiv = document.getElementById('iot-log');
            logDiv.innerHTML += `<p class="text-sm">已映射知识点：${data.practicedNodes.join(', ')}，推荐理论：${data.recommendedTheory.join(', ')}</p>`;
        }
    });
}