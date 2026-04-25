// 三角函数专题数据结构
const trigFunctionsModule = {
  id: 'math-trigonometry',
  title: '三角函数专题',
  sections: [
    {
      title: '基础概念',
      content: '三角函数是描述直角三角形边角关系的函数...',
      formula: "\\sin\\theta = \\frac{opposite}{hypotenuse}",
      examples: [
        {
          problem: "在直角三角形中，已知对边为3，斜边为5，求sinθ",
          solution: "sinθ = 对边/斜边 = 3/5 = 0.6"
        }
      ]
    },
    {
      title: '公式与变换',
      content: '介绍基本三角恒等式...',
      formula: "\\sin^2\\theta + \\cos^2\\theta = 1",
      examples: [
        {
          problem: "证明 sin²θ + cos²θ = 1",
          solution: "利用单位圆定义和勾股定理可证"
        }
      ]
    }
  ],
  practiceQuestions: [],
  commonMistakes: [
    {
      type: "角度制与弧度制混淆",
      example: "计算sin(30)得到错误结果",
      correctSolution: "应明确是30°还是30弧度",
      prevention: "注意题目中的角度单位"
    }
  ]
};

// 辅助函数
function calculateTrigValue(func, angle) {
  const rad = angle * Math.PI / 180;
  switch(func) {
    case 'sin': return Math.sin(rad).toFixed(4);
    case 'cos': return Math.cos(rad).toFixed(4);
    case 'tan': return Math.tan(rad).toFixed(4);
    case 'cot': return (1/Math.tan(rad)).toFixed(4);
    case 'sec': return (1/Math.cos(rad)).toFixed(4);
    case 'csc': return (1/Math.sin(rad)).toFixed(4);
    default: return 'N/A';
  }
}

function analyzeResults(results) {
  const correctCount = results.filter(r => r.correct).length;
  const accuracy = (correctCount / results.length * 100).toFixed(1);
  // TODO: 可用 toast 或页面提示替换 alert(`答题完成！正确率: ${accuracy}%`);
  // TODO: 可用页面错误列表替换 console.log 错误输出
}

// 组件实现
function ExampleCard({ example }) {
  return (
    <div className="example-card">
      <div className="example-problem">
        <strong>例题: </strong>{example.problem}
      </div>
      <div className="example-solution">
        <strong>解答: </strong>{example.solution}
      </div>
    </div>
  );
}

function TrigonometryConcept({ concept }) {
  return (
    <div className="concept-card">
      <h3>{concept.title}</h3>
      <div className="concept-content">
        {concept.content}
      </div>
      {concept.formula && (
        <div className="formula-box">
          <TeX math={concept.formula} />
        </div>
      )}
      <div className="concept-examples">
        {concept.examples.map((example, i) => (
          <ExampleCard key={i} example={example} />
        ))}
      </div>
    </div>
  );
}

function InteractiveFormula() {
  const [angle, setAngle] = useState(30);
  
  return (
    <div className="formula-demo">
      <h4>正弦函数演示</h4>
      <div className="controls">
        <span>角度: </span>
        <input 
          type="range" 
          min="0" 
          max="360" 
          value={angle} 
          onChange={(e) => setAngle(e.target.value)}
        />
        <span>{angle}°</span>
      </div>
      <div className="formula-result">
        <p>sin({angle}°) = {Math.sin(angle * Math.PI / 180).toFixed(4)}</p>
      </div>
    </div>
  );
}

function generateTrigQuestion(difficulty) {
  const types = ['value-calculation', 'identity-proof'];
  const selectedType = types[Math.floor(Math.random() * types.length)];
  
  switch(selectedType) {
    case 'value-calculation':
      return generateValueCalculationQuestion(difficulty);
    case 'identity-proof':
      return {
        type: 'identity-proof',
        question: "证明 sin²θ + cos²θ = 1",
        answer: 'proof',
        solutionSteps: [
          "考虑单位圆上一点P(x,y)",
          "根据定义: x = cosθ, y = sinθ",
          "由勾股定理: x² + y² = 1",
          "因此 sin²θ + cos²θ = 1"
        ]
      };
    default:
      return generateValueCalculationQuestion(difficulty);
  }
}

function generateValueCalculationQuestion(difficulty) {
  const angles = [30, 45, 60, 90, 120, 135, 150, 180];
  const angle = angles[Math.floor(Math.random() * angles.length)];
  const functions = ['sin', 'cos', 'tan'];
  const func = functions[Math.floor(Math.random() * functions.length)];
  
  return {
    type: 'value-calculation',
    question: `计算 ${func}(${angle}°) 的值`,
    answer: calculateTrigValue(func, angle),
    solutionSteps: [
      `将角度转换为弧度: ${angle}° = ${angle * Math.PI / 180} rad`,
      `使用${func}函数定义计算`,
      `结果: ${calculateTrigValue(func, angle)}`
    ]
  };
}

function MistakeAnalysis({ mistakes }) {
  return (
    <div className="mistake-analysis">
      <h3>常见错误分析</h3>
      <table>
        <thead>
          <tr>
            <th>错误类型</th>
            <th>示例</th>
            <th>正确解法</th>
            <th>避免方法</th>
          </tr>
        </thead>
        <tbody>
          {mistakes.map((mistake, index) => (
            <tr key={index}>
              <td>{mistake.type}</td>
              <td>{mistake.example}</td>
              <td>{mistake.correctSolution}</td>
              <td>{mistake.prevention}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrigonometryModule() {
  const [activeSection, setActiveSection] = useState(0);
  const [practiceMode, setPracticeMode] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  
  const generatePractice = () => {
    const newQuestions = [];
    for (let i = 0; i < 5; i++) {
      newQuestions.push(generateTrigQuestion('medium'));
    }
    setQuestions(newQuestions);
    setPracticeMode(true);
  };
  
  const submitAnswers = () => {
    const results = questions.map((q, i) => ({
      question: q.question,
      userAnswer: userAnswers[i],
      correct: userAnswers[i] === q.answer,
      solution: q.solutionSteps
    }));
    analyzeResults(results);
    setPracticeMode(false);
  };
  
  return (
    <div className="trigonometry-module">
      <div className="module-header">
        <h2>三角函数专题</h2>
        <button onClick={generatePractice}>开始练习</button>
      </div>
      
      {!practiceMode ? (
        <div className="learning-sections">
          <div className="section-nav">
            {trigFunctionsModule.sections.map((section, i) => (
              <button 
                key={i}
                className={i === activeSection ? 'active' : ''}
                onClick={() => setActiveSection(i)}
              >
                {section.title}
              </button>
            ))}
          </div>
          
          <div className="section-content">
            <TrigonometryConcept concept={trigFunctionsModule.sections[activeSection]} />
            <InteractiveFormula />
          </div>
        </div>
      ) : (
        <div className="practice-section">
          <h3>三角函数练习</h3>
          {questions.map((q, i) => (
            <div key={i} className="practice-question">
              <p>{q.question}</p>
              <input
                type="text"
                value={userAnswers[i] || ''}
                onChange={(e) => setUserAnswers({...userAnswers, [i]: e.target.value})}
              />
            </div>
          ))}
          <button onClick={submitAnswers}>提交答案</button>
        </div>
      )}
      
      <MistakeAnalysis mistakes={trigFunctionsModule.commonMistakes} />
    </div>
  );
}
// 在文件末尾添加以下代码
function App() {
  return (
    <div className="app-container">
      <TrigonometryModule />
    </div>
  );
}

// 渲染React应用
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);