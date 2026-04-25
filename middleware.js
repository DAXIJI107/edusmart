// middleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || '123456';

function authenticateJWT(req, res, next) {
    const token = req.cookies.token; // 从cookie获取
    if (!token) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: '无效的token' });
    }
}

module.exports = { authenticateJWT };