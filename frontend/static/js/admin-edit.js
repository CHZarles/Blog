let currentBlogId = null;
let isPreviewMode = false;

// DOM elements
let editForm, blogId, blogTitle, blogCategory, blogTags, blogContent;
let saveDraft;
let insertImage, insertLink, insertCode, insertTable;
let messageContainer;
let previewToggle, previewPane, previewContent;
let editorContainer;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    editForm = document.getElementById('edit-blog-form');
    blogId = document.getElementById('blog-id');
    blogTitle = document.getElementById('blog-title');
    blogCategory = document.getElementById('blog-category');
    blogTags = document.getElementById('blog-tags');
    blogContent = document.getElementById('blog-content');
    saveDraft = document.getElementById('save-draft');
    previewToggle = document.getElementById('preview-toggle');
    previewPane = document.getElementById('preview-pane');
    previewContent = document.getElementById('edit-preview-content');
    editorContainer = document.querySelector('.editor-container');

    // Optional toolbar buttons (may not exist)
    insertImage = document.getElementById('insert-image');
    insertLink = document.getElementById('insert-link');
    insertCode = document.getElementById('insert-code');
    insertTable = document.getElementById('insert-table');

    // Get blog ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    currentBlogId = urlParams.get('id');

    if (!currentBlogId) {
        showMessage('No blog ID provided', 'error');
        setTimeout(() => {
            window.location.href = '/admin/manage';
        }, 2000);
        return;
    }

    // Load blog data and categories
    loadBlogData();
    loadCategories();

    // Event listeners
    editForm.addEventListener('submit', updateBlog);
    if (previewToggle) previewToggle.addEventListener('click', togglePreview);
    if (saveDraft) saveDraft.addEventListener('click', saveBlogDraft);

    if (insertImage) insertImage.addEventListener('click', insertImageMarkdown);
    if (insertLink) insertLink.addEventListener('click', insertLinkMarkdown);
    if (insertCode) insertCode.addEventListener('click', insertCodeBlock);
    if (insertTable) insertTable.addEventListener('click', insertTableMarkdown);

    // Live preview when typing (only updates if preview open)
    blogContent.addEventListener('input', updatePreview);

        // Initialize Tagify for tags
        const tagifyEdit = new Tagify(blogTags, {
                whitelist: [],
                dropdown: { enabled: 0, maxItems: 20, classname: 'custom-tagify-dropdown' }
        });
        // Load existing tags and set whitelist
        fetch('/api/tags')
            .then(res => res.json())
            .then(tags => {
                if (Array.isArray(tags)) {
                    tagifyEdit.settings.whitelist = tags;
                }
            });

        // 初始化 category 下拉框，使用 Tagify 进行优化，允许用户输入新的类别
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

    // Add keyboard shortcuts
    blogContent.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + S for save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            updateBlog(e);
        }

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
            updatePreview();
        }

        // Ctrl/Cmd + Shift + I for image
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            insertImageMarkdown();
            updatePreview();
        }
    });
});

