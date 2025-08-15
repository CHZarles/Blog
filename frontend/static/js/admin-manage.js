// 登录校验：未登录则跳转到登录页
fetch('/api/admin/blog/list', { credentials: 'same-origin' })
    .then(resp => {
        if (resp.status === 401) {
            window.location.href = '/admin-login.html';
        }
    });
let blogs = [];
let filteredBlogs = [];

// DOM elements
let filterCategory, filterTags, clearFilters, blogCount, blogsTable;
let previewModal, previewBody, closePreview;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    filterCategory = document.getElementById('filter-category');
    filterTags = document.getElementById('filter-tags');
    clearFilters = document.getElementById('clear-filters');
    blogCount = document.getElementById('blog-count');
    blogsTable = document.getElementById('blogs-tbody');
    
    previewModal = document.getElementById('preview-modal');
    previewBody = document.getElementById('preview-body');
    closePreview = document.getElementById('close-preview');
    
    // Load blogs and filter options
    fetchBlogs();
    
    // Load filter options with a small delay to ensure DOM is ready
    setTimeout(loadFilterOptions, 100);
    
    // Event listeners
    filterCategory.addEventListener('input', applyFilters);
    filterTags.addEventListener('input', applyFilters);
    clearFilters.addEventListener('click', clearAllFilters);
    
    closePreview.addEventListener('click', () => previewModal.style.display = 'none');
    
    // Close modals on outside click
    previewModal.addEventListener('click', function(e) {
        if (e.target === previewModal) {
            previewModal.style.display = 'none';
        }
    });
});

function fetchBlogs() {
    fetch('/api/blogs')
        .then(response => response.json())
        .then(data => {
            blogs = data;
            filteredBlogs = [...blogs];
            renderBlogs();
        })
        .catch(error => {
            console.error('Error fetching blogs:', error);
            showMessage('Error loading blogs', 'error');
        });
}

function applyFilters() {
    const categoryFilter = filterCategory.value.toLowerCase().trim();
    const tagsFilter = filterTags.value.toLowerCase().trim();
    
    filteredBlogs = blogs.filter(blog => {
        const matchesCategory = !categoryFilter || 
            (blog.category && blog.category.toLowerCase().includes(categoryFilter));
        
        const matchesTags = !tagsFilter || 
            (blog.tags && blog.tags.toLowerCase().includes(tagsFilter));
        
        return matchesCategory && matchesTags;
    });
    
    renderBlogs();
}

function clearAllFilters() {
    filterCategory.value = '';
    filterTags.value = '';
    filteredBlogs = [...blogs];
    renderBlogs();
}

function renderBlogs() {
    blogCount.textContent = `Found ${filteredBlogs.length} blog(s)`;
    
    if (filteredBlogs.length === 0) {
        blogsTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #6c757d; font-style: italic;">No blogs found</td></tr>';
        return;
    }
    
    blogsTable.innerHTML = filteredBlogs.map(blog => `
        <tr>
            <td><strong>${escapeHtml(blog.title)}</strong></td>
            <td><span class="category-tag">${escapeHtml(blog.category || 'Uncategorized')}</span></td>
            <td><span class="tags-list">${escapeHtml(blog.tags || 'No tags')}</span></td>
            <td>${formatDate(blog.created_at)}</td>
            <td>
                <button class="preview-btn" onclick="showPreview(${blog.id})">👁️ Preview</button>
                <button class="edit-btn" onclick="editBlog(${blog.id})">✏️ Edit</button>
                <button class="delete-btn" onclick="deleteBlog(${blog.id})">🗑️ Delete</button>
            </td>
        </tr>
    `).join('');
}

