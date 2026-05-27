/**
 * 深读 - AI书籍分析 PWA 主逻辑 v2.0
 * 参考微信读书/得到/Flomo/Notion设计
 */

// ================
// 数据层
// ================
const Store = {
    _defaults: { notes: [], bookshelf: [], settings: { apiKey: '', theme: 'dark', nickname: '阅读者', firstDay: new Date().toISOString() } },

    get(key) {
        try {
            const raw = localStorage.getItem('shendu_' + key);
            return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(this._defaults[key]));
        } catch { return JSON.parse(JSON.stringify(this._defaults[key])); }
    },
    set(key, val) { localStorage.setItem('shendu_' + key, JSON.stringify(val)); },

    get notes() { return this.get('notes'); },
    set notes(v) { this.set('notes', v); },
    get bookshelf() { return this.get('bookshelf'); },
    set bookshelf(v) { this.set('bookshelf', v); },
    get settings() { return this.get('settings'); },
    set settings(v) { this.set('settings', v); },
};

// ================
// 全局状态
// ================
const App = {
    currentPage: 'home',
    analysisStep: 1,
    selectedMethod: 'text',
    currentResults: null,
    editingNoteId: null,
    viewingBookId: null,
    selectedFile: null,
    fileTextContent: '',
};

// ================
// 初始化
// ================
document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    updateGreeting();
    updateHomeStats();
    renderRecentBooks();
    updateProfile();
    updateApiKeyStatus();

    // PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }
});

// ================
// 导航
// ================
function navigateTo(page) {
    App.currentPage = page;

    // 切换页面
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    // 更新导航
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.nav === page);
    });

    // 页面初始化
    if (page === 'home') { updateHomeStats(); renderRecentBooks(); updateGreeting(); }
    if (page === 'bookshelf') renderBookshelf();
    if (page === 'notes') { renderNotes(); renderTagChips(); }
    if (page === 'profile') updateProfile();
    if (page === 'analysis') { resetAnalysis(); }
}
window.navigateTo = navigateTo;

// ================
// 首页
// ================
function updateGreeting() {
    const h = new Date().getHours();
    let g = '晚上好 🌙';
    if (h >= 5 && h < 12) g = '早上好 ☀️';
    else if (h >= 12 && h < 14) g = '中午好 🌤️';
    else if (h >= 14 && h < 18) g = '下午好 👋';
    const el = document.getElementById('greeting-text');
    if (el) el.textContent = g;

    const dateEl = document.getElementById('greeting-date');
    if (dateEl) {
        const now = new Date();
        const days = ['日','一','二','三','四','五','六'];
        dateEl.textContent = `${now.getMonth()+1}月${now.getDate()}日 星期${days[now.getDay()]}`;
    }
}

function updateHomeStats() {
    const books = Store.bookshelf;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const todayCount = books.filter(b => new Date(b.analyzedAt) >= today).length;
    const weekCount = books.filter(b => new Date(b.analyzedAt) >= weekAgo).length;

    const el1 = document.getElementById('stat-today');
    const el2 = document.getElementById('stat-week');
    const el3 = document.getElementById('stat-total');
    if (el1) el1.textContent = todayCount;
    if (el2) el2.textContent = weekCount;
    if (el3) el3.textContent = books.length;
}

function renderRecentBooks() {
    const container = document.getElementById('recent-books');
    if (!container) return;
    const books = Store.bookshelf.slice(0, 10);

    if (books.length === 0) {
        container.innerHTML = '<div class="empty-hint">还没有分析过书籍，点击上方「分析新书」开始</div>';
        return;
    }

    container.innerHTML = books.map(b => `
        <div class="recent-book-card" style="background:${b.coverColor || gradientFromTitle(b.title)}" onclick="viewBookDetail('${b.id}')">
            <div class="book-title">${esc(b.title)}</div>
            <div class="book-date">${timeAgo(b.analyzedAt)}</div>
        </div>
    `).join('');
}

// ================
// 书架
// ================
let bookFilter = 'all';

