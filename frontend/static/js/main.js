// okmij.org 风格的极简博客系统 JavaScript

// 全局变量
let currentBlogId = null;
let allBlogs = [];
let currentPage = 1;
let blogsPerPage = 40;
let totalPages = 1;

// 全局博文详情缓存Map，用于快速访问
const blogDetailsMap = new Map();

// 确保全局可访问
window.allBlogs = allBlogs;
window.blogDetailsMap = blogDetailsMap;

// 分类映射 - 动态生成，直接使用原始分类名称
let categoryMapping = {};

// 分类显示顺序 - 动态生成
let categoryOrder = [];

// 更新分类映射和顺序
function updateCategoryMappings(blogs) {
    const categories = new Set();
    
    // 从博客中收集所有分类
    blogs.forEach(blog => {
        if (blog.category && blog.category.trim()) {
            categories.add(blog.category.trim());
        } else {
            categories.add('uncategorized');
        }
    });
    
    // 更新分类映射
    categoryMapping = {};
    categories.forEach(category => {
        categoryMapping[category] = category;
    });
    
    // 更新分类顺序（按字母顺序排列，uncategorized放最后）
    const sortedCategories = Array.from(categories).sort();
    if (sortedCategories.includes('uncategorized')) {
        categoryOrder = sortedCategories.filter(cat => cat !== 'uncategorized');
        categoryOrder.push('uncategorized');
    } else {
        categoryOrder = sortedCategories;
    }
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    // Daily Inspiration logic
    const quotes = [
        { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
        { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
        { text: 'Code is like humor. When you have to explain it, it’s bad.', author: 'Cory House' },
        { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
        { text: 'Programs must be written for people to read, and only incidentally for machines to execute.', author: 'Harold Abelson' },
        { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
        { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
        { text: 'Experience is the name everyone gives to their mistakes.', author: 'Oscar Wilde' },
        { text: 'Knowledge is power.', author: 'Francis Bacon' },
        { text: 'Great things are done by a series of small things brought together.', author: 'Vincent Van Gogh' }
    ];
    const today = new Date();
    const idx = today.getFullYear() * 1000 + today.getMonth() * 32 + today.getDate();
    const quote = quotes[idx % quotes.length];
    const quoteEl = document.querySelector('.card-quote');
    const authorEl = document.querySelector('.card-quote-author');
    if (quoteEl && authorEl) {
        quoteEl.textContent = '“' + quote.text + '”';
        authorEl.textContent = '— ' + quote.author;
    }
});

// 初始化应用
function initializeApp() {
    // 初始化highlight.js
    if (typeof hljs !== 'undefined') {
        hljs.highlightAll();
        console.log('Highlight.js initialized successfully');
    } else {
        console.warn('Highlight.js not loaded');
    }
    
    // 绑定导航事件
    bindNavigationEvents();
    
    // 更新北京时间
    updateBeijingTime();
    
    // 加载首页内容
    showSection('home');
    
    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const tag = urlParams.get('tag');
    
    if (tag) {
        // 如果有标签参数，等待数据加载后显示标签相关内容
        loadHomePage().then(() => {
            if (window.loadBlogsByTag) {
                window.loadBlogsByTag(tag);
            }
        });
    } else {
        loadHomePage();
    }
    
    // 初始化SSE连接
    initializeSSE();
}

// 绑定导航事件
function bindNavigationEvents() {
    // 使用事件委托处理动态生成的链接
    document.addEventListener('click', function(e) {
        // 检查是否是外部链接（target="_blank"或以http开头的链接）
        if (e.target.tagName === 'A') {
            const href = e.target.getAttribute('href');
            const target = e.target.getAttribute('target');
            
            // 如果是外部链接，让浏览器正常处理
            if (target === '_blank' || (href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')))) {
                return; // 不阻止默认行为，让链接正常打开
            }
        }
        
        // 快捷链接点击事件（分类）
        if (e.target.closest('.shortcut-links') && e.target.tagName === 'A') {
            e.preventDefault();
            const category = e.target.getAttribute('data-category');
            if (category) {
                loadBlogsByCategory(category);
            } else {
                // 处理锚点链接
                const href = e.target.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const targetId = href.substring(1);
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            }
        }
        
        // 标签链接点击事件
        if (e.target.closest('.tag-links') && e.target.tagName === 'A') {
            e.preventDefault();
            const tag = e.target.getAttribute('data-tag');
            if (tag) {
                window.loadBlogsByTag(tag);
            }
        }
    });
    
    // 博客链接点击事件
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('blog-link')) {
            e.preventDefault();
            const blogId = e.target.getAttribute('data-blog-id');
            // Navigate to the new blog detail page with smooth transition
            window.location.href = `/blog-detail.html?id=${blogId}`;
        }
    });
    
    // 返回链接点击事件
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('back-link')) {
            e.preventDefault();
            showSection('home');
            loadHomePage();
        }
    });
    
    // "Recent changes"链接点击事件
    document.addEventListener('click', function(e) {
        if (e.target.getAttribute('href') === '#recent') {
            e.preventDefault();
            loadBlogsByTime();
        }
    });
    
    // "About"链接点击事件
    document.addEventListener('click', function(e) {
        if (e.target.getAttribute('href') === '#about') {
            e.preventDefault();
            showAboutPage();
        }
    });
}

