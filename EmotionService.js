// core/EmotionService.js
class EmotionService {
    // 基于文本关键词的简单情感识别（可扩展为调用NLP模型）
    recognizeFromText(text) {
        const textLower = text.toLowerCase();
        if (textLower.includes('好难') || textLower.includes('不会') || textLower.includes('不懂')) {
            return { emotion: 'frustrated', confidence: 0.8 };
        }
        if (textLower.includes('开心') || textLower.includes('简单') || textLower.includes('懂了')) {
            return { emotion: 'happy', confidence: 0.7 };
        }
        if (textLower.includes('?') && textLower.length < 20) {
            return { emotion: 'confused', confidence: 0.6 };
        }
        return { emotion: 'neutral', confidence: 0.5 };
    }

    // 基于行为特征的识别
    recognizeFromBehavior(responseTime, errorCount, sessionDuration) {
        if (responseTime > 30000) { // 30秒无响应
            return { emotion: 'distracted', confidence: 0.7 };
        }
        if (errorCount > 3) {
            return { emotion: 'frustrated', confidence: 0.6 };
        }
        if (sessionDuration > 60 && errorCount === 0) {
            return { emotion: 'focused', confidence: 0.8 };
        }
        return null;
    }

    // 融合多模态结果
    fuse(textResult, behaviorResult) {
        if (!textResult && !behaviorResult) return { emotion: 'neutral', confidence: 0.5 };
        if (!textResult) return behaviorResult;
        if (!behaviorResult) return textResult;

        // 简单加权融合（可改进）
        const emotions = [textResult, behaviorResult];
        const weightMap = { frustrated: 1.2, distracted: 1.1, neutral: 0.8 };
        let best = emotions[0];
        for (const e of emotions) {
            if ((weightMap[e.emotion] || 1) * e.confidence > (weightMap[best.emotion] || 1) * best.confidence) {
                best = e;
            }
        }
        return best;
    }

    // 记录情感日志
    async logEmotion(userId, sessionId, emotion, confidence, text, responseTime, errorCount, pool) {
        await pool.query(
            'INSERT INTO emotion_logs (user_id, session_id, emotion, confidence, text, response_time, error_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, sessionId, emotion, confidence, text, responseTime, errorCount]
        );
    }
}

module.exports = EmotionService;