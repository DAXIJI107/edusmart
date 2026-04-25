// core/LearningAgent.js
class LearningAgent {
    constructor(userId, pool) {
        this.userId = userId;
        this.pool = pool;
    }

    // 获取用户权限设置
    async getPermissions() {
        const [rows] = await this.pool.query(
            'SELECT * FROM agent_permissions WHERE user_id = ?',
            [this.userId]
        );
        if (rows.length === 0) {
            // 默认权限
            return {
                allow_auto_tutor: true,
                allow_auto_group: true,
                allow_auto_review: true,
                allow_auto_purchase: false,
                budget_limit: 0,
                require_review_for_purchase: true
            };
        }
        return rows[0];
    }

    // 检查是否有权限执行某动作
    async checkPermission(actionType) {
        const perms = await this.getPermissions();
        switch(actionType) {
            case 'BOOK_TUTOR': return perms.allow_auto_tutor;
            case 'FORM_STUDY_GROUP': return perms.allow_auto_group;
            case 'SCHEDULE_REVIEW': return perms.allow_auto_review;
            case 'PURCHASE_COURSE': return perms.allow_auto_purchase;
            default: return false;
        }
    }

    // 分析是否需要预约辅导
    async analyzeTutorNeeds() {
        // 获取最近三天错误率较高的知识点
        const [rows] = await this.pool.query(
            `SELECT q.node_id, COUNT(*) as error_count
             FROM user_answers ua
             JOIN questions q ON ua.question_id = q.id
             WHERE ua.user_id = ? AND ua.is_correct = 0
               AND ua.created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)
             GROUP BY q.node_id
             HAVING error_count >= 3`,
            [this.userId]
        );
        if (rows.length > 0) {
            // 获取知识点名称
            const nodeId = rows[0].node_id;
            const [node] = await this.pool.query('SELECT name FROM knowledge_nodes WHERE id = ?', [nodeId]);
            return {
                needTutor: true,
                topic: node[0]?.name || '未知知识点',
                reason: `连续三天在「${node[0]?.name}」上出错`
            };
        }
        return { needTutor: false };
    }

    // 执行预约辅导
    async bookTutoringSession(topic, scheduledTime = null) {
        // 模拟预约（实际应调用预约系统API）
        if (!scheduledTime) {
            // 默认预约今晚7点
            scheduledTime = new Date();
            scheduledTime.setHours(19, 0, 0, 0);
        }
        // 存入数据库
        const [result] = await this.pool.query(
            'INSERT INTO tutor_sessions (user_id, topic, scheduled_time, created_by) VALUES (?, ?, ?, ?)',
            [this.userId, topic, scheduledTime, 'agent']
        );
        return {
            success: true,
            sessionId: result.insertId,
            message: `已为您预约「${topic}」辅导，时间：${scheduledTime.toLocaleString()}`
        };
    }

    // 生成复习计划（根据遗忘曲线）
    async scheduleReview(knowledgePoints) {
        // 模拟安排复习
        const reviews = knowledgePoints.map(point => ({
            point,
            reviewDate: new Date(Date.now() + 24*60*60*1000) // 明天
        }));
        return {
            success: true,
            reviews,
            message: `已为您安排${knowledgePoints.length}个知识点的复习计划`
        };
    }

    // 执行每日计划
    async runDailyPlan() {
        const actions = [];
        // 1. 检查是否需要预约辅导
        const tutorNeed = await this.analyzeTutorNeeds();
        if (tutorNeed.needTutor && await this.checkPermission('BOOK_TUTOR')) {
            const result = await this.bookTutoringSession(tutorNeed.topic);
            actions.push({
                action: 'BOOK_TUTOR',
                result,
                status: 'success'
            });
            await this.logExecution('BOOK_TUTOR', { topic: tutorNeed.topic }, result, 'success');
        }

        // 2. 检查是否需要安排复习（这里可扩展更多规则）
        // ... 其他规则

        return actions;
    }

    // 记录执行日志
    async logExecution(actionType, params, result, status = 'success') {
        await this.pool.query(
            'INSERT INTO agent_execution_logs (user_id, action_type, params, result, status) VALUES (?, ?, ?, ?, ?)',
            [this.userId, actionType, JSON.stringify(params), JSON.stringify(result), status]
        );
    }
}

module.exports = LearningAgent;