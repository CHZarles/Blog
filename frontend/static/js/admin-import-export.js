// 登录校验：未登录则跳转到登录页
fetch('/api/admin/blog/list', { credentials: 'same-origin' })
    .then(resp => {
        if (resp.status === 401) {
            window.location.href = '/admin-login.html';
        }
    });
// DOM elements
let importFile, importFolder, importBlog, importFolderBtn;
let exportBlog, exportCategory, categorySelect, exportStats;
let importProgress, importStatus, exportProgress, exportStatus;
let activityLog;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    importFile = document.getElementById('import-file');
    importFolder = document.getElementById('import-folder');
    importBlog = document.getElementById('import-blog');
    importFolderBtn = document.getElementById('import-folder-btn');
    
    exportBlog = document.getElementById('export-blog');
    exportCategory = document.getElementById('export-category');
    categorySelect = document.getElementById('category-select');
    exportStats = document.getElementById('export-stats');
    
    importProgress = document.getElementById('import-progress');
    importStatus = document.getElementById('import-status');
    exportProgress = document.getElementById('export-progress');
    exportStatus = document.getElementById('export-status');
    
    activityLog = document.getElementById('activity-log');
    
    // Event listeners
    importBlog.addEventListener('click', () => importFile.click());
    importFolderBtn.addEventListener('click', () => importFolder.click());
    
    importFile.addEventListener('change', handleFileImport);
    importFolder.addEventListener('change', handleFolderImport);
    
    exportBlog.addEventListener('click', handleExportAll);
    exportCategory.addEventListener('click', handleExportCategory);
    exportStats.addEventListener('click', handleExportStats);
    
    // Load categories for export
    loadCategories();
    
    // Load recent activity
    loadRecentActivity();
});

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.md')) {
        showMessage('Please select a Markdown (.md) file', 'error');
        return;
    }
    
    showImportProgress(true);
    updateImportStatus('Reading file...');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const title = file.name.replace('.md', '');
        
        const blogData = {
            title: title,
            content: content,
            category: extractCategoryFromContent(content),
            tags: extractTagsFromContent(content)
        };
        
        updateImportStatus('Uploading blog...');
        
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
                showMessage('Blog imported successfully!', 'success');
                addActivity('import', `Imported "${title}"`);
            }
            showImportProgress(false);
        })
        .catch(error => {
            console.error('Error importing blog:', error);
            showMessage('Error importing blog', 'error');
            showImportProgress(false);
        });
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

function handleFolderImport(event) {
    const files = Array.from(event.target.files).filter(file => file.name.endsWith('.md'));
    
    if (files.length === 0) {
        showMessage('No Markdown files found in the selected folder', 'error');
        return;
    }
    
    showImportProgress(true);
    updateImportStatus(`Found ${files.length} Markdown files. Starting import...`);
    
    let imported = 0;
    let failed = 0;
    
    const importPromises = files.map((file, index) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                const title = file.name.replace('.md', '');
                const category = extractCategoryFromPath(file.webkitRelativePath) || extractCategoryFromContent(content);
                
                const blogData = {
                    title: title,
                    content: content,
                    category: category,
                    tags: extractTagsFromContent(content)
                };
                
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
                        failed++;
                        console.error(`Failed to import ${title}:`, data.error);
                    } else {
                        imported++;
                    }
                    
                    updateImportStatus(`Imported ${imported + failed}/${files.length} files...`);
                    updateImportProgress((imported + failed) / files.length * 100);
                    resolve();
                })
                .catch(error => {
                    failed++;
                    console.error(`Error importing ${title}:`, error);
                    updateImportStatus(`Imported ${imported + failed}/${files.length} files...`);
                    updateImportProgress((imported + failed) / files.length * 100);
                    resolve();
                });
            };
            reader.readAsText(file);
        });
    });
    
    Promise.all(importPromises).then(() => {
        showImportProgress(false);
        const message = `Import completed: ${imported} successful, ${failed} failed`;
        showMessage(message, failed > 0 ? 'error' : 'success');
        addActivity('import', `Imported ${imported} blogs from folder`);
        loadCategories(); // Refresh categories
    });
    
    event.target.value = ''; // Reset input
}

