// Returns the welcome message HTML matching sidebar.html (large avatar, bot icon, settings button)
function getWelcomeMessageHTML() {
    return `
        <div class="welcome-message">
            <div class="ai-avatar large">
                <i data-lucide="bot" style="width:28px;height:28px;"></i>
            </div>
            <h2>Welcome to Glimpse</h2>
            <p>I'm here to help you with any questions or tasks. Please configure your Gemini API key in settings to get started.</p>
            <div class="welcome-actions">
                <button class="action-btn" id="configureSettingsBtn">
                    <i data-lucide="settings" style="width:16px;height:16px;"></i>
                    Configure Settings
                </button>
            </div>
            <div class="quick-actions" id="welcomeQuickActions">
                <div class="quick-action" id="qaSummarize">
                    <div class="qa-icon"><i data-lucide="file-text" style="width:18px;height:18px;"></i></div>
                    <div class="qa-text">
                        <div class="qa-title">Summarize page</div>
                        <div class="qa-desc">Creates a concise summary of the current page</div>
                    </div>
                </div>
                <div class="quick-action" id="qaExtract">
                    <div class="qa-icon"><i data-lucide="list-checks" style="width:18px;height:18px;"></i></div>
                    <div class="qa-text">
                        <div class="qa-title">Extract action items</div>
                        <div class="qa-desc">Finds tasks with owners and deadlines</div>
                    </div>
                </div>
                <div class="quick-action" id="qaExplain">
                    <div class="qa-icon"><i data-lucide="image" style="width:18px;height:18px;"></i></div>
                    <div class="qa-text">
                        <div class="qa-title">Explain a screenshot</div>
                        <div class="qa-desc">Describes what’s in an attached image</div>
                    </div>
                </div>
                <div class="quick-action" id="qaSelection">
                    <div class="qa-icon"><i data-lucide="mouse-pointer" style="width:18px;height:18px;"></i></div>
                    <div class="qa-text">
                        <div class="qa-title">Use selected text</div>
                        <div class="qa-desc">Captures selected text from the page</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
// Ensure Lucide icons are rendered after DOM updates
function renderLucideIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        try {
            window.lucide.createIcons();
            console.log('🎨 Lucide icons rendered successfully');
        } catch (error) {
            console.error('❌ Error rendering Lucide icons:', error);
            fallbackIcons();
        }
    } else {
        console.warn('⚠️ Lucide library not available, using fallback icons');
        fallbackIcons();
    }
}

function fallbackIcons() {
    // Replace common Lucide icons with Unicode equivalents
    const iconMappings = {
        'bot': '🤖',
        'send': '➤',
        'image': '🖼️',
        'file': '📎',
        'settings': '⚙️',
        'copy': '📋',
        'download': '⬇️',
        'x': '✕',
        'check': '✓',
        'camera': '📸'
    };
    
    document.querySelectorAll('[data-lucide]').forEach(element => {
        const iconName = element.getAttribute('data-lucide');
        if (iconMappings[iconName]) {
            element.textContent = iconMappings[iconName];
            element.style.fontSize = '16px';
        }
    });
}

class AIChat {
    async fetchTranscriptFromServer(videoId) {
        const CACHE_KEY = 'transcriptCache';
        const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
        const REQUEST_TIMEOUT_MS = 60000; // 60s (increased to handle HF cold starts)
        const MAX_ATTEMPTS = 2;

        // Check cache first
        const cacheResult = await browser.storage.local.get([CACHE_KEY]);
        const transcriptCache = cacheResult[CACHE_KEY] || {};
        const cached = transcriptCache[videoId];
        const now = Date.now();
        if (cached && typeof cached.transcript === 'string' && typeof cached.ts === 'number' && (now - cached.ts) < CACHE_TTL_MS) {
            this.lastTranscript = cached.transcript;
            this.showSuccessMessage('Transcript loaded from cache');
            return true;
        }

        const url = `http://141.147.92.36:10000/transcript?video_id=${videoId}`;
        let attempt = 0;
        while (attempt < MAX_ATTEMPTS) {
            attempt += 1;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
                const response = await fetch(url, {
                    method: 'GET',
                    signal: controller.signal,
                    cache: 'no-store',
                    credentials: 'omit',
                    headers: { 'Accept': 'application/json' },
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    // For server errors, try once more
                    if (attempt < MAX_ATTEMPTS && (response.status >= 500 || response.status === 408 || response.status === 429)) {
                        await new Promise(r => setTimeout(r, 1500));
                        continue;
                    }
                    this.lastTranscript = '';
                    this.showErrorMessage(`Transcript error: ${response.status}`);
                    return false;
                }

                let data;
                try {
                    data = await response.json();
                } catch (e) {
                    // Invalid JSON
                    if (attempt < MAX_ATTEMPTS) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }
                    this.lastTranscript = '';
                    this.showErrorMessage('Transcript parsing failed.');
                    return false;
                }

                // Accept array or string transcripts
                let transcriptText = '';
                if (data && Array.isArray(data.transcript)) {
                    transcriptText = data.transcript.join(' ');
                } else if (data && typeof data.transcript === 'string') {
                    transcriptText = data.transcript;
                }

                if (transcriptText && transcriptText.length > 0) {
                    this.lastTranscript = transcriptText;
                    transcriptCache[videoId] = { transcript: this.lastTranscript, ts: now };
                    await browser.storage.local.set({ [CACHE_KEY]: transcriptCache });
                    this.showSuccessMessage('Transcript fetched from server!');
                    return true;
                } else {
                    this.lastTranscript = '';
                    this.showErrorMessage((data && data.error) || 'No transcript found.');
                    return false;
                }
            } catch (err) {
                const isAbort = (err && (err.name === 'AbortError' || err.message?.includes('aborted')));
                if (attempt < MAX_ATTEMPTS) {
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }
                this.lastTranscript = '';
                console.error('Transcript fetch failed:', err);
                this.showErrorMessage(isAbort ? 'Transcript request timed out.' : 'Transcript service unavailable.');
                return false;
            }
        }
        this.lastTranscript = '';
        return false;
    }
    constructor() {
        this.apiKey = '';
        this.openrouterApiKey = '';
        this.provider = 'google';
        this.model = 'gemini-2.5-flash';
        this.messages = [];
        this.isTyping = false;
        this.isStreaming = false;
        this.attachedFiles = [];
        this.currentSessionId = this.generateSessionId();
        this.abortController = null;
        this.lastMessage = null;
        this.lastFiles = [];
        // Mentions (@-tabs) state
        this.isMentionOpen = false;
        this.mentionTabs = [];
        this.mentionFiltered = [];
        this.mentionTriggerPos = null;
        this.mentionSelectedIndex = 0;
        this.mentionDropdownEl = null;
        this.mentionListEl = null;
        this.mentionLabelToTabId = {};
        this.attachedTabIds = new Set();
        
        this.initializeElements();
        this.loadSettings();
        this.bindEvents();
        this.setupCopyHandlers();
        this.autoResizeTextarea();
        this.notifySidebarOpened();
        // Show the welcome message on initial load
        this.chatMessages.innerHTML = getWelcomeMessageHTML();
        renderLucideIcons();
        this.bindWelcomeActions();
        // Setup mentions UI
        this.setupMentionUI();
    }

    // Bind actions for the welcome message (e.g., Configure Settings button)
    bindWelcomeActions() {
        const configureBtn = document.getElementById('configureSettingsBtn');
        if (configureBtn) {
            configureBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSettings();
            });
        }
        // Welcome quick actions
        const qaSummarize = document.getElementById('qaSummarize');
        const qaExtract = document.getElementById('qaExtract');
        const qaExplain = document.getElementById('qaExplain');
        const qaSelection = document.getElementById('qaSelection');
        if (qaSummarize) qaSummarize.addEventListener('click', async () => {
            this.prefillPrompt('Summarize the key points of the current page. If attachments are present, use them as context.');
            await this.captureCurrentTab();
        });
        if (qaExtract) qaExtract.addEventListener('click', async () => {
            this.prefillPrompt('Extract action items with owners and deadlines from the provided content.');
            await this.captureCurrentTab();
        });
        if (qaExplain) qaExplain.addEventListener('click', async () => {
            this.prefillPrompt('Explain what is shown in the attached screenshot or image in clear, concise language.');
            await this.captureScreenshot();
        });
        if (qaSelection) qaSelection.addEventListener('click', () => this.captureSelectionFromPage());
    }

    // Simple markdown parser
    parseMarkdown(text) {
        const escapeHtml = (str) => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        // First handle fenced code blocks, supporting optional language and Windows newlines
        let html = text.replace(/```([a-zA-Z0-9_\-]+)?\r?\n([\s\S]*?)```/gim, (match, lang, code) => {
            const codeId = 'code_' + Math.random().toString(36).substr(2, 9);
            const languageLabel = (lang || 'Code').toString();
            const escaped = escapeHtml(code).replace(/\n/g, '__GLIMPSE_CODE_NL__');
            return `<div class="code-block-container">
                <div class="code-block-header">
                    <span class="code-block-language">${languageLabel}</span>
                    <button class="copy-code-btn" data-code-id="${codeId}">
                        <i data-lucide="copy" style="width:14px;height:14px;"></i>
                        Copy
                    </button>
                </div>
                <pre><code id="${codeId}" class="language-${languageLabel}">${escaped}</code></pre>
            </div>`;
        });

        // Headers
        html = html
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Inline code (escape content)
        html = html.replace(/`([^`]+)`/gim, (m, inline) => `<code>${escapeHtml(inline)}</code>`);

        // Bold / Italic (avoid turning list markers into italics)
        html = html
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/(^|[^\*])\*(?!\*)([^\n]+?)\*(?!\*)/gim, '$1<em>$2</em>');

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (m, textPart, href) => {
            const safeHref = href;
            return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${textPart}</a>`;
        });

        // Lists (very simple). Avoid interfering with table syntax
        html = html
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');

        // Strict GitHub-style table detection to avoid false positives
        const convertMarkdownTables = (s) => {
            const lines = s.split('\n');
            const out = [];
            let i = 0;
            const isPipeRow = (line) => /^\s*\|(.+)\|\s*$/.test(line);
            const isHeader = (line) => isPipeRow(line) && /\|/.test(line);
            const isSeparator = (line) => {
                if (!/^\s*\|([ :\-|]+)\|\s*$/.test(line)) return false;
                const cells = line.replace(/^\s*\||\|\s*$/g, '').split('|').map(c => c.trim());
                return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
            };
            const toCells = (line) => line.replace(/^\s*\||\|\s*$/g, '').split('|').map(c => c.trim());
            while (i < lines.length) {
                if (i + 1 < lines.length && isHeader(lines[i]) && isSeparator(lines[i + 1])) {
                    const headerCells = toCells(lines[i]);
                    const sepCells = toCells(lines[i + 1]);
                    if (sepCells.length === headerCells.length) {
                        const rows = [];
                        let j = i + 2;
                        while (j < lines.length && isPipeRow(lines[j])) {
                            const rowCells = toCells(lines[j]);
                            if (rowCells.length !== headerCells.length) break;
                            rows.push(rowCells);
                            j++;
                        }
                        if (rows.length > 0) {
                            let tableHtml = '<div class="table-container"><table><thead><tr>' + headerCells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>'; 
                            out.push(tableHtml);
                            i = j;
                            continue;
                        }
                    }
                }
                out.push(lines[i]);
                i++;
            }
            return out.join('\n');
        };
        html = convertMarkdownTables(html);

        // Tables (GitHub-style: header|header\n---|---\nrow|row)
        html = html.replace(/(^|\n)\s*\|?(\s*[^\n|]+\s*\|)+\s*(\n\s*\|?\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?\s*)\n([\s\S]*?)(?=\n\n|$)/gim, (match) => {
            const lines = match.trim().split(/\n/);
            if (lines.length < 2) return match; // not a table
            const header = lines[0].trim();
            const separator = lines[1].trim();
            if (!/\|/.test(header) || !/-{3,}/.test(separator)) return match;
            const rows = lines.slice(2);
            const toCells = (line) => line.replace(/^\|/, '').replace(/\|$/, '').split(/\|/).map(c => c.trim());
            const headCells = toCells(header);
            const bodyRows = rows.filter(r => /\|/.test(r)).map(r => toCells(r));
            let tableHtml = '<div class="table-container"><table><thead><tr>';
            tableHtml += headCells.map(c => `<th>${c}</th>`).join('');
            tableHtml += '</tr></thead><tbody>';
            tableHtml += bodyRows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
            tableHtml += '</tbody></table></div>';
            return tableHtml;
        });

        // Line breaks (after table handling). Convert plain line breaks to <br>, but not inside HTML tags
        html = html.replace(/\n(?![^<]*>)/g, '<br>');
        // Restore protected code newlines
        html = html.replace(/__GLIMPSE_CODE_NL__/g, '\n');

        return html;
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.stopButton = document.getElementById('stopButton');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.apiKeyInput = document.getElementById('apiKey');
        this.openrouterApiKeyInput = document.getElementById('openrouterApiKey');
        this.providerSelect = document.getElementById('providerSelect');
        this.apiKeyLabel = document.getElementById('apiKeyLabel');
        this.saveSettingsBtn = document.getElementById('saveSettings');
        // Remove direct reference, use event delegation for toggle-password
        this.modelInput = document.getElementById('modelInput');
        this.attachButton = document.getElementById('attachButton');
        // Quick actions now live only in welcome panel; toolbar quick action refs removed
        this.statusIndicator = document.getElementById('statusIndicator');
        this.captureTabButton = document.getElementById('captureTabButton');
        this.screenshotButton = document.getElementById('screenshotButton');
        this.youtubeAnalysisButton = document.getElementById('youtubeAnalysisButton');
        this.captureVideoButton = document.getElementById('captureVideoButton');
        this.fileInput = document.getElementById('fileInput');
        this.filePreview = document.getElementById('filePreview');
        this.historyBtn = document.getElementById('historyBtn');
        this.newSessionBtn = document.getElementById('newSessionBtn');
        this.historyPanel = document.getElementById('historyPanel');
        this.closeHistoryBtn = document.getElementById('closeHistoryBtn');
        this.deleteAllHistoryBtn = document.getElementById('deleteAllHistoryBtn');
        this.historyContent = document.getElementById('historyContent');
        this.chatContainer = document.querySelector('.chat-container');
        this.configureSettingsBtn = document.getElementById('configureSettingsBtn');
    }

    bindEvents() {
        this.sendButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.sendMessage();
        });
        this.stopButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.stopRequest();
        });
        this.messageInput.addEventListener('keydown', (e) => {
            // Handle mention navigation/commit
            if (this.isMentionOpen) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.moveMentionSelection(1);
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.moveMentionSelection(-1);
                    return;
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    this.commitMention();
                    return;
                }
                if (e.key === 'Escape') {
                    this.closeMention();
                    return;
                }
            }
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.messageInput.addEventListener('input', (e) => {
            this.updateSendButton();
            this.autoResizeTextarea();
            this.onInputForMention(e);
        });

        if (this.settingsBtn) {
            console.log('✅ Settings button found, adding event listener');
            this.settingsBtn.addEventListener('click', (e) => {
                console.log('🔧 Settings button clicked');
                e.stopPropagation();
                this.toggleSettings();
            });
        }
        
        // Close settings button - handle both button and SVG clicks
        if (this.closeSettingsBtn) {
            console.log('✅ Close settings button found, adding event listener');
            this.closeSettingsBtn.addEventListener('click', (e) => {
                console.log('🚪 Close settings button clicked!', e.target);
                e.preventDefault();
                e.stopPropagation();
                this.closeSettings();
            });
            
            // Also add listener to the SVG inside the button
            const closeButtonSvg = this.closeSettingsBtn.querySelector('svg');
            if (closeButtonSvg) {
                closeButtonSvg.addEventListener('click', (e) => {
                    console.log('🚪 Close settings SVG clicked!');
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeSettings();
                });
            }
        } else {
            console.log('❌ Close settings button NOT found');
        }
        
        // Use event delegation for password toggle (handles dynamic DOM)
        if (this.settingsPanel) {
            this.settingsPanel.addEventListener('click', (e) => {
                console.log('🔍 Settings panel clicked:', e.target);
                // Check if clicked element is a toggle button or its child
                let btn = null;
                if (e.target.classList.contains('toggle-password')) {
                    btn = e.target;
                } else {
                    btn = e.target.closest('.toggle-password');
                }
                console.log('🔍 Found toggle button:', btn);
                if (btn) {
                    console.log('✅ Toggle password button clicked');
                    e.preventDefault();
                    e.stopPropagation();
                    this.togglePasswordVisibility(btn);
                } else {
                    console.log('❌ Not a toggle password button');
                }
            });
        }
        
        this.saveSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.saveSettings();
        });
        if (this.providerSelect) {
            this.providerSelect.addEventListener('change', (e) => {
                this.handleProviderChange();
            });
        }

        this.attachButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.fileInput.click();
        });

        this.captureTabButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.captureCurrentTab();
        });

        this.screenshotButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.captureScreenshot();
        });

        this.youtubeAnalysisButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.analyzeYouTubeVideo();
        });

        // No toolbar quick actions; handled via welcome panel only

        if (this.captureVideoButton) {
            this.captureVideoButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.captureVideoFrame();
            });
        }

        this.fileInput.addEventListener('change', (e) => {
            e.stopPropagation();
            this.handleFileSelect(e.target.files);
        });

        // Drag & drop attachments on the input wrapper
        const inputWrapper = document.querySelector('.chat-input-wrapper');
        if (inputWrapper) {
            const prevent = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
                inputWrapper.addEventListener(evt, prevent);
            });
            ['dragenter', 'dragover'].forEach(evt => {
                inputWrapper.addEventListener(evt, () => inputWrapper.classList.add('drag-over'));
            });
            ['dragleave', 'drop'].forEach(evt => {
                inputWrapper.addEventListener(evt, () => inputWrapper.classList.remove('drag-over'));
            });
            inputWrapper.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                if (!dt) return;
                const files = dt.files;
                if (files && files.length > 0) {
                    this.handleFileSelect(files);
                }
            });
        }

        // Add paste event listener for images
        this.messageInput.addEventListener('paste', (e) => {
            this.handlePaste(e);
        });

        // New session and history events
        this.newSessionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startNewSession();
        });
        this.historyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleHistory();
        });
        this.closeHistoryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeHistory();
        });

        // Delete all history button
        if (this.deleteAllHistoryBtn) {
            this.deleteAllHistoryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteAllHistory();
            });
        }

        // History enhancements: search and pin controls
        if (this.historyPanel) {
            let searchBar = this.historyPanel.querySelector('#historySearchInput');
            if (!searchBar) {
                const header = this.historyPanel.querySelector('.history-header');
                if (header) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.id = 'historySearchInput';
                    input.className = 'history-search';
                    input.placeholder = 'Search history...';
                    header.insertBefore(input, header.querySelector('.close-btn'));
                }
            }
            this.historyPanel.addEventListener('input', (e) => {
                if (e.target && e.target.id === 'historySearchInput') {
                    const query = e.target.value.toLowerCase();
                    this.filterHistory(query);
                }
            });
        }

        // Remove the document click listener approach entirely
        // Settings will only close via:
        // 1. Clicking the close button
        // 2. Clicking the settings button again (toggle)
        // 3. Clicking outside the entire sidebar (if needed)
        
        // Optional: Close settings when clicking outside the entire browser extension
        document.addEventListener('click', (e) => {
            if (this.settingsPanel.classList.contains('open')) {
                // Only close if click is completely outside the chat container
                const isClickOutsideSidebar = !this.chatContainer.contains(e.target);
                if (isClickOutsideSidebar) {
                    this.closeSettings();
                }
            }
        });

        // Prevent settings panel clicks from bubbling up, but allow close button to work
        this.settingsPanel.addEventListener('click', (e) => {
            // Don't prevent propagation if clicking the close button
            if (!this.closeSettingsBtn.contains(e.target)) {
                e.stopPropagation();
            }
        });

        // Removed document-level event delegation for close button to avoid duplicate/blocked handlers

        // Configure settings button from welcome message
        if (this.configureSettingsBtn) {
            this.configureSettingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSettings();
            });
        }

        // Settings panel click handler - allow interactive elements to work normally
        this.settingsPanel.addEventListener('click', (e) => {
            console.log('🔧 Settings panel click detected on:', e.target.tagName, e.target.className);
            
            // Don't prevent propagation for buttons, inputs, and selects
            if (e.target.tagName === 'BUTTON' || 
                e.target.tagName === 'INPUT' || 
                e.target.tagName === 'SELECT' ||
                e.target.closest('button')) {
                console.log('🎯 Interactive element detected, allowing propagation');
                return; // Let the element's own handler run
            }
            console.log('🛡️ Non-interactive element, stopping propagation');
            e.stopPropagation();
        });
    }

    prefillPrompt(text) {
        if (!text) return;
        const current = this.messageInput.value.trim();
        const spacer = current ? '\n' : '';
        this.messageInput.value = current + spacer + text;
        this.updateSendButton();
        this.autoResizeTextarea();
        this.messageInput.focus();
    }

    async captureSelectionFromPage() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tabs || tabs.length === 0) throw new Error('No active tab');
            const activeTab = tabs[0];
            const results = await browser.tabs.executeScript(activeTab.id, {
                code: `
                    (function(){
                        var sel = window.getSelection();
                        var text = sel ? sel.toString() : '';
                        if (!text) {
                            var el = document.activeElement;
                            if (el && (el.tagName==='TEXTAREA' || (el.tagName==='INPUT' && el.type==='text'))) {
                                text = el.value.substring(el.selectionStart||0, el.selectionEnd||0);
                            }
                        }
                        return text || '';
                    })();
                `
            });
            const selected = (results && results[0]) ? String(results[0]).trim() : '';
            if (!selected) {
                this.showErrorMessage('No text selected');
                return;
            }
            // Attach as a small text file for consistent handling
            const data = `data:text/plain;base64,${btoa(unescape(encodeURIComponent(selected)))}`;
            const file = {
                name: 'Selection.txt',
                type: 'text/plain',
                size: selected.length,
                dataUrl: data,
                isSelection: true,
                title: 'Selection'
            };
            this.attachedFiles.push(file);
            this.updateFilePreview();
            this.updateSendButton();
            this.showSuccessMessage('Selected text attached');
        } catch (e) {
            console.error('Selection capture failed:', e);
            this.showErrorMessage('Failed to capture selection');
        }
    }

    // Delete all chat history
    async deleteAllHistory() {
        if (!confirm('Are you sure you want to delete ALL chat history? This cannot be undone.')) {
            return;
        }
        try {
            await browser.storage.local.set({ chatHistory: [] });
            this.loadHistory();
            this.showSuccessMessage('All chat history deleted!');
        } catch (error) {
            console.error('Error deleting all history:', error);
            this.showErrorMessage('Error deleting all history');
        }
    }

    setupCopyHandlers() {
        // Event delegation for copy buttons
        this.chatMessages.addEventListener('click', (e) => {
            if (e.target.closest('.copy-code-btn')) {
                const button = e.target.closest('.copy-code-btn');
                const codeId = button.getAttribute('data-code-id');
                this.copyToClipboard(codeId, button);
            }
        });
    }

    copyToClipboard(elementId, button) {
        const element = document.getElementById(elementId);
        if (element) {
            const text = element.textContent;
            navigator.clipboard.writeText(text).then(() => {
                // Show success feedback
                const originalText = button.innerHTML;
                button.innerHTML = `
                    <i data-lucide="check" style="width:14px;height:14px;"></i>
                    Copied!
                `;
                if (window.lucide && typeof window.lucide.createIcons === 'function') {
                    window.lucide.createIcons();
                }
                button.classList.add('copied');
                setTimeout(() => {
                    button.innerHTML = originalText;
                    if (window.lucide && typeof window.lucide.createIcons === 'function') {
                        window.lucide.createIcons();
                    }
                    button.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                // Still show feedback even with fallback
                const originalText = button.innerHTML;
                button.innerHTML = `
                    <i data-lucide="check" style="width:14px;height:14px;"></i>
                    Copied!
                `;
                if (window.lucide && typeof window.lucide.createIcons === 'function') {
                    window.lucide.createIcons();
                }
                button.classList.add('copied');
                setTimeout(() => {
                    button.innerHTML = originalText;
                    if (window.lucide && typeof window.lucide.createIcons === 'function') {
                        window.lucide.createIcons();
                    }
                    button.classList.remove('copied');
                }, 2000);
            });
        }
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    updateSendButton() {
        const hasText = this.messageInput.value.trim().length > 0;
        const hasApiKey = this.apiKey.length > 0;
        const hasFiles = this.attachedFiles.length > 0;
        this.sendButton.disabled = (!hasText && !hasFiles) || !hasApiKey || this.isTyping;
    }

    toggleSettings() {
        console.log('🔄 toggleSettings() called');
        const isOpen = this.settingsPanel.classList.contains('open');
        console.log('📊 Current settings state:', isOpen ? 'OPEN' : 'CLOSED');
        
        if (isOpen) {
            console.log('❌ Closing settings panel via toggle');
            this.closeSettings();
        } else {
            console.log('✅ Opening settings panel');
            this.settingsPanel.classList.add('open');
            // Clear any inline styles to let CSS class handle the animation
            this.settingsPanel.style.transform = '';
            this.settingsPanel.style.transition = '';
        }
        
        console.log('📋 Settings panel classes after toggle:', this.settingsPanel.className);
    }

    closeSettings() {
        console.log('🔒 closeSettings() method called');
        // Remove the open class
        this.settingsPanel.classList.remove('open');
        // Force close with direct transform (more reliable)
        this.settingsPanel.style.transform = 'translateY(-100%)';
        this.settingsPanel.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        // After the transition, clean up inline styles so open works smoothly
        const cleanup = () => {
            this.settingsPanel.style.transform = '';
            this.settingsPanel.style.transition = '';
            this.settingsPanel.removeEventListener('transitionend', cleanup);
            console.log('🧹 Cleaned up inline styles after close animation');
        };
        this.settingsPanel.addEventListener('transitionend', cleanup);
        console.log('✅ Settings panel closed with direct transform');
    }

    togglePasswordVisibility(btn) {
        console.log('🔍 togglePasswordVisibility called with btn:', btn);
        
        if (!btn) {
            console.log('❌ No button provided');
            return;
        }
        
        // Find the input in the same .input-wrapper as the button
        const wrapper = btn.closest('.input-wrapper');
        console.log('🔍 Found wrapper:', wrapper);
        if (!wrapper) {
            console.log('❌ No wrapper found');
            return;
        }
        
        const input = wrapper.querySelector('input[type="password"], input[type="text"]');
        // Look for the i element directly inside the button (before Lucide replacement)
        // or the SVG element (after Lucide replacement)
        let iconElement = btn.querySelector('i[data-lucide]') || btn.querySelector('svg[data-lucide]') || btn.querySelector('svg');
        console.log('🔍 Found input:', input, 'iconElement:', iconElement);
        
        if (!input) {
            console.log('❌ No input found');
            return;
        }
        
        if (!iconElement) {
            console.log('❌ No icon found');
            return;
        }
        
        console.log('🔍 Current input type:', input.type);
        
        // Toggle password visibility
        if (input.type === 'password') {
            input.type = 'text';
            // Update the data-lucide attribute
            if (iconElement.hasAttribute('data-lucide')) {
                iconElement.setAttribute('data-lucide', 'eye-off');
            }
            console.log('✅ Changed to text, set eye-off');
        } else {
            input.type = 'password';
            // Update the data-lucide attribute
            if (iconElement.hasAttribute('data-lucide')) {
                iconElement.setAttribute('data-lucide', 'eye');
            }
            console.log('✅ Changed to password, set eye');
        }
        
        // Re-render Lucide icons
        renderLucideIcons();
        console.log('🔄 Lucide icons re-rendered');
    }

    async loadSettings() {
        try {
            const result = await browser.storage.local.get(['apiKey', 'openrouterApiKey', 'provider', 'model', 'includePageUrl']);
            this.apiKey = result.apiKey || '';
            this.openrouterApiKey = result.openrouterApiKey || '';
            this.provider = result.provider || 'google';
            this.model = result.model || 'gemini-2.5-flash';
            this.includePageUrl = !!result.includePageUrl;
            this.apiKeyInput.value = this.apiKey;
            this.openrouterApiKeyInput.value = this.openrouterApiKey;
            this.modelInput.value = this.model;
            if (this.providerSelect) this.providerSelect.value = this.provider;
            const includeUrlCheckbox = document.getElementById('includePageUrlCheckbox');
            if (includeUrlCheckbox) includeUrlCheckbox.checked = this.includePageUrl;
            this.handleProviderChange();
            this.updateSendButton();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        this.apiKey = this.apiKeyInput.value.trim();
        this.openrouterApiKey = this.openrouterApiKeyInput.value.trim();
        this.provider = this.providerSelect ? this.providerSelect.value : 'google';
        this.model = this.modelInput.value.trim();
        const includeUrlCheckbox = document.getElementById('includePageUrlCheckbox');
        this.includePageUrl = !!(includeUrlCheckbox && includeUrlCheckbox.checked);

        try {
            await browser.storage.local.set({
                apiKey: this.apiKey,
                openrouterApiKey: this.openrouterApiKey,
                provider: this.provider,
                model: this.model,
                includePageUrl: this.includePageUrl
            });
            // Force close the settings panel
            this.settingsPanel.classList.remove('open');
            this.updateSendButton();
            this.showSuccessMessage('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showErrorMessage('Failed to save settings');
            // Still close the panel even if there's an error
            this.settingsPanel.classList.remove('open');
        }
    }

    handleProviderChange() {
        if (!this.providerSelect) return;
        const provider = this.providerSelect.value;
        const geminiWrapper = document.getElementById('geminiKeyWrapper');
        const openrouterWrapper = document.getElementById('openrouterKeyWrapper');
        
        // Remove existing API key links
        const existingLinks = document.querySelectorAll('.api-key-link');
        existingLinks.forEach(link => link.remove());
        
        if (provider === 'google') {
            if (geminiWrapper) geminiWrapper.style.display = '';
            if (openrouterWrapper) openrouterWrapper.style.display = 'none';
            this.apiKeyLabel.textContent = 'Gemini API Key';
            this.apiKeyInput.placeholder = 'Enter your Gemini API key';
            
            // Add Google AI Studio link
            this.addApiKeyLink(geminiWrapper, 'Get your API key', 'https://aistudio.google.com/app/apikey');
        } else if (provider === 'openrouter') {
            if (geminiWrapper) geminiWrapper.style.display = 'none';
            if (openrouterWrapper) openrouterWrapper.style.display = '';
            this.apiKeyLabel.textContent = 'OpenRouter API Key';
            this.openrouterApiKeyInput.placeholder = 'Enter your OpenRouter API key';
            
            // Add OpenRouter link
            this.addApiKeyLink(openrouterWrapper, 'Get your API key', 'https://openrouter.ai/keys');
        }
    }

    addApiKeyLink(wrapper, text, url) {
        if (!wrapper) return;
        
        const linkElement = document.createElement('div');
        linkElement.className = 'api-key-link';
        linkElement.innerHTML = `
            <a href="${url}" target="_blank" class="api-key-help-link">
                <i data-lucide="external-link" style="width:14px;height:14px;"></i>
                ${text}
            </a>
        `;
        
        // Insert after the input wrapper
        wrapper.parentNode.insertBefore(linkElement, wrapper.nextSibling);
        
        // Re-render Lucide icons for the new link
        renderLucideIcons();
    }

    showSuccessMessage(message) {
        // Friendlier, less technical success messages
        let friendlyMsg = message;
        if (message.includes('Transcript fetched')) friendlyMsg = 'Got the transcript!';
        else if (message.includes('Settings saved')) friendlyMsg = 'Settings updated!';
        else if (message.includes('Captured content')) friendlyMsg = 'Webpage captured!';
        else if (message.includes('Screenshot captured')) friendlyMsg = 'Screenshot saved!';
        else if (message.includes('All chat history deleted')) friendlyMsg = 'Chat history cleared.';
        this.showToast(friendlyMsg, 'success');
    }

    showErrorMessage(message) {
        // Friendlier, less technical error messages
        let friendlyMsg = message;
        if (message.includes('Server unavailable')) friendlyMsg = 'Couldn\'t get the transcript. Trying another way...';
        else if (message.includes('No transcript found')) friendlyMsg = 'No transcript found for this video.';
        else if (message.includes('Failed to save settings')) friendlyMsg = 'Couldn\'t save your settings.';
        else if (message.includes('Failed to capture tab content')) friendlyMsg = 'Couldn\'t capture this page.';
        else if (message.includes('Failed to capture screenshot')) friendlyMsg = 'Couldn\'t take a screenshot.';
        else if (message.includes('Error deleting all history')) friendlyMsg = 'Couldn\'t clear chat history.';
        else if (message.includes('No message to retry')) friendlyMsg = 'Nothing to retry yet.';
        else if (message.includes('Failed to get response from AI')) friendlyMsg = 'Hmm, something went wrong. Try again!';
        this.showToast(friendlyMsg, 'error');
    }

    showToast(message, type = 'success') {
        // Remove any existing toast
        const existingToast = document.querySelector('.ai-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `ai-toast ai-toast-${type}`;
        toast.innerHTML = `
            <span class="ai-toast-icon">${type === 'success' ? '✓' : '✕'}</span>
            <span class="ai-toast-message">${message}</span>
        `;

        // Insert above the input box (before input's parent container)
        if (this.messageInput && this.messageInput.parentNode) {
            const inputWrapper = this.messageInput.parentNode;
            if (inputWrapper.previousElementSibling) {
                inputWrapper.parentNode.insertBefore(toast, inputWrapper);
            } else {
                inputWrapper.parentNode.insertBefore(toast, inputWrapper.nextSibling);
            }
        } else {
            document.body.appendChild(toast);
        }

        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showRetryButton() {
        // Remove any existing retry button
        const existingRetry = document.querySelector('.retry-button');
        if (existingRetry) {
            existingRetry.remove();
        }

        const retryDiv = document.createElement('div');
        retryDiv.className = 'retry-container';
        retryDiv.innerHTML = `
            <button class="retry-button">
                <i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i>
                Retry last message
            </button>
        `;
        
        this.chatMessages.appendChild(retryDiv);
        this.scrollToBottom();

        // Add click event
        const retryButton = retryDiv.querySelector('.retry-button');
        retryButton.addEventListener('click', () => {
            this.retryLastMessage();
            retryDiv.remove();
        });
    }

    async retryLastMessage() {
        if (!this.lastMessage && this.lastFiles.length === 0) {
            this.showErrorMessage('No message to retry');
            return;
        }

        // Restore the input and files
        this.messageInput.value = this.lastMessage || '';
        this.attachedFiles = [...this.lastFiles];
        this.updateFilePreview();
        this.autoResizeTextarea();
        this.updateSendButton();

        // Send the message
        await this.sendMessage();
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if ((!message && this.attachedFiles.length === 0) || !this.apiKey || this.isTyping) return;

        // If message contains @mentions, attach those tabs before sending
        await this.attachMentionedTabsIfAny(message);

        // Store files before clearing
        const filesToSend = [...this.attachedFiles];
        
        // Store last message and files for retry functionality
        this.lastMessage = message;
        this.lastFiles = [...filesToSend];

        // Add user message with files
        this.addMessage(message, 'user', false, filesToSend);
        this.messageInput.value = '';
        this.clearAttachedFiles();
        this.autoResizeTextarea();
        this.updateSendButton();

        // Show typing indicator and stop button
        this.showTypingIndicator();
        this.sendButton.style.display = 'none';
        this.stopButton.style.display = 'flex';

        try {
            const response = await this.callGeminiAPI(message, filesToSend);
            
            // Switch to streaming indicator before starting to stream
            this.showStreamingIndicator();
            
            // Create AI message container for streaming
            const aiMessageContent = this.addMessage('', 'ai', true, [], false);
            this.hideTypingIndicator();
            
            // Track if streaming was stopped
            let wasAborted = false;
            await this.streamText(response, aiMessageContent, () => {
                wasAborted = true;
            });

            // Only add the AI response to history if not aborted
            if (!wasAborted) {
                this.messages.push({ content: response, sender: 'ai', timestamp: Date.now(), files: [] });
                // Auto-save session after successful response
                await this.saveCurrentSession();
            }
        } catch (error) {
            this.hideTypingIndicator();
            if (error.name === 'AbortError') {
                this.showErrorMessage('Request stopped by user');
                this.showRetryButton();
            } else {
                this.showErrorMessage('Failed to get response from AI. Please check your API key and try again.');
                this.showRetryButton();
                console.error('API Error:', error);
            }
        } finally {
            // Reset buttons
            this.sendButton.style.display = 'flex';
            this.stopButton.style.display = 'none';
            this.updateSendButton();
        }
    }

    addMessage(content, sender, isStreaming = false, files = [], addToHistory = true) {
        // Remove welcome message if it exists
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        if (sender === 'user') {
            avatar.textContent = 'U';
        } else {
            avatar.innerHTML = `<i data-lucide="bot" style="width:16px;height:16px;"></i>`;
        }

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Add files if any
        if (files && files.length > 0) {
            const filesDiv = document.createElement('div');
            filesDiv.className = 'message-files';
            files.forEach(file => {
                const fileDiv = document.createElement('div');
                fileDiv.className = 'file-item';
                
                if (file.isWebpage) {
                    fileDiv.innerHTML = `
                        <div class="file-icon">🌐</div>
                        <div class="file-info">
                            <div class="file-name">${file.title || file.name}</div>
                            <div class="file-size">${file.url}</div>
                        </div>
                    `;
                } else if (file.type.startsWith('image/')) {
                    fileDiv.innerHTML = `
                        <div class="file-icon">
                            <img src="${file.dataUrl}" alt="${file.name}">
                        </div>
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${this.formatFileSize(file.size)}</div>
                        </div>
                    `;
                } else {
                    fileDiv.innerHTML = `
                        <div class="file-icon">📄</div>
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${this.formatFileSize(file.size)}</div>
                        </div>
                    `;
                }
                filesDiv.appendChild(fileDiv);
            });
            messageContent.appendChild(filesDiv);
        }
        
        if (isStreaming) {
            messageContent.className += ' typing-text';
            const textDiv = document.createElement('div');
            messageContent.appendChild(textDiv);
        } else if (content) {
            const textDiv = document.createElement('div');
            if (sender === 'ai') {
                // Render markdown for AI responses
                const html = this.parseMarkdown(content);
                textDiv.innerHTML = html;
            } else {
                textDiv.textContent = content;
            }
            messageContent.appendChild(textDiv);
        }

        // Message utilities: copy message and retry (for AI) buttons
        const actionsBar = document.createElement('div');
        actionsBar.className = 'message-actions';
        const copyBtn = document.createElement('button');
        copyBtn.className = 'history-action-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', () => {
            const text = content || '';
            try {
                navigator.clipboard.writeText(text);
            } catch (_){
                const temp = document.createElement('textarea');
                temp.value = text;
                document.body.appendChild(temp);
                temp.select();
                document.execCommand('copy');
                document.body.removeChild(temp);
            }
            this.showSuccessMessage('Message copied');
        });
        actionsBar.appendChild(copyBtn);
        if (sender === 'ai' && !isStreaming) {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'history-action-btn';
            retryBtn.textContent = 'Retry';
            retryBtn.addEventListener('click', () => this.retryLastMessage());
            actionsBar.appendChild(retryBtn);
        }
        messageContent.appendChild(actionsBar);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        this.chatMessages.appendChild(messageDiv);
        
        // Render icons after message is added to DOM
        if (sender === 'ai') {
            renderLucideIcons();
        }
        
        this.scrollToBottom();

        // Store message in history only if specified (avoid duplicates when loading sessions)
        if (addToHistory) {
            this.messages.push({ content, sender, timestamp: Date.now(), files });
        }

        return isStreaming ? messageContent.lastElementChild : messageContent;
    }

    showTypingIndicator() {
        this.isTyping = true;
        this.updateSendButton();

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai typing-message';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i data-lucide="bot" style="width:16px;height:16px;"></i>
            </div>
            <div class="message-content">
                <div class="thinking-indicator">
                    Thinking<span class="thinking-dots">...</span>
                </div>
            </div>
        `;

        this.chatMessages.appendChild(typingDiv);
        renderLucideIcons();
        this.scrollToBottom();
    }

    showStreamingIndicator() {
        const typingMessage = document.querySelector('.typing-message');
        if (typingMessage) {
            const messageContent = typingMessage.querySelector('.message-content');
            messageContent.innerHTML = `
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            `;
        }
    }

    hideTypingIndicator() {
        this.isTyping = false;
        this.updateSendButton();

        const typingMessage = document.querySelector('.typing-message');
        if (typingMessage) {
            typingMessage.remove();
        }
    }

    async streamText(text, messageElement, onAbort) {
        this.isStreaming = true;
        messageElement.innerHTML = '';
        const words = text.split(' ');
        let currentText = '';
        let wasAborted = false;
        for (let i = 0; i < words.length; i++) {
            // Check if request was aborted or streaming was stopped
            if ((this.abortController && this.abortController.signal.aborted) || !this.isStreaming) {
                console.log('Streaming stopped by user');
                wasAborted = true;
                if (onAbort) onAbort();
                break;
            }
            // Use abortable timeout
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(resolve, 50 + Math.random() * 100);
                    if (this.abortController) {
                        this.abortController.signal.addEventListener('abort', () => {
                            clearTimeout(timeout);
                            reject(new Error('Aborted'));
                        });
                    }
                });
            } catch (error) {
                if (error.message === 'Aborted') {
                    console.log('Streaming aborted during timeout');
                    wasAborted = true;
                    if (onAbort) onAbort();
                    break;
                }
            }
            // Double check if still streaming
            if (!this.isStreaming) {
                wasAborted = true;
                if (onAbort) onAbort();
                break;
            }
            if (i === 0) {
                currentText = words[i];
            } else {
                currentText += ' ' + words[i];
            }
            // Render markdown in real-time with progressive code block support
            const fenceMatches = currentText.match(/```/g);
            if (fenceMatches && fenceMatches.length % 2 === 1) {
                // There is an open (unclosed) code fence → render everything before as markdown,
                // and render a live code block for the open fence content
                const openIndex = currentText.lastIndexOf('```');
                const beforeFence = currentText.slice(0, openIndex);
                const afterFence = currentText.slice(openIndex + 3);

                // Extract optional language and code content so far
                let languageLabel = 'Code';
                let codeSoFar = '';
                const firstLineBreakIdx = afterFence.indexOf('\n');
                if (firstLineBreakIdx !== -1) {
                    const possibleLang = afterFence.slice(0, firstLineBreakIdx).trim();
                    if (possibleLang.length > 0 && /^[a-zA-Z0-9_\-]+$/.test(possibleLang)) {
                        languageLabel = possibleLang;
                        codeSoFar = afterFence.slice(firstLineBreakIdx + 1);
                    } else {
                        codeSoFar = afterFence;
                    }
                } else {
                    const possibleLang = afterFence.trim();
                    if (possibleLang.length > 0 && /^[a-zA-Z0-9_\-]+$/.test(possibleLang)) {
                        languageLabel = possibleLang;
                    }
                    codeSoFar = '';
                }

                const htmlBefore = this.parseMarkdown(beforeFence);
                if (!messageElement.dataset.liveCodeId) {
                    messageElement.dataset.liveCodeId = 'code_live_' + Math.random().toString(36).slice(2, 9);
                }
                const codeId = messageElement.dataset.liveCodeId;

                const escapeHtml = (str) => str
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\"/g, '&quot;')
                    .replace(/'/g, '&#39;');
                const escapedCode = escapeHtml(codeSoFar);

                const liveBlock = `
                    <div class="code-block-container">
                        <div class="code-block-header">
                            <span class="code-block-language">${languageLabel}</span>
                            <button class="copy-code-btn" data-code-id="${codeId}">
                                <i data-lucide="copy" style="width:14px;height:14px;"></i>
                                Copy
                            </button>
                        </div>
                        <pre><code id="${codeId}" class="language-${languageLabel}">${escapedCode}</code></pre>
                    </div>
                `;

                messageElement.innerHTML = htmlBefore + liveBlock;
                renderLucideIcons();
                this.scrollToBottom();
            } else {
                // No open fence → render normally
                const html = this.parseMarkdown(currentText);
                messageElement.innerHTML = html;
                this.scrollToBottom();
            }
        }
        this.isStreaming = false;
        // Remove typing cursor animation
        messageElement.parentElement.classList.remove('typing-text');
        // Ensure icons (e.g., copy button) render after the final content is in place
        renderLucideIcons();
        return !wasAborted;
    }

    handleFileSelect(files) {
        Array.from(files).forEach(file => {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                this.showErrorMessage(`File ${file.name} is too large. Maximum size is 10MB.`);
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl: e.target.result
                };
                this.attachedFiles.push(fileData);
                this.updateFilePreview();
                this.updateSendButton();
            };
            reader.readAsDataURL(file);
        });
        
        // Clear the input
        this.fileInput.value = '';
    }

    handlePaste(event) {
        const items = event.clipboardData.items;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // Check if the item is an image
            if (item.type.indexOf('image') !== -1) {
                event.preventDefault(); // Prevent default paste behavior
                
                const file = item.getAsFile();
                if (file) {
                    // Create a file-like object similar to file input
                    const fileList = [file];
                    this.handleFileSelect(fileList);
                }
                break;
            }
        }
    }

    // ===== @mention (open tabs) =====
    setupMentionUI() {
        const wrapper = document.querySelector('.chat-input-wrapper');
        if (!wrapper) return;
        const dropdown = document.createElement('div');
        dropdown.className = 'mention-dropdown';
        dropdown.innerHTML = `<ul class="mention-list"></ul>`;
        wrapper.appendChild(dropdown);
        this.mentionDropdownEl = dropdown;
        this.mentionListEl = dropdown.querySelector('.mention-list');

        // Click outside closes
        document.addEventListener('click', (e) => {
            if (!this.isMentionOpen) return;
            if (!dropdown.contains(e.target) && e.target !== this.messageInput) {
                this.closeMention();
            }
        });
    }

    async fetchOpenTabs() {
        try {
            const tabs = await browser.tabs.query({ currentWindow: true });
            this.mentionTabs = tabs.filter(t => t.url && !/^about:|^chrome:|^chrome-extension:|^moz-extension:/.test(t.url));
        } catch (e) {
            console.error('Error fetching tabs for mentions:', e);
            this.mentionTabs = [];
        }
    }

    getHostname(url) {
        try { return new URL(url).hostname.replace(/^www\./,''); } catch { return ''; }
    }

    onInputForMention() {
        const value = this.messageInput.value;
        const caret = this.messageInput.selectionStart || 0;
        // Find a trigger '@' immediately preceding caret with no whitespace between
        let trigger = -1;
        for (let i = caret - 1; i >= 0; i--) {
            const ch = value[i];
            if (ch === '@') { trigger = i; break; }
            if (/\s/.test(ch)) break; // stop at whitespace
        }
        if (trigger >= 0) {
            this.mentionTriggerPos = trigger;
            const term = value.slice(trigger + 1, caret).toLowerCase();
            this.openMention(term);
        } else if (this.isMentionOpen) {
            this.closeMention();
        }
    }

    async openMention(term) {
        if (!this.isMentionOpen) {
            await this.fetchOpenTabs();
        }
        this.isMentionOpen = true;
        const q = (term || '').trim();
        const tabs = this.mentionTabs;
        const filtered = tabs
            .map(t => ({
                id: t.id,
                title: t.title || this.getHostname(t.url) || t.url,
                url: t.url,
                favIconUrl: t.favIconUrl || ''
            }))
            .filter(t => {
                if (!q) return true;
                const host = this.getHostname(t.url).toLowerCase();
                return t.title.toLowerCase().includes(q) || host.includes(q);
            })
            .slice(0, 20);
        this.mentionFiltered = filtered;
        this.mentionSelectedIndex = 0;
        this.renderMentionList();
    }

    closeMention() {
        this.isMentionOpen = false;
        this.mentionTriggerPos = null;
        this.mentionFiltered = [];
        this.mentionSelectedIndex = 0;
        if (this.mentionDropdownEl) this.mentionDropdownEl.style.display = 'none';
    }

    renderMentionList() {
        if (!this.mentionDropdownEl || !this.mentionListEl) return;
        if (!this.isMentionOpen || this.mentionFiltered.length === 0) {
            this.mentionDropdownEl.style.display = 'none';
            return;
        }
        this.mentionDropdownEl.style.display = 'block';
        this.mentionListEl.innerHTML = '';
        this.mentionFiltered.forEach((t, idx) => {
            const li = document.createElement('li');
            li.className = 'mention-item' + (idx === this.mentionSelectedIndex ? ' active' : '');
            const host = this.getHostname(t.url);
            const img = document.createElement('img');
            img.className = 'mention-favicon';
            if (t.favIconUrl) img.src = t.favIconUrl;
            img.alt = '';
            img.addEventListener('error', () => { img.style.display = 'none'; });
            const texts = document.createElement('div');
            texts.className = 'mention-texts';
            const primary = document.createElement('div');
            primary.className = 'mention-primary';
            primary.textContent = t.title;
            const secondary = document.createElement('div');
            secondary.className = 'mention-secondary';
            secondary.textContent = host;
            texts.appendChild(primary);
            texts.appendChild(secondary);
            li.appendChild(img);
            li.appendChild(texts);
            li.addEventListener('mousedown', (e) => { // mousedown to commit before blur
                e.preventDefault();
                this.mentionSelectedIndex = idx;
                this.commitMention();
            });
            this.mentionListEl.appendChild(li);
        });
    }

    moveMentionSelection(delta) {
        if (!this.isMentionOpen || this.mentionFiltered.length === 0) return;
        const n = this.mentionFiltered.length;
        this.mentionSelectedIndex = (this.mentionSelectedIndex + delta + n) % n;
        this.renderMentionList();
    }

    sanitizeLabel(text) {
        return text.toLowerCase()
            .replace(/https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/[^a-z0-9\-_.]+/g, '-')
            .replace(/-{2,}/g, '-')
            .replace(/^-|-$|\.$/g, '')
            .slice(0, 40);
    }

    async commitMention() {
        if (!this.isMentionOpen || this.mentionFiltered.length === 0 || this.mentionTriggerPos == null) return;
        const chosen = this.mentionFiltered[this.mentionSelectedIndex];
        const host = this.getHostname(chosen.url);
        const baseLabel = this.sanitizeLabel(host || chosen.title || 'tab');
        // ensure uniqueness if same label already used
        let label = baseLabel || 'tab';
        let suffix = 2;
        while (this.mentionLabelToTabId[label]) {
            label = `${baseLabel}-${suffix++}`;
        }
        this.mentionLabelToTabId[label] = chosen.id;

        // Replace the trigger text from mentionTriggerPos..caret with @label + space
        const value = this.messageInput.value;
        const caret = this.messageInput.selectionStart || 0;
        const before = value.slice(0, this.mentionTriggerPos);
        const after = value.slice(caret);
        const insertion = `@${label} `;
        this.messageInput.value = before + insertion + after;
        const newCaret = (before + insertion).length;
        this.messageInput.setSelectionRange(newCaret, newCaret);
        this.closeMention();
        this.updateSendButton();
        this.autoResizeTextarea();

        // Immediately capture and attach selected tab content (avoid duplicates)
        try {
            if (!this.attachedTabIds.has(chosen.id)) {
                const file = await this.captureTabAsFile(chosen);
                if (file) {
                    this.attachedFiles.push(file);
                    this.attachedTabIds.add(chosen.id);
                    this.updateFilePreview();
                    this.updateSendButton();
                    this.showSuccessMessage(`Captured content from: ${file.title || 'Tab'}`);
                }
            }
        } catch (e) {
            this.showErrorMessage('Failed to capture mentioned tab');
        }
    }

    async attachMentionedTabsIfAny(message) {
        if (!message || !message.includes('@')) return;
        // Extract tokens like @label
        const tokens = new Set();
        const re = /@([a-z0-9._-]{2,50})/gi;
        let m;
        while ((m = re.exec(message)) !== null) {
            tokens.add(m[1].toLowerCase());
        }
        if (tokens.size === 0) return;

        // Get current tabs
        await this.fetchOpenTabs();
        const tabsById = new Map(this.mentionTabs.map(t => [t.id, t]));
        const tabs = this.mentionTabs;
        const used = new Set();
        let attachedCount = 0;

        for (const token of tokens) {
            let matchedTabs = [];
            const mappedId = this.mentionLabelToTabId[token];
            if (mappedId && tabsById.has(mappedId)) {
                matchedTabs = [tabsById.get(mappedId)];
            } else {
                // fuzzy match: any tab whose title or host contains token
                matchedTabs = tabs.filter(t => {
                    const host = this.getHostname(t.url).toLowerCase();
                    const title = (t.title || '').toLowerCase();
                    return host.includes(token) || title.includes(token);
                });
            }
            for (const t of matchedTabs) {
                if (used.has(t.id) || this.attachedTabIds.has(t.id)) continue;
                const file = await this.captureTabAsFile(t).catch(() => null);
                if (file) {
                    this.attachedFiles.push(file);
                    this.attachedTabIds.add(t.id);
                    attachedCount += 1;
                    used.add(t.id);
                }
            }
        }
        if (attachedCount > 0) {
            this.updateFilePreview();
            this.updateSendButton();
            this.showSuccessMessage(`Attached ${attachedCount} tab${attachedCount>1?'s':''} via mentions`);
        }
    }

    async captureTabAsFile(tab) {
        // Guard internal pages
        const url = tab.url || '';
        if (/^about:|^chrome:|^chrome-extension:|^moz-extension:/.test(url)) {
            throw new Error('Cannot capture internal pages');
        }
        try {
            const results = await browser.tabs.executeScript(tab.id, {
                code: `
                    (function() {
                        const title = document.title;
                        const url = window.location.href;
                        let content = '';
                        const contentSelectors = ['main','[role="main"]','article','.content','.main-content','.post-content','.entry-content','.article-content','body'];
                        let contentElement = null;
                        for (const selector of contentSelectors) {
                            contentElement = document.querySelector(selector);
                            if (contentElement) break;
                        }
                        if (contentElement) {
                            const scripts = contentElement.querySelectorAll('script, style, nav, header, footer, .sidebar, .ads, .advertisement');
                            scripts.forEach(el => el.remove());
                            content = contentElement.innerText || contentElement.textContent || '';
                        } else {
                            content = document.body.innerText || document.body.textContent || '';
                        }
                        content = content.replace(/\\s+/g,' ').replace(/\\n\\s*\\n/g,'\\n').trim();
                        if (content.length > 10000) {
                            content = content.substring(0, 10000) + '...\\n[Content truncated for length]';
                        }
                        return { title, url, content };
                    })();
                `
            });
            if (!results || results.length === 0) throw new Error('No content');
            const pageData = results[0];
            return {
                name: `${pageData.title || 'Webpage'}.txt`,
                type: 'text/plain',
                size: pageData.content.length,
                dataUrl: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(
                    `Title: ${pageData.title}\nURL: ${pageData.url}\n\n${pageData.content}`
                )))}`,
                isWebpage: true,
                url: pageData.url,
                title: pageData.title,
                tabId: tab.id
            };
        } catch (err) {
            // Fallback attach stub with title + URL so the AI still has context
            const title = tab.title || this.getHostname(tab.url) || 'Tab';
            const urlText = tab.url || '';
            const stub = `Title: ${title}\nURL: ${urlText}\n\n[Note] Could not capture page text due to site restrictions or permissions.`;
            return {
                name: `${title}.txt`,
                type: 'text/plain',
                size: stub.length,
                dataUrl: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(stub)))}`,
                isWebpage: true,
                url: urlText,
                title,
                tabId: tab.id,
                isStub: true
            };
        }
    }

    async captureCurrentTab() {
        try {
            // Disable button during capture
            this.captureTabButton.disabled = true;
            this.captureTabButton.innerHTML = `
                <i data-lucide="loader-2" class="lucide-spin" style="width:20px;height:20px;"></i>
            `;
            renderLucideIcons();

            // Get the active tab
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tabs || tabs.length === 0) {
                throw new Error('No active tab found');
            }

            const activeTab = tabs[0];
            
            // Check if we can access this tab (not a chrome:// or browser internal page)
            if (activeTab.url.startsWith('chrome://') || 
                activeTab.url.startsWith('moz-extension://') || 
                activeTab.url.startsWith('chrome-extension://') ||
                activeTab.url.startsWith('about:')) {
                throw new Error('Cannot capture content from browser internal pages');
            }

            // Execute script to get page content
            const results = await browser.tabs.executeScript(activeTab.id, {
                code: `
                    (function() {
                        // Get page title
                        const title = document.title;
                        
                        // Get page URL
                        const url = window.location.href;
                        
                        // Get main content (try to find main content areas)
                        let content = '';
                        
                        // Try to get main content from common selectors
                        const contentSelectors = [
                            'main',
                            '[role="main"]',
                            'article',
                            '.content',
                            '.main-content',
                            '.post-content',
                            '.entry-content',
                            '.article-content',
                            'body'
                        ];
                        
                        let contentElement = null;
                        for (const selector of contentSelectors) {
                            contentElement = document.querySelector(selector);
                            if (contentElement) break;
                        }
                        
                        if (contentElement) {
                            // Remove script and style elements
                            const scripts = contentElement.querySelectorAll('script, style, nav, header, footer, .sidebar, .ads, .advertisement');
                            scripts.forEach(el => el.remove());
                            
                            content = contentElement.innerText || contentElement.textContent || '';
                        } else {
                            content = document.body.innerText || document.body.textContent || '';
                        }
                        
                        // Clean up the content
                        content = content
                            .replace(/\\s+/g, ' ')  // Replace multiple whitespace with single space
                            .replace(/\\n\\s*\\n/g, '\\n')  // Remove empty lines
                            .trim();
                        
                        // Limit content length to avoid API limits
                        if (content.length > 10000) {
                            content = content.substring(0, 10000) + '...\\n[Content truncated for length]';
                        }
                        
                        return {
                            title: title,
                            url: url,
                            content: content
                        };
                    })();
                `
            });

            if (!results || results.length === 0) {
                throw new Error('Failed to capture tab content');
            }

            const pageData = results[0];
            
            // Create a "file" object with the page content
            const webpageFile = {
                name: `${pageData.title || 'Webpage'}.txt`,
                type: 'text/plain',
                size: pageData.content.length,
                dataUrl: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(
                    `Title: ${pageData.title}\nURL: ${pageData.url}\n\n${pageData.content}`
                )))}`,
                isWebpage: true,
                url: pageData.url,
                title: pageData.title
            };

            // Add to attached files
            this.attachedFiles.push(webpageFile);
            this.updateFilePreview();
            this.updateSendButton();
            
            this.showSuccessMessage(`Captured content from: ${pageData.title}`);

        } catch (error) {
            console.error('Error capturing tab content:', error);
            this.showErrorMessage(`Failed to capture tab content: ${error.message}`);
        } finally {
            // Re-enable button and restore icon
            this.captureTabButton.disabled = false;
            this.captureTabButton.innerHTML = `
                <i data-lucide="copy" style="width:20px;height:20px;"></i>
            `;
            renderLucideIcons();
        }
    }

    async captureScreenshot() {
        try {
            // Disable button during capture
            this.screenshotButton.disabled = true;
            this.screenshotButton.innerHTML = `
                <i data-lucide="loader-2" class="lucide-spin" style="width:20px;height:20px;"></i>
            `;
            renderLucideIcons();

            // Get the active tab
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tabs || tabs.length === 0) {
                throw new Error('No active tab found');
            }

            const activeTab = tabs[0];
            
            // Check if we can access this tab
            if (activeTab.url.startsWith('chrome://') || 
                activeTab.url.startsWith('moz-extension://') || 
                activeTab.url.startsWith('chrome-extension://') ||
                activeTab.url.startsWith('about:')) {
                throw new Error('Cannot capture screenshot from browser internal pages');
            }

            // Use browser.tabs.captureTab to get a screenshot
            const dataUrl = await browser.tabs.captureTab(activeTab.id, {
                format: 'png',
                quality: 90
            });

            // Get page title and URL for context
            const pageData = await browser.tabs.executeScript(activeTab.id, {
                code: `({
                    title: document.title,
                    url: window.location.href,
                    hasVideo: !!document.querySelector('video')
                })`
            });

            const { title, url, hasVideo } = pageData[0];

            // Create a screenshot file object
            const screenshot = {
                name: `Screenshot - ${title || 'Current Tab'}.png`,
                type: 'image/png',
                size: dataUrl.length,
                dataUrl: dataUrl,
                isScreenshot: true,
                hasVideo: hasVideo,
                url: url,
                title: title,
                timestamp: new Date().toISOString()
            };

            // Add to attached files
            this.attachedFiles.push(screenshot);
            this.updateFilePreview();
            this.updateSendButton();
            
            this.showSuccessMessage(`📷 Screenshot captured from: ${title}`);

        } catch (error) {
            console.error('Error capturing screenshot:', error);
            let errorMessage = 'Failed to capture screenshot';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Screenshot permission denied. Please allow tab capture and try again.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Screenshot capture not supported in this browser.';
            } else if (error.message) {
                errorMessage = `Failed to capture screenshot: ${error.message}`;
            }
            
            this.showErrorMessage(errorMessage);
        } finally {
            // Re-enable button and restore icon
            this.screenshotButton.disabled = false;
            this.screenshotButton.innerHTML = `
                <i data-lucide="camera" style="width:20px;height:20px;"></i>
            `;
            renderLucideIcons();
        }
    }

    async analyzeYouTubeVideo() {
        try {
            // Disable button during analysis
            this.youtubeAnalysisButton.disabled = true;
            this.youtubeAnalysisButton.innerHTML = `
                <i data-lucide="loader-2" class="lucide-spin" style="width:20px;height:20px;"></i>
            `;
            renderLucideIcons();

            // Get the active tab
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tabs || tabs.length === 0) {
                throw new Error('No active tab found');
            }

            const activeTab = tabs[0];

            // Check if this is a YouTube page
            const isYouTube = activeTab.url.includes('youtube.com/watch') || activeTab.url.includes('youtu.be/');

            if (!isYouTube) {
                throw new Error('This feature only works on YouTube video pages');
            }

            // Try to get video ID
            const videoIdMatch = activeTab.url.match(/[?&]v=([^&]+)/) || activeTab.url.match(/youtu\.be\/([^?&]+)/);
            const videoId = videoIdMatch ? videoIdMatch[1] : null;
            if (videoId) {
                // Always use backend transcript; do not attempt local extraction
                await this.fetchTranscriptFromServer(videoId);
                // Proceed to capture analysis (frame + metadata) regardless of transcript
                await this.captureYouTubeVideoAnalysis(activeTab);
            } else {
                // If no videoId, still capture frame + metadata
                await this.captureYouTubeVideoAnalysis(activeTab);
            }

        } catch (error) {
            console.error('Error analyzing YouTube video:', error);
            let errorMessage = 'Failed to analyze YouTube video';
            
            if (error.message.includes('only works on YouTube')) {
                errorMessage = 'This feature only works on YouTube video pages. Please navigate to a YouTube video.';
            } else if (error.message) {
                errorMessage = `Failed to analyze video: ${error.message}`;
            }
            
            this.showErrorMessage(errorMessage);
        } finally {
            // Re-enable button and restore icon
            this.youtubeAnalysisButton.disabled = false;
            this.youtubeAnalysisButton.innerHTML = `
                <i data-lucide="youtube" style="width:20px;height:20px;"></i>
            `;
            renderLucideIcons();
        }
    }

    async captureVideoFrame() {
        try {
            // Disable button during capture
            this.captureVideoButton.disabled = true;
            this.captureVideoButton.innerHTML = `
                <i data-lucide="loader-2" class="lucide-spin" style="width:20px;height:20px;"></i>
            `;
            renderLucideIcons();

            // Get the active tab
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tabs || tabs.length === 0) {
                throw new Error('No active tab found');
            }

            const activeTab = tabs[0];
            
            // Check if we can access this tab
            if (activeTab.url.startsWith('chrome://') || 
                activeTab.url.startsWith('moz-extension://') || 
                activeTab.url.startsWith('chrome-extension://') ||
                activeTab.url.startsWith('about:')) {
                throw new Error('Cannot capture video from browser internal pages');
            }

            // Check if this is a YouTube page
            const isYouTube = activeTab.url.includes('youtube.com/watch') || activeTab.url.includes('youtu.be/');
            
            if (isYouTube) {
                await this.captureYouTubeVideoAnalysis(activeTab);
            } else {
                // Fallback to screenshot for non-YouTube pages
                await this.captureRegularVideoFrame(activeTab);
            }

        } catch (error) {
            console.error('Error capturing video:', error);
            let errorMessage = 'Failed to capture video content';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Permission denied. Please allow the required permissions and try again.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Video capture not supported in this browser.';
            } else if (error.message) {
                errorMessage = `Failed to capture video: ${error.message}`;
            }
            
            this.showErrorMessage(errorMessage);
        } finally {
            // Re-enable button and restore icon
            this.captureVideoButton.disabled = false;
            this.captureVideoButton.innerHTML = `
                <i data-lucide="video" style="width:20px;height:20px;"></i>
            `;
            renderLucideIcons();
        }
    }

    async captureYouTubeVideoAnalysis(activeTab) {
        // Execute comprehensive YouTube analysis script with transcript API fetch
        const results = await browser.tabs.executeScript(activeTab.id, {
            code: `
                (function() {
                    return (async function() {
                        try {
                            var title = document.title.replace(' - YouTube', '');
                            var url = window.location.href;
                            var videoIdMatch = url.match(/[?&]v=([^&]+)/);
                            var videoId = videoIdMatch ? videoIdMatch[1] : null;
                            var video = document.querySelector('video');
                            if (!video) {
                                throw new Error('No video element found on this page');
                            }
                            var duration = video.duration || 0;
                            var currentTime = video.currentTime || 0;
                            var transcript = '';
                            var captionsEnabled = false;
                            try {
                                // Check if captions are enabled (look for CC button or transcript menu)
                                var ccButton = document.querySelector('.ytp-subtitles-button[aria-pressed="true"], .ytp-subtitles-button[aria-label*="subtitles"]');
                                if (ccButton) {
                                    captionsEnabled = true;
                                }
                                // Step 1: Fetch available transcript languages
                                var transcriptLangs = [];
                                if (videoId) {
                                    var listUrl = 'https://www.youtube.com/api/timedtext?type=list&v=' + videoId;
                                    var listResponse = await fetch(listUrl);
                                    if (listResponse.ok) {
                                        var listXml = await listResponse.text();
                                        var listParser = new DOMParser();
                                        var listDoc = listParser.parseFromString(listXml, 'text/xml');
                                        var tracks = Array.from(listDoc.getElementsByTagName('track'));
                                        transcriptLangs = tracks.map(function(track) {
                                            return track.getAttribute('lang_code');
                                        });
                                    }
                                }
                                // Step 2: Try to fetch transcript for each available language
                                if (videoId && transcriptLangs.length > 0) {
                                    for (var l = 0; l < transcriptLangs.length; l++) {
                                        var apiUrl = 'https://www.youtube.com/api/timedtext?lang=' + transcriptLangs[l] + '&v=' + videoId;
                                        var response = await fetch(apiUrl);
                                        if (response.ok) {
                                            var xml = await response.text();
                                            var parser = new DOMParser();
                                            var xmlDoc = parser.parseFromString(xml, 'text/xml');
                                            var texts = Array.from(xmlDoc.getElementsByTagName('text'));
                                            if (texts.length > 0) {
                                                transcript = texts.map(function(t) { return t.textContent.replace(/\s+/g, ' ').trim(); }).join(' ');
                                                break;
                                            }
                                        }
                                    }
                                }
                                // Fallback: Try English if no tracks found
                                if (!transcript && videoId) {
                                    var fallbackLangs = ['en', 'en-US', 'en-GB'];
                                    for (var f = 0; f < fallbackLangs.length; f++) {
                                        var apiUrl = 'https://www.youtube.com/api/timedtext?lang=' + fallbackLangs[f] + '&v=' + videoId;
                                        var response = await fetch(apiUrl);
                                        if (response.ok) {
                                            var xml = await response.text();
                                            var parser = new DOMParser();
                                            var xmlDoc = parser.parseFromString(xml, 'text/xml');
                                            var texts = Array.from(xmlDoc.getElementsByTagName('text'));
                                            if (texts.length > 0) {
                                                transcript = texts.map(function(t) { return t.textContent.replace(/\s+/g, ' ').trim(); }).join(' ');
                                                break;
                                            }
                                        }
                                    }
                                }
                                // Try opening the transcript panel UI and scraping segments
                                if (!transcript) {
                                    try {
                                        // Open the 'More actions' menu
                                        var moreBtn = document.querySelector('button[aria-label*="More actions"], tp-yt-paper-icon-button[aria-label*="More actions"]');
                                        if (moreBtn) {
                                            moreBtn.click();
                                            await new Promise(function(r){ setTimeout(r, 600); });
                                            // Find 'Show transcript' menu item
                                            var menuItems = Array.from(document.querySelectorAll('ytd-menu-service-item-renderer tp-yt-paper-item, ytd-menu-service-item-renderer yt-formatted-string'));
                                            var showItem = menuItems.find(function(el){ return /Show transcript/i.test((el.textContent || '')); });
                                            if (showItem) {
                                                showItem.click();
                                                await new Promise(function(r){ setTimeout(r, 900); });
                                            }
                                        }
                                        // Locate transcript panel
                                        var transcriptPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[visible] ytd-transcript-renderer, ytd-transcript-renderer');
                                        if (transcriptPanel) {
                                            var segEls = transcriptPanel.querySelectorAll('ytd-transcript-segment-renderer #segment-text, ytd-transcript-segment-renderer yt-formatted-string, .segment-text');
                                            var parts = Array.from(segEls).map(function(el){ return (el.textContent || '').trim(); }).filter(function(t){ return t.length > 0; });
                                            if (parts.length > 0) {
                                                transcript = parts.join(' ');
                                            }
                                        }
                                    } catch (e) {
                                        // ignore scraping errors
                                    }
                                }
                                // Try new YouTube caption selectors (2025)
                                if (!transcript) {
                                    var captionSelectors = [
                                        '.ytp-caption-segment',
                                        '.ytp-caption-window-rolled-up .ytp-caption-segment',
                                        '.ytp-caption-window-bottom .ytp-caption-segment',
                                        '.ytp-caption-window-top .ytp-caption-segment',
                                        '.caption-window .captions-text',
                                        '.ytp-caption-window .ytp-caption-segment',
                                        '.ytp-caption-window .captions-text',
                                        '.ytp-caption-segment',
                                        '.ytp-captions-text',
                                        '.ytp-caption-window',
                                        '.ytp-caption-segment',
                                        '.ytp-caption-segment span'
                                    ];
                                    var debugCaptions = [];
                                    for (var i = 0; i < captionSelectors.length; i++) {
                                        var elements = document.querySelectorAll(captionSelectors[i]);
                                        if (elements.length > 0) {
                                            debugCaptions.push('Selector: ' + captionSelectors[i] + ', Count: ' + elements.length);
                                            debugCaptions.push('Texts: ' + Array.from(elements).map(function(el) { return el.textContent.trim(); }).join(' | '));
                                            transcript = Array.from(elements)
                                                .map(function(el) { return el.textContent.trim(); })
                                                .filter(function(text) { return text.length > 0; })
                                                .join(' ');
                                            if (transcript.length > 0) break;
                                        }
                                    }
                                    if (debugCaptions.length > 0) {
                                        window._debugCaptions = debugCaptions;
                                    }
                                }
                                // Fallback: auto-generated captions (if available)
                                if (!transcript && captionsEnabled) {
                                    var autoCaptionElements = document.querySelectorAll('[class*="auto-generated"] .ytp-caption-segment');
                                    if (autoCaptionElements.length > 0) {
                                        window._debugCaptions = window._debugCaptions || [];
                                        window._debugCaptions.push('Auto-generated selector: [class*="auto-generated"] .ytp-caption-segment, Count: ' + autoCaptionElements.length);
                                        window._debugCaptions.push('Texts: ' + Array.from(autoCaptionElements).map(function(el) { return el.textContent.trim(); }).join(' | '));
                                        transcript = Array.from(autoCaptionElements)
                                            .map(function(el) { return el.textContent.trim(); })
                                            .filter(function(text) { return text.length > 0; })
                                            .join(' ');
                                    }
                                }
                                // Fallback: video description
                                if (!transcript) {
                                    var description = document.querySelector('#description-inline-expander, #description, .content, .ytd-video-secondary-info-renderer');
                                    if (description && description.textContent.length > 100) {
                                        transcript = description.textContent.substring(0, 2000) + '...';
                                    }
                                }
                            } catch (e) {
                                console.warn('Could not extract transcript:', e);
                            }
                            var viewCount = '';
                            var channelName = '';
                            var uploadDate = '';
                            try {
                                var viewElement = document.querySelector('#info-strings yt-formatted-string, .view-count');
                                if (viewElement) viewCount = viewElement.textContent.trim();
                                var channelElement = document.querySelector('#channel-name a, .ytd-channel-name a');
                                if (channelElement) channelName = channelElement.textContent.trim();
                                var dateElement = document.querySelector('#info-strings yt-formatted-string:last-child, .upload-date');
                                if (dateElement) uploadDate = dateElement.textContent.trim();
                            } catch (e) {
                                console.warn('Could not extract metadata:', e);
                            }
                            var canvas = document.createElement('canvas');
                            var ctx = canvas.getContext('2d');
                            canvas.width = video.videoWidth || video.clientWidth;
                            canvas.height = video.videoHeight || video.clientHeight;
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            var frameDataUrl = canvas.toDataURL('image/png');
                            return {
                                title: title,
                                url: url,
                                videoId: videoId,
                                duration: duration,
                                currentTime: currentTime,
                                transcript: transcript,
                                viewCount: viewCount,
                                channelName: channelName,
                                uploadDate: uploadDate,
                                frameDataUrl: frameDataUrl,
                                videoWidth: canvas.width,
                                videoHeight: canvas.height
                            };
                        } catch (err) {
                            return { error: err.message };
                        }
                    })();
                })();`
        });

        let videoData;
        if (!results || results.length === 0) {
            throw new Error('Failed to analyze YouTube video');
        } else {
            videoData = results[0];
        }
        if (videoData.error) {
            throw new Error('YouTube analysis failed: ' + videoData.error);
        }

        // Debug: Only show a concise success message; local extraction removed
        if (videoData.transcript && videoData.transcript.length > 0) {
            this.showSuccessMessage('Transcript detected on page');
        }

        // Create comprehensive video analysis object
        const youtubeAnalysis = {
            name: `YouTube Video Analysis - ${videoData.title}.json`,
            type: 'application/json',
            size: JSON.stringify(videoData).length,
            dataUrl: `data:application/json;base64,${btoa(JSON.stringify(videoData, null, 2))}`,
            isYouTubeAnalysis: true,
            isVideoFrame: false, // This is more than just a frame
            url: videoData.url,
            title: videoData.title,
            videoData: videoData,
            timestamp: new Date().toISOString()
        };

        // Also create the current frame as an image
        const currentFrame = {
            name: `YouTube Frame - ${videoData.title}.png`,
            type: 'image/png',
            size: videoData.frameDataUrl.length,
            dataUrl: videoData.frameDataUrl,
            isVideoFrame: true,
            isYouTube: true,
            url: videoData.url,
            title: videoData.title,
            timestamp: new Date().toISOString()
        };

        // Add both to attached files
        this.attachedFiles.push(youtubeAnalysis);
        this.attachedFiles.push(currentFrame);
        this.updateFilePreview();
        this.updateSendButton();

        // Do not append transcript into the input; it will be injected into the model context silently on send

        // Show success message with analysis details
        let successMessage = `📹 Captured YouTube video analysis: ${videoData.title}`;
        if (videoData.transcript && videoData.transcript.length > 50) {
            successMessage += '\n✅ Transcript/captions extracted';
        }
        if (videoData.channelName) {
            successMessage += `\n📺 Channel: ${videoData.channelName}`;
        }
        successMessage += `\n🎯 Current time: ${Math.floor(videoData.currentTime / 60)}:${Math.floor(videoData.currentTime % 60).toString().padStart(2, '0')}`;

        this.showSuccessMessage(successMessage);
    }

    async captureRegularVideoFrame(activeTab) {
        // Use browser.tabs.captureTab to get a screenshot instead
        const dataUrl = await browser.tabs.captureTab(activeTab.id, {
            format: 'png',
            quality: 90
        });

        // Get page title and URL for context
        const pageData = await browser.tabs.executeScript(activeTab.id, {
            code: `({
                title: document.title,
                url: window.location.href,
                hasVideo: !!document.querySelector('video')
            })`
        });

        const { title, url, hasVideo } = pageData[0];

        // Create a "file" object with the captured frame
        const videoFrame = {
            name: `${hasVideo ? 'Video Frame' : 'Tab Screenshot'} - ${title || 'Current Tab'}.png`,
            type: 'image/png',
            size: dataUrl.length,
            dataUrl: dataUrl,
            isVideoFrame: true,
            isYouTube: false,
            url: url,
            title: title,
            timestamp: new Date().toISOString()
        };

        // Add to attached files
        this.attachedFiles.push(videoFrame);
        this.updateFilePreview();
        this.updateSendButton();
        
        this.showSuccessMessage(`Captured ${hasVideo ? 'video frame' : 'screenshot'} from: ${title}`);
    }

    updateFilePreview() {
        if (this.attachedFiles.length === 0) {
            this.filePreview.classList.remove('has-files');
            this.filePreview.innerHTML = '';
            return;
        }

        this.filePreview.classList.add('has-files');
        this.filePreview.innerHTML = this.attachedFiles.map((file, index) => {
            if (file.isWebpage) {
                return `
                    <div class="file-item">
                        <div class="file-icon"><i data-lucide="globe" style="width:20px;height:20px;"></i></div>
                        <div class="file-info">
                            <div class="file-name">${file.title || file.name}</div>
                            <div class="file-size">${file.url}</div>
                        </div>
                        <button class="file-remove" data-file-index="${index}"><i data-lucide="x" style="width:16px;height:16px;"></i></button>
                    </div>
                `;
            } else if (file.isYouTubeAnalysis) {
                return `
                    <div class="file-item">
                        <div class="file-icon"><i data-lucide="youtube" style="width:20px;height:20px;"></i></div>
                        <div class="file-info">
                            <div class="file-name">${file.title} (Analysis)</div>
                            <div class="file-size">YouTube Video Analysis • Transcript + Metadata</div>
                        </div>
                        <button class="file-remove" data-file-index="${index}"><i data-lucide="x" style="width:16px;height:16px;"></i></button>
                    </div>
                `;
            } else if (file.isScreenshot) {
                return `
                    <div class="file-item">
                        <div class="file-icon">
                            <img src="${file.dataUrl}" alt="${file.name}">
                        </div>
                        <div class="file-info">
                            <div class="file-name">${file.title || file.name}</div>
                            <div class="file-size">Screenshot • ${file.url}</div>
                        </div>
                        <button class="file-remove" data-file-index="${index}"><i data-lucide="x" style="width:16px;height:16px;"></i></button>
                    </div>
                `;
            } else if (file.isVideoFrame) {
                return `
                    <div class="file-item">
                        <div class="file-icon">
                            <img src="${file.dataUrl}" alt="${file.name}">
                        </div>
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${file.isYouTube ? 'YouTube Frame' : 'Video Frame'} • ${file.url}</div>
                        </div>
                        <button class="file-remove" data-file-index="${index}"><i data-lucide="x" style="width:16px;height:16px;"></i></button>
                    </div>
                `;
            } else {
                return `
                    <div class="file-item">
                        <div class="file-icon">
                            ${file.type.startsWith('image/') ? 
                                `<img src="${file.dataUrl}" alt="${file.name}">` : 
                                '<i data-lucide="file" style="width:20px;height:20px;"></i>'
                            }
                        </div>
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${this.formatFileSize(file.size)}</div>
                        </div>
                        <button class="file-remove" data-file-index="${index}"><i data-lucide="x" style="width:16px;height:16px;"></i></button>
                    </div>
                `;
            }
        }).join('');

        // Render Lucide icons for all file items (including X buttons)
        renderLucideIcons();
        // Add event listeners for remove buttons
        this.filePreview.querySelectorAll('.file-remove').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-file-index'));
                this.removeFile(index);
            });
        });
    }

    removeFile(index) {
        this.attachedFiles.splice(index, 1);
        this.updateFilePreview();
        this.updateSendButton();
    }

    clearAttachedFiles() {
        this.attachedFiles = [];
        this.attachedTabIds = new Set();
        this.updateFilePreview();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async callGeminiAPI(message, files = []) {
        // Support both Google Gemini and OpenRouter
        let url = '';
        let requestBody = {};
        let headers = { 'Content-Type': 'application/json' };
        let isOpenRouter = this.provider === 'openrouter';

        // Build the conversation history as before
        const contents = [];
        for (const msg of this.messages) {
            if (msg.sender === 'user' || msg.sender === 'ai') {
                const role = msg.sender === 'user' ? 'user' : 'model';
                if (msg.files && msg.files.length > 0) {
                    const fileParts = msg.files.map(file => {
                        if (file.isWebpage) {
                            return { text: `[Webpage Content]\n${file.title || file.name || ''}\n${file.url || ''}` };
                        } else if (file.isYouTubeAnalysis) {
                            return { text: `[YouTube Video Analysis]\n${file.title || file.name || ''}\n${file.url || ''}` };
                        } else if (file.isScreenshot || file.isVideoFrame) {
                            return { text: `[Image: ${file.title || file.name || ''}]` };
                        } else if (file.type && file.type.startsWith('image/')) {
                            return { text: `[Image: ${file.name}]` };
                        } else {
                            return { text: `[File: ${file.name}, Type: ${file.type}, Size: ${this.formatFileSize(file.size)}]` };
                        }
                    });
                    contents.push({ role, parts: [{ text: msg.content }, ...fileParts] });
                } else {
                    contents.push({ role, parts: [{ text: msg.content }] });
                }
            }
        }

        // Add the new user message as the last turn
        const userParts = [];
        if (message) {
            userParts.push({ text: message });
        }
        // Optionally include active tab URL as context
        if (this.includePageUrl) {
            try {
                const tabs = await browser.tabs.query({ active: true, currentWindow: true });
                if (tabs && tabs[0] && tabs[0].url && !tabs[0].url.startsWith('about:') && !tabs[0].url.startsWith('moz-extension://')) {
                    userParts.push({ text: `[Current Page URL]\n${tabs[0].url}` });
                }
            } catch (_) { /* ignore */ }
        }
        // Inject transcript into context if available and not already included
        if (this.lastTranscript && this.lastTranscript.length > 20) {
            userParts.push({ text: `[Video Transcript]