function setBookFilter(filter, el) {
    bookFilter = filter;
    document.querySelectorAll('#page-bookshelf .chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    renderBookshelf();
}
window.setBookFilter = setBookFilter;

function renderBookshelf() {
    const container = document.getElementById('bookshelf-grid');
    if (!container) return;

    let books = Store.bookshelf;
    const search = (document.getElementById('bookshelf-search')?.value || '').trim().toLowerCase();
    if (search) books = books.filter(b => b.title.toLowerCase().includes(search));
    if (bookFilter === 'recent') books = books.slice(0, 6);

    if (books.length === 0) {
        container.innerHTML = '<div class="empty-hint">书架空空如也，去分析你的第一本书吧</div>';
        return;
    }

    container.innerHTML = books.map(b => `
        <div class="bookshelf-card" style="background:${b.coverColor || gradientFromTitle(b.title)}" onclick="viewBookDetail('${b.id}')">
            <div>
                <div class="bs-title">${esc(b.title)}</div>
                <div class="bs-summary">${esc(b.summary || '')}</div>
            </div>
            <div class="bs-date">${formatDate(b.analyzedAt)}</div>
        </div>
    `).join('');
}

function viewBookDetail(id) {
    const book = Store.bookshelf.find(b => b.id === id);
    if (!book) return;
    App.viewingBookId = id;

    const modal = document.getElementById('book-detail-modal');
    const content = document.getElementById('book-detail-content');
    if (!modal || !content) return;

    content.innerHTML = renderResultCardsHTML(book.results, book.title);
    modal.classList.remove('hidden');
}
window.viewBookDetail = viewBookDetail;

function closeBookDetail() {
    document.getElementById('book-detail-modal')?.classList.add('hidden');
    App.viewingBookId = null;
}
window.closeBookDetail = closeBookDetail;

function deleteBookFromDetail() {
    if (!App.viewingBookId) return;
    if (!confirm('确定删除这本书的分析记录？')) return;
    const books = Store.bookshelf.filter(b => b.id !== App.viewingBookId);
    Store.bookshelf = books;
    closeBookDetail();
    renderBookshelf();
    updateHomeStats();
    renderRecentBooks();
    showToast('已删除');
}
window.deleteBookFromDetail = deleteBookFromDetail;

// ================
// 分析流程
// ================
function resetAnalysis() {
    App.analysisStep = 1;
    App.selectedMethod = 'text';
    App.currentResults = null;
    updateStepUI();
    // 重置结果区
    document.getElementById('analysis-results')?.classList.add('hidden');
    document.querySelectorAll('.analysis-step').forEach(s => s.classList.remove('active'));
    document.getElementById('step-1')?.classList.add('active');
}

function goStep(step) {
    // 验证
    if (step === 2) {
        const title = document.getElementById('analysis-book-title')?.value.trim();
        if (!title) { showToast('请输入书名'); return; }
    }
    if (step === 3) {
        const content = getAnalysisContent();
        if (!content || content.trim().length < 10) { showToast('请输入更多内容（至少10字）'); return; }
        // 更新确认信息
        const title = document.getElementById('analysis-book-title')?.value.trim();
        const confirmTitle = document.getElementById('confirm-title');
        const confirmMethod = document.getElementById('confirm-method');
        const confirmLength = document.getElementById('confirm-length');
        if (confirmTitle) confirmTitle.textContent = title;
        if (confirmMethod) confirmMethod.textContent = {text:'粘贴文字',file:'上传文件',photo:'拍照识别',link:'粘贴链接'}[App.selectedMethod];
        if (confirmLength) confirmLength.textContent = content.length + ' 字';
    }

    App.analysisStep = step;
    updateStepUI();

    document.querySelectorAll('.analysis-step').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('step-' + step);
    if (target) target.classList.add('active');
}
window.goStep = goStep;

function updateStepUI() {
    document.querySelectorAll('.step-dot').forEach(d => {
        const s = parseInt(d.dataset.step);
        d.classList.remove('active','done');
        if (s === App.analysisStep) d.classList.add('active');
        else if (s < App.analysisStep) d.classList.add('done');
    });
    document.querySelectorAll('.step-line').forEach((l, i) => {
        l.classList.toggle('done', i + 1 < App.analysisStep);
    });
}

function selectMethod(method, el) {
    App.selectedMethod = method;
    document.querySelectorAll('.method-card').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    document.querySelectorAll('.method-input').forEach(m => m.classList.remove('active'));
    const target = document.getElementById('method-' + method);
    if (target) target.classList.add('active');
}
window.selectMethod = selectMethod;

function fillTitle(title) {
    const input = document.getElementById('analysis-book-title');
    if (input) input.value = title;
}
window.fillTitle = fillTitle;

function getAnalysisContent() {
    switch (App.selectedMethod) {
        case 'text': return document.getElementById('book-input')?.value || '';
        case 'file': return App.fileTextContent || '';
        case 'photo': return '';
        case 'link': return document.getElementById('link-input')?.value || '';
        default: return '';
    }
}

async function startAnalysis() {
    const content = getAnalysisContent();
    const title = document.getElementById('analysis-book-title')?.value.trim() || '书籍分析';
    if (!content || content.trim().length < 10) { showToast('内容不足，请返回补充'); return; }

    // 显示进度遮罩
    const overlay = document.getElementById('analysis-overlay');
    overlay?.classList.remove('hidden');

    // 模拟进度
    const steps = [
        { text: '📖 识别书籍内容...', progress: 15, delay: 600 },
        { text: '🧠 分析作者思维框架...', progress: 35, delay: 800 },
        { text: '🎯 提取核心观点...', progress: 55, delay: 700 },
        { text: '🛠️ 梳理方法论...', progress: 70, delay: 600 },
        { text: '💡 提炼启发收获...', progress: 85, delay: 500 },
        { text: '🚀 生成行动计划...', progress: 95, delay: 400 },
        { text: '✅ 分析完成！', progress: 100, delay: 300 },
    ];

    for (const step of steps) {
        const textEl = document.getElementById('overlay-progress-text');
        const fillEl = document.getElementById('overlay-progress-fill');
        if (textEl) textEl.textContent = step.text;
        if (fillEl) fillEl.style.width = step.progress + '%';
        await sleep(step.delay);
    }

    // 生成结果（用mock）
    const results = generateMockResults(title);
    App.currentResults = results;

    // 隐藏遮罩
    overlay?.classList.add('hidden');
    document.getElementById('overlay-progress-fill')!.style.width = '0%';

    // 显示结果
    showResults(results, title);
}
window.startAnalysis = startAnalysis;

function showResults(results, title) {
    // 隐藏步骤
    document.querySelectorAll('.analysis-step').forEach(s => s.classList.remove('active'));
    document.getElementById('analysis-results')?.classList.remove('hidden');

    const titleEl = document.getElementById('result-book-title');
    if (titleEl) titleEl.textContent = '📚 ' + title;

    const cardsEl = document.getElementById('result-cards');
    if (cardsEl) cardsEl.innerHTML = renderResultCardsHTML(results, title);
}

function renderResultCardsHTML(results, title) {
    if (!results) return '<div class="empty-hint">暂无结果</div>';
    const sections = [
        { icon: '📝', title: '一句话总结', content: results.oneSentenceSummary, type: 'text' },
        { icon: '🧠', title: '作者思维框架', content: results.thinkingFramework, type: 'text' },
        { icon: '🎯', title: '核心观点', content: results.coreViewpoints, type: 'list' },
        { icon: '🛠️', title: '方法论清单', content: results.methodology, type: 'list' },
        { icon: '💡', title: '启发收获', content: results.inspirations, type: 'list' },
        { icon: '🚀', title: '行动计划', content: results.actionPlan, type: 'list' },
    ];

    return sections.map((s, i) => {
        let body = '';
        if (s.type === 'text') {
            body = `<p>${formatContent(s.content)}</p>`;
        } else {
            body = `<ul>${s.content.map(item => `<li>${formatContent(item)}</li>`).join('')}</ul>`;
        }
        return `
            <div class="result-card">
                <div class="result-card-header" onclick="toggleResultCard(this)">
                    <h3>${s.icon} ${s.title}</h3>
                    <span class="result-card-toggle">▼</span>
                </div>
                <div class="result-card-body">${body}</div>
            </div>
        `;
    }).join('');
}

function toggleResultCard(header) {
    const body = header.nextElementSibling;
    const toggle = header.querySelector('.result-card-toggle');
    if (!body) return;
    body.classList.toggle('collapsed');
    toggle?.classList.toggle('collapsed');
}
window.toggleResultCard = toggleResultCard;

function backToAnalysis() {
    document.getElementById('analysis-results')?.classList.add('hidden');
    App.analysisStep = 1;
    updateStepUI();
    document.querySelectorAll('.analysis-step').forEach(s => s.classList.remove('active'));
    document.getElementById('step-1')?.classList.add('active');
}
window.backToAnalysis = backToAnalysis;

// ================
// Mock 数据生成
// ================
function generateMockResults(title) {
    return {
        bookTitle: title,
        oneSentenceSummary: '习惯的改变不靠意志力，而靠系统设计——通过优化提示、渴求、反应、奖励四个环节，让好习惯自然而然发生。',
        thinkingFramework: '【系统思维】作者认为个人改变的关键不是设定目标，而是构建系统。目标是结果导向，系统是过程导向。\n\n【原子思维】微小的改变在复利效应下会产生巨大影响。每天进步1%，一年后你会进步37倍。\n\n【身份认同】行为改变的最深层是身份认同。与其说"我要跑步"，不如说"我是一个跑步的人"。',
        coreViewpoints: [
            '习惯是自我改善的复利——好习惯让时间成为盟友，坏习惯让时间成为敌人',
            '关注系统而非目标——系统是导致结果的过程',
            '习惯四步循环：提示→渴求→反应→奖励',
            '环境设计比意志力更有效',
            '身份认同是习惯的终极驱动力',
            '习惯叠加法：将新习惯附加在已有习惯之后',
            '两分钟法则：先建立身份认同再优化'
        ],
        methodology: [
            '【让提示更明显】执行意图："我将在[时间][地点]做[行为]" + 习惯叠加 + 环境设计',
            '【让习惯更有吸引力】诱惑捆绑 + 模仿身边人 + 仪式感',
            '【让行动更简单】两分钟法则 + 减少阻力 + 利用技术自动化',
            '【让奖励更满足】即时满足 + 习惯追踪 + 决不连续缺席两次'
        ],
        inspirations: [
            '不要试图改变结果，要改变系统',
            '环境是隐形的雕塑家——改变环境比改变意志力更持久',
            '1%的力量：微小的改变看似无意义，但时间是放大器',
            '「决不连续缺席两次」原则——一次失误不可怕，连续失误才是真正的危险'
        ],
        actionPlan: [
            '今天：选择一个想养成的习惯，写出它的两分钟版本',
            '明天：为这个习惯设计「执行意图」',
            '第3天：用习惯叠加法，附加在每天必做的事之后',
            '第5天：开始习惯追踪，保持不断链',
            '第7天：复盘第一周，决不连续缺席两次'
        ]
    };
}

// ================
// 保存到书架 / 导入笔记 / 导出
// ================
function saveToBookshelf() {
    if (!App.currentResults) { showToast('暂无分析结果'); return; }
    const books = Store.bookshelf;
    const title = App.currentResults.bookTitle || document.getElementById('analysis-book-title')?.value.trim() || '未命名';
    const id = Date.now().toString();

    books.unshift({
        id,
        title,
        summary: App.currentResults.oneSentenceSummary?.substring(0, 50) || '',
        results: App.currentResults,
        coverColor: gradientFromTitle(title),
        analyzedAt: new Date().toISOString(),
    });
    Store.bookshelf = books;
    showToast('✅ 已保存到书架');
    updateHomeStats();
}
window.saveToBookshelf = saveToBookshelf;

function importToNotes() {
    if (!App.currentResults) { showToast('暂无分析结果'); return; }
    const r = App.currentResults;
    let content = `📖 ${r.bookTitle}\n\n`;
    content += `📝 一句话总结：${r.oneSentenceSummary}\n\n`;
    content += `🎯 核心观点：\n${r.coreViewpoints.map((v,i)=>`${i+1}. ${v}`).join('\n')}\n\n`;
    content += `💡 启发：\n${r.inspirations.map(i=>`- ${i}`).join('\n')}`;

    const notes = Store.notes;
    notes.unshift({
        id: Date.now().toString(),
        title: `📚 ${r.bookTitle} - 读书笔记`,
        content,
        tags: ['读书笔记', 'AI分析'],
        source: r.bookTitle,
        createdAt: new Date().toISOString(),
    });
    Store.notes = notes;
    showToast('✅ 已导入笔记');
}
window.importToNotes = importToNotes;

function exportResult() {
    if (!App.currentResults) return;
    const r = App.currentResults;
    let text = `# ${r.bookTitle} - AI深度分析\n\n`;
    text += `## 一句话总结\n${r.oneSentenceSummary}\n\n`;
    text += `## 思维框架\n${r.thinkingFramework}\n\n`;
    text += `## 核心观点\n${r.coreViewpoints.map((v,i)=>`${i+1}. ${v}`).join('\n')}\n\n`;
    text += `## 方法论\n${r.methodology.map(m=>`- ${m}`).join('\n')}\n\n`;
    text += `## 启发收获\n${r.inspirations.map(i=>`- ${i}`).join('\n')}\n\n`;
    text += `## 行动计划\n${r.actionPlan.map(a=>`- ${a}`).join('\n')}`;

    const blob = new Blob([text], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${r.bookTitle}_AI分析.md`;
    a.click();
    URL.revokeObjectURL(a.href);
}
window.exportResult = exportResult;

// ================
// 笔记管理
// ================
let tagFilter = 'all';

function renderNotes() {
    const container = document.getElementById('notes-timeline');
    if (!container) return;

    let notes = Store.notes;
    const search = (document.getElementById('notes-search')?.value || '').trim().toLowerCase();
    if (search) notes = notes.filter(n => n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search));
    if (tagFilter !== 'all') notes = notes.filter(n => n.tags && n.tags.includes(tagFilter));

    // 更新计数
    const countEl = document.getElementById('notes-count');
    if (countEl) countEl.textContent = notes.length + '条';

    if (notes.length === 0) {
        container.innerHTML = '<div class="empty-hint">还没有笔记，说一句或写一句开始吧 ✨</div>';
        return;
    }

    container.innerHTML = notes.map(n => `
        <div class="note-item" onclick="viewNote('${n.id}')">
            <div class="note-title">${esc(n.title)}</div>
            <div class="note-preview">${esc(n.content.substring(0, 100))}</div>
            <div class="note-meta">
                ${(n.tags||[]).map(t => `<span class="note-tag">${esc(t)}</span>`).join('')}
                <span class="note-time">${timeAgo(n.createdAt)}</span>
            </div>
            <div class="note-actions">
                <button class="note-action-btn" onclick="event.stopPropagation();aiActionOnNote('comment','${n.id}')">💡 点评</button>
                <button class="note-action-btn" onclick="event.stopPropagation();aiActionOnNote('challenge','${n.id}')">🤔 拷问</button>
                <button class="note-action-btn" onclick="event.stopPropagation();aiActionOnNote('polish','${n.id}')">✨ 打磨</button>
                <button class="note-action-btn" onclick="event.stopPropagation();aiActionOnNote('publish','${n.id}')">📤 变作品</button>
            </div>
        </div>
    `).join('');
}

function renderTagChips() {
    const container = document.getElementById('tag-chips');
    if (!container) return;
    const notes = Store.notes;
    const allTags = new Set();
    notes.forEach(n => (n.tags||[]).forEach(t => allTags.add(t)));

    container.innerHTML = `<button class="chip ${tagFilter==='all'?'active':''}" data-tag="all" onclick="setTagFilter('all',this)">全部</button>` +
        [...allTags].map(t => `<button class="chip ${tagFilter===t?'active':''}" data-tag="${esc(t)}" onclick="setTagFilter('${esc(t)}',this)">${esc(t)}</button>`).join('');
}

function setTagFilter(tag, el) {
    tagFilter = tag;
    document.querySelectorAll('#page-notes .chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    renderNotes();
}
window.setTagFilter = setTagFilter;

function showAddNoteModal(editId) {
    App.editingNoteId = editId || null;
    const modal = document.getElementById('note-modal');
    const titleEl = document.getElementById('note-modal-title');
    const inputTitle = document.getElementById('note-input-title');
    const inputContent = document.getElementById('note-input-content');
    const inputTags = document.getElementById('note-input-tags');

    if (editId) {
        const note = Store.notes.find(n => n.id === editId);
        if (note) {
            if (titleEl) titleEl.textContent = '编辑笔记';
            if (inputTitle) inputTitle.value = note.title;
            if (inputContent) inputContent.value = note.content;
            if (inputTags) inputTags.value = (note.tags||[]).join(', ');
        }
    } else {
        if (titleEl) titleEl.textContent = '添加笔记';
        if (inputTitle) inputTitle.value = '';
        if (inputContent) inputContent.value = '';
        if (inputTags) inputTags.value = '';
    }
    modal?.classList.remove('hidden');
}
window.showAddNoteModal = showAddNoteModal;

function closeNoteModal() {
    document.getElementById('note-modal')?.classList.add('hidden');
    App.editingNoteId = null;
}
window.closeNoteModal = closeNoteModal;

function saveNote() {
    const title = document.getElementById('note-input-title')?.value.trim() || '无标题';
    const content = document.getElementById('note-input-content')?.value.trim() || '';
    const tagsRaw = document.getElementById('note-input-tags')?.value.trim() || '';
    const tags = tagsRaw.split(/[,，]/).map(t => t.trim()).filter(Boolean);

    const notes = Store.notes;

    if (App.editingNoteId) {
        const idx = notes.findIndex(n => n.id === App.editingNoteId);
        if (idx >= 0) {
            notes[idx] = { ...notes[idx], title, content, tags, updatedAt: new Date().toISOString() };
        }
    } else {
        notes.unshift({
            id: Date.now().toString(),
            title, content, tags,
            source: '',
            createdAt: new Date().toISOString(),
        });
    }

    Store.notes = notes;
    closeNoteModal();
    renderNotes();
    renderTagChips();
    showToast('✅ 已保存');
}
window.saveNote = saveNote;

function viewNote(id) {
    const note = Store.notes.find(n => n.id === id);
    if (!note) return;
    // 用模态展示，复用编辑
    if (confirm('查看/编辑这篇笔记？\n\n标题：' + note.title + '\n\n取消则删除此笔记')) {
        showAddNoteModal(id);
    } else {
        if (confirm('确定删除这篇笔记？')) {
            Store.notes = Store.notes.filter(n => n.id !== id);
            renderNotes();
            renderTagChips();
            showToast('已删除');
        }
    }
}
window.viewNote = viewNote;

// ================
// 文件上传
// ================
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    App.selectedFile = file;

    const fileNameEl = document.getElementById('file-name');
    const fileSelectedEl = document.getElementById('file-selected');
    if (fileNameEl) fileNameEl.textContent = `📄 ${file.name} (${formatFileSize(file.size)})`;
    if (fileSelectedEl) fileSelectedEl.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = (ev) => {
        if (file.name.endsWith('.txt')) {
            App.fileTextContent = ev.target.result;
        } else {
            App.fileTextContent = '';
            showToast('PDF/DOCX建议使用「粘贴文字」模式');
        }
    };
    if (file.name.endsWith('.txt')) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
}

function clearFile() {
    App.selectedFile = null;
    App.fileTextContent = '';
    const fileInput = document.getElementById('file-input');
    const fileSelectedEl = document.getElementById('file-selected');
    if (fileInput) fileInput.value = '';
    if (fileSelectedEl) fileSelectedEl.classList.add('hidden');
}
window.clearFile = clearFile;

// ================
// 个人设置
// ================
function updateProfile() {
    const books = Store.bookshelf;
    const notes = Store.notes;
    const settings = Store.settings;

    const el1 = document.getElementById('profile-books');
    const el2 = document.getElementById('profile-notes');
    const el3 = document.getElementById('profile-days');
    const nameEl = document.getElementById('profile-nickname');

    if (el1) el1.textContent = books.length;
    if (el2) el2.textContent = notes.length;
    if (nameEl) nameEl.textContent = settings.nickname || '阅读者';

    if (el3) {
        const first = new Date(settings.firstDay || Date.now());
        const days = Math.max(1, Math.ceil((Date.now() - first.getTime()) / 86400000));
        el3.textContent = days;
    }
}

function toggleTheme() {
    const settings = Store.settings;
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    Store.settings = settings;
    applyTheme();
}

function applyTheme() {
    const settings = Store.settings;
    const isDark = settings.theme !== 'light';
    document.body.classList.toggle('light', !isDark);

    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.classList.toggle('on', !isDark);

    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#0f0f1a' : '#f5f6fa');
}

function showApiModal() {
    const modal = document.getElementById('api-modal');
    const input = document.getElementById('api-key-input');
    if (input) input.value = Store.settings.apiKey || '';
    modal?.classList.remove('hidden');
}
window.showApiModal = showApiModal;

function closeApiModal() {
    document.getElementById('api-modal')?.classList.add('hidden');
}
window.closeApiModal = closeApiModal;

function saveApiKey() {
    const key = document.getElementById('api-key-input')?.value.trim() || '';
    const settings = Store.settings;
    settings.apiKey = key;
    Store.settings = settings;
    closeApiModal();
    updateApiKeyStatus();
    showToast('✅ API Key 已保存');
}
window.saveApiKey = saveApiKey;

function updateApiKeyStatus() {
    const el = document.getElementById('api-key-status');
    if (el) el.textContent = Store.settings.apiKey ? '已配置 ✓' : '未配置';
}

function exportData() {
    const data = {
        notes: Store.notes,
        bookshelf: Store.bookshelf,
        settings: Store.settings,
        exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '深读_数据备份_' + new Date().toLocaleDateString('zh-CN').replace(/\//g,'-') + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('✅ 数据已导出');
}
window.exportData = exportData;

function showAbout() {
    showToast('深读 v2.0 - AI书籍深度分析工具');
}
window.showAbout = showAbout;

// ================
// 工具函数
// ================
function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('zh-CN');
}

function timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff/60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff/3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff/86400000) + '天前';
    return formatDate(iso);
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/1048576).toFixed(1) + ' MB';
}

function formatContent(text) {
    if (!text) return '';
    return text.split('\n').map(line => {
        if (line.trim() === '') return '<br>';
        return line.replace(/【(.+?)】/g, '<strong>【$1】</strong>');
    }).join('');
}

function gradientFromTitle(title) {
    if (!title) return 'linear-gradient(135deg, #6c5ce7, #a29bfe)';
    const gradients = [
        'linear-gradient(135deg, #6c5ce7, #a29bfe)',
        'linear-gradient(135deg, #e17055, #fdcb6e)',
        'linear-gradient(135deg, #00b894, #00cec9)',
        'linear-gradient(135deg, #fd79a8, #e84393)',
        'linear-gradient(135deg, #0984e3, #74b9ff)',
        'linear-gradient(135deg, #6c5ce7, #fd79a8)',
        'linear-gradient(135deg, #00b894, #55efc4)',
        'linear-gradient(135deg, #e17055, #d63031)',
        'linear-gradient(135deg, #fdcb6e, #e17055)',
        'linear-gradient(135deg, #a29bfe, #fd79a8)',
    ];
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = ((hash << 5) - hash) + title.charCodeAt(i);
    return gradients[Math.abs(hash) % gradients.length];
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2500);
}

// ================
// GET笔记风格：语音记录
// ================
let isRecording = false;
let recognition = null;

function showVoiceNoteModal() {
    showAddNoteModal();
    // 切换到语音模式
    setTimeout(() => switchNoteMode('voice', document.querySelector('.input-mode-btn[data-mode="voice"]')), 100);
}
window.showVoiceNoteModal = showVoiceNoteModal;

function switchNoteMode(mode, el) {
    document.querySelectorAll('.input-mode-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    document.querySelectorAll('.note-mode-area').forEach(a => a.classList.remove('active'));
    const target = document.getElementById('note-mode-' + mode);
    if (target) target.classList.add('active');
}
window.switchNoteMode = switchNoteMode;

function toggleVoiceRecord() {
    if (isRecording) {
        stopVoiceRecord();
    } else {
        startVoiceRecord();
    }
}
window.toggleVoiceRecord = toggleVoiceRecord;

function startVoiceRecord() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        showToast('浏览器不支持语音识别');
        return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;

    let transcript = '';
    recognition.onresult = (e) => {
        transcript = '';
        for (let i = 0; i < e.results.length; i++) {
            transcript += e.results[i][0].transcript;
        }
        const statusEl = document.getElementById('voice-status');
        if (statusEl) statusEl.textContent = transcript || '正在识别...';
    };

    recognition.onend = () => {
        isRecording = false;
        const btn = document.getElementById('voice-record-btn');
        if (btn) btn.classList.remove('recording');
        // 填入文字区
        const contentEl = document.getElementById('note-input-content');
        if (contentEl && transcript) contentEl.value = transcript;
        // 切回文字模式
        switchNoteMode('text', document.querySelector('.input-mode-btn[data-mode="text"]'));
    };

    recognition.onerror = () => {
        isRecording = false;
        const btn = document.getElementById('voice-record-btn');
        if (btn) btn.classList.remove('recording');
        showToast('语音识别出错，请重试');
    };

    recognition.start();
    isRecording = true;
    const btn = document.getElementById('voice-record-btn');
    if (btn) btn.classList.add('recording');
    const statusEl = document.getElementById('voice-status');
    if (statusEl) statusEl.textContent = '正在录音...';
}

function stopVoiceRecord() {
    if (recognition) recognition.stop();
    isRecording = false;
    const btn = document.getElementById('voice-record-btn');
    if (btn) btn.classList.remove('recording');
}

// ================
// GET笔记风格：快速笔记（首页输入栏）
// ================
function quickAddNote() {
    const input = document.getElementById('quick-note-input');
    const text = input?.value?.trim();
    if (!text) return;

    const notes = Store.notes;
    notes.unshift({
        id: Date.now().toString(),
        title: text.substring(0, 30),
        content: text,
        tags: ['闪念'],
        source: '',
        createdAt: new Date().toISOString(),
    });
    Store.notes = notes;
    if (input) input.value = '';
    renderNotes();
    renderTagChips();
    showToast('✅ 已记录');
}
window.quickAddNote = quickAddNote;

// ================
// GET笔记风格：AI操作（点评/拷问/打磨/变作品）
// ================
let currentAIAction = 'comment';
let currentAINoteId = null;
let currentAIResult = '';

function aiActionOnNote(action, noteId) {
    currentAIAction = action;
    currentAINoteId = noteId;
    currentAIResult = '';

    const note = Store.notes.find(n => n.id === noteId);
    if (!note) return;

    const modal = document.getElementById('ai-action-modal');
    const titleEl = document.getElementById('ai-action-title');
    const originalEl = document.getElementById('ai-action-original');
    const resultEl = document.getElementById('ai-action-result');

    const actionNames = {comment:'💡 AI点评',challenge:'🤔 AI拷问',polish:'✨ AI打磨',publish:'📤 变作品'};
    if (titleEl) titleEl.textContent = actionNames[action] || 'AI点评';
    if (originalEl) originalEl.textContent = note.content;
    if (resultEl) resultEl.innerHTML = '<div class="ai-thinking"><span class="pulse-dot"></span><span class="pulse-dot"></span><span class="pulse-dot"></span> AI正在思考...</div>';

    // 高亮当前tab
    document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
    const tabMap = {comment:0,challenge:1,polish:2,publish:3};
    document.querySelectorAll('.ai-tab')[tabMap[action]]?.classList.add('active');

    modal?.classList.remove('hidden');

    // 模拟AI生成结果
    setTimeout(() => generateAIAction(action, note), 1500);
}
window.aiActionOnNote = aiActionOnNote;

function switchAITab(action, el) {
    if (!currentAINoteId) return;
    document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    currentAIAction = action;
    const resultEl = document.getElementById('ai-action-result');
    if (resultEl) resultEl.innerHTML = '<div class="ai-thinking"><span class="pulse-dot"></span><span class="pulse-dot"></span><span class="pulse-dot"></span> AI正在思考...</div>';
    const note = Store.notes.find(n => n.id === currentAINoteId);
    if (note) setTimeout(() => generateAIAction(action, note), 1000);
}
window.switchAITab = switchAITab;

function generateAIAction(action, note) {
    const resultEl = document.getElementById('ai-action-result');
    if (!resultEl) return;

    const mocks = {
        comment: `💡 <strong>点评</strong><br><br>这段笔记有一个很好的洞察：<strong>你抓住了核心问题</strong>。<br><br>亮点：思路清晰，有具体行动方向<br>建议：可以进一步量化目标，加上时间节点<br><br>🌟 这条笔记值得深入打磨，变成一篇完整的文章。`,
        challenge: `🤔 <strong>拷问</strong><br><br>1. 你确定这是根本原因吗？还是表象？<br>2. 如果反过来想呢？<br>3. 有没有你忽略的前提假设？<br>4. 这个结论在什么条件下会不成立？<br><br>💡 真正的思考，是从质疑自己开始的。`,
        polish: `✨ <strong>打磨后</strong><br><br>${note.content}<br><br>---<br>📝 <strong>优化版：</strong><br>${note.content}。关键在于持续实践，把知识内化为能力。每天进步1%，一年后你会进步37倍。<br><br>💡 建议加上具体案例和可执行的步骤。`,
        publish: `📤 <strong>小红书版本</strong><br><br>📖 今日读书笔记<br><br>${note.content}<br><br>💭 有没有被戳中？<br>👉 收藏起来慢慢看<br><br>#读书笔记 #自我提升 #AI阅读<br><br>---<br>📤 <strong>朋友圈版本</strong><br><br>今天读到了一段特别有感触的话：${note.content.substring(0, 50)}... 📖`
    };

    currentAIResult = mocks[action] || '';
    resultEl.innerHTML = currentAIResult;
}

function closeAIAction() {
    document.getElementById('ai-action-modal')?.classList.add('hidden');
    currentAINoteId = null;
}
window.closeAIAction = closeAIAction;

function saveAIResult() {
    if (!currentAIResult || !currentAINoteId) return;
    const note = Store.notes.find(n => n.id === currentAINoteId);
    const notes = Store.notes;
    const actionNames = {comment:'AI点评',challenge:'AI拷问',polish:'AI打磨',publish:'AI作品'};
    notes.unshift({
        id: Date.now().toString(),
        title: `${actionNames[currentAIAction] || 'AI'} - ${(note?.title || '').substring(0,15)}`,
        content: currentAIResult.replace(/<[^>]*>/g, ''),
        tags: ['AI生成', currentAIAction],
        source: note?.title || '',
        createdAt: new Date().toISOString(),
    });
    Store.notes = notes;
    closeAIAction();
    renderNotes();
    renderTagChips();
    showToast('✅ 已保存为笔记');
}
window.saveAIResult = saveAIResult;

function copyAIResult() {
    const text = currentAIResult.replace(/<[^>]*>/g, '');
    navigator.clipboard?.writeText(text).then(() => showToast('✅ 已复制'));
}
window.copyAIResult = copyAIResult;

// ================
// GET笔记风格：AI大脑
// ================
function sendBrainMsg() {
    const input = document.getElementById('brain-input');
    const text = input?.value?.trim();
    if (!text) return;
    input.value = '';
    brainAsk(text);
}
window.sendBrainMsg = sendBrainMsg;

function brainAsk(question) {
    const chat = document.getElementById('brain-chat');
    if (!chat) return;

    // 添加用户消息
    chat.innerHTML += `
        <div class="chat-msg user">
            <div class="chat-avatar">👤</div>
            <div class="chat-bubble">${esc(question)}</div>
        </div>
    `;

    // 添加AI思考中
    const thinkingId = 'brain-thinking-' + Date.now();
    chat.innerHTML += `
        <div class="chat-msg ai" id="${thinkingId}">
            <div class="chat-avatar">🧠</div>
            <div class="chat-bubble"><span class="pulse-dot"></span><span class="pulse-dot"></span><span class="pulse-dot"></span> 思考中...</div>
        </div>
    `;
    chat.scrollTop = chat.scrollHeight;

    // 基于笔记内容生成回答
    setTimeout(() => {
        const answer = generateBrainAnswer(question);
        const thinkingEl = document.getElementById(thinkingId);
        if (thinkingEl) {
            thinkingEl.querySelector('.chat-bubble').innerHTML = answer;
        }
        chat.scrollTop = chat.scrollHeight;
    }, 1200);
}
window.brainAsk = brainAsk;

function generateBrainAnswer(question) {
    const notes = Store.notes;
    const books = Store.bookshelf;

    // 简单关键词匹配
    if (question.includes('总结') || question.includes('收获')) {
        if (books.length === 0) return '你还没有分析过书籍哦。去分析一本书，我就能帮你总结了！📚';
        const titles = books.slice(0, 3).map(b => b.title).join('、');
        return `根据你的阅读记录，你最近读了：${titles}。<br><br>📖 你关注的核心主题是<strong>自我提升和思维方法</strong>。<br>💡 建议：把这些书的共性方法论整理成一套自己的行动体系。`;
    }
    if (question.includes('推荐') || question.includes('书')) {
        return '基于你的阅读偏好，推荐：<br><br>1. 📖《掌控习惯》- 如果你喜欢《原子习惯》<br>2. 📖《思维模型》- 提升决策能力<br>3. 📖《刻意练习》- 科学提升技能<br><br>要不要分析其中一本？';
    }
    if (question.includes('整理') || question.includes('笔记')) {
        if (notes.length === 0) return '还没有笔记，先去记录一些想法吧！';
        const tags = new Set();
        notes.forEach(n => (n.tags||[]).forEach(t => tags.add(t)));
        return `你有 ${notes.length} 条笔记，涉及标签：${[...tags].slice(0,5).join('、')}。<br><br>🗂️ 建议：把同类笔记合并，提炼核心观点，用「打磨」功能变成可发布的内容。`;
    }
    if (question.includes('小红书') || question.includes('朋友圈') || question.includes('发布')) {
        if (notes.length === 0) return '先记录一些内容，我帮你变成可发布的作品！';
        const latest = notes[0];
        return `帮你把最新笔记变成小红书版本：<br><br>📖 今日读书笔记<br>${latest.content.substring(0,80)}...<br><br>💭 有没有共鸣？<br>👉 收藏慢慢看<br><br>#读书笔记 #自我提升<br><br>💡 点击笔记的「📤 变作品」按钮可以获得更多版本！`;
    }
    // 通用回答
    return `我记住了你 ${notes.length} 条笔记和 ${books.length} 本书籍分析。<br><br>你可以问我：<br>• 帮我总结最近的读书收获<br>• 推荐相关书籍<br>• 整理笔记<br>• 帮我写小红书/朋友圈<br><br>或者直接告诉我你想聊什么 🤔`;
}
