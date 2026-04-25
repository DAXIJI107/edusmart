// api/rhythm.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware');
const pool = require('../db');
const RhythmAnalyzer = require('../services/rhythmAnalyzer');

const analyzer = new RhythmAnalyzer();

// 分析课程视频，生成节律节点
router.post('/analyze', authenticateJWT, async (req, res) => {
    try {
        const { courseId, videoUrl } = req.body;
        if (!courseId || !videoUrl) {
            return res.status(400).json({ success: false, message: '缺少参数' });
        }

        // 调用分析器
        const nodes = await analyzer.alignMultimodalData(videoUrl);

        // 存入数据库
        for (const node of nodes) {
            await pool.query(
                'INSERT INTO rhythm_nodes (course_id, time_seconds, node_type, importance, topic) VALUES (?, ?, ?, ?, ?)',
                [courseId, node.time, node.type, node.importance, node.topic]
            );
        }

        res.json({ success: true, message: '分析完成', nodeCount: nodes.length });
    } catch (error) {
        console.error('节奏分析失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 根据学生注意力推荐复习节点
router.post('/recommend-review', authenticateJWT, async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.id;

        // 获取课程所有节点
        const [nodes] = await pool.query(
            'SELECT * FROM rhythm_nodes WHERE course_id = ? ORDER BY time_seconds',
            [courseId]
        );

        // 获取学生本节课的注意力记录（假设前端已上传）
        const [attentionLogs] = await pool.query(
            'SELECT * FROM attention_logs WHERE user_id = ? AND course_id = ? ORDER BY time_seconds',
            [userId, courseId]
        );

        // 找出错过节点
        const missedNodes = analyzer.findMissedNodes(attentionLogs, nodes);

        // 为每个错过节点生成复习推荐
        const reviews = [];
        for (const node of missedNodes) {
            // 生成视频片段URL（实际应基于node时间生成）
            const clipUrl = `/video/clip?course=${courseId}&start=${node.time_seconds}&end=${node.time_seconds+30}`;
            
            // 插入错过记录
            const [result] = await pool.query(
                'INSERT INTO missed_nodes (user_id, node_id, course_id) VALUES (?, ?, ?)',
                [userId, node.id, courseId]
            );

            // 查询关联习题（假设有习题表，这里简化为知识点）
            const [questions] = await pool.query(
                'SELECT id, content FROM questions WHERE node_id = ? LIMIT 2',
                [node.id]
            );

            reviews.push({
                nodeId: node.id,
                topic: node.topic,
                time: node.time_seconds,
                clipUrl,
                questions: questions.map(q => ({ id: q.id, content: q.content }))
            });
        }

        res.json({ success: true, reviews });
    } catch (error) {
        console.error('推荐复习失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取课程节律图谱（用于前端展示）
router.get('/:courseId/nodes', authenticateJWT, async (req, res) => {
    try {
        const { courseId } = req.params;
        const [nodes] = await pool.query(
            'SELECT id, time_seconds as time, node_type as type, importance, topic FROM rhythm_nodes WHERE course_id = ? ORDER BY time_seconds',
            [courseId]
        );
        res.json({ success: true, nodes });
    } catch (error) {
        console.error('获取节律节点失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 记录学生注意力（前端定期上报）
router.post('/attention', authenticateJWT, async (req, res) => {
    try {
        const { courseId, timeSeconds, status } = req.body;
        const userId = req.user.id;

        await pool.query(
            'INSERT INTO attention_logs (user_id, course_id, time_seconds, attention_status) VALUES (?, ?, ?, ?)',
            [userId, courseId, timeSeconds, status]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('记录注意力失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router;