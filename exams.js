const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateJWT } = require('../middleware');

// 获取考试列表（只显示已发布考试）
router.get('/', authenticateJWT, async (req, res) => {
    const [rows] = await pool.query('SELECT id, name, difficulty, duration FROM exams WHERE is_publish=1');
    res.json(rows);
});
// 在 module.exports 之前添加
router.get('/:examId/questions', authenticateJWT, async (req, res) => {
    try {
        const examId = req.params.examId;
        const [rows] = await pool.query(
            'SELECT id, content, type, options, answer, difficulty, score, node_id, subject FROM questions WHERE exam_id = ?',
            [examId]
        );
        // 处理 options 和 answer 的 JSON 解析（与 questions.js 类似）
        const questions = rows.map(q => {
            let opts = q.options;
            if (typeof opts === 'string') {
                try { opts = JSON.parse(opts); } catch(e) { opts = []; }
            }
            let ans = q.answer;
            if (q.type === 'multiple' && typeof ans === 'string') {
                try { ans = JSON.parse(ans); } catch(e) {
                    ans = ans.split(',').map(a => a.trim());
                }
            }
            return { ...q, options: opts, answer: ans };
        });
        res.json({ success: true, questions });
    } catch (error) {
        console.error('获取考试题目失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});
module.exports = router;
