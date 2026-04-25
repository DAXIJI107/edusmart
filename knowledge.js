const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ success: false, message: '无效的ID' });
    }
    try {
        const [rows] = await pool.query(
            `SELECT id, name, description, difficulty, bvid
             FROM knowledge_nodes
             WHERE id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: '知识点不存在' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('查询知识点失败:', err);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

module.exports = router;