let isPreviewMode = false;

// DOM elements
let createForm, blogTitle, blogCategory, blogTags, blogContent;
let previewToggle, insertImage, insertLink, previewPane, previewContent;
let editorContainer, messageContainer;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    createForm = document.getElementById('create-blog-form');
    blogTitle = document.getElementById('blog-title');
    blogCategory = document.getElementById('blog-category');
    blogTags = document.getElementById('blog-tags');
    blogContent = document.getElementById('blog-content');
    
    previewToggle = document.getElementById('preview-toggle');
    insertImage = document.getElementById('insert-image');
    insertLink = document.getElementById('insert-link');
    previewPane = document.getElementById('preview-pane');
    previewContent = document.getElementById('preview-content');
    editorContainer = document.querySelector('.editor-container');
    
    // 初始化 tags 下拉选择框，使用 Tagify
    const tagifyCreate = new Tagify(blogTags, {
        whitelist: [],
        dropdown: { enabled: 0, maxItems: 20, classname: 'custom-tagify-dropdown' }
    });
    fetch('/api/tags')
        .then(res => res.json())
        .then(tags => {
            if (Array.isArray(tags)) {
                tagifyCreate.settings.whitelist = tags;
            }
        });

    // 初始化 category 下拉选择框，使用 Tagify，允许用户输入新的类别
    const categoryTagify = new Tagify(blogCategory, {
        whitelist: [],
        dropdown: { enabled: 0, maxItems: 20, classname: 'custom-category-dropdown' },
        maxTags: 1,
        enforceWhitelist: false
    });
    fetch('/api/categories')
        .then(res => res.json())
        .then(categories => {
            if (Array.isArray(categories)) {
                categoryTagify.settings.whitelist = categories;
            }
        });
    
    // Event listeners
    createForm.addEventListener('submit', createBlog);
    previewToggle.addEventListener('click', togglePreview);
    insertImage.addEventListener('click', insertImageMarkdown);
    insertLink.addEventListener('click', insertLinkMarkdown);
    document.getElementById('save-draft').addEventListener('click', saveDraft);
    
    // Auto-update preview when typing
    blogContent.addEventListener('input', updatePreview);
    
    // Add some helpful keyboard shortcuts
    blogContent.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + B for bold
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            insertAtCursor(this, '**bold text**');
            updatePreview();
        }
        
        // Ctrl/Cmd + I for italic
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            insertAtCursor(this, '*italic text*');
            updatePreview();
        }
        
        // Ctrl/Cmd + K for link
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            insertLinkMarkdown();
        }
    });
    
    // Load draft if exists
    loadDraft();
});

function createBlog(e) {
    e.preventDefault();
    
    const blogData = {
        title: blogTitle.value.trim(),
        category: blogCategory.value.trim(),
        tags: blogTags.value.trim(),
        content: blogContent.value.trim()
    };
    
    if (!blogData.title || !blogData.content) {
        showMessage('Title and content are required!', 'error');
        return;
    }
    
    fetch('/api/blogs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(blogData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showMessage(data.error, 'error');
        } else {
            showMessage('Blog created successfully!', 'success');
            clearDraft();
            createForm.reset();
            updatePreview();
            
            // Redirect to manage page after a short delay
            setTimeout(() => {
                window.location.href = '/admin/manage';
            }, 1500);
        }
    })
    .catch(error => {
        console.error('Error creating blog:', error);
        showMessage('Error creating blog', 'error');
    });
}

function togglePreview() {
    isPreviewMode = !isPreviewMode;
    
    if (isPreviewMode) {
        editorContainer.classList.add('split');
        previewPane.style.display = 'block';
        previewToggle.textContent = '📝 Hide Preview';
        updatePreview();
    } else {
        editorContainer.classList.remove('split');
        previewPane.style.display = 'none';
        previewToggle.textContent = '👁️ Toggle Preview';
    }
}

function updatePreview() {
    if (isPreviewMode && previewContent) {
        const content = blogContent.value || '';
        
        if (content.trim()) {
            try {
                // Configure marked with syntax highlighting
                marked.setOptions({
                    breaks: true,
                    gfm: true,
                    sanitize: false,
                    smartLists: true,
                    smartypants: true,
                    highlight: function(code, lang) {
                        if (typeof hljs !== 'undefined') {
                            try {
                                if (lang && hljs.getLanguage(lang)) {
                                    return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
                                }
                                return hljs.highlightAuto(code).value;
                            } catch (e) {
                                console.error('Highlight.js error:', e);
                            }
                        }
                        return code;
                    }
                });
                
                let markdownHtml = marked.parse(content);
                
                // Add copy buttons to code blocks
                markdownHtml = addCopyButtonsToCodeBlocks(markdownHtml);
                
                previewContent.innerHTML = `
                    <div class="blog-meta-preview">
                        <h2>${escapeHtml(blogTitle.value || 'Blog Title')}</h2>
                        <p><strong>Category:</strong> ${escapeHtml(blogCategory.value || 'Uncategorized')}</p>
                        <p><strong>Tags:</strong> ${escapeHtml(blogTags.value || 'No tags')}</p>
                        <hr>
                    </div>
                    <div class="markdown-content">
                        ${markdownHtml}
                    </div>
                `;
                
                // Re-highlight any code that wasn't caught by marked
                if (typeof hljs !== 'undefined') {
                    previewContent.querySelectorAll('pre code').forEach((block) => {
                        if (!block.classList.contains('hljs')) {
                            hljs.highlightElement(block);
                        }
                    });
                }
                
                // Add copy functionality to buttons
                addCopyFunctionality();
                
            } catch (error) {
                previewContent.innerHTML = `
                    <div class="blog-meta-preview">
                        <h2>${escapeHtml(blogTitle.value || 'Blog Title')}</h2>
                        <p><strong>Category:</strong> ${escapeHtml(blogCategory.value || 'Uncategorized')}</p>
                        <p><strong>Tags:</strong> ${escapeHtml(blogTags.value || 'No tags')}</p>
                        <hr>
                    </div>
                    <div class="markdown-content">
                        <p style="color: red;">Error rendering preview</p>
                    </div>
                `;
            }
        } else {
            previewContent.innerHTML = `
                <div class="blog-meta-preview">
                    <h2>${escapeHtml(blogTitle.value || 'Blog Title')}</h2>
                    <p><strong>Category:</strong> ${escapeHtml(blogCategory.value || 'Uncategorized')}</p>
                    <p><strong>Tags:</strong> ${escapeHtml(blogTags.value || 'No tags')}</p>
                    <hr>
                </div>
                <div class="markdown-content">
                    <p style="color: #6c757d; font-style: italic;">Start typing to see preview...</p>
                </div>
            `;
        }
    }
}

