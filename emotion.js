// api/emotion.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware');
const pool = require('../db');
const EmotionService = require('../core/EmotionService');
const ResiliencePredictor = require('../core/ResiliencePredictor');

const emotionService = new EmotionService();
const predictor = new ResiliencePredictor();

// 情感识别
router.post('/recognize', authenticateJWT, async (req, res) => {
    try {
        const { text, responseTime, errorCount } = req.body;
        const userId = req.user.id;
        const sessionId = req.session?.id || 'unknown';

        // 文本识别
        const textResult = emotionService.recognizeFromText(text);
        // 行为识别
        const behaviorResult = emotionService.recognizeFromBehavior(responseTime, errorCount, 0);
        // 融合
        const fused = emotionService.fuse(textResult, behaviorResult);

        // 记录日志
        await emotionService.logEmotion(userId, sessionId, fused.emotion, fused.confidence, text, responseTime, errorCount, pool);

        res.json({ success: true, emotion: fused.emotion, confidence: fused.confidence });
    } catch (error) {
        console.error('情感识别失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 韧性预测
router.post('/predict-resilience', authenticateJWT, async (req, res) => {
    try {
        const { studentId } = req.body;
        const userId = studentId || req.user.id;

        const risk = await predictor.predictRisk(userId, pool);
        const intervention = predictor.generateIntervention(risk);

        // 存储预测结果
        await pool.query(
            'INSERT INTO resilience_predictions (user_id, prediction_date, risk_score, features, intervention) VALUES (?, CURDATE(), ?, ?, ?)',
            [userId, risk, JSON.stringify({}), JSON.stringify(intervention)]
        );

        res.json({ success: true, risk, intervention });
    } catch (error) {
        console.error('韧性预测失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取历史情感趋势（用于前端展示）
router.get('/trends', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.query(
            `SELECT DATE(created_at) as date, 
                    SUM(CASE WHEN emotion='frustrated' THEN 1 ELSE 0 END) as frustrated_count,
                    SUM(CASE WHEN emotion='distracted' THEN 1 ELSE 0 END) as distracted_count,
                    COUNT(*) as total
             FROM emotion_logs 
             WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY DATE(created_at)`,
            [userId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('获取情感趋势失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router;