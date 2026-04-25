const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware');
const pool = require('../db');

router.post('/', authenticateJWT, async (req, res) => {
  const { user_exam_id } = req.body;
  try {
    const [answers] = await pool.query(
      `SELECT q.content, q.answer AS correct, ua.answer AS user_ans, q.node_id, k.name
       FROM user_answers ua
       JOIN questions q ON ua.question_id = q.id
       LEFT JOIN knowledge_nodes k ON q.node_id = k.id
       WHERE ua.user_exam_id = ?`,
      [user_exam_id]
    );
    const wrong = answers.filter(a => {
      if (a.user_ans === null || a.user_ans === '') return true;
      return a.correct !== a.user_ans;
    });
    const explain = wrong.map((w, idx) =>
      `第${idx+1}题：${w.content} 正确答案：${w.correct}，所涉知识点：${w.name || '未知'}。`
    ).join('\n');
    res.json({ explain: explain || '没有错题' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;