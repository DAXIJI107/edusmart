const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware');
const MetacognitiveEngine = require('../core/MetacognitiveEngine');
const pool = require('../db'); // 用于查询历史日志

// 初始化引擎（可复用，但每次请求新实例也行）
const engine = new MetacognitiveEngine();

// 生成引导问题
router.post('/guidance', authenticateJWT, async (req, res) => {
    try {
        const { question } = req.body;
        const userId = req.user.id;

        // 可选：记录本次提问作为互动日志
        await pool.query(
            'INSERT INTO interaction_logs (user_id, session_id, type, content) VALUES (?, ?, ?, ?)',
            [userId, req.session?.id || 'unknown', 'question', question]
        );

        // 调用引擎生成引导
        const guidance = await engine.generateGuidance(question, userId);

        res.json({ success: true, guidance });
    } catch (error) {
        console.error('生成引导失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 评估元认知参与度（假设前端会传递会话ID和日志）
router.post('/assess', authenticateJWT, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const userId = req.user.id;

        // 查询该会话的所有互动日志
        const [logs] = await pool.query(
            'SELECT type, content FROM interaction_logs WHERE user_id = ? AND session_id = ? ORDER BY timestamp',
            [userId, sessionId]
        );

        const score = engine.assessMetacognitiveEngagement(logs);

        // 存储评分
        await pool.query(
            'INSERT INTO metacognitive_scores (user_id, session_id, score, details) VALUES (?, ?, ?, ?)',
            [userId, sessionId, score, JSON.stringify({ logsSummary: logs.length })]
        );

        res.json({ success: true, score });
    } catch (error) {
        console.error('评估失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router;