${this.lastTranscript}` });
            // Clear transcript after using it once
            this.lastTranscript = null;
        }
        for (const file of files) {
            if (file.isWebpage) {
                const base64Data = file.dataUrl.split(',')[1];
                const webpageContent = atob(base64Data);
                userParts.push({ text: `[Webpage Content]\n${webpageContent}` });
            } else if (file.isYouTubeAnalysis) {
                const base64Data = file.dataUrl.split(',')[1];
                const youtubeData = JSON.parse(atob(base64Data));
                let analysisText = `[YouTube Video Analysis]\n`;
                analysisText += `Title: ${youtubeData.title}\n`;
                analysisText += `URL: ${youtubeData.url}\n`;
                if (youtubeData.channelName) analysisText += `Channel: ${youtubeData.channelName}\n`;
                if (youtubeData.viewCount) analysisText += `Views: ${youtubeData.viewCount}\n`;
                if (youtubeData.uploadDate) analysisText += `Upload Date: ${youtubeData.uploadDate}\n`;
                analysisText += `Duration: ${Math.floor(youtubeData.duration / 60)}:${Math.floor(youtubeData.duration % 60).toString().padStart(2, '0')}\n`;
                analysisText += `Current Time: ${Math.floor(youtubeData.currentTime / 60)}:${Math.floor(youtubeData.currentTime % 60).toString().padStart(2, '0')}\n`;
                if (youtubeData.transcript && youtubeData.transcript.length > 20) {
                    analysisText += `\n[Video Transcript/Captions]\n${youtubeData.transcript}\n`;
                } else {
                    analysisText += `\nNote: No transcript/captions were available for this video.\n`;
                }
                analysisText += `\nThis YouTube video analysis includes both textual information (transcript, metadata) and a visual frame capture. Please analyze both the textual content and the visual frame to provide comprehensive insights about this video.`;
                userParts.push({ text: analysisText });
            } else if (file.isScreenshot) {
                const base64Data = file.dataUrl.split(',')[1];
                const contextText = `[Screenshot from: ${file.title || 'Current Tab'}]\nURL: ${file.url}\nThis is a screenshot captured from a web page. Please analyze what you see in this screenshot.`;
                userParts.push({ text: contextText });
                userParts.push({
                    inline_data: {
                        mime_type: file.type,
                        data: base64Data
                    }
                });
            } else if (file.isVideoFrame) {
                const base64Data = file.dataUrl.split(',')[1];
                const contextText = file.isYouTube 
                    ? `[YouTube Video Frame]\nThis is a frame captured from a YouTube video at timestamp ${file.timestamp}. Please analyze what you see in this video frame.`
                    : `[Video Frame captured from: ${file.url}]\nThis is a screenshot/frame from a web page that may contain video content. Please analyze what you see.`;
                userParts.push({ text: contextText });
                userParts.push({
                    inline_data: {
                        mime_type: file.type,
                        data: base64Data
                    }
                });
            } else if (file.type.startsWith('image/')) {
                const base64Data = file.dataUrl.split(',')[1];
                userParts.push({
                    inline_data: {
                        mime_type: file.type,
                        data: base64Data
                    }
                });
            } else {
                userParts.push({ text: `[File: ${file.name}, Type: ${file.type}, Size: ${this.formatFileSize(file.size)}]` });
            }
        }
        if (userParts.length > 0) {
            contents.push({ role: 'user', parts: userParts });
        }

        if (isOpenRouter) {
            url = `https://openrouter.ai/api/v1/chat/completions`;
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.openrouterApiKey}`
            };
            // OpenRouter expects an OpenAI-compatible payload
            // Map Gemini's format to OpenAI's format
            const messages = [];
            for (const c of contents) {
                const role = c.role === 'user' ? 'user' : 'assistant';
                let text = '';
                for (const part of c.parts) {
                    if (part.text) text += part.text + '\n';
                }
                messages.push({ role, content: text.trim() });
            }
            requestBody = {
                model: this.model,
                messages: messages,
                max_tokens: 2000,
                temperature: 0.7,
                top_p: 0.95
            };
        } else {
            url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
            requestBody = {
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 20000,
                }
            };
        }

        // Create abort controller for this request
        this.abortController = new AbortController();

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
            signal: this.abortController.signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }

        const data = await response.json();
        if (isOpenRouter) {
            // OpenRouter returns OpenAI format
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('No response from OpenRouter. Response: ' + JSON.stringify(data));
            }
            return data.choices[0].message.content;
        } else {
            // Debug: Log the full response to see what we're getting
            console.log('Full Gemini API Response:', JSON.stringify(data, null, 2));
            // Check if response was blocked by safety filters
            if (data.promptFeedback && data.promptFeedback.blockReason) {
                throw new Error(`Request blocked by safety filters: ${data.promptFeedback.blockReason}`);
            }
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('No response candidates from API. This might be due to safety filters or invalid model name. Response: ' + JSON.stringify(data));
            }
            const candidate = data.candidates[0];
            if (candidate.finishReason === 'SAFETY') {
                throw new Error('Response blocked by safety filters');
            }
            if (candidate.finishReason === 'MAX_TOKENS') {
                if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                    throw new Error('Response was truncated due to token limit. Try asking a simpler question or use fewer/smaller images.');
                }
                console.warn('Response was truncated due to token limit, but partial content available');
            }
            if (!candidate.content) {
                throw new Error('No content in candidate. Candidate: ' + JSON.stringify(candidate));
            }
            if (!candidate.content.parts || candidate.content.parts.length === 0) {
                throw new Error('No parts in content. Content: ' + JSON.stringify(candidate.content));
            }
            if (!candidate.content.parts[0].text) {
                throw new Error('No text in first part. Part: ' + JSON.stringify(candidate.content.parts[0]));
            }
            return candidate.content.parts[0].text;
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    // Generate unique session ID
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Stop current request
    stopRequest() {
        console.log('Stop request called');
        this.isStreaming = false;
        
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.hideTypingIndicator();
        
        // Reset buttons
        this.sendButton.style.display = 'flex';
        this.stopButton.style.display = 'none';
        this.updateSendButton();
        
        // Show retry button when manually stopped
        this.showRetryButton();
    }

    // Start new session
    async startNewSession() {
        // Save current session if it has messages
        if (this.messages.length > 0) {
            await this.saveCurrentSession();
        }
        
        // Reset everything
        this.messages = [];
        this.currentSessionId = this.generateSessionId();
        
        // Clear chat with the same welcome message as initial load
        this.chatMessages.innerHTML = getWelcomeMessageHTML();
        renderLucideIcons();
        this.bindWelcomeActions();
        
        this.clearAttachedFiles();
        this.showSuccessMessage('New session started!');
    }

    // Save current session to history
    async saveCurrentSession() {
        if (this.messages.length === 0) return;

        const session = {
            id: this.currentSessionId,
            timestamp: Date.now(),
            messages: [...this.messages],
            title: this.generateSessionTitle(),
            preview: this.generateSessionPreview()
        };

        try {
            const result = await browser.storage.local.get(['chatHistory']);
            const history = result.chatHistory || [];
            
            // Remove existing session with same ID to avoid duplicates
            const filteredHistory = history.filter(s => s.id !== this.currentSessionId);
            
            // Add current session to beginning
            filteredHistory.unshift(session);
            
            // Keep only last 50 sessions
            if (filteredHistory.length > 50) {
                filteredHistory.splice(50);
            }
            
            await browser.storage.local.set({ chatHistory: filteredHistory });
        } catch (error) {
            console.error('Error saving session:', error);
        }
    }

    // Generate session title from first user message
    generateSessionTitle() {
        const firstUserMessage = this.messages.find(msg => msg.sender === 'user');
        if (firstUserMessage) {
            let title = firstUserMessage.content.substring(0, 50);
            if (firstUserMessage.content.length > 50) {
                title += '...';
            }
            return title || 'New Chat';
        }
        return 'New Chat';
    }

    // Generate session preview
    generateSessionPreview() {
        const lastMessage = this.messages[this.messages.length - 1];
        if (lastMessage) {
            let preview = lastMessage.content.substring(0, 100);
            if (lastMessage.content.length > 100) {
                preview += '...';
            }
            return preview;
        }
        return 'No messages';
    }

    // Toggle history panel
    toggleHistory() {
        this.historyPanel.classList.toggle('open');
        if (this.historyPanel.classList.contains('open')) {
            this.loadHistory();
        }
    }

    // Close history panel
    closeHistory() {
        this.historyPanel.classList.remove('open');
    }

    // Load and display chat history
    async loadHistory() {
        try {
            const result = await browser.storage.local.get(['chatHistory']);
            const history = result.chatHistory || [];
            // Sort: pinned first, then by recency
            history.sort((a, b) => (b.pinned === true) - (a.pinned === true) || (b.timestamp - a.timestamp));
            
            if (history.length === 0) {
                this.historyContent.innerHTML = '<div class="no-history">No chat history yet</div>';
                return;
            }

            this.historyContent.innerHTML = history.map(session => `
                <div class="history-item" data-session-id="${session.id}">
                    <div class="history-item-title">${this.escapeHtml(session.title)}</div>
                    <div class="history-item-date">${this.formatDate(session.timestamp)}</div>
                    <div class="history-item-preview">${this.escapeHtml(session.preview)}</div>
                    <div class="history-item-actions">
                        <button class="history-action-btn load" data-session-id="${session.id}">Load</button>
                        <button class="history-action-btn pin" data-session-id="${session.id}">${session.pinned ? 'Unpin' : 'Pin'}</button>
                        <button class="history-action-btn delete" data-session-id="${session.id}">Delete</button>
                    </div>
                </div>
            `).join('');

            // Add event listeners
            this.historyContent.querySelectorAll('.history-action-btn.load').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.loadSession(btn.dataset.sessionId);
                });
            });

            this.historyContent.querySelectorAll('.history-action-btn.delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteSession(btn.dataset.sessionId);
                });
            });

            this.historyContent.querySelectorAll('.history-action-btn.pin').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.togglePinSession(btn.dataset.sessionId);
                });
            });

        } catch (error) {
            console.error('Error loading history:', error);
            this.historyContent.innerHTML = '<div class="no-history">Error loading history</div>';
        }
    }

    async togglePinSession(sessionId) {
        try {
            const result = await browser.storage.local.get(['chatHistory']);
            const history = result.chatHistory || [];
            const session = history.find(s => s.id === sessionId);
            if (!session) return;
            session.pinned = !session.pinned;
            await browser.storage.local.set({ chatHistory: history });
            this.loadHistory();
        } catch (error) {
            console.error('Error pinning session:', error);
        }
    }

    async filterHistory(query) {
        try {
            const result = await browser.storage.local.get(['chatHistory']);
            const history = (result.chatHistory || []).filter(s =>
                (s.title && s.title.toLowerCase().includes(query)) ||
                (s.preview && s.preview.toLowerCase().includes(query))
            );
            if (history.length === 0) {
                this.historyContent.innerHTML = '<div class="no-history">No results</div>';
                return;
            }
            this.historyContent.innerHTML = history.map(session => `
                <div class="history-item" data-session-id="${session.id}">
                    <div class="history-item-title">${this.escapeHtml(session.title)}</div>
                    <div class="history-item-date">${this.formatDate(session.timestamp)}</div>
                    <div class="history-item-preview">${this.escapeHtml(session.preview)}</div>
                    <div class="history-item-actions">
                        <button class="history-action-btn load" data-session-id="${session.id}">Load</button>
                        <button class="history-action-btn pin" data-session-id="${session.id}">${session.pinned ? 'Unpin' : 'Pin'}</button>
                        <button class="history-action-btn delete" data-session-id="${session.id}">Delete</button>
                    </div>
                </div>
            `).join('');
            this.historyContent.querySelectorAll('.history-action-btn.load').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.loadSession(btn.dataset.sessionId);
                });
            });
            this.historyContent.querySelectorAll('.history-action-btn.delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteSession(btn.dataset.sessionId);
                });
            });
            this.historyContent.querySelectorAll('.history-action-btn.pin').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.togglePinSession(btn.dataset.sessionId);
                });
            });
        } catch (error) {
            console.error('Error filtering history:', error);
        }
    }

    // Load a session from history
    async loadSession(sessionId) {
        try {
            const result = await browser.storage.local.get(['chatHistory']);
            const history = result.chatHistory || [];
            const session = history.find(s => s.id === sessionId);
            
            if (!session) {
                this.showErrorMessage('Session not found');
                return;
            }

            // Save current session if it has messages
            if (this.messages.length > 0) {
                await this.saveCurrentSession();
            }

            // Load the session
            this.messages = [...session.messages];
            this.currentSessionId = sessionId;
            
            // Clear and rebuild chat
            this.chatMessages.innerHTML = '';
            
            // Add all messages without adding them to history again
            this.messages.forEach(msg => {
                this.addMessage(msg.content, msg.sender, false, msg.files || [], false);
            });

            this.closeHistory();
            this.showSuccessMessage('Session loaded!');
            
        } catch (error) {
            console.error('Error loading session:', error);
            this.showErrorMessage('Error loading session');
        }
    }

    // Delete a session from history
    async deleteSession(sessionId) {
        if (!confirm('Are you sure you want to delete this chat session?')) {
            return;
        }

        try {
            const result = await browser.storage.local.get(['chatHistory']);
            const history = result.chatHistory || [];
            const filteredHistory = history.filter(s => s.id !== sessionId);
            
            await browser.storage.local.set({ chatHistory: filteredHistory });
            this.loadHistory(); // Refresh the list
            
        } catch (error) {
            console.error('Error deleting session:', error);
            this.showErrorMessage('Error deleting session');
        }
    }

    // Format date for display
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showRetryButton() {
        // Remove any existing retry button
        const existingRetry = document.querySelector('.retry-button');
        if (existingRetry) {
            existingRetry.remove();
        }

        const retryDiv = document.createElement('div');
        retryDiv.className = 'retry-container';
        retryDiv.innerHTML = `
            <button class="retry-button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>
                </svg>
                Retry last message
            </button>
        `;
        
        this.chatMessages.appendChild(retryDiv);
        this.scrollToBottom();

        // Add click event
        const retryButton = retryDiv.querySelector('.retry-button');
        retryButton.addEventListener('click', () => {
            this.retryLastMessage();
            retryDiv.remove();
        });
    }

    async retryLastMessage() {
        if (!this.lastMessage && this.lastFiles.length === 0) {
            this.showErrorMessage('No message to retry');
            return;
        }

        // Restore the input and files
        this.messageInput.value = this.lastMessage || '';
        this.attachedFiles = [...this.lastFiles];
        this.updateFilePreview();
        this.autoResizeTextarea();
        this.updateSendButton();

        // Send the message
        await this.sendMessage();
    }

    // Notify background script that sidebar is opened
    notifySidebarOpened() {
        console.log('🚀 Sidebar loaded - notifying background script');
        try {
            const runtime = browser.runtime || chrome.runtime;
            if (runtime) {
                runtime.sendMessage({
                    action: 'sidebarOpened'
                }, (response) => {
                    console.log('📤 Sidebar opened notification sent, response:', response);
                });
            }
        } catch (error) {
            console.log('❌ Could not notify background script of sidebar opened:', error);
        }
    }

    // Notify background script that sidebar is closed
    notifySidebarClosed() {
        try {
            const runtime = browser.runtime || chrome.runtime;
            if (runtime) {
                runtime.sendMessage({
                    action: 'sidebarClosed'
                }, (response) => {
                    console.log('Sidebar closed notification sent');
                });
            }
        } catch (error) {
            console.log('Could not notify background script of sidebar closed:', error);
        }
    }
}

// Singleton pattern to ensure only one instance
let aiChatInstance = null;

function createAIChat() {
    if (!aiChatInstance) {
        console.log('🚀 Creating new AIChat instance');
        aiChatInstance = new AIChat();
        window.aiChat = aiChatInstance;
    } else {
        console.log('♻️ AIChat instance already exists, reusing');
    }
    return aiChatInstance;
}

// Initialize the chat when DOM is loaded
function initializeWithLucide() {
    createAIChat();
    renderLucideIcons();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWithLucide);
} else {
    initializeWithLucide();
}

// Notify when sidebar is being closed
window.addEventListener('beforeunload', () => {
    if (window.aiChat) {
        window.aiChat.notifySidebarClosed();
    }
});
