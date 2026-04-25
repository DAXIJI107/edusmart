// routes/user.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // 你的数据库连接
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 认证中间件（根据你的 token 实现调整）
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: '未登录' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'token 无效' });
    }
};

// ========== 1. 获取当前用户信息 ==========
router.get('/auth/user', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, username, nickname, email, phone, gender, birthday, bio, interests, avatar, role, study_hours, completed_courses, knowledge_mastery, correct_answers, study_efficiency, continuous_days FROM users WHERE id = ?',
            [req.userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        const user = rows[0];
        // 解析 JSON 字段
        if (user.interests && typeof user.interests === 'string') {
            user.interests = JSON.parse(user.interests);
        }
        // 构造前端期望的格式
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                nickname: user.nickname || user.username,
                email: user.email,
                phone: user.phone || '',
                phoneDisplay: user.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '',
                gender: user.gender || 'male',
                birthday: user.birthday || '',
                bio: user.bio || '',
                interests: user.interests || [],
                avatar: user.avatar || '',
                studyStats: {
                    studyHours: user.study_hours || 0,
                    completedCourses: user.completed_courses || 0,
                    knowledgeMastery: user.knowledge_mastery || 0,
                    correctAnswers: user.correct_answers || 0,
                    studyEfficiency: user.study_efficiency || 0,
                    continuousDays: user.continuous_days || 0
                }
            }
        });
    } catch (err) {
        console.error('获取用户信息失败:', err);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// ========== 2. 更新用户资料 ==========
router.put('/user/profile', authenticateToken, async (req, res) => {
    try {
        const { name, nickname, email, phone, gender, birthday, bio, interests } = req.body;
        const phoneDisplay = phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '';
        const interestsJson = interests ? JSON.stringify(interests) : null;
        
        await db.query(
            `UPDATE users SET 
                name = ?, nickname = ?, email = ?, phone = ?, phone_display = ?,
                gender = ?, birthday = ?, bio = ?, interests = ?,
                updated_at = NOW()
            WHERE id = ?`,
            [name, nickname, email, phone, phoneDisplay, gender, birthday, bio, interestsJson, req.userId]
        );
        res.json({ success: true, message: '更新成功' });
    } catch (err) {
        console.error('更新用户信息失败:', err);
        res.status(500).json({ success: false, message: '更新失败' });
    }
});

// ========== 3. 修改密码 ==========
router.put('/user/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.userId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: '用户不存在' });
        
        const isValid = await bcrypt.compare(currentPassword, rows[0].password);
        if (!isValid) return res.json({ success: false, message: '当前密码错误' });
        
        const hashed = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashed, req.userId]);
        res.json({ success: true, message: '密码修改成功' });
    } catch (err) {
        res.status(500).json({ success: false, message: '修改失败' });
    }
});

// ========== 4. 更新头像 ==========
router.post('/user/avatar', authenticateToken, async (req, res) => {
    try {
        const { avatar } = req.body;
        await db.query('UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?', [avatar, req.userId]);
        res.json({ success: true, message: '头像已更新' });
    } catch (err) {
        res.status(500).json({ success: false, message: '更新失败' });
    }
});

module.exports = router;