function addCopyButtonsToCodeBlocks(html) {
    // Replace code blocks with enhanced versions that include copy buttons
    return html.replace(/<pre><code class="language-(\w+)"([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (match, lang, attrs, content) => {
        return `<div class="code-block-container">
            <div class="code-block-header">
                <span class="code-language">${lang}</span>
                <button class="copy-code-btn" onclick="copyCode(this)">📋 Copy</button>
            </div>
            <pre><code class="language-${lang}" data-lang="${lang}">${content}</code></pre>
        </div>`;
    }).replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (match, attrs, content) => {
        // Skip if already processed (contains language- class)
        if (attrs.includes('language-')) {
            return match;
        }
        return `<div class="code-block-container">
            <div class="code-block-header">
                <span class="code-language">text</span>
                <button class="copy-code-btn" onclick="copyCode(this)">📋 Copy</button>
            </div>
            <pre><code${attrs}>${content}</code></pre>
        </div>`;
    });
}

function addCopyFunctionality() {
    // Make copy function globally available
    window.copyCode = function(button) {
        const codeBlock = button.closest('.code-block-container').querySelector('code');
        const text = codeBlock.textContent;
        
        navigator.clipboard.writeText(text).then(() => {
            const originalText = button.textContent;
            button.textContent = '✅ Copied!';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy code: ', err);
            button.textContent = '❌ Failed';
            setTimeout(() => {
                button.textContent = '📋 Copy';
            }, 2000);
        });
    };
}

function insertImageMarkdown() {
    const imageUrl = prompt('Enter image URL:');
    const altText = prompt('Enter alt text (optional):') || 'Image';
    
    if (imageUrl) {
        const markdown = `![${altText}](${imageUrl})`;
        insertAtCursor(blogContent, markdown);
        updatePreview();
    }
}

function insertLinkMarkdown() {
    const linkUrl = prompt('Enter link URL:');
    const linkText = prompt('Enter link text:') || 'Link';
    
    if (linkUrl) {
        const markdown = `[${linkText}](${linkUrl})`;
        insertAtCursor(blogContent, markdown);
        updatePreview();
    }
}

function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    
    textarea.value = before + text + after;
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
}

function saveDraft() {
    const draftData = {
        title: blogTitle.value,
        category: blogCategory.value,
        tags: blogTags.value,
        content: blogContent.value,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('blog_draft', JSON.stringify(draftData));
    showMessage('Draft saved!', 'success');
}

function loadDraft() {
    const draft = localStorage.getItem('blog_draft');
    if (draft) {
        try {
            const draftData = JSON.parse(draft);
            const draftAge = new Date() - new Date(draftData.timestamp);
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (draftAge < maxAge) {
                if (confirm('A draft was found. Would you like to load it?')) {
                    blogTitle.value = draftData.title || '';
                    blogCategory.value = draftData.category || '';
                    blogTags.value = draftData.tags || '';
                    blogContent.value = draftData.content || '';
                    updatePreview();
                }
            } else {
                // Remove old draft
                localStorage.removeItem('blog_draft');
            }
        } catch (error) {
            console.error('Error loading draft:', error);
            localStorage.removeItem('blog_draft');
        }
    }
}

function clearDraft() {
    localStorage.removeItem('blog-draft');
}

// Auto-save draft every 30 seconds
setInterval(() => {
    if (blogTitle.value || blogCategory.value || blogTags.value || blogContent.value) {
        saveDraft();
    }
}, 30000);

// Save draft before page unload
window.addEventListener('beforeunload', function(e) {
    if (blogTitle.value || blogCategory.value || blogTags.value || blogContent.value) {
        saveDraft();
    }
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(message, type) {
    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        messageContainer = createMessageContainer();
    }
    
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageContainer.style.display = 'block';
    
    setTimeout(() => {
        messageContainer.style.display = 'none';
    }, 3000);
}

function createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'message-container';
    container.innerHTML = '<div id="message" class="message"></div>';
    document.body.appendChild(container);
    return container;
}

