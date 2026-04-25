// core/ResiliencePredictor.js
class ResiliencePredictor {
    // 从数据库获取用户近期特征
    async getUserFeatures(userId, pool, days = 30) {
        const [rows] = await pool.query(
            `SELECT 
                AVG(avg_accuracy) as avg_accuracy,
                SUM(help_count) as total_help,
                SUM(study_duration) as total_duration,
                AVG(emotion_volatility) as avg_volatility,
                COUNT(*) as active_days
            FROM student_daily_features
            WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
            [userId, days]
        );
        return rows[0] || {};
    }

    // 计算风险分数（0-1）
    async predictRisk(userId, pool) {
        const features = await this.getUserFeatures(userId, pool);
        
        // 简单规则模型（可替换为机器学习）
        let risk = 0.3; // 基础风险
        
        // 正确率过低
        if (features.avg_accuracy && features.avg_accuracy < 0.5) risk += 0.2;
        // 求助过多
        if (features.total_help && features.total_help > 20) risk += 0.1;
        // 学习时长过短
        if (features.total_duration && features.total_duration < 60) risk += 0.15;
        // 情绪波动大
        if (features.avg_volatility && features.avg_volatility > 0.6) risk += 0.15;
        // 活跃天数少
        if (features.active_days && features.active_days < 10) risk += 0.1;

        return Math.min(risk, 1.0);
    }

    // 生成干预内容
    generateIntervention(risk, userProfile = {}) {
        if (risk > 0.7) {
            return {
                type: 'HIGH_RISK',
                message: '检测到学习困难，建议联系学习顾问或休息一下。需要我帮你预约辅导吗？',
                action: 'contact_advisor'
            };
        } else if (risk > 0.4) {
            return {
                type: 'MEDIUM_RISK',
                message: '看起来这部分有点难，我们可以先做几道基础题巩固一下，或者换一种学习方式？',
                action: 'adjust_difficulty'
            };
        } else {
            return {
                type: 'LOW_RISK',
                message: '你已经坚持学习了很久，真棒！继续保持！',
                action: 'motivation'
            };
        }
    }
}

module.exports = ResiliencePredictor;