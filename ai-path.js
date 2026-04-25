// js/ai-path.js
let currentData = null;
let currentMode = 'card';

$(document).ready(function() {
    loadLearningPath();

    $('#refresh-path').click(function() {
        loadLearningPath(true);
    });

    $('#view-mode').click(function() {
        if (currentMode === 'card') {
            $('#path-container').addClass('hidden');
            $('#graph-container').removeClass('hidden');
            renderGraph(currentData);
            currentMode = 'graph';
            $(this).html('<i class="fas fa-list me-1"></i> 切换视图');
        } else {
            $('#graph-container').addClass('hidden');
            $('#path-container').removeClass('hidden');
            renderCards(currentData);
            currentMode = 'card';
            $(this).html('<i class="fas fa-project-diagram me-1"></i> 切换视图');
        }
    });
});

async function loadLearningPath(forceRefresh = false) {
    showLoading();

    try {
        const url = forceRefresh ? '/api/ai/learning-path?refresh=true' : '/api/ai/learning-path';
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (result.success) {
            currentData = result.data;
            renderCards(currentData);
            updateStats(currentData.stats);
        } else {
            showError('加载失败，请重试');
        }
    } catch (error) {
        console.error('加载路径出错:', error);
        showError('网络错误');
    }
}

function renderCards(data) {
    const container = $('#path-container');
    container.empty();

    if (!data.steps || data.steps.length === 0) {
        container.html(`
            <div class="text-center py-8">
                <i class="fas fa-check-circle text-5xl text-success mb-3"></i>
                <h4 class="text-xl font-semibold mb-2">恭喜！所有知识点已掌握</h4>
                <p class="text-gray-500">暂无待学习内容</p>
            </div>
        `);
        return;
    }

    data.steps.forEach((step, index) => {
        const masteryClass = step.mastery >= 80 ? 'bg-success' : step.mastery >= 50 ? 'bg-warning' : 'bg-danger';
        const card = `
            <div class="path-step-card bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow" data-id="${step.id}">
                <div class="flex items-start">
                    <div class="step-index flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mr-4">${index+1}</div>
                    <div class="flex-grow">
                        <div class="flex justify-between items-start">
                            <div>
                                <h4 class="font-semibold text-lg">${step.name}</h4>
                            </div>
                            <span class="badge ${step.difficulty === 'hard' ? 'bg-danger' : step.difficulty === 'medium' ? 'bg-warning' : 'bg-success'} text-white px-2 py-1 rounded text-xs">${step.difficulty}</span>
                        </div>
                        <div class="flex flex-wrap gap-4 mt-2 text-sm">
                            <span class="text-gray-500"><i class="far fa-clock mr-1"></i>预计 ${step.estimate}分钟</span>
                            <span class="text-gray-500"><i class="fas fa-layer-group mr-1"></i>前置: ${step.prereqCount}</span>
                        </div>
                        <div class="mt-3">
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar ${masteryClass}" style="width: ${step.mastery}%"></div>
                            </div>
                            <div class="flex justify-between mt-1">
                                <span class="text-xs text-gray-500">掌握度</span>
                                <span class="text-xs font-medium">${step.mastery}%</span>
                            </div>
                        </div>
                        <div class="mt-3 flex justify-end space-x-2">
                            <button class="btn btn-sm btn-outline-primary start-learning" data-id="${step.id}"><i class="fas fa-play mr-1"></i>开始学习</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.append(card);
    });

    // 绑定开始学习按钮事件
    $('.start-learning').click(function() {
        const id = $(this).data('id');
        window.location.href = `/course-detail.html?knowledgeId=${id}`;
    });
}

function renderGraph(data) {
    if (!data || !data.steps || data.steps.length === 0) {
        $('#graph-container').html('<p class="text-center text-gray-500 mt-5">暂无学习路径数据</p>');
        return;
    }

    // 由于缺少真实边数据，这里用简单顺序展示（实际应使用 prerequisites）
    // 如果需要真实依赖关系，需从后端额外获取或从 knowledge_nodes 构建
    const width = $('#graph-container').width();
    const height = 400;

    const nodes = data.steps.map((s, i) => ({ 
        id: s.id, 
        name: s.name, 
        mastery: s.mastery,
        index: i 
    }));

    // 构建边：根据路径顺序连接（简化）
    const links = [];
    for (let i = 0; i < nodes.length - 1; i++) {
        links.push({ source: nodes[i].id, target: nodes[i+1].id });
    }

    // 清空并创建 svg
    d3.select('#graph-container').html(''); // 清空
    const svg = d3.select('#graph-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // 力导向图布局
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));

    // 绘制连线
    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('class', 'link')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6);

    // 绘制节点
    const node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter().append('circle')
        .attr('r', 10)
        .attr('class', d => {
            if (d.mastery >= 80) return 'mastery-2';
            if (d.mastery >= 50) return 'mastery-1';
            return 'mastery-0';
        })
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // 添加文字标签
    const text = svg.append('g')
        .selectAll('text')
        .data(nodes)
        .enter().append('text')
        .attr('dx', 12)
        .attr('dy', 4)
        .text(d => d.name)
        .attr('font-size', '10px');

    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);

        text
            .attr('x', d => d.x)
            .attr('y', d => d.y);
    });

    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }
}

function updateStats(stats) {
    $('#total-knowledge').text(stats.total || 0);
    $('#mastered-count').text(stats.mastered || 0);
    $('#to-learn-count').text(stats.toLearn || 0);
    $('#estimate-time').text(stats.estimateTime ? stats.estimateTime + 'h' : '--');
}

function showLoading() {
    $('#path-container').html(`
        <div class="text-center py-8 text-gray-400">
            <i class="fas fa-spinner fa-spin fa-2x mb-2"></i>
            <p>正在智能规划你的学习路径...</p>
        </div>
    `);
}

function showError(msg) {
    $('#path-container').html(`
        <div class="text-center py-8">
            <i class="fas fa-exclamation-circle text-4xl text-danger mb-3"></i>
            <p class="text-danger">${msg}</p>
        </div>
    `);
}