function handleExportAll() {
    showExportProgress(true);
    updateExportStatus('Fetching blogs...');
    
    fetch('/api/blogs')
        .then(response => response.json())
        .then(blogs => {
            if (blogs.length === 0) {
                showMessage('No blogs to export', 'error');
                showExportProgress(false);
                return;
            }
            
            updateExportStatus('Creating export file...');
            
            if (blogs.length === 1) {
                // Single blog - export as markdown
                exportSingleBlog(blogs[0]);
            } else {
                // Multiple blogs - export as ZIP
                exportMultipleBlogs(blogs);
            }
        })
        .catch(error => {
            console.error('Error fetching blogs:', error);
            showMessage('Error fetching blogs for export', 'error');
            showExportProgress(false);
        });
}

function handleExportCategory() {
    const category = categorySelect.value;
    if (!category) {
        showMessage('Please select a category to export', 'error');
        return;
    }
    
    showExportProgress(true);
    updateExportStatus('Fetching blogs...');
    
    fetch('/api/blogs')
        .then(response => response.json())
        .then(blogs => {
            const categoryBlogs = blogs.filter(blog => blog.category === category);
            
            if (categoryBlogs.length === 0) {
                showMessage(`No blogs found in category "${category}"`, 'error');
                showExportProgress(false);
                return;
            }
            
            updateExportStatus('Creating export file...');
            
            if (categoryBlogs.length === 1) {
                exportSingleBlog(categoryBlogs[0]);
            } else {
                exportMultipleBlogs(categoryBlogs, category);
            }
        })
        .catch(error => {
            console.error('Error fetching blogs:', error);
            showMessage('Error fetching blogs for export', 'error');
            showExportProgress(false);
        });
}

