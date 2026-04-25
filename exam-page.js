// exam-page.js
// 动态实现 exam.html 在线考试全部功能

document.addEventListener('DOMContentLoaded', function() {
        // ========== AI摄像头监考 ==========
        let videoStream = null, faceInterval = null;
        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);
        async function startCamera() {
            try {
                videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = videoStream;
                await video.play();
                // 加载 face-api.js
                if (!window.faceapi) {
                    await loadFaceApi();
                }
                faceInterval = setInterval(faceMonitor, 2000);
            } catch (e) {
                showToast('无法访问摄像头，无法考试', 'danger');
            }
        }
        async function loadFaceApi() {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/face-api.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        async function faceMonitor() {
            if (!window.faceapi) return;
            const detections = await faceapi.detectAllFaces(video);
            if (!detections.length) {
                showToast('未检测到人脸，请勿离开摄像头!', 'danger');
            } else if (detections.length > 1) {
                showToast('检测到多个人脸，考试异常!', 'danger');
            }
        }

        // ========== 防切屏/切换/全屏 ==========
        let cutCount = 0, maxCut = 3;
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                cutCount++;
                showToast('检测到切屏，专心答题!', 'danger');
                if (cutCount >= maxCut) submitExam(true);
            }
        });
        // 强制全屏
        function requestFullscreen() {
            const el = document.documentElement;
            if (el.requestFullscreen) el.requestFullscreen();
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
            else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
            else if (el.msRequestFullscreen) el.msRequestFullscreen();
        }

        // ========== 答题行为分析 ==========
        let answerBehavior = { mouse: [], keys: [], time: {}, start: Date.now() };
        document.addEventListener('mousemove', e => answerBehavior.mouse.push([e.clientX, e.clientY, Date.now()]));
        document.addEventListener('keydown', e => answerBehavior.keys.push([e.key, Date.now()]));
        function recordQuestionTime(qid, type) {
            if (!answerBehavior.time[qid]) answerBehavior.time[qid] = { start: Date.now(), end: null };
            if (type === 'end') answerBehavior.time[qid].end = Date.now();
        }

        // ========== 环境音检测 ==========
        let audioStream = null, audioContext = null, analyser = null, audioInterval = null;
        async function startAudioMonitor() {
            try {
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioContext.createMediaStreamSource(audioStream);
                analyser = audioContext.createAnalyser();
                source.connect(analyser);
                audioInterval = setInterval(checkAudio, 2000);
            } catch (e) {
                showToast('无法访问麦克风，无法考试', 'danger');
            }
        }
        function checkAudio() {
            const data = new Uint8Array(analyser.fftSize);
            analyser.getByteTimeDomainData(data);
            const volume = data.reduce((a, b) => a + Math.abs(b - 128), 0) / data.length;
            if (volume > 20) showToast('环境噪音过大，注意安静!', 'danger');
        }

        // ========== 防复制/粘贴/右键/截图 ==========
        document.addEventListener('copy', e => { e.preventDefault(); showToast('禁止复制!', 'danger'); });
        document.addEventListener('paste', e => { e.preventDefault(); showToast('禁止粘贴!', 'danger'); });
        document.addEventListener('contextmenu', e => { e.preventDefault(); showToast('禁止右键!', 'danger'); });
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey && e.key === 's') || (e.key === 'PrintScreen')) {
                e.preventDefault();
                showToast('禁止截图!', 'danger');
            }
        });

        // ========== 考后AI讲解入口 ==========
        function showAIExplainBtn() {
            const panel = document.getElementById('resultPanel');
            if (panel && !document.getElementById('ai-explain-btn')) {
                const btn = document.createElement('button');
                btn.id = 'ai-explain-btn';
                btn.className = 'btn btn-info mt-3';
                btn.textContent = 'AI智能讲解错题';
                btn.onclick = async function() {
                    btn.disabled = true;
                    btn.textContent = 'AI正在分析...';
                    // 假设后端有 /api/ai-explain 接口
                    const res = await fetch('/api/ai-explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_exam_id: userExamId }) });
                    const data = await res.json();
                    btn.textContent = 'AI讲解完成';
                    const explainDiv = document.createElement('div');
                    explainDiv.className = 'alert alert-info mt-2';
                    explainDiv.innerHTML = `<b>AI讲解：</b><br>${data.explain || '暂无讲解'} `;
                    panel.appendChild(explainDiv);
                };
                panel.appendChild(btn);
            }
        }
    let timerInterval, timeLeft = 0, blurCount = 0, maxBlur = 3, userExamId = null, questions = [], answers = {};
    // 获取考试列表
    async function loadExams() {
        const res = await fetch('/api/exams', { credentials: 'include' });
        const data = await res.json();
        const select = document.getElementById('examSelect');
        select.innerHTML = data.map(e => `<option value="${e.id}">${e.name}（${e.difficulty}）</option>`).join('');
    }
    // 获取题目
    async function loadQuestions(examId) {
        const res = await fetch(`/api/exams/${examId}/questions`, { credentials: 'include' });
        questions = await res.json();
    }
    // 开始考试
    async function startExam() {
            // 启动AI监考、音频监控、全屏
            await startCamera();
            await startAudioMonitor();
            requestFullscreen();
        let examId = document.getElementById('examSelect').value;
        if (!examId || isNaN(parseInt(examId, 10))) {
            alert('请选择考试');
            return;
        }
        examId = String(examId);
        const res = await fetch('/api/user-exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ exam_id: examId })
        });
        const data = await res.json();
        userExamId = data.user_exam_id;
        await loadQuestions(examId);
        renderQuestions();
        document.getElementById('examPanel').style.display = '';
        document.getElementById('resultPanel').style.display = 'none';
        // 假设每场考试 30 分钟
        timeLeft = 30 * 60;
        startTimer();
    }
    // 渲染题目
    function renderQuestions() {
        const container = document.getElementById('questionsContainer');
        container.innerHTML = '';
        questions.forEach((q, idx) => {
            let html = `<div class="question-card card mb-3"><div class="card-body"><b>第${idx+1}题（${q.score}分）</b><br>${q.content}<br>`;
            if (q.type === 'choice' || q.type === 'true_false') {
                const opts = JSON.parse(q.options || '[]');
                opts.forEach((opt, i) => {
                    html += `<div class="form-check mt-2"><input class="form-check-input" type="radio" name="q_${q.id}" value="${opt}" id="q_${q.id}_${i}"><label class="form-check-label option-label" for="q_${q.id}_${i}">${opt}</label></div>`;
                });
            } else if (q.type === 'multiple') {
                const opts = JSON.parse(q.options || '[]');
                opts.forEach((opt, i) => {
                    html += `<div class="form-check mt-2"><input class="form-check-input" type="checkbox" name="q_${q.id}[]" value="${opt}" id="q_${q.id}_${i}"><label class="form-check-label option-label" for="q_${q.id}_${i}">${opt}</label></div>`;
                });
            } else {
                html += `<textarea class="form-control mt-2" name="q_${q.id}" rows="2" placeholder="请输入答案"></textarea>`;
            }
            html += '</div></div>';
            container.innerHTML += html;
        });
    }
    // 计时器
    function startTimer() {
        updateTimer();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimer();
            if(timeLeft<=0) {
                clearInterval(timerInterval);
                submitExam(true);
            }
        }, 1000);
    }
    function updateTimer() {
        const min = String(Math.floor(timeLeft/60)).padStart(2,'0');
        const sec = String(timeLeft%60).padStart(2,'0');
        document.getElementById('timer').textContent = `${min}:${sec}`;
    }
    // 切屏检测
    window.onblur = function() {
        blurCount++;
        document.getElementById('blurWarning').style.display = '';
        if(blurCount>=maxBlur) {
            submitExam(true);
        }
    };
    // 保存进度
    document.getElementById('saveProgressBtn').onclick = async function() {
        await saveAnswers();
        showToast('进度已保存', 'success');
    };
    // 提交试卷
    document.getElementById('examForm').onsubmit = async function(e) {
        e.preventDefault();
        await submitExam();
    };
    async function saveAnswers() {
        for(const q of questions) {
            let val = '';
            const el = document.querySelector(`[name='q_${q.id}']`) || document.querySelector(`[name='q_${q.id}[]']`);
            if(q.type==='multiple') {
                val = Array.from(document.querySelectorAll(`[name='q_${q.id}[]']:checked`)).map(e=>e.value).join(',');
            } else if(el && el.type==='radio') {
                val = document.querySelector(`[name='q_${q.id}']:checked`)?.value || '';
            } else if(el && el.type==='textarea') {
                val = el.value;
            } else if(el) {
                val = el.value;
            }
            answers[q.id] = val;
            await fetch('/api/user-answers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ user_exam_id: userExamId, question_id: q.id, answer: val })
            });
        }
    }
    async function submitExam(auto=false) {
        clearInterval(timerInterval);
        if (faceInterval) clearInterval(faceInterval);
        if (audioInterval) clearInterval(audioInterval);
        await saveAnswers();
        const res = await fetch(`/api/user-exams/${userExamId}/submit`, {
            method: 'POST',
            credentials: 'include'
        });
        const data = await res.json();
        document.getElementById('examPanel').style.display = 'none';
        document.getElementById('resultPanel').style.display = '';
        document.getElementById('resultPanel').innerHTML = `<div class='alert alert-${data.score>=60?'success':'danger'}'><h4>考试${auto?'已自动':''}提交！</h4><p>得分：<b>${data.score}</b>分</p></div>`;
        showAIExplainBtn();
    }
    // 初始化
    loadExams();
    document.getElementById('startExamBtn').onclick = startExam;
    // 通用 toast
    function showToast(msg, type = 'info') {
        let toast = document.getElementById('global-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'global-toast';
            toast.className = 'toast align-items-center text-bg-' + type + ' position-fixed bottom-0 end-0 m-3';
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            toast.setAttribute('aria-atomic', 'true');
            toast.innerHTML = `<div class="d-flex"><div class="toast-body"></div><button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
            document.body.appendChild(toast);
        }
        toast.querySelector('.toast-body').textContent = msg;
        toast.className = 'toast align-items-center text-bg-' + type + ' position-fixed bottom-0 end-0 m-3 show';
        setTimeout(() => { toast.classList.remove('show'); }, 2000);
    }
});
