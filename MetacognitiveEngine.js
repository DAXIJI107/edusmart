// core/MetacognitiveEngine.js
const pool = require('../db'); // 假设你有一个数据库连接池文件

class MetacognitiveEngine {
    constructor() {
        this.questionBank = this.loadSocraticQuestions();
    }

    // 加载苏格拉底问题模板（可根据知识点类型扩展）
    loadSocraticQuestions() {
        return {
            review: (knowledgeName) => `在解决这个问题前，我们先回顾一下：${knowledgeName}的概念是什么？`,
            step1: (topic) => `你觉得这个问题与我们已经学过的哪些概念相关？`,
            step2: () => `如果把这个复杂问题分解成几个小步骤，第一步应该做什么？`,
            step3: () => `为什么选择这个方法？还有别的思路吗？`,
            step4: () => `你的推理过程中，哪个假设最重要？如果这个假设不成立会怎样？`
        };
    }

    // 分析困惑点：根据问题文本匹配最可能的知识点
    async analyzeConfusion(question, userId) {
        // 简化版：从问题中提取关键词，去知识库中模糊匹配
        // 实际应用中可用NLP库如node-nlp，这里用简单的包含关系
        const keywords = question.split(/\s+/).filter(w => w.length > 1);
        
        // 从数据库查询所有知识点
        const [nodes] = await pool.query('SELECT id, name, description FROM knowledge_nodes');
        
        // 计算每个知识点与问题的匹配得分（关键词出现在名称或描述中）
        let bestNode = null;
        let maxScore = 0;
        for (const node of nodes) {
            let score = 0;
            const text = (node.name + ' ' + node.description).toLowerCase();
            for (const kw of keywords) {
                if (text.includes(kw.toLowerCase())) score += 1;
            }
            if (score > maxScore) {
                maxScore = score;
                bestNode = node;
            }
        }
        return bestNode ? bestNode.id : null;
    }

    // 获取学生未掌握的前置知识点
    async getMissingPrereqs(nodeId, userId, threshold = 60) {
        // 递归查询所有前置知识点
        const prereqIds = await this.getAllPrereqs(nodeId);
        if (prereqIds.length === 0) return [];

        // 查询学生对这些知识点的掌握度
        const placeholders = prereqIds.map(() => '?').join(',');
        const [rows] = await pool.query(
            `SELECT node_id, mastery FROM student_knowledge 
             WHERE user_id = ? AND node_id IN (${placeholders})`,
            [userId, ...prereqIds]
        );
        const masteryMap = {};
        rows.forEach(row => masteryMap[row.node_id] = row.mastery || 0);

        // 筛选出掌握度低于阈值的知识点
        const missing = [];
        for (const pid of prereqIds) {
            if ((masteryMap[pid] || 0) < threshold) {
                // 获取知识点名称
                const [nodeInfo] = await pool.query('SELECT name FROM knowledge_nodes WHERE id = ?', [pid]);
                if (nodeInfo[0]) {
                    missing.push({ id: pid, name: nodeInfo[0].name, mastery: masteryMap[pid] || 0 });
                }
            }
        }
        return missing;
    }

    // 递归获取所有前置知识点（直接+间接）
    async getAllPrereqs(nodeId, visited = new Set()) {
        if (visited.has(nodeId)) return [];
        visited.add(nodeId);
        
        const [rows] = await pool.query('SELECT prereq_id FROM prerequisites WHERE node_id = ?', [nodeId]);
        let prereqs = [];
        for (const row of rows) {
            prereqs.push(row.prereq_id);
            const deeper = await this.getAllPrereqs(row.prereq_id, visited);
            prereqs = prereqs.concat(deeper);
        }
        return prereqs;
    }

    // 生成引导性问题链
    async generateGuidance(question, userId) {
        // 1. 分析困惑点
        const nodeId = await this.analyzeConfusion(question, userId);
        if (!nodeId) {
            // 如果无法匹配知识点，返回通用引导
            return [this.questionBank.step1(''), this.questionBank.step2()];
        }

        // 2. 获取缺失前置知识
        const missing = await this.getMissingPrereqs(nodeId, userId);
        
        // 3. 生成引导链
        const guidance = [];
        if (missing.length > 0) {
            // 只针对第一个缺失知识生成复习问题
            guidance.push(this.questionBank.review(missing[0].name));
            // 可继续追问，但简化版只给一个复习问题
        } else {
            // 没有缺失前置，直接进入启发式提问
            guidance.push(this.questionBank.step1());
            guidance.push(this.questionBank.step2());
            guidance.push(this.questionBank.step3());
            guidance.push(this.questionBank.step4());
        }
        return guidance;
    }

    // 评估元认知参与度（简化版）
    assessMetacognitiveEngagement(interactionLogs) {
        // 统计自我解释次数、提问深度等
        let selfExplainCount = 0;
        let questionDepth = 0;
        let reflectionCount = 0;

        for (const log of interactionLogs) {
            if (log.type === 'self_explain') selfExplainCount++;
            if (log.type === 'question') {
                // 问题深度：根据长度简单判断
                const length = log.content ? log.content.length : 0;
                questionDepth += Math.min(length / 10, 5); // 最多5分
            }
            if (log.type === 'reflect') reflectionCount++;
        }

        // 归一化并加权计算
        const total = selfExplainCount * 3 + questionDepth * 2 + reflectionCount * 4;
        const maxPossible = 100; // 可根据实际情况调整
        return Math.min(Math.round(total), 100);
    }
}

module.exports = MetacognitiveEngine;