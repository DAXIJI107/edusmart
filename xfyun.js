// api/xfyun.js
const express = require('express');
const router = express.Router();
const { generateAuthUrl } = require('../utils/xfyunAuth');
const axios = require('axios');

// 从环境变量读取凭证（确保 .env 已配置）
const APP_ID = process.env.XFYUN_APP_ID;
const API_KEY = process.env.XFYUN_API_KEY;
const API_SECRET = process.env.XFYUN_API_SECRET;

if (!APP_ID || !API_KEY || !API_SECRET) {
    console.error('❌ 请在 .env 中配置 XFYUN_APP_ID, XFYUN_API_KEY, XFYUN_API_SECRET');
}

// ========== 1. 英语口语评测 (ISE) ==========
router.get('/ise-url', (req, res) => {
    try {
        const host = 'ise-api.xfyun.cn';
        const path = '/v2/open-ise';      // 流式版口语评测接口路径
        const url = generateAuthUrl(host, path, API_KEY, API_SECRET);
        res.json({ url, appId: APP_ID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== 2. 实时语音转写（标准版，iat 接口）==========
router.get('/asr-url', (req, res) => {
    try {
        const host = 'iat-api.xfyun.cn';
        const path = '/v2/iat';
        const url = generateAuthUrl(host, path, API_KEY, API_SECRET);
        res.json({ url, appId: APP_ID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== 3. 实时语音转写大模型（你截图中的私有化地址）==========
router.get('/rta-bigmodel-url', (req, res) => {
    try {
        // 注意：该地址为私有化部署，需确保网络可达，且鉴权方式与标准一致
        const host = 'office-api-ast-dx.iflyai.com';
        const path = '/ast/communicate/v1';
        const url = generateAuthUrl(host, path, API_KEY, API_SECRET);
        res.json({ url, appId: APP_ID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== 4. 翻译接口（使用讯飞翻译 API）==========
router.post('/translate', async (req, res) => {
    const { text, from, to } = req.body;
    if (!text) {
        return res.status(400).json({ error: '缺少 text 参数' });
    }
    try {
        // 讯飞翻译 API (HTTP)
        const response = await axios.post('https://itrans.xf-yun.com/v1/its', {
            from: from || 'cn',
            to: to || 'en',
            text: text,
            app_id: APP_ID,
            api_key: API_KEY
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        const translation = response.data?.data?.result?.trans_result || '';
        res.json({ translation });
    } catch (error) {
        console.error('翻译失败:', error.message);
        res.status(500).json({ error: '翻译服务异常' });
    }
});

// ========== 5. 语音合成 (TTS) ==========
router.get('/tts-url', (req, res) => {
    try {
        const host = 'tts-api.xfyun.cn';
        const path = '/v2/tts';
        const url = generateAuthUrl(host, path, API_KEY, API_SECRET);
        res.json({ url, appId: APP_ID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;