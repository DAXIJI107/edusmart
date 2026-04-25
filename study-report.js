

// 学习报告模块
const ReportModule = (() => {
    // 私有变量
    let currentPeriod = 'week';
    let currentSubject = 'all';
    let currentData = null;
    let toast = null;
    
    // 初始化函数
    const init = () => {
        initToast();
        initEventListeners();
        renderCharts();
        updateReportData();
        initTooltips();
    };
    
    // 初始化Toast通知
    const initToast = () => {
        toast = new bootstrap.Toast(document.getElementById('liveToast'));
    };
    
    // 初始化工具提示
    const initTooltips = () => {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    };
    
    // 显示Toast通知
    const showToast = (title, message, type = 'info') => {
        const toastTitle = document.getElementById('toast-title');
        const toastMessage = document.getElementById('toast-message');
        const toastElement = document.getElementById('liveToast');
        
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        // 根据类型设置背景色
        toastElement.classList.remove('bg-primary', 'bg-success', 'bg-danger', 'bg-warning');
        switch(type) {
            case 'success':
                toastElement.classList.add('bg-success');
                break;
            case 'error':
                toastElement.classList.add('bg-danger');
                break;
            case 'warning':
                toastElement.classList.add('bg-warning');
                break;
            default:
                toastElement.classList.add('bg-primary');
        }
        
        toast.show();
    };
    
    // 显示成功Toast
    const showSuccessToast = (message) => {
        showToast('成功', message, 'success');
    };
    
    // 显示错误Toast
    const showErrorToast = (message) => {
        showToast('错误', message, 'error');
    };
    
    // 事件监听
    const initEventListeners = () => {
        // 周期选择
        document.querySelectorAll('input[name="reportPeriod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentPeriod = e.target.id.replace('Report', '');
                toggleCustomDateRange();
                updateReportData();
            });
        });
        
        // 学科筛选
        document.getElementById('subjectFilter').addEventListener('change', (e) => {
            currentSubject = e.target.value;
            updateReportData();
        });
        
        // 生成报告按钮
        document.getElementById('generateReport').addEventListener('click', updateReportData);
        
        // 导出按钮
        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', exportReport);
        });
        
        // 图表标签切换
        document.querySelectorAll('.chart-tabs button').forEach(btn => {
            btn.addEventListener('click', function() {
                // 切换active类
                document.querySelector('.chart-tabs .active').classList.remove('active');
                this.classList.add('active');
                
                // 更新图表数据
                const chartType = this.dataset.type;
                updateTrendChart(chartType);
            });
        });
        
        // 查看错题本
        document.getElementById('view-error-book').addEventListener('click', () => {
            window.location.href = `/error-book?subject=${currentSubject}`;
        });
        
        // 生成专项练习
        document.getElementById('generate-practice').addEventListener('click', async () => {
            try {
                if (!currentData || !currentData.errors) {
                    showErrorToast('请先生成报告');
                    return;
                }
                
                showLoading(true);
                
                const response = await fetch('/api/generate-practice', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        subject: currentSubject,
                        weakAreas: currentData.errors.map(e => e.topic)
                    })
                });
                
                if (response.ok) {
                    showSuccessToast('专项练习已生成');
                    setTimeout(() => {
                        window.location.href = '/practice';
                    }, 1500);
                } else {
                    throw new Error('Network response was not ok');
                }
            } catch (error) {
                console.error('Error generating practice:', error);
                showErrorToast('生成练习失败');
            } finally {
                showLoading(false);
            }
        });
        
        // 窗口大小变化时调整图表
        window.addEventListener('resize', () => {
            if (window.studyTrendChart) window.studyTrendChart.resize();
            if (window.efficiencyChart) window.efficiencyChart.resize();
        });
    };
    
    // 显示/隐藏加载指示器
    const showLoading = (show) => {
        document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
        document.getElementById('reportContent').style.display = show ? 'none' : 'block';
    };
    
    // 切换自定义日期范围显示
    const toggleCustomDateRange = () => {
        const customRangeDiv = document.getElementById('customDateRange');
        customRangeDiv.style.display = currentPeriod === 'custom' ? 'block' : 'none';
    };
    
    // 获取日期范围标签
    const getDateRangeLabel = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const formatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        return `${start.toLocaleDateString('zh-CN', formatOptions)} - ${end.toLocaleDateString('zh-CN', formatOptions)}`;
    };
    
    // 更新报告数据
    const updateReportData = async () => {
        try {
            showLoading(true);
            
            // 获取数据
            const data = await fetchReportData();
            currentData = data;
            
            // 更新UI
            updateSummaryCards(data.summary);
            updateCharts(data.charts);
            updateKnowledgeData(data.knowledge);
            updateErrorAnalysis(data.errors);
            updateEfficiencyData(data.efficiency);
            updateDateRangeDisplay(data.dateRange);
            
            showSuccessToast('报告已更新');
        } catch (error) {
            console.error('Error updating report:', error);
            showErrorToast('获取报告数据失败');
        } finally {
            showLoading(false);
        }
    };
    
    // 从后端API获取数据
    const fetchReportData = async () => {
        const params = {
            period: currentPeriod,
            subject: currentSubject,
            startDate: currentPeriod === 'custom' ? document.getElementById('startDate').value : null,
            endDate: currentPeriod === 'custom' ? document.getElementById('endDate').value : null
        };
        
        const response = await fetch('/api/report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        return await response.json();
    };
    
    // 更新摘要卡片
    const updateSummaryCards = (data) => {
        document.getElementById('totalStudyTime').textContent = data.totalTime;
        document.getElementById('knowledgeMastery').textContent = data.mastery;
        document.getElementById('studyEfficiency').textContent = data.efficiency;
        
        // 更新趋势指示器
        updateTrendIndicator('time', data.timeTrend);
        updateTrendIndicator('mastery', data.masteryTrend);
        updateTrendIndicator('efficiency', data.efficiencyTrend);
    };
    
    // 更新趋势指示器
    const updateTrendIndicator = (type, trend) => {
        const element = document.querySelector(`.${type}-trend`);
        if (!element) return;
        
        element.innerHTML = trend.value > 0 
            ? `<i class="fas fa-arrow-up"></i> ${trend.value}%`
            : `<i class="fas fa-arrow-down"></i> ${Math.abs(trend.value)}%`;
        
        element.className = `${type}-trend ${trend.value > 0 ? 'text-success' : 'text-danger'}`;
    };
    
    // 初始化图表
    const renderCharts = () => {
        // 学习趋势图
        const trendCtx = document.getElementById('studyTrendChart').getContext('2d');
        window.studyTrendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: '学习时长(小时)',
                        data: [],
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: getChartOptions('学习趋势')
        });
        
        // 效率图表
        const efficiencyCtx = document.getElementById('efficiencyChart').getContext('2d');
        window.efficiencyChart = new Chart(efficiencyCtx, {
            type: 'radar',
            data: {
                labels: ['专注度', '理解度', '记忆度', '速度', '持久度'],
                datasets: [{
                    label: '学习效率',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(255, 206, 86, 0.2)',
                    borderColor: 'rgba(255, 206, 86, 1)',
                    pointBackgroundColor: 'rgba(255, 206, 86, 1)',
                    pointBorderColor: '#fff',
                    pointRadius: 4
                }]
            },
            options: getRadarChartOptions()
        });
    };
    
    // 获取图表选项
    const getChartOptions = (title) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: title,
                font: {
                    size: 16
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y + (title.includes('时长') ? 'h' : '%');
                        }
                        return label;
                    }
                }
            },
            legend: {
                position: 'bottom',
                labels: {
                    boxWidth: 12,
                    padding: 20
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return value + (title.includes('时长') ? 'h' : '%');
                    }
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    });
    
    // 获取雷达图选项
    const getRadarChartOptions = () => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return context.parsed.r + '%';
                    }
                }
            }
        },
        scales: {
            r: {
                angleLines: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                suggestedMin: 0,
                suggestedMax: 100,
                ticks: {
                    stepSize: 20,
                    backdropColor: 'transparent'
                },
                pointLabels: {
                    font: {
                        size: 12
                    }
                }
            }
        },
        elements: {
            line: {
                borderWidth: 3
            }
        }
    });
    
    // 更新图表数据
    const updateCharts = (data) => {
        updateTrendChart('time', data.trend);
        updateEfficiencyChart(data.efficiency);
    };
    
    // 更新趋势图
    const updateTrendChart = (type, trendData) => {
        if (!trendData) trendData = currentData.charts.trend;
        
        let label, data, color;
        
        switch(type) {
            case 'time':
                label = '学习时长(小时)';
                data = trendData.time;
                color = 'rgba(75, 192, 192, 1)';
                break;
            case 'mastery':
                label = '知识点掌握度(%)';
                data = trendData.mastery;
                color = 'rgba(54, 162, 235, 1)';
                break;
            case 'efficiency':
                label = '学习效率(%)';
                data = trendData.efficiency;
                color = 'rgba(255, 159, 64, 1)';
                break;
        }
        
        window.studyTrendChart.data.labels = trendData.labels;
        window.studyTrendChart.data.datasets[0] = {
            label,
            data,
            borderColor: color,
            backgroundColor: color.replace('1)', '0.2)'),
            tension: 0.3,
            fill: true
        };
        
        window.studyTrendChart.update();
    };
    
    // 更新效率图表
    const updateEfficiencyChart = (data) => {
        window.efficiencyChart.data.datasets[0].data = [
            data.concentration,
            data.comprehension,
            data.memory,
            data.speed,
            data.endurance
        ];
        window.efficiencyChart.update();
    };
    
    // 更新知识点数据
    const updateKnowledgeData = (data) => {
        // 更新学科进度条
        data.subjects.forEach(subject => {
            const percentElement = document.querySelector(`.${subject.name}-percent`);
            const progressBar = document.querySelector(`.progress-bar[data-subject="${subject.name}"]`);
            
            if (percentElement && progressBar) {
                percentElement.textContent = `${subject.mastery}%`;
                progressBar.style.width = `${subject.mastery}%`;
                progressBar.setAttribute('aria-valuenow', subject.mastery);
            }
        });
        
        // 更新知识点分布
        const distribution = data.distribution;
        document.querySelector('.node-mastered + .knowledge-percent').textContent = `${distribution.mastered}%`;
        document.querySelector('.node-learning + .knowledge-percent').textContent = `${distribution.learning}%`;
        document.querySelector('.node-weak + .knowledge-percent').textContent = `${distribution.weak}%`;
        document.querySelector('.node-untouched + .knowledge-percent').textContent = `${distribution.untouched}%`;
    };
    
    // 更新效率数据
    const updateEfficiencyData = (data) => {
        document.getElementById('bestStudyTime').textContent = data.bestStudyTime;
        document.getElementById('avgFocusTime').textContent = data.avgFocusTime;
        document.getElementById('distractions').textContent = data.distractions;
        document.getElementById('reviewInterval').textContent = data.reviewInterval;
        
        // 更新建议列表
        const suggestionsList = document.getElementById('efficiencySuggestions');
        suggestionsList.innerHTML = '';
        
        data.suggestions.forEach(suggestion => {
            const li = document.createElement('li');
            li.className = 'suggestion-item';
            
            const icon = document.createElement('i');
            icon.className = `fas ${suggestion.type === 'positive' ? 'fa-check-circle text-success' : 'fa-exclamation-triangle text-warning'} me-2`;
            
            li.appendChild(icon);
            li.appendChild(document.createTextNode(suggestion.text));
            suggestionsList.appendChild(li);
        });
    };
    
    // 更新错题分析
    const updateErrorAnalysis = (errors) => {
        const tableBody = document.getElementById('error-analysis-table');
        tableBody.innerHTML = '';
        
        errors.forEach(error => {
            const row = document.createElement('tr');
            
            // 知识点
            const topicCell = document.createElement('td');
            topicCell.textContent = error.topic;
            
            // 错误率
            const rateCell = document.createElement('td');
            rateCell.textContent = `${error.rate}%`;
            
            // 错题数
            const countCell = document.createElement('td');
            countCell.textContent = error.count;
            
            // 错误类型
            const typeCell = document.createElement('td');
            const typeBadge = document.createElement('span');
            typeBadge.className = `badge bg-${getErrorTypeColor(error.type)}`;
            typeBadge.textContent = error.type;
            typeCell.appendChild(typeBadge);
            
            // 改进建议
            const suggestionCell = document.createElement('td');
            suggestionCell.textContent = error.suggestion;
            
            // 组装行
            row.appendChild(topicCell);
            row.appendChild(rateCell);
            row.appendChild(countCell);
            row.appendChild(typeCell);
            row.appendChild(suggestionCell);
            
            tableBody.appendChild(row);
        });
    };
    
    // 获取错误类型对应的颜色
    const getErrorTypeColor = (type) => {
        switch(type) {
            case '公式记忆': return 'danger';
            case '概念理解': return 'warning';
            case '计算错误': return 'info';
            case '审题错误': return 'secondary';
            default: return 'primary';
        }
    };
    
    // 更新日期范围显示
    const updateDateRangeDisplay = (dateRange) => {
        document.getElementById('reportDateRange').textContent = getDateRangeLabel(dateRange.start, dateRange.end);
        
        // 更新周期标签
        const periodBadge = document.querySelector('.report-badges .badge:first-child');
        if (periodBadge) {
            let periodText = '';
            let periodIcon = '';
            
            switch(currentPeriod) {
                case 'week':
                    periodText = '本周';
                    periodIcon = 'fa-calendar-week';
                    break;
                case 'month':
                    periodText = '本月';
                    periodIcon = 'fa-calendar-month';
                    break;
                case 'quarter':
                    periodText = '本季度';
                    periodIcon = 'fa-calendar-alt';
                    break;
                case 'custom':
                    periodText = '自定义';
                    periodIcon = 'fa-calendar-day';
                    break;
            }
            
            periodBadge.innerHTML = `<i class="fas ${periodIcon} me-1"></i>${periodText}`;
        }
    };
    
    // 导出报告
    const exportReport = async (e) => {
        const format = e.currentTarget.dataset.format;
        
        try {
            showLoading(true);
            
            const response = await fetch('/api/export-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    period: currentPeriod,
                    subject: currentSubject,
                    format,
                    startDate: currentPeriod === 'custom' ? document.getElementById('startDate').value : null,
                    endDate: currentPeriod === 'custom' ? document.getElementById('endDate').value : null
                })
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `学习报告_${new Date().toLocaleDateString('zh-CN')}.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                showSuccessToast(`报告已导出为${format.toUpperCase()}格式`);
            } else {
                throw new Error('Network response was not ok');
            }
        } catch (error) {
            console.error('Export error:', error);
            showErrorToast('导出报告失败');
        } finally {
            showLoading(false);
        }
    };
    
    // 公共API
    return {
        init
    };
})();

// 初始化模块
document.addEventListener('DOMContentLoaded', ReportModule.init);

