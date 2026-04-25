const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const app = express();
const PORT = process.env.PORT || 3000;
require('dotenv').config();
const fs = require('fs');

// ==================== 定时任务 ====================
cron.schedule('0 2 * * *', async () => {
    console.log('开始计算昨日学习特征...');
    const pool = require('./db');
    const [users] = await pool.query('SELECT id FROM users');
    for (const user of users) {
        const userId = user.id;
        const [accuracy] = await pool.query(
            `SELECT AVG(is_correct) as avg_accuracy 
             FROM user_answers ua 
             JOIN questions q ON ua.question_id = q.id
             WHERE ua.user_id = ? AND DATE(ua.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`,
            [userId]
        );
        await pool.query(
            `INSERT INTO student_daily_features (user_id, date, avg_accuracy, help_count, study_duration, emotion_volatility, session_count)
             VALUES (?, DATE_SUB(CURDATE(), INTERVAL 1 DAY), ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE avg_accuracy=VALUES(avg_accuracy)`,
            [userId, accuracy[0].avg_accuracy || 0, 0, 0, 0, 0]
        );
    }
    console.log('特征计算完成');
});

const MasteryCalculator = require('./core/MasteryCalculator');
const calculator = new MasteryCalculator();

cron.schedule('0 3 * * *', async () => {
    console.log('开始更新所有用户知识点掌握度...');
    const pool = require('./db');
    const [users] = await pool.query('SELECT id FROM users');
    for (const user of users) {
        await calculator.updateAllMastery(user.id, pool);
    }
    console.log('掌握度更新完成');
});

// ==================== 基础中间件 ====================
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

// ==================== 静态文件服务 ====================
app.use(express.static(path.join(__dirname, 'html')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// ==================== 认证中间件 ====================
const { authenticateJWT } = require('./middleware');

// ==================== 页面路由 ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

app.get('/home', authenticateJWT, (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'home.html'));
});

app.get('/ai-assistant', authenticateJWT, (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'ai-assistant.html'));
});

app.get('/study-report', authenticateJWT, (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'study-report.html'));
});

app.get('/cs', authenticateJWT, (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'cs.html'));
});

app.get('/course', authenticateJWT, (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'course.html'));
});

app.get('/course-detail', authenticateJWT, (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'course-detail.html'));
});

app.get('/daohanglan', authenticateJWT, (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'daohanglan.html'));
});
// ... 在原有路由之后讯飞星火中英互动api
const xfyunRouter = require('./api/xfyun');
app.use('/api/xfyun', xfyunRouter);


// ==================== 星火大模型代理 ====================
const axios = require('axios');
const CHAT_LOG_FILE = path.join(__dirname, 'chat_history.log');

app.post('/api/spark-proxy', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages 参数缺失或格式错误' });
        }

        const response = await axios.post(
            'https://spark-api-open.xf-yun.com/x2/chat/completions',
            {
                model: 'spark-x',
                messages,
                stream: false,
                temperature: 0.7
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.SPARK_API_PASSWORD}`
                }
            }
        );

        const aiContent = response.data?.choices?.[0]?.message?.content || '(空回复)';
        const userQuestion = messages[messages.length - 1]?.content || '(空问题)';

        const logEntry = `[${new Date().toLocaleString()}] 用户: ${userQuestion}\nAI: ${aiContent}\n${'─'.repeat(50)}\n`;
        fs.appendFileSync(CHAT_LOG_FILE, logEntry, 'utf8');
        console.log('📝 对话已记录到 chat_history.log');

        res.json(response.data);
    } catch (error) {
        console.error('星火代理错误：', error.response?.data || error.message);
        res.status(500).json({ error: '星火大模型请求失败' });
    }
});

// ==================== API 路由挂载 ====================
// 注意顺序：questions 接口需确保文件 ./api/questions.js 存在
app.use('/api/auth', require('./api/auth'));
app.use('/api/exams', require('./api/exams'));
app.use('/api/questions', require('./api/questions'));  // 挂载 /api/questions 路由
app.use('/api/user-exams', require('./api/userExams'));
app.use('/api/user-answers', require('./api/userAnswers'));
app.use('/api/ai-explain', require('./api/ai-explain'));
app.use('/api', require('./routes/user'));               // 用户管理路由（/api/auth/user 等）
app.use('/api/ai', require('./api/aiPath'));             // AI学习路径
app.use('/api/metacognitive', require('./api/metacognitive'));
app.use('/api/rhythm', require('./api/rhythm'));
app.use('/api/emotion', require('./api/emotion'));
app.use('/api/iot', require('./api/iot'));
app.use('/api/agent', require('./api/agent'));
app.use('/api/report', require('./api/report'));

// 兼容旧题目路由 /api/exams/:examId/questions → 转发到 questions
const questionsRouter = require('./api/questions');
app.use('/api/exams/:examId/questions', (req, res, next) => {
    req.url = `/${req.params.examId}`;
    questionsRouter.handle(req, res, next);
});
app.use('/api/ai-explain', require('./api/ai-explain'));
app.use('/api/knowledge', require('./api/knowledge'));
app.use('/api/user', require('./api/user'));

// ==================== 404 处理 ====================
app.use((req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        console.log('API 404:', req.method, req.originalUrl);
        res.status(404).json({ success: false, message: 'API接口不存在' });
    } else {
        console.log('页面 404:', req.method, req.originalUrl);
        res.sendFile(path.join(__dirname, 'html', 'index.html'));
    }
});

// ==================== 启动服务器 ====================
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});