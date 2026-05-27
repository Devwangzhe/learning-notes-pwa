/**
 * 学习笔记工具 - 主逻辑
 * app.js
 */

// ================
// 全局状态
// ================
const AppState = {
    currentTab: 'book-analysis',
    notes: [],
    bookAnalysisResults: null
};

// ================
// 初始化
// ================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 加载笔记数据
    loadNotes();
    
    // 绑定事件
    bindEvents();
    
    // 显示当前Tab
    showTab(AppState.currentTab);
    
    console.log('✅ 学习笔记工具已启动');
}

// ================
// 事件绑定
// ================
function bindEvents() {
    // Tab切换（桌面端）
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            showTab(tabName);
        });
    });
    
    // 底部导航（手机端）
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const navName = btn.dataset.nav;
            showTab(navName);
        });
    });
    
    // 输入方式切换
    const inputOptions = document.querySelectorAll('.input-option');
    inputOptions.forEach(option => {
        option.addEventListener('click', () => {
            const method = option.dataset.method;
            switchInputMethod(method);
        });
    });
    
    // 开始分析按钮
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', startBookAnalysis);
    }
    
    // 添加到笔记按钮
    const addNoteBtn = document.getElementById('add-note-btn');
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', addNote);
    }
    
    // 浮动添加按钮
    const fabBtn = document.getElementById('add-note-btn-fab');
    if (fabBtn) {
        fabBtn.addEventListener('click', () => {
            showAddNoteModal();
        });
    }
}

// ================
// Tab切换
// ================
function showTab(tabName) {
    // 更新状态
    AppState.currentTab = tabName;
    
    // 更新桌面Tab
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // 更新手机底部导航
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        if (btn.dataset.nav === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // 显示对应内容
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => {
        if (content.id === tabName) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // 特殊处理：如果是笔记Tab，刷新列表
    if (tabName === 'notes') {
        renderNotesList();
    }
}

// ================
// 输入方式切换
// ================
function switchInputMethod(method) {
    // 更新按钮状态
    const options = document.querySelectorAll('.input-option');
    options.forEach(option => {
        if (option.dataset.method === method) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    
    // 显示对应输入区域
    const methods = document.querySelectorAll('.input-method');
    methods.forEach(m => {
        if (m.id === `input-${method}`) {
            m.classList.add('active');
        } else {
            m.classList.remove('active');
        }
    });
}

// ================
// 笔记管理
// ================
function loadNotes() {
    const stored = localStorage.getItem('learning-notes');
    if (stored) {
        try {
            AppState.notes = JSON.parse(stored);
        } catch (e) {
            console.error('加载笔记失败:', e);
            AppState.notes = [];
        }
    }
}

function saveNotes() {
    localStorage.setItem('learning-notes', JSON.stringify(AppState.notes));
}

function addNote(noteData) {
    const newNote = {
        id: Date.now().toString(),
        title: noteData.title || '无标题',
        content: noteData.content || '',
        tags: noteData.tags || [],
        category: noteData.category || '未分类',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    AppState.notes.unshift(newNote);
    saveNotes();
    renderNotesList();
    
    return newNote;
}

function deleteNote(noteId) {
    AppState.notes = AppState.notes.filter(note => note.id !== noteId);
    saveNotes();
    renderNotesList();
}

function renderNotesList() {
    const notesList = document.getElementById('notes-list');
    if (!notesList) return;
    
    if (AppState.notes.length === 0) {
        notesList.innerHTML = `
            <div class="empty-state">
                <p>📝 还没有笔记</p>
                <p>点击右下角 + 按钮添加</p>
            </div>
        `;
        return;
    }
    
    notesList.innerHTML = AppState.notes.map(note => `
        <div class="note-item" data-id="${note.id}">
            <div class="note-title">${escapeHtml(note.title)}</div>
            <div class="note-preview">${escapeHtml(note.content.substring(0, 100))}</div>
            <div class="note-meta">
                <span>📁 ${escapeHtml(note.category)}</span>
                <span>🕒 ${formatDate(note.updatedAt)}</span>
            </div>
        </div>
    `).join('');
    
    // 绑定笔记点击事件
    const noteItems = notesList.querySelectorAll('.note-item');
    noteItems.forEach(item => {
        item.addEventListener('click', () => {
            const noteId = item.dataset.id;
            viewNote(noteId);
        });
    });
}

function viewNote(noteId) {
    const note = AppState.notes.find(n => n.id === noteId);
    if (!note) return;
    
    // TODO: 显示笔记详情（可以打开模态框或跳转新页面）
    alert(`查看笔记: ${note.title}\n\n${note.content.substring(0, 200)}...`);
}

// ================
// 书籍分析结果导入笔记
// ================
function importBookAnalysisToNotes() {
    if (!AppState.bookAnalysisResults) {
        alert('⚠️ 请先完成书籍分析');
        return;
    }
    
    const results = AppState.bookAnalysisResults;
    
    // 构建笔记内容
    let content = `# ${results.bookTitle || '书籍分析'}\n\n`;
    content += `## 📝 一句话总结\n${results.oneSentenceSummary}\n\n`;
    content += `## 🧠 作者思维框架\n${results.thinkingFramework}\n\n`;
    content += `## 🎯 核心观点\n${results.coreViewpoints.map((v, i) => `${i+1}. ${v}`).join('\n')}\n\n`;
    content += `## 🛠️ 方法论\n${results.methodology.map(m => `- ${m}`).join('\n')}\n\n`;
    content += `## 💡 启发收获\n${results.inspirations.map(i => `- ${i}`).join('\n')}\n\n`;
    content += `## 🚀 行动计划\n${results.actionPlan.map(a => `- ${a}`).join('\n')}\n`;
    
    const noteData = {
        title: `📚 ${results.bookTitle || '书籍分析'}`,
        content: content,
        tags: ['书籍分析', 'AI生成'],
        category: '书籍笔记'
    };
    
    addNote(noteData);
    
    // 切换到笔记Tab
    showTab('notes');
    
    alert('✅ 已导入学习笔记！');
}

// ================
// 工具函数
// ================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    
    return date.toLocaleDateString('zh-CN');
}

// ================
// 导出功能
// ================
function exportToWord() {
    // TODO: 使用 docx.js 生成Word文档
    alert('🚧 Word导出功能开发中...');
}

// ================
// PWA Service Worker 注册
// ================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker 注册成功:', registration);
            })
            .catch(error => {
                console.log('❌ Service Worker 注册失败:', error);
            });
    });
}

// 导出全局函数
window.showTab = showTab;
window.startBookAnalysis = startBookAnalysis;
window.importBookAnalysisToNotes = importBookAnalysisToNotes;