// 显示指定的内容区域
function showSection(sectionName) {
    // 隐藏所有内容区域
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 显示指定的内容区域
    const targetSection = document.getElementById(sectionName + '-section') || document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// 加载首页内容
// 防抖变量和缓存配置
let loadHomePageTimeout = null;
let isLoadingHomePage = false;

// 通用缓存配置
const CACHE_CONFIG = {
    HOME_DATA: {
        key: 'blog_home_data',
        expiryKey: 'blog_home_data_expiry',
        duration: 5 * 60 * 1000 // 5分钟
    },
    BLOG_DETAIL: {
        key: 'blog_detail_',
        expiryKey: 'blog_detail_expiry_',
        duration: 10 * 60 * 1000 // 10分钟
    },
    CATEGORY_DATA: {
        key: 'blog_category_',
        expiryKey: 'blog_category_expiry_',
        duration: 5 * 60 * 1000 // 5分钟
    },
    TAG_DATA: {
        key: 'blog_tag_',
        expiryKey: 'blog_tag_expiry_',
        duration: 5 * 60 * 1000 // 5分钟
    }
};

// 通用缓存工具函数
const CacheUtils = {
    // 获取缓存
    get: function(cacheType, identifier = '') {
        try {
            const config = CACHE_CONFIG[cacheType];
            if (!config) return null;
            
            const cacheKey = config.key + identifier;
            const expiryKey = config.expiryKey + identifier;
            
            const cachedData = localStorage.getItem(cacheKey);
            const cacheExpiry = localStorage.getItem(expiryKey);
            
            if (cachedData && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
                return JSON.parse(cachedData);
            }
            
            // 清除过期缓存
            this.remove(cacheType, identifier);
            return null;
        } catch (error) {
            console.warn('Failed to get cache:', error);
            return null;
        }
    },
    
    // 设置缓存
    set: function(cacheType, data, identifier = '') {
        try {
            const config = CACHE_CONFIG[cacheType];
            if (!config) return false;
            
            const cacheKey = config.key + identifier;
            const expiryKey = config.expiryKey + identifier;
            
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            localStorage.setItem(expiryKey, (Date.now() + config.duration).toString());
            
            console.log(`Cache saved: ${cacheType}${identifier ? '_' + identifier : ''}`);
            return true;
        } catch (error) {
            console.warn('Failed to set cache:', error);
            return false;
        }
    },
    
    // 删除缓存
    remove: function(cacheType, identifier = '') {
        try {
            const config = CACHE_CONFIG[cacheType];
            if (!config) return;
            
            const cacheKey = config.key + identifier;
            const expiryKey = config.expiryKey + identifier;
            
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(expiryKey);
        } catch (error) {
            console.warn('Failed to remove cache:', error);
        }
    },
    
    // 清除所有缓存
    clearAll: function() {
        try {
            Object.values(CACHE_CONFIG).forEach(config => {
                // 清除所有相关的缓存项
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith(config.key) || key.startsWith(config.expiryKey))) {
                        localStorage.removeItem(key);
                        i--; // 调整索引，因为删除了一项
                    }
                }
            });
            console.log('All cache cleared');
        } catch (error) {
            console.warn('Failed to clear all cache:', error);
        }
    }
};

// 兼容旧的缓存常量
const CACHE_KEY = CACHE_CONFIG.HOME_DATA.key;
const CACHE_EXPIRY_KEY = CACHE_CONFIG.HOME_DATA.expiryKey;
const CACHE_DURATION = CACHE_CONFIG.HOME_DATA.duration;

function loadHomePage() {
    return new Promise((resolve) => {
        // 防抖处理，避免重复请求
        if (loadHomePageTimeout) {
            clearTimeout(loadHomePageTimeout);
        }
        
        // 如果正在加载，直接返回
        if (isLoadingHomePage) {
            resolve();
            return;
        }
        
        // 先尝试从缓存加载
    if (loadFromCache()) {
            resolve();
            return;
        }
        
        loadHomePageTimeout = setTimeout(async () => {
            await loadHomePageInternal();
            resolve();
        }, 100);
    });
}

// 从缓存加载数据（使用新的缓存系统）
function loadFromCache() {
    const cachedData = CacheUtils.get('HOME_DATA');
    if (cachedData) {
        console.log('Loading blogs from cache');
        
        showLoading('dynamic-categories');
        showTagsOnRight();
        hideTableOfContents();
        
        allBlogs = cachedData.data.blogs;
        window.allBlogs = allBlogs;
        updateCategoryMappings(allBlogs);
        displayBlogsByCategory(allBlogs);
        generateShortcutLinks(allBlogs);
        generateTagLinks(allBlogs);
    renderQuickFilters(allBlogs);
        
        return true;
    }
    
    return false;
}

// 保存数据到缓存（使用新的缓存系统）
function saveToCache(blogs) {
    const cacheData = {
        blogs: blogs,
        timestamp: Date.now()
    };
    CacheUtils.set('HOME_DATA', cacheData);
}

// 清除缓存（使用新的缓存系统）
function clearCache() {
    CacheUtils.remove('HOME_DATA');
}

// 强制刷新数据（清除缓存后重新加载）
function forceRefreshHomePage() {
    clearCache();
    isLoadingHomePage = false; // 重置加载状态
    loadHomePage();
}

// 清除所有缓存的全局函数
function clearAllCache() {
    CacheUtils.clearAll();
    blogDetailsMap.clear();
    console.log('All cache cleared (localStorage + memory map)');
}

async function loadHomePageInternal() {
    if (isLoadingHomePage) {
        return;
    }
    
    isLoadingHomePage = true;
    showLoading('dynamic-categories');
    
    // 在主页显示Tags在右侧，隐藏目录
    showTagsOnRight();
    hideTableOfContents();
    
    try {
        const response = await fetchWithRetry('/api/blog/list?limit=1000', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        // 检查响应状态
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // 检查响应内容类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Expected JSON response, got: ${contentType}. Response: ${text.substring(0, 200)}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.data && data.data.blogs) {
             allBlogs = data.data.blogs;
             window.allBlogs = allBlogs; // 确保全局可访问
             
             // 保存到缓存
             saveToCache(allBlogs);
             
             updateCategoryMappings(allBlogs); // 更新分类映射
             displayBlogsByCategory(allBlogs);
             generateShortcutLinks(allBlogs);
             generateTagLinks(allBlogs);
             renderQuickFilters(allBlogs);
             
             // 预缓存所有博客详情
             preloadAllBlogDetails(allBlogs);
         } else {
             showError('Failed to load blogs: ' + (data.message || 'Unknown error'));
         }
    } catch (error) {
        console.error('Error loading blogs:', error);
        showError('Failed to load blogs: ' + error.message);
    } finally {
        isLoadingHomePage = false;
    }
}

// 带重试的fetch函数
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            lastError = error;
            console.warn(`Fetch attempt ${i + 1} failed:`, error.message);
            
            // 如果不是最后一次重试，等待一段时间再重试
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }
    
    throw lastError;
}

// 按分类加载博客
function loadBlogsByCategory(category) {
    // 切换到首页视图
    showSection('home');
    
    // 在分类页面显示Tags在右侧，隐藏目录
    showTagsOnRight();
    hideTableOfContents();
    
    const filteredBlogs = allBlogs.filter(blog => {
        // 对于uncategorized分类，包含没有分类或分类为空的博客
        if (category === 'uncategorized') {
            return !blog.category || blog.category.trim() === '';
        }
        
        // 对于其他分类，排除没有分类的博客
        if (!blog.category) return false;
        
        // 检查是否匹配分类
        const blogCategory = blog.category.toLowerCase();
        const targetCategory = category.toLowerCase();
        
        return blogCategory === targetCategory || 
               blogCategory.includes(targetCategory) ||
               targetCategory.includes(blogCategory);
    });
    
    displayBlogsByCategory(filteredBlogs, category);
}

// 按标签加载博客
function loadBlogsByTag(tag) {
    if (!allBlogs || allBlogs.length === 0) {
        return;
    }
    
    // 切换到首页视图
    showSection('home');
    
    const filteredBlogs = allBlogs.filter(blog => {
        if (blog.tags) {
            if (Array.isArray(blog.tags)) {
                return blog.tags.includes(tag);
            } else if (typeof blog.tags === 'string') {
                try {
                    const tags = JSON.parse(blog.tags);
                    return tags.includes(tag);
                } catch (e) {
                    const tags = blog.tags.split(',').map(t => t.trim());
                    return tags.includes(tag);
                }
            }
        }
        return false;
    });
    
    displayBlogsByTag(filteredBlogs, tag);
}

