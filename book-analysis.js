/**
 * 书籍深度分析模块 - 核心逻辑
 * book-analysis.js
 */

// ================
// AI分析配置
// ================
const AIConfig = {
    // DeepSeek API配置（生产环境应通过后端代理）
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: '', // 前端不存放key，MVP用模拟数据
    model: 'deepseek-chat',
    useMock: true // MVP阶段使用模拟数据
};

// ================
// 开始书籍分析
// ================
async function startBookAnalysis() {
    const btn = document.getElementById('analyze-btn');
    const progressSection = document.getElementById('progress-section');
    const resultSection = document.getElementById('result-section');
    
    // 获取输入内容
    const bookContent = getBookInputContent();
    if (!bookContent || bookContent.trim() === '') {
        alert('请先输入书籍内容或书名');
        return;
    }
    
    // 禁用按钮，显示进度
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ 分析中...';
    }
    if (progressSection) {
        progressSection.classList.remove('hidden');
    }
    if (resultSection) {
        resultSection.classList.add('hidden');
    }
    
    try {
        let results;
        if (AIConfig.useMock) {
            results = await mockAnalysis(bookContent);
        } else {
            results = await realAIAnalysis(bookContent);
        }
        
        // 保存结果
        AppState.bookAnalysisResults = results;
        
        // 显示结果
        displayResults(results);
        
    } catch (error) {
        console.error('分析失败:', error);
        alert('分析失败，请重试: ' + error.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🚀 开始分析';
        }
    }
}

// ================
// 获取输入内容
// ================
function getBookInputContent() {
    const activeMethod = document.querySelector('.input-method.active');
    if (!activeMethod) return '';
    
    const methodId = activeMethod.id;
    
    switch (methodId) {
        case 'input-text':
            return document.getElementById('book-text')?.value || '';
        case 'input-file':
            return document.getElementById('file-content')?.textContent || '';
        case 'input-title':
            return document.getElementById('book-title')?.value || '';
        case 'input-photo':
            return document.getElementById('ocr-content')?.textContent || '';
        default:
            return '';
    }
}

