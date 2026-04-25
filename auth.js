const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateJWT } = require('../middleware');

const JWT_SECRET = process.env.JWT_SECRET || '123456';

// 注册
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: '请提供所有必填字段' });
        }
        const [userRows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (userRows.length > 0) {
            return res.status(400).json({ success: false, message: '用户名已存在' });
        }
        const [emailRows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (emailRows.length > 0) {
            return res.status(400).json({ success: false, message: '邮箱已存在' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        res.json({ success: true, message: '用户注册成功' });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 登录
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: '请提供用户名和密码' });
        }
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 3600000,
            sameSite: 'lax'
        });
        res.json({ 
            success: true, 
            message: '登录成功', 
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取当前用户
router.get('/user', authenticateJWT, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username, email FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: '用户未找到' });
        }
        res.json({ success: true, user: rows[0] });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 退出登录
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: '已退出登录' });
});

module.exports = router;