// 确保函数在全局作用域中可访问
window.loadBlogsByTag = loadBlogsByTag;

// Quick Filters: render colorful tag chips for top tags
function renderQuickFilters(blogs) {
    const container = document.getElementById('quick-filters');
    if (!container) return;
    if (!blogs || blogs.length === 0) {
        container.innerHTML = '';
        return;
    }

    // Collect tag frequencies
    const freq = new Map();
    for (const blog of blogs) {
        let tags = [];
        if (Array.isArray(blog.tags)) {
            tags = blog.tags;
        } else if (typeof blog.tags === 'string' && blog.tags.trim()) {
            try { tags = JSON.parse(blog.tags); }
            catch { tags = blog.tags.split(',').map(t => t.trim()).filter(Boolean); }
        }
        for (const t of tags) {
            if (!t) continue;
            freq.set(t, (freq.get(t) || 0) + 1);
        }
    }

    const topTags = Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([t]) => t);

    // If no tags, hide container
    if (topTags.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = '';

    const chips = topTags.map(tag =>
        `<button class="chip" data-tag="${escapeHtml(tag)}" title="Filter by ${escapeHtml(tag)}">
            <span class="chip-dot"></span>
            <span class="chip-label">${escapeHtml(tag)}</span>
        </button>`
    ).join('');

    container.innerHTML = `
        <div class="quick-filters-inner">
            <span class="quick-filters-title">Quick Filters</span>
            <div class="chips">${chips}</div>
        </div>
    `;

    // Click handling
    container.querySelectorAll('.chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tag = btn.getAttribute('data-tag');
            // Highlight active
            container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            // Trigger existing filter
            window.loadBlogsByTag && window.loadBlogsByTag(tag);
            // Scroll into view of content
            const categoriesEl = document.getElementById('dynamic-categories');
            if (categoriesEl) categoriesEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

// Expose for optional reuse
window.renderQuickFilters = renderQuickFilters;

// 按时间顺序加载所有博客
function loadBlogsByTime(page = 1) {
    // 切换到首页视图
    showSection('home');
    
    // 在时间排序页面显示Tags在右侧，隐藏目录
    showTagsOnRight();
    hideTableOfContents();
    
    if (!allBlogs || allBlogs.length === 0) {
        const container = document.getElementById('dynamic-categories');
        if (container) {
            container.innerHTML = '<p>No blogs found.</p>';
        }
        return;
    }
    
    // 按创建时间降序排序（最新的在前）
    const sortedBlogs = [...allBlogs].sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
    });
    
    displayBlogsByTime(sortedBlogs, page);
}