// ================
// 模拟AI分析（MVP用）
// ================
async function mockAnalysis(input) {
    const bookTitle = extractBookTitle(input);
    
    // 模拟进度条
    await simulateProgress([
        { text: '📖 识别书籍内容...', progress: 15, delay: 600 },
        { text: '🧠 分析作者思维框架...', progress: 30, delay: 800 },
        { text: '🎯 提取核心观点...', progress: 50, delay: 700 },
        { text: '🛠️ 梳理方法论...', progress: 65, delay: 600 },
        { text: '💡 提炼启发收获...', progress: 80, delay: 500 },
        { text: '🚀 生成行动计划...', progress: 95, delay: 400 },
        { text: '✅ 分析完成！', progress: 100, delay: 300 }
    ]);
    
    // 返回模拟结果
    return {
        bookTitle: bookTitle,
        oneSentenceSummary: '习惯的改变不靠意志力，而靠系统设计——通过优化提示、渴求、反应、奖励四个环节，让好习惯自然而然发生。',
        thinkingFramework: '【系统思维】作者认为个人改变的关键不是设定目标，而是构建系统。目标是结果导向，系统是过程导向。好习惯的养成不是靠意志力硬撑，而是通过重新设计环境和流程，让期望行为成为最自然的选择。\n\n【原子思维】微小的改变在复利效应下会产生巨大影响。每天进步1%，一年后你会进步37倍。关键不在于单次改变的幅度，而在于持续的微小改进。\n\n【身份认同】行为改变的最深层是身份认同。与其说"我要跑步"，不如说"我是一个跑步的人"。当行为与身份一致时，习惯就自然形成。',
        coreViewpoints: [
            '习惯是自我改善的复利——好习惯让时间成为盟友，坏习惯让时间成为敌人',
            '关注系统而非目标——目标是关于你想要达到的结果，系统是关于导致那些结果的过程',
            '习惯四步循环：提示→渴求→反应→奖励，所有习惯都遵循这个回路',
            '环境设计比意志力更有效——改变环境比改变自己更容易',
            '身份认同是习惯的终极驱动力——你不会偏离你的身份认同太远',
            '习惯叠加法：将新习惯附加在已有习惯之后，利用行为惯性',
            '两分钟法则：将任何习惯缩减到两分钟以内，先建立身份认同再优化'
        ],
        methodology: [
            '【让提示更明显】①执行意图：明确"我将在[时间][地点]做[行为]" ②习惯叠加："做完[当前习惯]后，我将[新习惯]" ③环境设计：把好习惯的提示放在显眼处',
            '【让习惯更有吸引力】①诱惑捆绑：把需要做的事和想做的事配对 ②模仿身边人的习惯 ③仪式感：创造做习惯前的固定仪式',
            '【让行动更简单】①两分钟法则：从两分钟版本开始 ②减少阻力：提前准备好所需物品 ③利用技术：自动化重复步骤',
            '【让奖励更满足】①即时满足：给完成习惯的自己一个小奖励 ②习惯追踪：用日历打卡记录连续天数 ③决不连续缺席两次'
        ],
        inspirations: [
            '不要试图改变结果，要改变系统——这不是目标的问题，是系统的问题',
            '环境是隐形的雕塑家——改变环境比改变意志力更持久有效',
            '你不是你的习惯，但你的习惯塑造了你的身份——先成为那样的人',
            '1%的力量：微小的改变看似无意义，但时间是放大器',
            '「决不连续缺席两次」原则——一次失误不可怕，连续失误才是真正的危险'
        ],
        actionPlan: [
            '今天：选择一个想养成的习惯，写出它的两分钟版本（如：读1页书、做1个俯卧撑）',
            '明天：为这个习惯设计一个「执行意图」——我将在[时间][地点]做[行为]',
            '第3天：用习惯叠加法，把这个习惯附加在你每天必做的事之后',
            '第4天：重新设计你的环境——把好习惯的提示放在显眼处，坏习惯的提示藏起来',
            '第5天：开始习惯追踪——用日历或App记录每天是否完成，保持不断链',
            '第7天：复盘第一周——哪些有效？哪些需要调整？决不连续缺席两次'
        ],
        mindmapData: {
            center: '原子习惯',
            branches: [
                { name: '为什么', children: ['复利效应', '1%法则', '系统>目标'] },
                { name: '四步循环', children: ['提示→明显', '渴求→吸引力', '反应→简单', '奖励→满足'] },
                { name: '身份认同', children: ['我是谁', '行为=身份', '先成为再做到'] },
                { name: '实操方法', children: ['习惯叠加', '两分钟法则', '环境设计', '习惯追踪'] }
            ]
        }
    };
}

