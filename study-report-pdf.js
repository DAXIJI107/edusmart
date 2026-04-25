// study-report-pdf.js

// ============================================================
// 中文字体配置
// 1. 下载思源黑体 TTF 文件（或任何包含中文的 TrueType 字体）
//    例如从 https://github.com/adobe-fonts/source-han-sans/releases 下载
//    选择 SourceHanSansSC-Normal.ttf
// 2. 在本项目根目录执行以下命令将字体转为 Base64：
//    node -e "console.log(require('fs').readFileSync('SourceHanSansSC-Normal.ttf').toString('base64'))" > fontbase64.txt
// 3. 将 fontbase64.txt 中的内容替换到下方 FONT_BASE64 变量中（不要换行）
// 如果暂时无法获取字体，可使用下方“图片方案”备用函数 exportToPDF_Image()
// ============================================================
const FONT_BASE64 = 'PASTE_YOUR_BASE64_FONT_HERE'; // 请替换为真实 Base64 数据

// 注册并设置中文字体（在 jsPDF 实例上执行）
function setupChineseFont(doc) {
    if (FONT_BASE64 !== 'PASTE_YOUR_BASE64_FONT_HERE') {
        doc.addFileToVFS('SourceHanSansSC.ttf', FONT_BASE64);
        doc.addFont('SourceHanSansSC.ttf', 'SourceHanSansSC', 'normal');
        doc.setFont('SourceHanSansSC');
        return true;
    }
    return false; // 未配置字体
}

// 获取通用文本样式（用于 autoTable）
function getDefaultStyles() {
    return {
        font: 'SourceHanSansSC',
        fontStyle: 'normal',
        fontSize: 10
    };
}

// ========== 原有代码（修改字体部分） ==========
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 10) {
        navbar.classList.add('navbar-scrolled');
    } else {
        navbar.classList.remove('navbar-scrolled');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // PDF导出功能
    document.getElementById('exportPdf').addEventListener('click', exportToPDF);
    // Excel导出功能
    document.getElementById('exportExcel').addEventListener('click', exportToExcel);

    // 自定义日期范围显示/隐藏
    document.querySelectorAll('input[name="reportPeriod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const customDateRange = document.getElementById('customDateRange');
            if (this.id === 'customReport') {
                customDateRange.style.display = 'block';
            } else {
                customDateRange.style.display = 'none';
            }
        });
    });

    // 初始化图表
    initializeCharts();
});