// 显示按时间排序的博客列表
function displayBlogsByTime(blogs, page = 1) {
    const container = document.getElementById('dynamic-categories');
    if (!container) return;
    
    // 在时间排序页面显示Tags在右侧，隐藏目录
    showTagsOnRight();
    hideTableOfContents();
    
    if (!blogs || blogs.length === 0) {
        container.innerHTML = '<p>No blogs found.</p>';
        return;
    }
    
    // 应用分页
    const startIndex = (page - 1) * blogsPerPage;
    const endIndex = startIndex + blogsPerPage;
    const paginatedBlogs = blogs.slice(startIndex, endIndex);
    totalPages = Math.ceil(blogs.length / blogsPerPage);
    
    let html = '<h2>Recent Changes (按时间顺序)</h2><div class="blog-list">';
    
    paginatedBlogs.forEach(blog => {
        const title = escapeHtml(blog.title || 'Untitled');
        const excerpt = escapeHtml(blog.excerpt || 'No excerpt available');
        const date = blog.created_at ? formatDate(blog.created_at) : '';
        
        let tags = '';
        if (blog.tags) {
            if (Array.isArray(blog.tags)) {
                tags = blog.tags.map(tag => escapeHtml(tag)).join(', ');
            } else if (typeof blog.tags === 'string') {
                try {
                    const tagArray = JSON.parse(blog.tags);
                    tags = tagArray.map(tag => escapeHtml(tag)).join(', ');
                } catch (e) {
                    tags = blog.tags.split(',').map(tag => escapeHtml(tag.trim())).join(', ');
                }
            }
        }
        
        html += `
            <div class="blog-item" data-id="${blog.id}">
                <h3><a href="#" class="blog-link" data-blog-id="${blog.id}">${title}</a></h3>
                ${date ? `<p class="blog-meta">Published: ${date}</p>` : ''}
                ${tags ? `<p class="blog-tags">Tags: ${tags}</p>` : ''}
                ${(blog.excerpt && blog.excerpt.trim() !== '' && blog.excerpt !== 'No excerpt available') ? `<p class="blog-excerpt">${excerpt}</p>` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    
    // 添加分页控件
    if (totalPages > 1) {
        html += generatePagination(page, totalPages, 'time');
    }
    
    container.innerHTML = html;
    currentPage = page;
}

// 显示标签过滤后的博客
function displayBlogsByTag(blogs, tag, page = 1) {
    // 在标签页面显示Tags在右侧，隐藏目录
    showTagsOnRight();
    hideTableOfContents();
    
    const dynamicCategoriesContainer = document.getElementById('dynamic-categories');
    if (!dynamicCategoriesContainer) return;
    
    if (blogs.length === 0) {
        dynamicCategoriesContainer.innerHTML = `
            <h2>Tag: ${escapeHtml(tag)}</h2>
            <div class="blog-list">
                <div class="error">No blogs found with tag "${escapeHtml(tag)}"</div>
            </div>
        `;
        return;
    }
    
    // 应用分页
    const startIndex = (page - 1) * blogsPerPage;
    const endIndex = startIndex + blogsPerPage;
    const paginatedBlogs = blogs.slice(startIndex, endIndex);
    totalPages = Math.ceil(blogs.length / blogsPerPage);
    
    // 只显示找到的文章，按行排列
    const blogItems = paginatedBlogs.map(blog => createBlogItem(blog)).join('');
    
    let html = `
        <h2>Tag: ${escapeHtml(tag)}</h2>
        <div class="blog-list">
            ${blogItems}
        </div>
    `;
    
    // 添加分页控件
    if (totalPages > 1) {
        html += generatePagination(page, totalPages, 'tag', tag);
    }
    
    dynamicCategoriesContainer.innerHTML = html;
    currentPage = page;
}

// 生成快捷链接（带缓存）
let shortcutLinksCache = null;
let shortcutLinksCacheKey = '';
function generateShortcutLinks(blogs) {
    const shortcutLinksContainer = document.getElementById('shortcut-links');
    if (shortcutLinksContainer) {
        // 如果没有博客，清空快捷链接
        if (!blogs || blogs.length === 0) {
            shortcutLinksContainer.innerHTML = '';
            return;
        }
        
        // 生成缓存键（基于博客数量和最后更新时间）
        const cacheKey = `${blogs.length}_${blogs.map(b => b.updated_at || b.created_at).sort().pop()}`;
        
        // 如果缓存有效，直接使用
        if (shortcutLinksCache && shortcutLinksCacheKey === cacheKey) {
            shortcutLinksContainer.innerHTML = shortcutLinksCache;
            return;
        }
        
        // 按分类分组博客，只显示有文章的分类
        const blogsByCategory = {};
        blogs.forEach(blog => {
            const category = blog.category || 'uncategorized';
            if (!blogsByCategory[category]) {
                blogsByCategory[category] = [];
            }
            blogsByCategory[category].push(blog);
        });
        
        // 定义emoji数组
        const emojis = ['🚀', '💡', '🎯', '⭐', '🔥', '💎', '🌟', '🎨', '🔧', '📚', '🎪', '🎭', '🎨', '🎯', '🎲', '🎸', '🎺', '🎻', '🎹', '🥁', '🎤', '🎧', '🎬', '🎮', '🕹️', '🎰', '🎳', '🎯', '🎪', '🎭'];
        
        // 只为有文章的分类生成链接
        const categoryLinks = categoryOrder
            .filter(category => blogsByCategory[category] && blogsByCategory[category].length > 0)
            .map(category => {
                let displayName = categoryMapping[category] || category;
                // 为所有分类添加随机emoji图标
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                // 如果是英文名称，转换为全大写
                if (/^[a-zA-Z\s]+$/.test(displayName)) {
                    displayName = `${randomEmoji} ${displayName.toUpperCase()}`;
                } else {
                    // 中文或其他语言分类也添加emoji
                    displayName = `${randomEmoji} ${displayName}`;
                }
                return `<a href="#${category}" data-category="${escapeHtml(category)}">${escapeHtml(displayName)}</a>`;
            }).join('');
        
        // 更新缓存
        shortcutLinksCache = categoryLinks;
        shortcutLinksCacheKey = cacheKey;
        
        shortcutLinksContainer.innerHTML = categoryLinks;
    }
}

// 生成右侧标签链接（带缓存）
let tagLinksCache = null;
let tagLinksCacheKey = '';
function generateTagLinks(blogs) {
    const tagLinksContainer = document.getElementById('tag-links');
    if (!tagLinksContainer) return;
    
    // 如果没有博客，清空标签链接
    if (!blogs || blogs.length === 0) {
        tagLinksContainer.innerHTML = '';
        return;
    }
    
    // 生成缓存键（基于博客数量和最后更新时间）
    const cacheKey = `${blogs.length}_${blogs.map(b => b.updated_at || b.created_at).sort().pop()}`;
    
    // 如果缓存有效，直接使用
    if (tagLinksCache && tagLinksCacheKey === cacheKey) {
        tagLinksContainer.innerHTML = tagLinksCache;
        return;
    }
    
    const allTags = new Set();
    
    blogs.forEach(blog => {
        if (blog.tags) {
            if (Array.isArray(blog.tags)) {
                // 如果已经是数组格式
                blog.tags.forEach(tag => allTags.add(tag));
            } else if (typeof blog.tags === 'string') {
                try {
                    // 尝试解析JSON格式的标签
                    const tags = JSON.parse(blog.tags);
                    tags.forEach(tag => allTags.add(tag));
                } catch (e) {
                    // 如果解析失败，尝试按逗号分割
                    const tags = blog.tags.split(',').map(tag => tag.trim());
                    tags.forEach(tag => allTags.add(tag));
                }
            }
        }
    });
    
    const sortedTags = Array.from(allTags).sort();
    const tagLinksHTML = sortedTags.map(tag => 
        `<a href="#" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</a>`
    ).join('');
    
    // 更新缓存
    tagLinksCache = tagLinksHTML;
    tagLinksCacheKey = cacheKey;
    
    tagLinksContainer.innerHTML = tagLinksHTML;
}

// 将字符串转换为首字母大写格式
function toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

// 显示博客列表（按分类分组，支持分页）
function displayBlogsByCategory(blogs, filterCategory = null, page = 1) {
    const dynamicCategoriesContainer = document.getElementById('dynamic-categories');
    if (!dynamicCategoriesContainer) return;
    
    // 如果没有博客，显示友好消息
    if (!blogs || blogs.length === 0) {
        dynamicCategoriesContainer.innerHTML = `
            <div class="no-content">
                <h2>暂无文章</h2>
                <p>目前还没有发布任何文章，请稍后再来查看。</p>
            </div>
        `;
        return;
    }
    
    // 按分类分组博客
    const blogsByCategory = {};
    
    blogs.forEach(blog => {
        const category = (blog.category && blog.category.trim()) || 'uncategorized';
        if (!blogsByCategory[category]) {
            blogsByCategory[category] = [];
        }
        blogsByCategory[category].push(blog);
    });
    
    // 如果有过滤条件，只显示特定分类
    if (filterCategory) {
        const categoryBlogs = blogsByCategory[filterCategory] || [];
        let displayName = categoryMapping[filterCategory] || filterCategory;
        displayName = toTitleCase(displayName);
        
        // 对单个分类也应用分页
        const startIndex = (page - 1) * blogsPerPage;
        const endIndex = startIndex + blogsPerPage;
        const paginatedBlogs = categoryBlogs.slice(startIndex, endIndex);
        totalPages = Math.ceil(categoryBlogs.length / blogsPerPage);
        
        dynamicCategoriesContainer.innerHTML = `
            <h2>${escapeHtml(displayName)}</h2>
            <div class="blog-list">
                ${paginatedBlogs.length > 0 ? 
                    paginatedBlogs.map(blog => createBlogItem(blog)).join('') : 
                    '<div class="error">No blogs found in this category</div>'
                }
            </div>
            ${totalPages > 1 ? generatePagination(page, totalPages, 'category', filterCategory) : ''}
        `;
        return;
    }
    
    // 收集所有博客并应用分页
    let allCategoryBlogs = [];
    categoryOrder.forEach(category => {
        const categoryBlogs = blogsByCategory[category] || [];
        if (categoryBlogs.length > 0) {
            let displayName = categoryMapping[category] || category;
            displayName = toTitleCase(displayName);
            allCategoryBlogs.push({
                category: category,
                displayName: displayName,
                blogs: categoryBlogs
            });
        }
    });
    
    // 计算总页数
    const totalBlogs = allCategoryBlogs.reduce((sum, cat) => sum + cat.blogs.length, 0);
    totalPages = Math.ceil(totalBlogs / blogsPerPage);
    
    // 分页逻辑：按博客数量而不是分类数量分页
    let currentBlogCount = 0;
    let startIndex = (page - 1) * blogsPerPage;
    let endIndex = startIndex + blogsPerPage;
    let html = '';
    
    for (const categoryData of allCategoryBlogs) {
        const categoryBlogs = categoryData.blogs;
        const categoryStartIndex = Math.max(0, startIndex - currentBlogCount);
        const categoryEndIndex = Math.min(categoryBlogs.length, endIndex - currentBlogCount);
        
        if (categoryStartIndex < categoryBlogs.length && currentBlogCount < endIndex) {
            const visibleBlogs = categoryBlogs.slice(categoryStartIndex, categoryEndIndex);
            if (visibleBlogs.length > 0) {
                html += `
                    <h2 id="${categoryData.category}">${escapeHtml(categoryData.displayName)}</h2>
                    <div class="blog-list">
                        ${visibleBlogs.map(blog => createBlogItem(blog)).join('')}
                    </div>
                `;
            }
        }
        
        currentBlogCount += categoryBlogs.length;
        if (currentBlogCount >= endIndex) break;
    }
    
    // 如果没有任何分类有博客，显示空状态
    if (html === '') {
        dynamicCategoriesContainer.innerHTML = `
            <div class="no-content">
                <h2>暂无文章</h2>
                <p>目前还没有发布任何文章，请稍后再来查看。</p>
            </div>
        `;
    } else {
        dynamicCategoriesContainer.innerHTML = html + (totalPages > 1 ? generatePagination(page, totalPages, 'home') : '');
    }
    
    currentPage = page;
}

// 生成分页控件
function generatePagination(currentPage, totalPages, type, filterValue = null) {
    if (totalPages <= 1) return '';
    
    let pagination = '<div class="pagination">';
    
    // 上一页按钮
    if (currentPage > 1) {
        pagination += `<button class="pagination-btn" onclick="navigateToPage(${currentPage - 1}, '${type}', '${filterValue || ''}')">‹ 上一页</button>`;
    }
    
    // 页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // 调整起始页
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 第一页
    if (startPage > 1) {
        pagination += `<button class="pagination-btn" onclick="navigateToPage(1, '${type}', '${filterValue || ''}')">1</button>`;
        if (startPage > 2) {
            pagination += '<span class="pagination-ellipsis">...</span>';
        }
    }
    
    // 页码范围
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? ' active' : '';
        pagination += `<button class="pagination-btn${activeClass}" onclick="navigateToPage(${i}, '${type}', '${filterValue || ''}')">${i}</button>`;
    }
    
    // 最后一页
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pagination += '<span class="pagination-ellipsis">...</span>';
        }
        pagination += `<button class="pagination-btn" onclick="navigateToPage(${totalPages}, '${type}', '${filterValue || ''}')">${totalPages}</button>`;
    }
    
    // 下一页按钮
    if (currentPage < totalPages) {
        pagination += `<button class="pagination-btn" onclick="navigateToPage(${currentPage + 1}, '${type}', '${filterValue || ''}')">下一页 ›</button>`;
    }
    
    pagination += '</div>';
    return pagination;
}

// 导航到指定页面
function navigateToPage(page, type, filterValue = null) {
    if (page < 1 || page > totalPages) return;
    
    switch (type) {
        case 'home':
            displayBlogsByCategory(allBlogs, null, page);
            break;
        case 'category':
            displayBlogsByCategory(allBlogs, filterValue, page);
            break;
        case 'tag':
            // 需要重新获取按标签过滤的博客
            const tagBlogs = allBlogs.filter(blog => {
                if (!blog.tags) return false;
                let tags = [];
                if (Array.isArray(blog.tags)) {
                    tags = blog.tags;
                } else if (typeof blog.tags === 'string') {
                    try {
                        tags = JSON.parse(blog.tags);
                    } catch (e) {
                        tags = blog.tags.split(',').map(tag => tag.trim());
                    }
                }
                return tags.includes(filterValue);
            });
            displayBlogsByTag(tagBlogs, filterValue, page);
            break;
        case 'time':
            const sortedBlogs = [...allBlogs].sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB - dateA;
            });
            displayBlogsByTime(sortedBlogs, page);
            break;
    }
    
    // 滚动到顶部
    document.getElementById('dynamic-categories').scrollIntoView({ behavior: 'smooth' });
}

// 创建博客项目HTML（带缓存优化）
const blogItemCache = new Map();
function createBlogItem(blog) {
    // 生成缓存键
    const cacheKey = `${blog.id}_${blog.updated_at || blog.created_at}`;
    
    // 检查缓存
    if (blogItemCache.has(cacheKey)) {
        return blogItemCache.get(cacheKey);
    }
    
    const title = escapeHtml(blog.title || 'Untitled');
    
    let tags = '';
    if (blog.tags) {
        if (Array.isArray(blog.tags)) {
            // 如果已经是数组格式
            tags = blog.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
        } else if (typeof blog.tags === 'string') {
            try {
                // 尝试解析JSON格式的标签
                const tagArray = JSON.parse(blog.tags);
                tags = tagArray.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
            } catch (e) {
                // 如果解析失败，尝试按逗号分割
                tags = blog.tags.split(',').map(tag => `<span class="tag">${escapeHtml(tag.trim())}</span>`).join('');
            }
        }
    }
    
    const blogItemHTML = `
        <div class="blog-item">
            <a href="#" class="blog-link" data-blog-id="${blog.id}" data-updated-at="${blog.updated_at || blog.created_at}">${title}</a>
            ${tags ? `<span class="blog-tags">${tags}</span>` : ''}
        </div>
    `;
    
    // 缓存结果（限制缓存大小）
    if (blogItemCache.size > 100) {
        const firstKey = blogItemCache.keys().next().value;
        blogItemCache.delete(firstKey);
    }
    blogItemCache.set(cacheKey, blogItemHTML);
    
    return blogItemHTML;
}

// 加载博客详情
function loadBlogDetail(blogId, updatedAt) {
    currentBlogId = blogId;
    showLoading('blog-detail-content');
    showSection('blog-detail');

    // 检查内存缓存
    if (blogDetailsMap.has(blogId)) {
        const cachedData = blogDetailsMap.get(blogId);
        // 检查时间戳是否匹配
        if (cachedData.updated_at === updatedAt || cachedData.created_at === updatedAt) {
            console.log('Loading blog detail from memory map:', blogId);
            displayBlogDetail(cachedData);
            return;
        }
    }

    // 检查localStorage缓存
    const cachedBlog = CacheUtils.get('BLOG_DETAIL', blogId);
    if (cachedBlog) {
        // 检查时间戳是否匹配
        if (cachedBlog.data.updated_at === updatedAt || cachedBlog.data.created_at === updatedAt) {
            console.log('Loading blog detail from localStorage cache:', blogId);
            blogDetailsMap.set(blogId, cachedBlog.data); // 更新内存Map
            displayBlogDetail(cachedBlog.data);
            return;
        }
    }
    
    // 如果缓存不匹配或不存在，则从服务器获取
    console.log('Fetching blog detail from server:', blogId);
    fetchWithRetry(`/api/blog/detail?id=${blogId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success' && data.data) {
                // 更新内存Map和localStorage缓存
                blogDetailsMap.set(blogId, data.data);
                CacheUtils.set('BLOG_DETAIL', data.data, blogId);
                
                displayBlogDetail(data.data);

            } else {
                showError(data.message || 'Failed to load blog detail');
            }
        })
        .catch(error => {
            console.error('Error loading blog detail:', error);
            showError('Error loading blog detail: ' + error.message);
        });
}