// ================
// 真实AI分析（后续版本）
// ================
async function realAIAnalysis(input) {
    const prompt = `你是一位专业的书籍分析专家。请对以下书籍内容进行深度分析，返回JSON格式：

{
    "bookTitle": "书名",
    "oneSentenceSummary": "一句话总结这本书的核心思想",
    "thinkingFramework": "作者的思维框架分析（包括思维方式、推理逻辑、核心假设）",
    "coreViewpoints": ["核心观点1", "核心观点2", ...],
    "methodology": ["方法论1（含具体步骤）", "方法论2（含具体步骤）", ...],
    "inspirations": ["启发1", "启发2", ...],
    "actionPlan": ["行动1", "行动2", ...],
    "mindmapData": {
        "center": "核心主题",
        "branches": [{"name": "分支名", "children": ["子节点1", "子节点2"]}]
    }
}

书籍内容：
${input}`;

    const response = await fetch(AIConfig.apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AIConfig.apiKey}`
        },
        body: JSON.stringify({
            model: AIConfig.model,
            messages: [
                { role: 'system', content: '你是书籍分析专家，请严格按照JSON格式返回分析结果。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // 提取JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('AI返回格式异常');
    }
    
    return JSON.parse(jsonMatch[0]);
}

// ================
// 进度条模拟
// ================
async function simulateProgress(steps) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    for (const step of steps) {
        if (progressFill) {
            progressFill.style.width = step.progress + '%';
        }
        if (progressText) {
            progressText.textContent = step.text;
        }
        await sleep(step.delay);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ================
// 显示分析结果
// ================
function displayResults(results) {
    const resultSection = document.getElementById('result-section');
    const progressSection = document.getElementById('progress-section');
    
    // 隐藏进度
    if (progressSection) {
        progressSection.classList.add('hidden');
    }
    
    // 显示结果区域
    if (resultSection) {
        resultSection.classList.remove('hidden');
        
        // 一句话总结
        const summaryEl = document.getElementById('result-summary');
        if (summaryEl) {
            summaryEl.innerHTML = `<p class="summary-text">${escapeHtml(results.oneSentenceSummary)}</p>`;
        }
        
        // 思维框架
        const frameworkEl = document.getElementById('result-framework');
        if (frameworkEl) {
            frameworkEl.innerHTML = `<div class="framework-content">${formatText(results.thinkingFramework)}</div>`;
        }
        
        // 核心观点
        const viewpointsEl = document.getElementById('result-viewpoints');
        if (viewpointsEl) {
            viewpointsEl.innerHTML = `<ul class="viewpoints-list">${results.coreViewpoints.map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>`;
        }
        
        // 方法论
        const methodologyEl = document.getElementById('result-methodology');
        if (methodologyEl) {
            methodologyEl.innerHTML = `<ul class="methodology-content">${results.methodology.map(m => `<li>${formatText(m)}</li>`).join('')}</ul>`;
        }
        
        // 启发收获
        const inspirationsEl = document.getElementById('result-inspirations');
        if (inspirationsEl) {
            inspirationsEl.innerHTML = `<div class="inspirations-content">${results.inspirations.map(i => `<div class="inspiration-item">💡 ${escapeHtml(i)}</div>`).join('')}</div>`;
        }
        
        // 行动计划
        const actionEl = document.getElementById('result-action');
        if (actionEl) {
            actionEl.innerHTML = `<ul class="action-content">${results.actionPlan.map(a => `<li>🚀 ${escapeHtml(a)}</li>`).join('')}</ul>`;
        }
        
        // 思维导图
        renderMindmap(results.mindmapData);
    }
}

// ================
// 思维导图渲染
// ================
function renderMindmap(data) {
    const container = document.getElementById('result-mindmap');
    if (!container || !data) return;
    
    // 简单文本版思维导图（MVP）
    let html = `<div class="mindmap-text">`;
    html += `<div class="mindmap-center">${escapeHtml(data.center)}</div>`;
    
    if (data.branches) {
        data.branches.forEach(branch => {
            html += `<div class="mindmap-branch">`;
            html += `<div class="mindmap-branch-name">📌 ${escapeHtml(branch.name)}</div>`;
            if (branch.children) {
                html += `<div class="mindmap-children">`;
                branch.children.forEach(child => {
                    html += `<span class="mindmap-child">${escapeHtml(child)}</span>`;
                });
                html += `</div>`;
            }
            html += `</div>`;
        });
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

// ================
// 工具函数
// ================
function extractBookTitle(input) {
    // 尝试从输入中提取书名
    const titleInput = document.getElementById('book-title');
    if (titleInput && titleInput.value.trim()) {
        return titleInput.value.trim();
    }
    
    // 从文本中猜测
    const match = input.match(/《(.+?)》/);
    if (match) return match[1];
    
    return '书籍分析';
}

function formatText(text) {
    if (!text) return '';
    // 将换行转换为<br>，保留段落结构
    return text.split('\n').map(line => {
        if (line.trim() === '') return '<br>';
        // 高亮【】标记
        return line.replace(/【(.+?)】/g, '<strong style="color:var(--primary)">【$1】</strong>');
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 导出全局函数
window.startBookAnalysis = startBookAnalysis;