// 初始化图表
function initializeCharts() {
    const trendCtx = document.getElementById('studyTrendChart');
    if (trendCtx) {
        new Chart(trendCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                datasets: [{
                    label: '学习时长(小时)',
                    data: [2.5, 3.2, 2.8, 3.5, 2.0, 2.8, 2.7],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
    }

    const efficiencyCtx = document.getElementById('efficiencyChart');
    if (efficiencyCtx) {
        new Chart(efficiencyCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['高效学习', '一般学习', '低效学习'],
                datasets: [{
                    data: [65, 25, 10],
                    backgroundColor: ['#36D399', '#FBBD23', '#F87272'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

// 收集报告数据
function collectReportData() {
    return {
        title: '学习报告',
        studentName: document.getElementById('report-username')?.textContent || '未知',
        period: document.querySelector('input[name="reportPeriod"]:checked')?.nextElementSibling?.textContent.trim() || '本周',
        generationDate: new Date().toLocaleDateString('zh-CN'),

        totalStudyTime: document.getElementById('totalStudyTime')?.textContent || '0',
        knowledgeMastery: document.getElementById('knowledgeMastery')?.textContent || '0',
        studyEfficiency: document.getElementById('studyEfficiency')?.textContent || '0',

        subjects: [
            { name: '数学', progress: 82 },
            { name: '物理', progress: 75 },
            { name: '化学', progress: 68 },
            { name: '英语', progress: 58 }
        ],

        knowledgeDistribution: [
            { type: '已掌握', percentage: 42 },
            { type: '学习中', percentage: 36 },
            { type: '薄弱点', percentage: 15 },
            { type: '未学习', percentage: 7 }
        ],

        efficiencyStats: [
            { label: '最佳学习时段', value: '09:00-11:00' },
            { label: '平均专注时长', value: '45分钟' },
            { label: '平均分心次数', value: '3次/小时' },
            { label: '复习间隔', value: '3.2天' }
        ],

        errorAnalysis: [
            { knowledge: '三角函数公式变换', errorRate: '45%', errorCount: 9, errorType: '公式记忆', suggestion: '建议制作公式卡片每日复习' },
            { knowledge: '导数极值应用', errorRate: '38%', errorCount: 7, errorType: '概念理解', suggestion: '观看相关教学视频加深理解' },
            { knowledge: '空间向量计算', errorRate: '32%', errorCount: 6, errorType: '计算错误', suggestion: '加强空间想象能力训练' }
        ]
    };
}

// PDF导出功能（修复中文乱码）
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    const reportData = collectReportData();

    // 尝试注册中文字体
    const hasChineseFont = setupChineseFont(doc);

    // 如果字体未配置，回退到图片导出（备用方案）
    if (!hasChineseFont) {
        console.warn('未配置中文字体，将使用图片方式导出PDF，文字可能模糊');
        return exportToPDF_Image(reportData);
    }

    doc.setProperties({
        title: `${reportData.studentName}的学习报告`,
        subject: '学习分析报告',
        author: 'EduSmart系统',
        keywords: '学习报告, 教育分析, 学习数据'
    });

    let yPos = 40;

    // 标题
    doc.setFontSize(20);
    doc.text(reportData.title, 105, yPos, { align: 'center' });
    yPos += 15;

    // 基本信息
    doc.setFontSize(12);
    doc.text(`学生姓名: ${reportData.studentName}`, 20, yPos);
    doc.text(`报告周期: ${reportData.period}`, 20, yPos + 10);
    doc.text(`生成时间: ${reportData.generationDate}`, 20, yPos + 20);
    yPos += 35;

    // 学习概览表格
    doc.setFontSize(14);
    doc.text('学习概览', 20, yPos);
    yPos += 15;

    const overviewBody = [
        ['总学习时长', reportData.totalStudyTime, '小时'],
        ['知识点掌握率', reportData.knowledgeMastery, '%'],
        ['学习效率', reportData.studyEfficiency, '%']
    ];

    doc.autoTable({
        startY: yPos,
        head: [['统计项目', '数值', '单位']],
        body: overviewBody,
        theme: 'grid',
        styles: { ...getDefaultStyles(), fontSize: 10 },
        headStyles: { fillColor: [102, 126, 234], font: 'SourceHanSansSC' }
    });
    yPos = doc.lastAutoTable.finalY + 20;

    // 学科掌握情况
    doc.setFontSize(14);
    doc.text('学科掌握情况', 20, yPos);
    yPos += 15;

    const subjectBody = reportData.subjects.map(s => [s.name, `${s.progress}%`]);
    doc.autoTable({
        startY: yPos,
        head: [['学科', '掌握进度']],
        body: subjectBody,
        theme: 'grid',
        styles: { ...getDefaultStyles(), fontSize: 10 },
        headStyles: { fillColor: [118, 75, 162], font: 'SourceHanSansSC' }
    });
    yPos = doc.lastAutoTable.finalY + 20;

    // 知识点分布
    doc.setFontSize(14);
    doc.text('知识点状态分布', 20, yPos);
    yPos += 15;

    const knowledgeBody = reportData.knowledgeDistribution.map(item => [item.type, `${item.percentage}%`]);
    doc.autoTable({
        startY: yPos,
        head: [['状态', '占比']],
        body: knowledgeBody,
        theme: 'grid',
        styles: { ...getDefaultStyles(), fontSize: 10 },
        headStyles: { fillColor: [54, 211, 153], font: 'SourceHanSansSC' }
    });
    yPos = doc.lastAutoTable.finalY + 20;

    // 错题分析
    doc.setFontSize(14);
    doc.text('错题分析', 20, yPos);
    yPos += 15;

    const errorBody = reportData.errorAnalysis.map(e => [
        e.knowledge, e.errorRate, e.errorCount.toString(), e.errorType, e.suggestion
    ]);
    doc.autoTable({
        startY: yPos,
        head: [['知识点', '错误率', '错题数', '错误类型', '改进建议']],
        body: errorBody,
        theme: 'grid',
        styles: { ...getDefaultStyles(), fontSize: 8, font: 'SourceHanSansSC' },
        headStyles: { fillColor: [248, 114, 114], font: 'SourceHanSansSC' },
        columnStyles: {
            4: { cellWidth: 100 }
        }
    });

    // 保存
    doc.save(`${reportData.studentName}_学习报告_${reportData.generationDate.replace(/\//g, '-')}.pdf`);
    showExportSuccess('PDF');
}

// ========== 备用：图片方式导出 PDF（无需字体） ==========
function exportToPDF_Image(reportData) {
    const element = document.querySelector('.report-page main');
    if (!element) {
        alert('无法获取报告内容');
        return;
    }
    html2canvas(element, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            doc.addPage();
            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        doc.save(`${reportData.studentName}_学习报告_${reportData.generationDate.replace(/\//g, '-')}.pdf`);
        showExportSuccess('PDF (图片方式)');
    }).catch(err => {
        console.error('图片导出失败:', err);
        alert('PDF 导出失败，请稍后重试');
    });
}

// Excel导出功能（无乱码问题）
function exportToExcel() {
    const reportData = collectReportData();

    const wb = XLSX.utils.book_new();
    wb.Props = {
        Title: `${reportData.studentName}的学习报告`,
        Subject: "学习分析报告",
        Author: "EduSmart系统",
        CreatedDate: new Date()
    };

    // 1. 学习概览
    const overviewData = [
        ['学习报告概览'],
        ['学生姓名', reportData.studentName],
        ['报告周期', reportData.period],
        ['生成时间', reportData.generationDate],
        [],
        ['统计项目', '数值', '单位'],
        ['总学习时长', reportData.totalStudyTime, '小时'],
        ['知识点掌握率', reportData.knowledgeMastery, '%'],
        ['学习效率', reportData.studyEfficiency, '%']
    ];
    const overviewWS = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, overviewWS, "学习概览");

    // 2. 学科进度
    const subjectData = [
        ['学科', '掌握进度(%)'],
        ...reportData.subjects.map(s => [s.name, s.progress])
    ];
    const subjectWS = XLSX.utils.aoa_to_sheet(subjectData);
    XLSX.utils.book_append_sheet(wb, subjectWS, "学科进度");

    // 3. 知识点分布
    const knowledgeData = [
        ['知识点状态', '占比(%)'],
        ...reportData.knowledgeDistribution.map(i => [i.type, i.percentage])
    ];
    const knowledgeWS = XLSX.utils.aoa_to_sheet(knowledgeData);
    XLSX.utils.book_append_sheet(wb, knowledgeWS, "知识点分布");

    // 4. 错题分析
    const errorData = [
        ['知识点', '错误率', '错题数', '错误类型', '改进建议'],
        ...reportData.errorAnalysis.map(e => [e.knowledge, e.errorRate, e.errorCount, e.errorType, e.suggestion])
    ];
    const errorWS = XLSX.utils.aoa_to_sheet(errorData);
    XLSX.utils.book_append_sheet(wb, errorWS, "错题分析");

    // 5. 学习效率
    const efficiencyData = [
        ['效率指标', '数值'],
        ...reportData.efficiencyStats.map(s => [s.label, s.value])
    ];
    const efficiencyWS = XLSX.utils.aoa_to_sheet(efficiencyData);
    XLSX.utils.book_append_sheet(wb, efficiencyWS, "学习效率");

    XLSX.writeFile(wb, `${reportData.studentName}_学习报告_${reportData.generationDate.replace(/\//g, '-')}.xlsx`);
    showExportSuccess('Excel');
}

function showExportSuccess(format) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification show';
    toast.innerHTML = `
        <div class="alert alert-success d-flex align-items-center">
            <i class="fas fa-check-circle me-2"></i>
            <span>${format}导出成功！文件已开始下载</span>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}