// 控制Tags显示位置的函数
function showTagsOnLeft() {
    const rightTags = document.getElementById('right-tags');
    const leftTags = document.getElementById('left-tags');
    const leftTagLinks = document.getElementById('left-tag-links');
    const rightTagLinks = document.getElementById('tag-links');
    
    if (rightTags) rightTags.style.display = 'none';
    if (leftTags) leftTags.style.display = 'block';
    
    // 复制标签内容到左侧
    if (rightTagLinks && leftTagLinks) {
        leftTagLinks.innerHTML = rightTagLinks.innerHTML;
    }
}

function showTagsOnRight() {
    const rightTags = document.getElementById('right-tags');
    const leftTags = document.getElementById('left-tags');
    const rightSidebar = document.querySelector('.sidebar-right');
    
    // 确保右侧边栏可见
    if (rightSidebar) rightSidebar.style.display = 'block';
    if (rightTags) rightTags.style.display = 'block';
    if (leftTags) leftTags.style.display = 'none';
}

// 渲染Markdown内容
function renderMarkdown(content) {
    if (!content) return 'No content available';
    console.log("Original Markdown content:", content);
    
    // 检查marked库是否可用
    if (typeof marked !== 'undefined') {
        try {
            // 配置marked选项
            marked.setOptions({
                breaks: true,        // 支持换行
                gfm: true,          // 支持GitHub风格的Markdown
                sanitize: false,    // 不过滤HTML（如果需要更安全可以设为true）
                smartLists: true,   // 智能列表
                smartypants: true,  // 智能标点
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
                    return code; // no-highlight
                }
            });
            
            let html = marked.parse(content);
            console.log("After marked.parse:", html);
            
            // 后处理：为代码块添加容器和复制按钮
            html = enhanceCodeBlocks(html);
            console.log("After enhanceCodeBlocks:", html);
            
            return html;
        } catch (error) {
            console.error('Markdown parsing error:', error);
            // 如果解析失败，返回原始内容但进行HTML转义
            return escapeHtml(content).replace(/\n/g, '<br>');
        }
    } else {
        // 如果marked库未加载，简单处理换行
        return escapeHtml(content).replace(/\n/g, '<br>');
    }
}

