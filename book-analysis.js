/**
 * 深读 - 书籍深度分析模块 v2.0
 * 适配新UI，核心分析逻辑
 */

// ================
// AI分析配置
// ================
const AIConfig = {
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: '', // 从settings读取
    model: 'deepseek-chat',
    useMock: true // MVP阶段使用模拟数据
};

// ================
// 供app.js调用的分析入口（兼容旧接口）
// ================
async function startBookAnalysis() {
    // 此函数保留兼容，但新UI使用 app.js 中的 startAnalysis()
    const content = document.getElementById('book-input')?.value || '';
    const title = document.getElementById('analysis-book-title')?.value?.trim() || '书籍分析';
    
    if (!content.trim()) return;
    
    if (AIConfig.useMock) {
        return generateMockResults(title);
    }
    
    return await realAIAnalysis(content, title);
}

// ================
// 真实AI分析（接入DeepSeek API时使用）
// ================
async function realAIAnalysis(input, title) {
    // 从Store读取API Key
    try {
        const settings = JSON.parse(localStorage.getItem('shendu_settings') || '{}');
        AIConfig.apiKey = settings.apiKey || '';
    } catch {}
    
    if (!AIConfig.apiKey) {
        throw new Error('请先在「我的」页面配置 DeepSeek API Key');
    }
    
    const prompt = `你是一位专业的书籍分析专家。请对以下书籍内容进行深度分析，返回JSON格式：

{
    "bookTitle": "书名",
    "oneSentenceSummary": "一句话总结核心思想",
    "thinkingFramework": "作者思维框架分析",
    "coreViewpoints": ["观点1", "观点2", ...],
    "methodology": ["方法论1（含步骤）", "方法论2（含步骤）", ...],
    "inspirations": ["启发1", "启发2", ...],
    "actionPlan": ["行动1", "行动2", ...]
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
                { role: 'system', content: '你是书籍分析专家，严格返回JSON格式。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7
        })
    });
    
    if (!response.ok) throw new Error(`API请求失败: ${response.status}`);
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI返回格式异常');
    
    return JSON.parse(jsonMatch[0]);
}

// 导出全局函数
window.startBookAnalysis = startBookAnalysis;
