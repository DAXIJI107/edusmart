const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateJWT } = require('../middleware');

// 创建用户考试记录
router.post('/', authenticateJWT, async (req, res) => {
    let { exam_id } = req.body;
    exam_id = parseInt(exam_id, 10);
    if (!exam_id || isNaN(exam_id)) {
        return res.status(400).json({ error: '无效的 exam_id' });
    }
    const [result] = await pool.query(
        'INSERT INTO exam_records (user_id, exam_id, start_time, status) VALUES (?, ?, NOW(), ?)',
        [req.user.id, exam_id, 'in_progress']
    );
    res.json({ user_exam_id: result.insertId });
});

// 提交试卷并自动判分
router.post('/:id/submit', authenticateJWT, async (req, res) => {
    const user_exam_id = req.params.id;
    // 查询所有题目和用户答案
    const [questions] = await pool.query(
        'SELECT q.id, q.type, q.answer, q.score FROM questions q JOIN exam_records er ON q.exam_id=er.exam_id WHERE er.id=?',
        [user_exam_id]
    );
    const [answers] = await pool.query(
        'SELECT question_id, answer FROM user_answers WHERE user_exam_id=?',
        [user_exam_id]
    );
    // 判分
    let total = 0;
    for (const q of questions) {
        const ua = answers.find(a => a.question_id === q.id);
        if (!ua) continue;
        let correct = false;
        if (q.type === 'choice' || q.type === 'true_false') {
            correct = ua.answer.trim() === q.answer.trim();
        } else if (q.type === 'multiple') {
            // 多选题答案用逗号分隔，顺序无关
            const std = q.answer.split(',').map(s=>s.trim()).sort().join(',');
            const user = ua.answer.split(',').map(s=>s.trim()).sort().join(',');
            correct = std === user;
        } else {
            // 简答题不自动判分
            correct = false;
        }
        if (correct) total += q.score;
    }
    await pool.query(
        'UPDATE exam_records SET submit_time=NOW(), status=?, score=? WHERE id=?',
        ['submitted', total, user_exam_id]
    );
    res.json({ success: true, score: total });
});

module.exports = router;