// 增强代码块：添加容器和复制按钮
function enhanceCodeBlocks(html) {
    // 匹配代码块的正则表达式，捕获整个class属性值
    const codeBlockRegex = /<pre><code(?: class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g;
    
    return html.replace(codeBlockRegex, (match, classString, code) => {
        let language = '';
        if (classString) {
            const langMatch = classString.match(/language-(\w+)/);
            if (langMatch) {
                language = langMatch[1];
            }
        }

        // 生成唯一ID
        const blockId = 'code-block-' + Math.random().toString(36).substr(2, 9);
        
        // 确定语言标签
        const langLabel = language ? language.toUpperCase() : 'CODE';
        
        // The 'code' is already highlighted by marked's highlight function
        // We reconstruct the code tag with its original classes.
        const preTag = `<pre id="${blockId}"><code${classString ? ` class="${classString}"` : ''}>${code}</code></pre>`;

        return `
            <div class="code-block-container">
                <div class="code-block-header">
                    <div class="code-header-left">
                        <div class="traffic-lights">
                            <div class="traffic-light red"></div>
                            <div class="traffic-light yellow"></div>
                            <div class="traffic-light green"></div>
                        </div>
                        <span class="code-language">${langLabel}</span>
                    </div>
                    <button class="copy-button" onclick="copyCodeBlock('${blockId}')">
                        <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span class="copy-text">Copy</span>
                    </button>
                </div>
                ${preTag}
            </div>`;
    });
}

// 复制代码块内容
function copyCodeBlock(blockId) {
    const codeBlock = document.getElementById(blockId);
    if (!codeBlock) return;
    
    // 获取纯文本内容，去除HTML标签
    const codeElement = codeBlock.querySelector('code');
    const code = codeElement ? codeElement.textContent || codeElement.innerText : '';
    
    // 使用现代的Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(() => {
            showCopySuccess(blockId);
        }).catch(err => {
            console.error('Failed to copy code:', err);
            fallbackCopyTextToClipboard(code, blockId);
        });
    } else {
        // 降级方案
        fallbackCopyTextToClipboard(code, blockId);
    }
}

// 降级复制方案
function fallbackCopyTextToClipboard(text, blockId) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopySuccess(blockId);
        }
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }
    
    document.body.removeChild(textArea);
}

// 显示复制成功状态
function showCopySuccess(blockId) {
    const container = document.getElementById(blockId).closest('.code-block-container');
    const button = container.querySelector('.copy-button');
    const textSpan = button.querySelector('.copy-text');
    
    // 保存原始状态
    const originalText = textSpan.textContent;
    const originalClass = button.className;
    
    // 显示成功状态
    button.classList.add('copied');
    textSpan.textContent = 'Copied!';
    
    // 2秒后恢复原始状态
    setTimeout(() => {
        button.className = originalClass;
        textSpan.textContent = originalText;
    }, 2000);
}

// 生成文章目录
function generateTableOfContents(content) {
    if (!content) return '';
    
    // 创建一个临时div来解析HTML内容
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // 查找所有标题元素
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    if (headings.length === 0) {
        return '<p class="text-muted">本文暂无目录</p>';
    }
    
    let tocHTML = '';
    headings.forEach((heading, index) => {
        const level = heading.tagName.toLowerCase();
        const text = heading.textContent.trim();
        const id = `heading-${index}`;
        
        // 为标题添加ID，方便锚点跳转
        heading.id = id;
        
        // 生成目录项
        tocHTML += `<a href="#${id}" class="toc-${level} toc-link" data-target="${id}">${escapeHtml(text)}</a>`;
    });
    
    // 更新原始内容中的标题ID
    return { tocHTML, updatedContent: tempDiv.innerHTML };
}

