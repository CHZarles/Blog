document.addEventListener('DOMContentLoaded', function() {
    // 登录校验：未登录则跳转到登录页
    fetch('/api/admin/blog/list', { credentials: 'same-origin' })
        .then(resp => {
            if (resp.status === 401) {
                window.location.href = '/admin-login.html';
            }
        });
    // 登录校验：未登录则跳转到登录页
    fetch('/api/admin/blog/list', { credentials: 'same-origin' })
        .then(resp => {
            if (resp.status === 401) {
                window.location.href = '/admin-login.html';
            }
        });
    const app = document.getElementById('admin-app');
    const dynamicContent = document.getElementById('dynamic-content');
    const importFile = document.getElementById('import-file');
    const importFolder = document.getElementById('import-folder');
    const importBlogBtn = document.getElementById('import-blog');
    const importFolderBtn = document.getElementById('import-folder-btn');
    const exportBlogBtn = document.getElementById('export-blog');
    const filterCategory = document.getElementById('filter-category');
    const filterTags = document.getElementById('filter-tags');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const previewModal = document.getElementById('preview-modal');
    const closePreviewBtn = document.getElementById('close-preview');
    const previewBody = document.getElementById('preview-body');
    let blogs = [];
    let filteredBlogs = [];
    let editingBlogId = null;

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
        
        render();
    }

    function render() {
        const form = editingBlogId !== null ? renderEditForm() : renderAddForm();
        const blogsToShow = filteredBlogs.length > 0 || filterCategory.value || filterTags.value ? filteredBlogs : blogs;
        
        dynamicContent.innerHTML = `
            ${form}
            <div class="blog-count">显示 ${blogsToShow.length} 篇文章 (共 ${blogs.length} 篇)</div>
            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Tags</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${blogsToShow.map(blog => `
                        <tr>
                            <td>${blog.title}</td>
                            <td>${blog.category || 'uncategorized'}</td>
                            <td>${blog.tags || ''}</td>
                            <td>
                                <button class="preview-btn" data-id="${blog.id}">Preview</button>
                                <button class="edit-blog" data-id="${blog.id}">Edit</button>
                                <button class="delete-blog" data-id="${blog.id}">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function renderAddForm() {
        return `
            <h2>Add New Blog</h2>
            <form id="add-blog-form">
                <input type="text" id="title" placeholder="Title" required>
                <input type="text" id="category" placeholder="Category">
                <input type="text" id="tags" placeholder="Tags (comma separated)">
                <textarea id="content" placeholder="Content (Markdown)" required></textarea>
                <button type="submit">Add Blog</button>
            </form>
        `;
    }

    function renderEditForm() {
        const blog = blogs.find(b => b.id === editingBlogId);
        return `
            <h2>Edit Blog</h2>
            <form id="edit-blog-form">
                <input type="hidden" id="edit-id" value="${blog.id}">
                <input type="text" id="edit-title" placeholder="Title" value="${blog.title}" required>
                <input type="text" id="edit-category" placeholder="Category" value="${blog.category}">
                <input type="text" id="edit-tags" placeholder="Tags (comma separated)" value="${blog.tags}">
                <textarea id="edit-content" placeholder="Content (Markdown)" required>${blog.content}</textarea>
                <button type="submit">Update Blog</button>
                <button type="button" id="cancel-edit">Cancel</button>
            </form>
        `;
    }

    async function fetchBlogs() {
        const response = await fetch('/api/admin/blog/list');
        blogs = await response.json();
        filteredBlogs = [...blogs];
        render();
    }

    function showPreview(blogId) {
        const blog = blogs.find(b => b.id == blogId);
        if (blog) {
            fetch(`/api/blog/detail?id=${blogId}`)
                .then(response => response.json())
                .then(result => {
                    if (result.status === 'success') {
                        const content = result.data.content || 'No content available';
                        const renderedContent = marked.parse(content);
                        previewBody.innerHTML = `
                            <h2>${blog.title}</h2>
                            <p><strong>Category:</strong> ${blog.category || 'uncategorized'}</p>
                            <p><strong>Tags:</strong> ${blog.tags || 'None'}</p>
                            <hr>
                            <div class="markdown-content">${renderedContent}</div>
                        `;
                        previewModal.style.display = 'block';
                    }
                })
                .catch(error => {
                    console.error('Error loading blog detail:', error);
                    previewBody.innerHTML = '<p>Error loading blog content.</p>';
                    previewModal.style.display = 'block';
                });
        }
    }

    app.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (e.target.id === 'add-blog-form') {
            const title = document.getElementById('title').value;
            const category = document.getElementById('category').value;
            const tags = document.getElementById('tags').value;
            const content = document.getElementById('content').value;
            await fetch('/api/admin/blog/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, category, tags, content })
            });
            fetchBlogs();
        } else if (e.target.id === 'edit-blog-form') {
            const id = document.getElementById('edit-id').value;
            const title = document.getElementById('edit-title').value;
            const category = document.getElementById('edit-category').value;
            const tags = document.getElementById('edit-tags').value;
            const content = document.getElementById('edit-content').value;
            await fetch('/api/admin/blog/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, title, category, tags, content })
            });
            editingBlogId = null;
            fetchBlogs();
        }
    });

    app.addEventListener('click', async (e) => {
        if (e.target.classList.contains('preview-btn')) {
            const blogId = e.target.dataset.id;
            showPreview(blogId);
        } else if (e.target.classList.contains('edit-blog')) {
            editingBlogId = parseInt(e.target.dataset.id);
            const response = await fetch(`/api/blog/detail?id=${editingBlogId}`);
            const result = await response.json();
            if (result.status === 'success') {
                const blogToEdit = blogs.find(b => b.id === editingBlogId);
                blogToEdit.content = result.data.content;
                 render();
            }
        } else if (e.target.classList.contains('delete-blog')) {
            const blogId = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this blog?')) {
                await fetch('/api/admin/blog/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: blogId })
                });
                fetchBlogs();
            }
        } else if (e.target.id === 'cancel-edit') {
            editingBlogId = null;
            render();
        }
    });

    // Filter event listeners
    filterCategory.addEventListener('input', applyFilters);
    filterTags.addEventListener('input', applyFilters);
    clearFiltersBtn.addEventListener('click', () => {
        filterCategory.value = '';
        filterTags.value = '';
        applyFilters();
    });

    // Preview modal event listeners
    closePreviewBtn.addEventListener('click', () => {
        previewModal.style.display = 'none';
    });

    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            previewModal.style.display = 'none';
        }
    });

    importBlogBtn.addEventListener('click', () => {
        importFile.click();
    });

    importFolderBtn.addEventListener('click', () => {
        importFolder.click();
    });

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target.result;
                const title = file.name.replace(/\.md$/, '');
                await fetch('/api/admin/blog/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, content, category: 'imported', tags: '' })
                });
                fetchBlogs();
            };
            reader.readAsText(file);
        }
    });

    importFolder.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        const mdFiles = files.filter(file => file.name.endsWith('.md'));
        
        if (mdFiles.length === 0) {
            alert('No markdown files found in the selected folder.');
            return;
        }

        let importedCount = 0;
        for (const file of mdFiles) {
            try {
                const content = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsText(file);
                });

                // Extract category from folder path
                const pathParts = file.webkitRelativePath.split('/');
                const category = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'imported';
                const title = file.name.replace(/\.md$/, '');

                await fetch('/api/admin/blog/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, content, category, tags: '' })
                });
                importedCount++;
            } catch (error) {
                console.error(`Error importing ${file.name}:`, error);
            }
        }
        
        alert(`Successfully imported ${importedCount} blog posts.`);
        fetchBlogs();
    });

    exportBlogBtn.addEventListener('click', async () => {
        const response = await fetch('/api/admin/blog/list');
        const blogsToExport = await response.json();
        
        if (blogsToExport.length === 0) {
            alert('No blogs to export.');
            return;
        }
        
        if (blogsToExport.length === 1) {
            // Single blog - export as single markdown file
            const blog = blogsToExport[0];
            const detailResponse = await fetch(`/api/blog/detail?id=${blog.id}`);
            const detailResult = await detailResponse.json();
            if (detailResult.status === 'success') {
                const markdownContent = `# ${blog.title}\n\n**Category:** ${blog.category || 'uncategorized'}\n**Tags:** ${blog.tags || 'None'}\n\n${detailResult.data.content}`;
                const blob = new Blob([markdownContent], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${blog.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } else {
            // Multiple blogs - export as ZIP with category folders
            const zip = new JSZip();
            const blogsByCategory = {};
            
            // Group blogs by category
            for (const blog of blogsToExport) {
                const category = blog.category || 'uncategorized';
                if (!blogsByCategory[category]) {
                    blogsByCategory[category] = [];
                }
                blogsByCategory[category].push(blog);
            }
            
            // Add blogs to ZIP organized by category folders
            for (const [category, categoryBlogs] of Object.entries(blogsByCategory)) {
                const categoryFolder = zip.folder(category);
                
                for (const blog of categoryBlogs) {
                    const detailResponse = await fetch(`/api/blog/detail?id=${blog.id}`);
                    const detailResult = await detailResponse.json();
                    if (detailResult.status === 'success') {
                        const markdownContent = `# ${blog.title}\n\n**Category:** ${blog.category || 'uncategorized'}\n**Tags:** ${blog.tags || 'None'}\n\n${detailResult.data.content}`;
                        const fileName = `${blog.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
                        categoryFolder.file(fileName, markdownContent);
                    }
                }
            }
            
            // Generate and download ZIP file
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'blogs_export.zip';
            a.click();
            URL.revokeObjectURL(url);
        }
    });

    fetchBlogs();
});