function handleExportStats() {
    showExportProgress(true);
    updateExportStatus('Generating statistics...');
    
    fetch('/api/blogs')
        .then(response => response.json())
        .then(blogs => {
            const stats = generateBlogStats(blogs);
            const statsJson = JSON.stringify(stats, null, 2);
            
            const blob = new Blob([statsJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `blog-stats-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            showExportProgress(false);
            showMessage('Statistics exported successfully!', 'success');
            addActivity('export', 'Exported blog statistics');
        })
        .catch(error => {
            console.error('Error generating stats:', error);
            showMessage('Error generating statistics', 'error');
            showExportProgress(false);
        });
}

function exportSingleBlog(blog) {
    fetch(`/api/blogs/${blog.id}`)
        .then(response => response.json())
        .then(blogData => {
            const markdown = formatBlogAsMarkdown(blogData);
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${sanitizeFilename(blogData.title)}.md`;
            a.click();
            URL.revokeObjectURL(url);
            
            showExportProgress(false);
            showMessage('Blog exported successfully!', 'success');
            addActivity('export', `Exported "${blogData.title}"`);
        })
        .catch(error => {
            console.error('Error exporting blog:', error);
            showMessage('Error exporting blog', 'error');
            showExportProgress(false);
        });
}

function exportMultipleBlogs(blogs, categoryFilter = null) {
    const zip = new JSZip();
    let processed = 0;
    
    const fetchPromises = blogs.map(blog => {
        return fetch(`/api/blogs/${blog.id}`)
            .then(response => response.json())
            .then(blogData => {
                const markdown = formatBlogAsMarkdown(blogData);
                const category = blogData.category || 'Uncategorized';
                const filename = `${sanitizeFilename(blogData.title)}.md`;
                
                zip.folder(category).file(filename, markdown);
                processed++;
                updateExportProgress(processed / blogs.length * 100);
            });
    });
    
    Promise.all(fetchPromises)
        .then(() => {
            updateExportStatus('Creating ZIP file...');
            return zip.generateAsync({ type: 'blob' });
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = categoryFilter 
                ? `${sanitizeFilename(categoryFilter)}-blogs.zip`
                : `all-blogs-${new Date().toISOString().split('T')[0]}.zip`;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            
            showExportProgress(false);
            showMessage('Blogs exported successfully!', 'success');
            addActivity('export', `Exported ${blogs.length} blogs as ZIP`);
        })
        .catch(error => {
            console.error('Error creating ZIP:', error);
            showMessage('Error creating export file', 'error');
            showExportProgress(false);
        });
}

function loadCategories() {
    fetch('/api/blogs')
        .then(response => response.json())
        .then(blogs => {
            const categories = [...new Set(blogs.map(blog => blog.category).filter(cat => cat))];
            categorySelect.innerHTML = '<option value="">Select a category...</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading categories:', error);
        });
}

function extractCategoryFromPath(path) {
    const parts = path.split('/');
    return parts.length > 1 ? parts[parts.length - 2] : null;
}

function extractCategoryFromContent(content) {
    const categoryMatch = content.match(/^category:\s*(.+)$/m);
    return categoryMatch ? categoryMatch[1].trim() : null;
}

function extractTagsFromContent(content) {
    const tagsMatch = content.match(/^tags:\s*(.+)$/m);
    return tagsMatch ? tagsMatch[1].trim() : null;
}

function formatBlogAsMarkdown(blog) {
    return `# ${blog.title}

**Category:** ${blog.category || 'Uncategorized'}  
**Tags:** ${blog.tags || 'No tags'}  
**Created:** ${new Date(blog.created_at).toLocaleDateString()}  

---

${blog.content}`;
}

function sanitizeFilename(filename) {
    // 保留中英文、数字、下划线、短横线
    return filename.replace(/[^\u4e00-\u9fa5a-zA-Z0-9_\-]/g, '_');
}

function generateBlogStats(blogs) {
    const categories = {};
    const tags = {};
    const monthlyPosts = {};
    
    blogs.forEach(blog => {
        // Categories
        const category = blog.category || 'Uncategorized';
        categories[category] = (categories[category] || 0) + 1;
        
        // Tags
        if (blog.tags) {
            blog.tags.split(',').forEach(tag => {
                const cleanTag = tag.trim();
                tags[cleanTag] = (tags[cleanTag] || 0) + 1;
            });
        }
        
        // Monthly posts
        const month = new Date(blog.created_at).toISOString().substring(0, 7);
        monthlyPosts[month] = (monthlyPosts[month] || 0) + 1;
    });
    
    return {
        totalBlogs: blogs.length,
        categories: categories,
        tags: tags,
        monthlyPosts: monthlyPosts,
        generatedAt: new Date().toISOString()
    };
}

function showImportProgress(show) {
    importProgress.style.display = show ? 'block' : 'none';
    if (!show) {
        updateImportProgress(0);
    }
}

function showExportProgress(show) {
    exportProgress.style.display = show ? 'block' : 'none';
    if (!show) {
        updateExportProgress(0);
    }
}

function updateImportProgress(percent) {
    document.getElementById('progress-fill').style.width = `${percent}%`;
}

function updateExportProgress(percent) {
    document.getElementById('export-progress-fill').style.width = `${percent}%`;
}

function updateImportStatus(status) {
    importStatus.textContent = status;
}

function updateExportStatus(status) {
    exportStatus.textContent = status;
}

function addActivity(type, description) {
    const activities = JSON.parse(localStorage.getItem('admin_activities') || '[]');
    activities.unshift({
        type: type,
        description: description,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 10 activities
    activities.splice(10);
    localStorage.setItem('admin_activities', JSON.stringify(activities));
    
    loadRecentActivity();
}

function loadRecentActivity() {
    const activities = JSON.parse(localStorage.getItem('admin_activities') || '[]');
    
    if (activities.length === 0) {
        activityLog.innerHTML = '<p class="no-activity">No recent import/export activity.</p>';
        return;
    }
    
    activityLog.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <span class="activity-type">${activity.type === 'import' ? '📥' : '📤'}</span>
            <span class="activity-description">${activity.description}</span>
            <span class="activity-time">${new Date(activity.timestamp).toLocaleString()}</span>
        </div>
    `).join('');
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