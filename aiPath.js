// core/AIPathGenerator.js (新文件，替代硬编码)
class AIPathGenerator {
  async generate(userId, pool) {
    // 获取所有知识点及前置关系
    const [nodes] = await pool.query('SELECT id, name, difficulty FROM knowledge_nodes');
    const [prereqs] = await pool.query('SELECT node_id, prereq_id FROM prerequisites');
    
    // 获取用户掌握度
    const [masteryRows] = await pool.query(
      'SELECT node_id, mastery FROM student_knowledge WHERE user_id = ?', [userId]
    );
    const masteryMap = {};
    masteryRows.forEach(m => masteryMap[m.node_id] = m.mastery);
    
    // 拓扑排序优先选择薄弱前置已满足的知识点
    const nodeMap = {};
    nodes.forEach(n => {
      nodeMap[n.id] = {
        ...n,
        mastery: masteryMap[n.id] || 0,
        prereqs: []
      };
    });
    prereqs.forEach(p => {
      if (nodeMap[p.node_id]) nodeMap[p.node_id].prereqs.push(p.prereq_id);
    });
    
    // 入度计算
    const inDegree = {};
    Object.values(nodeMap).forEach(node => {
      inDegree[node.id] = node.prereqs.length;
    });
    
    const queue = [];
    Object.keys(nodeMap).forEach(id => {
      if (inDegree[id] === 0) queue.push(id);
    });
    
    const visited = new Set();
    const path = [];
    
    while (queue.length > 0) {
      queue.sort((a, b) => nodeMap[a].mastery - nodeMap[b].mastery);
      const cur = queue.shift();
      if (visited.has(cur)) continue;
      const node = nodeMap[cur];
      const prereqsOk = node.prereqs.every(pre => visited.has(pre) || (nodeMap[pre] && nodeMap[pre].mastery >= 60));
      if (!prereqsOk) {
        queue.push(cur);
        continue;
      }
      visited.add(cur);
      path.push(node);
      // 查找当前节点的后继（即谁依赖当前节点）
      const children = Object.keys(nodeMap).filter(id => nodeMap[id].prereqs.includes(cur));
      children.forEach(child => {
        inDegree[child]--;
        if (inDegree[child] === 0 && !visited.has(child)) {
          queue.push(child);
        }
      });
    }
    
    return path.map((node, index) => ({
      id: node.id,
      name: node.name,
      difficulty: node.difficulty,
      mastery: node.mastery,
      estimate: node.difficulty === 'hard' ? 90 : node.difficulty === 'medium' ? 60 : 30,
      prereqCount: node.prereqs.length
    }));
  }
}
module.exports = AIPathGenerator;