const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateJWT } = require('../middleware');

// 实时保存答题
router.post('/', authenticateJWT, async (req, res) => {
    const { user_exam_id, question_id, answer } = req.body;
    const [rows] = await pool.query(
        'SELECT id FROM user_answers WHERE user_exam_id=? AND question_id=?',
        [user_exam_id, question_id]
    );
    if (rows.length > 0) {
        await pool.query('UPDATE user_answers SET answer=? WHERE id=?', [answer, rows[0].id]);
    } else {
        await pool.query(
            'INSERT INTO user_answers (user_exam_id, question_id, answer) VALUES (?, ?, ?)',
            [user_exam_id, question_id, answer]
        );
    }
    res.json({ success: true });
});

module.exports = router;