function loadBlogData() {
    fetch(`/api/blogs/${currentBlogId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Blog not found');
            }
            return response.json();
        })
        .then(blog => {
            blogId.value = blog.id;
            blogTitle.value = blog.title || '';
            blogCategory.value = blog.category || '';
            blogTags.value = blog.tags || '';
            blogContent.value = blog.content || '';

            // Check for saved draft after loading original data
            loadDraft();

            // Update page title
            document.title = `Edit: ${blog.title} - Admin`;
            updatePreview();
        })
        .catch(error => {
            console.error('Error loading blog:', error);
            showMessage('Error loading blog data', 'error');
            setTimeout(() => {
                window.location.href = '/admin/manage';
            }, 2000);
        });
}

function updateBlog(e) {
    e.preventDefault();

    // 处理 Tagify 返回的 JSON 格式内容
    let tagsInput = blogTags.value.trim();
    try {
        const tagsArray = JSON.parse(tagsInput);
        if (Array.isArray(tagsArray)) {
            tagsInput = tagsArray.map(item => item.value).join(', ');
        }
    } catch (err) {
        // 若解析失败，则保持原值
    }

    let categoryInput = blogCategory.value.trim();
    try {
        const categoryArray = JSON.parse(categoryInput);
        if (Array.isArray(categoryArray)) {
            categoryInput = categoryArray.length > 0 ? categoryArray[0].value : '';
        }
    } catch (err) {
        // 若解析失败，则保持原值
    }

    const blogData = {
        title: blogTitle.value.trim(),
        category: categoryInput,
        tags: tagsInput,
        content: blogContent.value.trim()
    };

    if (!blogData.title || !blogData.content) {
        showMessage('Title and content are required!', 'error');
        return;
    }

    fetch(`/api/blogs/${currentBlogId}`, {
        method: 'PUT',
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
            showMessage('Blog updated successfully!', 'success');
            clearDraft();

            // Redirect to manage page after a short delay
            setTimeout(() => {
                window.location.href = '/admin/manage';
            }, 1500);
        }
    })
    .catch(error => {
        console.error('Error updating blog:', error);
        showMessage('Error updating blog', 'error');
    });
}

function insertImageMarkdown() {
    const url = prompt('Enter image URL:');
    const alt = prompt('Enter image description (optional):') || 'Image';

    if (url) {
        const markdown = `![${alt}](${url})`;
    insertAtCursor(blogContent, markdown);
    updatePreview();
    }
}

function insertLinkMarkdown() {
    const url = prompt('Enter link URL:');
    const text = prompt('Enter link text:') || 'Link';

    if (url) {
        const markdown = `[${text}](${url})`;
    insertAtCursor(blogContent, markdown);
    updatePreview();
    }
}

function insertCodeBlock() {
    const language = prompt('Enter programming language (optional):') || '';
    const markdown = `\`\`\`${language}\n// Your code here\n\`\`\``;
    insertAtCursor(blogContent, markdown);
    updatePreview();
}

function insertTableMarkdown() {
    const markdown = `| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |`;
    insertAtCursor(blogContent, markdown);
    updatePreview();
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

function saveBlogDraft() {
    const draftData = {
        id: currentBlogId,
        title: blogTitle.value,
        category: blogCategory.value,
        tags: blogTags.value,
        content: blogContent.value,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(`blog_edit_draft_${currentBlogId}`, JSON.stringify(draftData));
    
    // Visual feedback on button
    if (saveDraft) {
        const originalText = saveDraft.textContent;
        saveDraft.textContent = '✅ Draft Saved!';
        saveDraft.style.backgroundColor = '#28a745';
        setTimeout(() => {
            saveDraft.textContent = originalText;
            saveDraft.style.backgroundColor = '';
        }, 2000);
    }

    showMessage('Draft saved locally!', 'success');
}

function loadDraft() {
    const draftKey = `blog_edit_draft_${currentBlogId}`;
    const draft = localStorage.getItem(draftKey);
    
    if (draft) {
        try {
            const draftData = JSON.parse(draft);
            const draftAge = new Date() - new Date(draftData.timestamp);
            const hoursOld = draftAge / (1000 * 60 * 60);
            
            if (hoursOld < 24) { // Only load drafts less than 24 hours old
                if (confirm('A recent draft was found. Would you like to load it?')) {
                    blogTitle.value = draftData.title || '';
                    blogCategory.value = draftData.category || '';
                    blogTags.value = draftData.tags || '';
                    blogContent.value = draftData.content || '';
                    showMessage('Draft loaded!', 'success');
                    updatePreview();
                }
            } else {
                localStorage.removeItem(draftKey); // Remove old drafts
            }
        } catch (error) {
            localStorage.removeItem(draftKey);
        }
    }
}

function clearDraft() {
    localStorage.removeItem(`blog_edit_draft_${currentBlogId}`);
}

function togglePreview() {
    isPreviewMode = !isPreviewMode;
    if (isPreviewMode) {
        if (previewPane) previewPane.style.display = 'block';
        if (editorContainer) editorContainer.classList.add('split');
        if (previewToggle) previewToggle.textContent = '📝 Edit';
        updatePreview();
    } else {
        if (previewPane) previewPane.style.display = 'none';
        if (editorContainer) editorContainer.classList.remove('split');
        if (previewToggle) previewToggle.textContent = '👁️ Preview';
    }
}

function updatePreview() {
    if (!isPreviewMode || !previewContent) return;
    const text = blogContent ? blogContent.value : '';
    if (!text.trim()) {
        previewContent.innerHTML = '<p style="color: #6c757d; font-style: italic;">Start typing to see preview...</p>';
        return;
    }
    try {
        if (typeof marked !== 'undefined') {
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
                            return code;
                        }
                    }
                    return code;
                }
            });
            const html = marked.parse(text);
            previewContent.innerHTML = html;
            if (typeof hljs !== 'undefined') {
                previewContent.querySelectorAll('pre code').forEach((block) => {
                    if (!block.classList.contains('hljs')) {
                        hljs.highlightElement(block);
                    }
                });
            }
        } else {
            previewContent.textContent = text;
        }
    } catch (err) {
        previewContent.innerHTML = '<p style="color: red;">Error rendering preview</p>';
    }
}

// Auto-save draft every 30 seconds
setInterval(() => {
    if (blogContent && blogContent.value.trim()) {
        saveBlogDraft();
    }
}, 30000);

// Save draft before leaving page
window.addEventListener('beforeunload', function() {
    if (blogContent && blogContent.value.trim()) {
        saveBlogDraft();
    }
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(message, type) {
    if (!messageContainer) {
        messageContainer = createMessageContainer();
    }
    
    const messageDiv = messageContainer.querySelector('#message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    
    messageContainer.style.display = 'block';
    
    setTimeout(() => {
        messageContainer.style.display = 'none';
    }, 5000);
}

function createMessageContainer() {
    let container = document.getElementById('message-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'message-container';
        container.innerHTML = '<div id="message" class="message"></div>';
        document.querySelector('.page-main').appendChild(container);
    }
    return container;
}

function loadCategories() {
    fetch('/api/categories')
        .then(response => response.json())
        .then(categories => {
            const datalist = document.getElementById('category-suggestions');
            datalist.innerHTML = ''; // Clear existing options
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                datalist.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading categories:', error);
        });
}