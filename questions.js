const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
    try {
        const { subject, difficulty, count } = req.query;
        let sql = 'SELECT id, content, type, options, answer, difficulty, score, node_id, subject FROM questions WHERE 1=1';
        const params = [];

        // 学科筛选（直接使用 subject 列）
        if (subject && subject !== 'all') {
            sql += ' AND subject = ?';
            params.push(subject);
        }

        // 难度筛选
        if (difficulty && difficulty !== 'all') {
            sql += ' AND difficulty = ?';
            params.push(difficulty);
        }

        sql += ' ORDER BY RAND() LIMIT ?';
        params.push(parseInt(count) || 10);

        let [rows] = await db.query(sql, params);

        // 兜底：若按条件无结果，忽略所有筛选随机返回题目
        if (rows.length === 0) {
            const fallbackSql = 'SELECT id, content, type, options, answer, difficulty, score, node_id, subject FROM questions ORDER BY RAND() LIMIT ?';
            [rows] = await db.query(fallbackSql, [parseInt(count) || 10]);
        }

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
            return {
                id: q.id,
                content: q.content,
                type: q.type,
                options: Array.isArray(opts) ? opts : [],
                answer: ans,
                difficulty: q.difficulty || 'medium',
                score: q.score,
                node_id: q.node_id,
                subject: q.subject || 'math'
            };
        });

        res.json({ success: true, questions });
    } catch (err) {
        console.error('题目查询失败:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router;