// 处理目录点击事件
function handleTocClick(event) {
    event.preventDefault();
    const target = event.target;
    if (target.classList.contains('toc-link')) {
        const targetId = target.getAttribute('data-target');
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
}

// 显示/隐藏目录
function showTableOfContents() {
    const tocContainer = document.getElementById('article-toc');
    const tagsContainer = document.getElementById('right-tags');
    const rightSidebar = document.querySelector('.sidebar-right');
    
    // 确保右侧边栏可见
    if (rightSidebar) rightSidebar.style.display = 'block';
    if (tocContainer) tocContainer.style.display = 'block';
    if (tagsContainer) tagsContainer.style.display = 'none';
}

function hideTableOfContents() {
    const tocContainer = document.getElementById('article-toc');
    const tagsContainer = document.getElementById('right-tags');
    
    if (tocContainer) tocContainer.style.display = 'none';
    if (tagsContainer) tagsContainer.style.display = 'block';
}

// 显示博客详情
function displayBlogDetail(blog) {
    const container = document.getElementById('blog-detail-content');
    if (!container) return;
    
    // 在文章详情页显示Tags在左侧
    showTagsOnLeft();
    
    const title = escapeHtml(blog.title || 'Untitled');
    const rawContent = blog.content || 'No content available';
    const renderedContent = renderMarkdown(rawContent);
    const date = blog.created_at ? formatDate(blog.created_at) : '';
    
    // 生成目录
    const tocResult = generateTableOfContents(renderedContent);
    const finalContent = tocResult.updatedContent || renderedContent;
    const tocHTML = tocResult.tocHTML || '';
    
    // 显示目录并更新目录内容
    if (tocHTML) {
        showTableOfContents();
        const tocContainer = document.getElementById('toc-links');
        if (tocContainer) {
            tocContainer.innerHTML = tocHTML;
            // 为目录链接添加点击事件监听器
            tocContainer.addEventListener('click', handleTocClick);
        }
    } else {
        // 如果没有目录，隐藏整个右侧边栏
        const rightSidebar = document.querySelector('.sidebar-right');
        if (rightSidebar) {
            rightSidebar.style.display = 'none';
        }
    }
    
    let tags = '';
    if (blog.tags) {
        if (Array.isArray(blog.tags)) {
            // 如果已经是数组格式
            tags = blog.tags.map(tag => escapeHtml(tag)).join(', ');
        } else if (typeof blog.tags === 'string') {
            try {
                // 尝试解析JSON格式的标签
                const tagArray = JSON.parse(blog.tags);
                tags = tagArray.map(tag => escapeHtml(tag)).join(', ');
            } catch (e) {
                // 如果解析失败，尝试按逗号分割
                tags = blog.tags.split(',').map(tag => escapeHtml(tag.trim())).join(', ');
            }
        }
    }
    
    container.innerHTML = `
        <a href="#" class="back-link">← Back to Index</a>
        <h1>${title}</h1>
        ${date ? `<p class="blog-meta">Published: ${date}</p>` : ''}
        ${tags ? `<p class="blog-tags">Tags: ${tags}</p>` : ''}
        <div class="blog-content">${finalContent}</div>
    `;
    
    // 重新应用代码高亮
    if (typeof hljs !== 'undefined') {
        hljs.highlightAll();
    }
}

// 显示加载状态
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '<div class="loading">Loading...</div>';
    }
}

// 显示错误信息
function showError(message) {
    const containers = ['computation-list', 'types-list', 'meta-programming-list', 'continuations-list', 'algorithms-list', 'logic-list', 'essays-list'];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
        }
    });
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
}

// 更新北京时间（带缓存优化）
let lastFormattedTime = '';
function updateBeijingTime() {
    function updateTime() {
        const now = new Date();
        // 获取北京时间 (UTC+8)
        const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
        
        // 格式化为 "Month Day, Year" 格式
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'Asia/Shanghai'
        };
        
        const formattedTime = beijingTime.toLocaleDateString('en-US', options);
        
        // 只有时间变化时才更新DOM，避免不必要的重绘
        if (formattedTime !== lastFormattedTime) {
            const timeElement = document.getElementById('current-time');
            if (timeElement) {
                timeElement.textContent = formattedTime;
                lastFormattedTime = formattedTime;
            }
        }
    }
    
    // 立即更新一次
    updateTime();
    
    // 每分钟更新一次
      setInterval(updateTime, 60000);
  }

// 缓存状态监控和调试函数
function getCacheStatus() {
    const status = {
        localStorage: {
            used: 0,
            items: 0,
            cacheItems: []
        },
        memoryCache: {
            blogDetailsMap: blogDetailsMap.size,
            blogItems: blogItemCache.size,
            shortcutLinks: shortcutLinksCache ? 'cached' : 'empty',
            tagLinks: tagLinksCache ? 'cached' : 'empty'
        },
        cacheConfig: CACHE_CONFIG
    };
    
    // 统计localStorage使用情况
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        status.localStorage.used += key.length + value.length;
        status.localStorage.items++;
        
        // 检查是否是我们的缓存项
        const isCacheItem = Object.values(CACHE_CONFIG).some(config => 
            key.startsWith(config.key) || key.startsWith(config.expiryKey)
        );
        
        if (isCacheItem) {
            status.localStorage.cacheItems.push({
                key: key,
                size: key.length + value.length,
                isExpiry: key.includes('_expiry')
            });
        }
    }
    
    return status;
}

// 打印缓存状态到控制台
function printCacheStatus() {
    const status = getCacheStatus();
    console.group('🗄️ Cache Status Report');
    console.log('📊 LocalStorage:', status.localStorage);
    console.log('🧠 Memory Cache:', status.memoryCache);
    console.log(`📝 Blog Details in Memory: ${blogDetailsMap.size} items`);
    console.log('⚙️ Cache Config:', status.cacheConfig);
    console.groupEnd();
    return status;
}