function showPreview(id) {
    const blog = blogs.find(b => b.id === id);
    if (!blog) return;
    
    fetch(`/api/blogs/${id}`)
        .then(response => response.json())
        .then(blogData => {
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
                
                let markdownHtml = marked.parse(blogData.content || '');
                
                // Add copy buttons to code blocks
                markdownHtml = addCopyButtonsToCodeBlocks(markdownHtml);
                
                previewBody.innerHTML = `
                    <div class="blog-meta">
                        <h2>${escapeHtml(blogData.title)}</h2>
                        <p><strong>Category:</strong> ${escapeHtml(blogData.category || 'Uncategorized')}</p>
                        <p><strong>Tags:</strong> ${escapeHtml(blogData.tags || 'No tags')}</p>
                        <p><strong>Created:</strong> ${formatDate(blogData.created_at)}</p>
                        <hr>
                    </div>
                    <div class="markdown-content">
                        ${markdownHtml}
                    </div>
                `;
                
                // Re-highlight any code that wasn't caught by marked
                if (typeof hljs !== 'undefined') {
                    previewBody.querySelectorAll('pre code').forEach((block) => {
                        if (!block.classList.contains('hljs')) {
                            hljs.highlightElement(block);
                        }
                    });
                }
                
                // Add copy functionality to buttons
                addCopyFunctionality();
                
                previewModal.style.display = 'block';
                
            } catch (error) {
                previewBody.innerHTML = `
                    <div class="blog-meta">
                        <h2>${escapeHtml(blogData.title)}</h2>
                        <p><strong>Category:</strong> ${escapeHtml(blogData.category || 'Uncategorized')}</p>
                        <p><strong>Tags:</strong> ${escapeHtml(blogData.tags || 'No tags')}</p>
                        <p><strong>Created:</strong> ${formatDate(blogData.created_at)}</p>
                        <hr>
                    </div>
                    <div class="markdown-content">
                        <p style="color: red;">Error rendering preview</p>
                    </div>
                `;
                previewModal.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error fetching blog details:', error);
            showMessage('Error loading blog preview', 'error');
        });
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

function editBlog(id) {
    // Redirect to the dedicated edit page
    window.location.href = `/admin/edit?id=${id}`;
}



function deleteBlog(id) {
    const blog = blogs.find(b => b.id === id);
    if (!blog) return;
    
    if (confirm(`Are you sure you want to delete "${blog.title}"?`)) {
        fetch(`/api/blogs/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showMessage(data.error, 'error');
            } else {
                showMessage('Blog deleted successfully!', 'success');
                fetchBlogs(); // Refresh the list
            }
        })
        .catch(error => {
            console.error('Error deleting blog:', error);
            showMessage('Error deleting blog', 'error');
        });
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function loadFilterOptions() {
    // Load categories
    fetch('/api/categories')
        .then(response => response.json())
        .then(categories => {
            const categoryDatalist = document.getElementById('filter-category-suggestions');
            if (!categoryDatalist) {
                console.error('Category datalist element not found');
                return;
            }
            categoryDatalist.innerHTML = '';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                categoryDatalist.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading categories:', error);
        });
    
    // Load tags from all blogs
    fetch('/api/blogs')
        .then(response => response.json())
        .then(blogs => {
            const allTags = new Set();
            blogs.forEach(blog => {
                if (blog.tags) {
                    let tags = [];
                    if (typeof blog.tags === 'string') {
                        try {
                            tags = JSON.parse(blog.tags);
                        } catch (e) {
                            tags = blog.tags.split(',').map(tag => tag.trim());
                        }
                    } else if (Array.isArray(blog.tags)) {
                        tags = blog.tags;
                    }
                    tags.forEach(tag => {
                        if (tag && tag.trim()) {
                            allTags.add(tag.trim());
                        }
                    });
                }
            });
            
            const tagsDatalist = document.getElementById('filter-tags-suggestions');
            if (!tagsDatalist) {
                console.error('Tags datalist element not found');
                return;
            }
            tagsDatalist.innerHTML = '';
            Array.from(allTags).sort().forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                tagsDatalist.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading tags:', error);
        });
}

function showMessage(message, type) {
    const messageContainer = document.getElementById('message-container') || createMessageContainer();
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