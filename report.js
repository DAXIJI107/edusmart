// api/report.js
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware');
const pool = require('../db');

// 获取学习行为统计数据（快捷接口，供首页等使用）
router.get('/behavior', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        // ... 原有代码保持不变 ...（略）
    } catch (error) {
        console.error('获取行为报告失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 生成完整报告
router.post('/', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { period, subject, startDate, endDate } = req.body;

  // 计算日期范围
  let dateStart, dateEnd;
  const today = new Date();
  today.setHours(0,0,0,0);

  if (period === 'custom' && startDate && endDate) {
    dateStart = new Date(startDate);
    dateEnd = new Date(endDate);
  } else {
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));  // 本周一

    switch (period) {
      case 'week':
        dateStart = new Date(monday);
        dateEnd = new Date(monday);
        dateEnd.setDate(dateEnd.getDate() + 6);
        break;
      case 'month':
        dateStart = new Date(today.getFullYear(), today.getMonth(), 1);
        dateEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
        dateStart = new Date(today.getFullYear(), quarterStartMonth, 1);
        dateEnd = new Date(today.getFullYear(), quarterStartMonth + 3, 0);
        break;
      default:
        dateStart = new Date(monday);
        dateEnd = new Date(monday);
        dateEnd.setDate(dateEnd.getDate() + 6);
    }
  }
  // 设置为当天的起止时间
  dateStart.setHours(0,0,0,0);
  dateEnd.setHours(23,59,59,999);

  try {
    // 1. 概览数据：学习时长、正确率、情绪波动
    const [[overview]] = await pool.query(`
      SELECT 
        COALESCE(SUM(study_duration), 0) AS total_time,
        AVG(avg_accuracy) AS avg_accuracy,
        AVG(emotion_volatility) AS avg_volatility
      FROM student_daily_features
      WHERE user_id = ? AND date BETWEEN ? AND ?`,
      [userId, dateStart, dateEnd]
    );

    // 2. 学习时长趋势（聚合7天/月/季）
    const [durationTrend] = await pool.query(`
      SELECT DATE(date) as date, study_duration
      FROM student_daily_features
      WHERE user_id = ? AND date BETWEEN ? AND ?
      ORDER BY date`,
      [userId, dateStart, dateEnd]
    );

    // 3. 情感分布
    const [emotionRows] = await pool.query(`
      SELECT DATE(created_at) as date, emotion, COUNT(*) as count
      FROM emotion_logs
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at), emotion`,
      [userId, dateStart, dateEnd]
    );

    // 4. 元认知得分
    const [metaRows] = await pool.query(`
      SELECT created_at, score
      FROM metacognitive_scores
      WHERE user_id = ? AND created_at BETWEEN ? AND ?
      ORDER BY created_at DESC`,
      [userId, dateStart, dateEnd]
    );

    // 5. 知识点掌握度（受 subject 过滤）
    let knowledgeQuery = `
      SELECT k.id, k.name, k.difficulty, COALESCE(sk.mastery, 0) as mastery
      FROM knowledge_nodes k
      LEFT JOIN student_knowledge sk ON k.id = sk.node_id AND sk.user_id = ?
      WHERE 1=1`;
    const queryParams = [userId];
    if (subject && subject !== 'all') {
      // 根据 subject 过滤知识点（可通过 node 的 type 或关联的课程/考试）
      // 简化处理：不同学科知识点通过 name 前缀或 difficulty 映射（这里假设有 subject 字段）
      // 由于 knowledge_nodes 无 subject 字段，我们按 course 关联查询，或仅返回全部。
      // 此处根据实际业务调整，暂不过滤
    }
    const [knowledgeNodes] = await pool.query(knowledgeQuery, queryParams);

    // 6. 错题分析（基于最近考试）
const [errorData] = await pool.query(`
  SELECT q.node_id, k.name as topic, COUNT(*) as error_count,
         ROUND(COUNT(*) / MAX(total.total) * 100, 1) as error_rate
  FROM user_answers ua
  JOIN exam_records er ON ua.user_exam_id = er.id
  JOIN questions q ON ua.question_id = q.id
  LEFT JOIN knowledge_nodes k ON q.node_id = k.id
  JOIN (
    SELECT uae.user_exam_id, COUNT(*) as total
    FROM user_answers uae
    GROUP BY uae.user_exam_id
  ) total ON er.id = total.user_exam_id
  WHERE er.user_id = ? 
    AND er.submit_time BETWEEN ? AND ?
    AND (ua.answer IS NULL OR ua.answer != q.answer)
  GROUP BY q.node_id, k.name
  ORDER BY error_count DESC
  LIMIT 5`,
  [userId, dateStart, dateEnd]
);
    // 7. 学习效率指标（从 student_daily_features 推导）
    // 无实际数据时可默认
    const efficiency = {
      concentration: 65,
      comprehension: 70,
      memory: 60,
      speed: 75,
      endurance: 50
    };

    // 构建响应
    const summary = {
      totalStudyTime: (overview.total_time / 3600).toFixed(1),
      knowledgeMastery: overview.avg_accuracy ? Math.round(overview.avg_accuracy * 100) : 0,
      studyEfficiency: 75, // 可另外计算
      timeTrend: 12, masteryTrend: 8, efficiencyTrend: -3 // 示例
    };

    const knowledge = {
      subjects: knowledgeNodes.reduce((acc, n) => {
        // 简化：按难度归类科目，实际可通过映射表
        const subjectName = getSubjectByNode(n);
        if (!acc[subjectName]) acc[subjectName] = { name: subjectName, total:0, masterySum:0 };
        acc[subjectName].total++;
        acc[subjectName].masterySum += n.mastery;
        return acc;
      }, {}),
      distribution: { mastered: 42, learning: 36, weak: 15, untouched: 7 } // 可计算
    };

    res.json({
      success: true,
      data: {
        dateRange: { start: dateStart, end: dateEnd },
        summary,
        charts: {
          trend: {
            labels: durationTrend.map(d => new Date(d.date).toLocaleDateString('zh-CN')),
            time: durationTrend.map(d => (d.study_duration / 3600).toFixed(1)),
            mastery: [],  // 可填充
            efficiency: []
          }
        },
        knowledge,
        errors: errorData.map(e => ({
          topic: e.topic || '未分类',
          rate: e.error_rate,
          count: e.error_count,
          type: '概念理解',
          suggestion: '建议针对性练习'
        })),
        efficiency: {
          bestStudyTime: '09:00-11:00',
          avgFocusTime: '45分钟',
          distractions: '3次/小时',
          reviewInterval: '3.2天',
          ...efficiency
        }
      }
    });
  } catch (error) {
    console.error('生成报告失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 根据知识点获取所属学科（简单规则，实际应按课程映射）
function getSubjectByNode(node) {
  const name = node.name;
  if (name.includes('函数') || name.includes('导数') || name.includes('积分') || name.includes('三角')) return '数学';
  if (name.includes('力') || name.includes('电') || name.includes('磁') || name.includes('光')) return '物理';
  if (name.includes('化学') || name.includes('反应') || name.includes('元素')) return '化学';
  if (name.includes('英语') || name.includes('语法') || name.includes('词汇')) return '英语';
  return '数学'; // 默认
}

module.exports = router;