// 预加载所有博客详情
async function preloadAllBlogDetails(blogs) {
    if (!blogs || blogs.length === 0) return;
    
    console.log(`Starting to preload ${blogs.length} blog details...`);
    
    // 批量预加载，每次处理5个博客，避免过多并发请求
    const batchSize = 5;
    let loadedCount = 0;
    let fromCacheCount = 0;
    
    for (let i = 0; i < blogs.length; i += batchSize) {
        const batch = blogs.slice(i, i + batchSize);
        
        // 并行加载当前批次的博客详情
        const promises = batch.map(async (blog) => {
            try {
                // 检查是否已经在内存Map中
                if (blogDetailsMap.has(blog.id)) {
                    return; // 已在内存中，跳过
                }
                
                // 检查是否在localStorage缓存中
                const cached = CacheUtils.get('BLOG_DETAIL', blog.id);
                if (cached) {
                    // 从localStorage加载到内存Map
                    blogDetailsMap.set(blog.id, cached.data);
                    fromCacheCount++;
                    return;
                }
                
                const response = await fetchWithRetry(`/api/blog/${blog.id}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success' && data.data) {
                        // 保存到内存Map和localStorage缓存
                        blogDetailsMap.set(blog.id, data.data);
                        CacheUtils.set('BLOG_DETAIL', data.data, blog.id);
                        loadedCount++;
                    }
                }
            } catch (error) {
                console.warn(`Failed to preload blog ${blog.id}:`, error.message);
            }
        });
        
        // 等待当前批次完成
        await Promise.all(promises);
        
        // 添加小延迟，避免服务器压力过大
        if (i + batchSize < blogs.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    console.log(`Preloaded ${loadedCount} blog details from server, ${fromCacheCount} from cache. Total in memory: ${blogDetailsMap.size}`);
}

// 导出全局函数
window.navigateToPage = navigateToPage;
window.loadHomePage = loadHomePage;
window.loadBlogDetail = loadBlogDetail;

window.clearAllCache = clearAllCache;
window.forceRefreshHomePage = forceRefreshHomePage;
window.CacheUtils = CacheUtils;
window.getCacheStatus = getCacheStatus;
window.printCacheStatus = printCacheStatus;
window.preloadAllBlogDetails = preloadAllBlogDetails;
window.copyCodeBlock = copyCodeBlock;

// 显示About页面
function showAboutPage() {
    // 切换到About页面
    showSection('about');
    
    // 隐藏右侧标签和目录
    hideTableOfContents();
    document.getElementById('right-tags').style.display = 'none';
    
    // 显示左侧快捷链接
    document.getElementById('shortcut-links').parentElement.style.display = 'block';
    document.getElementById('left-tags').style.display = 'none';
    
    // 生成About页面内容
    const aboutContent = `
        <div class="back-link-container">
            <a href="#" class="back-link">← 返回首页</a>
        </div>
        
        <h1>👤 About Me</h1>
        
        <div class="about-info">
            <h2>🚀 个人简介</h2>
            <p>欢迎来到我的个人博客！我是一名热爱技术的开发者，专注于软件开发、系统设计和新技术探索。</p>
            
            <h2>💻 技术栈</h2>
            <ul>
                <li><strong>编程语言：</strong>C++, Python, JavaScript, Go</li>
                <li><strong>前端技术：</strong>HTML5, CSS3, JavaScript, React, Vue.js</li>
                <li><strong>后端技术：</strong>Node.js, Python Flask/Django, C++ Muduo</li>
                <li><strong>数据库：</strong>MySQL, PostgreSQL, SQLite, Redis</li>
                <li><strong>工具与平台：</strong>Git, Docker, Linux, AWS</li>
            </ul>
            
            <h2>🎯 兴趣领域</h2>
            <ul>
                <li>系统编程与性能优化</li>
                <li>Web开发与前端技术</li>
                <li>数据库设计与优化</li>
                <li>算法与数据结构</li>
                <li>人工智能与机器学习</li>
            </ul>
            
            <h2>📫 联系方式</h2>
            <p>
                <a href="https://github.com/charles" target="_blank">🐙 GitHub</a> |
                <a href="mailto:your.email@example.com">📧 Email</a> |
                <a href="https://linkedin.com/in/yourprofile" target="_blank">💼 LinkedIn</a>
            </p>
            
            <h2>📝 关于本站</h2>
            <p>这个博客使用C++后端（基于Muduo网络库）和原生JavaScript前端构建，采用极简设计风格，专注于内容本身。所有代码和文档均为公共领域，欢迎学习和使用。</p>
        </div>
    `;
    
    // 修复：使用正确的元素ID
    const aboutContentDiv = document.getElementById('about-content');
    if (aboutContentDiv) {
        aboutContentDiv.innerHTML = aboutContent;
    }
}

// SSE (Server-Sent Events) 实时数据更新
let eventSource = null;

function initializeSSE() {
    // 检查浏览器是否支持SSE
    if (typeof(EventSource) === "undefined") {
        console.log('浏览器不支持Server-Sent Events');
        return;
    }
    
    try {
        // eventSource = new EventSource('http://127.0.0.1:8080/api/events');
        eventSource = new EventSource('api/events');
        
        eventSource.onopen = function(event) {
            console.log('SSE连接已建立');
        };
        
        eventSource.onmessage = function(event) {
            console.log('收到SSE消息:', event.data);
        };
        
        eventSource.addEventListener('connected', function(event) {
            console.log('SSE连接确认:', JSON.parse(event.data));
        });
        
        eventSource.addEventListener('heartbeat', function(event) {
            // 心跳消息，保持连接活跃
            console.log('SSE心跳:', JSON.parse(event.data));
        });
        
        eventSource.addEventListener('blog_created', function(event) {
            const data = JSON.parse(event.data);
            console.log('博客已创建:', data);
            handleBlogDataChange('created', data);
        });
        
        eventSource.addEventListener('blog_updated', function(event) {
            const data = JSON.parse(event.data);
            console.log('博客已更新:', data);
            handleBlogDataChange('updated', data);
        });
        
        eventSource.addEventListener('blog_deleted', function(event) {
            const data = JSON.parse(event.data);
            console.log('博客已删除:', data);
            handleBlogDataChange('deleted', data);
        });
        
        eventSource.onerror = function(event) {
            console.log('SSE连接错误:', event);
            // 连接断开后尝试重连
            setTimeout(() => {
                if (eventSource.readyState === EventSource.CLOSED) {
                    console.log('尝试重新连接SSE...');
                    initializeSSE();
                }
            }, 5000);
        };
        
    } catch (error) {
        console.error('初始化SSE连接失败:', error);
    }
}

function handleBlogDataChange(action, data) {
    // 清除相关缓存
    clearAllCache();
    
    // 显示通知
    let message = '';
    switch (action) {
        case 'created':
            message = `新博客已发布: ${data.title}`;
            break;
        case 'updated':
            message = `博客已更新: ${data.title}`;
            break;
        case 'deleted':
            message = `博客已删除: ${data.title}`;
            break;
    }
    
    showDataChangeNotification(message);
    
    // 如果当前在首页，刷新数据
    const currentSection = document.querySelector('.nav-link.active')?.textContent;
    if (currentSection === '首页' || !currentSection) {
        setTimeout(() => {
            loadHomePage();
        }, 1000);
    }
}

function showDataChangeNotification(message) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'data-change-notification';
    notification.textContent = message;
    
    // 添加样式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
        word-wrap: break-word;
        animation: slideInRight 0.3s ease-out;
    `;
    
    // 添加动画样式
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 页面卸载时关闭SSE连接
window.addEventListener('beforeunload', function() {
    if (eventSource) {
        eventSource.close();
    }
});