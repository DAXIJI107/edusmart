// core/MasteryCalculator.js
class MasteryCalculator {
    // 计算单个知识点的掌握度
    async calculateNodeMastery(userId, nodeId, pool) {
        // 获取该知识点下所有答题记录（最近30天）
        const [rows] = await pool.query(
            `SELECT 
                q.difficulty,
                ua.is_correct,
                ua.created_at
             FROM user_answers ua
             JOIN questions q ON ua.question_id = q.id
             WHERE ua.user_id = ? AND q.node_id = ?
               AND ua.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             ORDER BY ua.created_at DESC`,
            [userId, nodeId]
        );

        if (rows.length === 0) return 0; // 无记录，掌握度为0

        // 简单加权平均：最近答题权重更高，难度系数调整
        let totalWeight = 0;
        let weightedSum = 0;
        const now = new Date();

        for (const row of rows) {
            // 时间衰减权重：越近权重越大（指数衰减）
            const daysDiff = (now - new Date(row.created_at)) / (1000 * 60 * 60 * 24);
            const timeWeight = Math.exp(-daysDiff / 7); // 半衰期7天

            // 难度权重：难题权重高
            let difficultyWeight = 1.0;
            if (row.difficulty === 'medium') difficultyWeight = 1.2;
            if (row.difficulty === 'hard') difficultyWeight = 1.5;

            const weight = timeWeight * difficultyWeight;
            totalWeight += weight;
            weightedSum += (row.is_correct ? 1 : 0) * weight;
        }

        const rawMastery = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
        return Math.round(rawMastery);
    }

    // 批量更新用户所有知识点的掌握度
    async updateAllMastery(userId, pool) {
        // 获取所有知识点
        const [nodes] = await pool.query('SELECT id FROM knowledge_nodes');
        for (const node of nodes) {
            const mastery = await this.calculateNodeMastery(userId, node.id, pool);
            await pool.query(
                `INSERT INTO student_knowledge (user_id, node_id, mastery) 
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE mastery = VALUES(mastery)`,
                [userId, node.id, mastery]
            );
        }
    }
}

module.exports = MasteryCalculator;