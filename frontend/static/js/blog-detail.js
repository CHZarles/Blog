// Blog Detail Page JavaScript - Enhanced with Smooth Animations

// Global variables
let detailCurrentBlogId = null;
let detailAllBlogs = [];
let isLoading = false;

// Animation and interaction utilities - Optimized for speed
const AnimationUtils = {
    // Fade in element with delay - Faster transitions
    fadeIn: (element, delay = 0) => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    },
    
    // Smooth scroll to element
    scrollTo: (element, offset = 80) => {
        const elementPosition = element.offsetTop - offset;
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    },
    
    // Typewriter effect for text - Faster speed
    typeWriter: (element, text, speed = 20) => {
        element.textContent = '';
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
    }
};

// Reading progress tracker
class ReadingProgressTracker {
    constructor() {
        this.progressBar = document.getElementById('reading-progress');
        this.init();
    }
    
    init() {
        window.addEventListener('scroll', this.updateProgress.bind(this));
        window.addEventListener('resize', this.updateProgress.bind(this));
    }
    
    updateProgress() {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        
        this.progressBar.style.width = Math.min(scrollPercent, 100) + '%';
    }
}

// Table of Contents manager
class TOCManager {
    constructor() {
        this.tocNav = document.getElementById('toc-nav');
        this.tocSection = document.getElementById('toc-section');
        this.headings = [];
        this.activeHeading = null;
    }
    
    generate(content) {
        // Find all headings in the content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        this.headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        if (this.headings.length === 0) {
            this.tocSection.style.display = 'none';
            return content;
        }
        
        // Generate TOC HTML and update content with IDs
        let tocHTML = '';
        let updatedContent = content;
        
        this.headings.forEach((heading, index) => {
            const id = `heading-${index}`;
            const level = heading.tagName.toLowerCase();
            const text = heading.textContent.trim();
            
            // Add ID to heading in content
            const headingRegex = new RegExp(`<${heading.tagName}([^>]*)>${this.escapeRegex(text)}</${heading.tagName}>`, 'i');
            updatedContent = updatedContent.replace(headingRegex, `<${heading.tagName}$1 id="${id}">${text}</${heading.tagName}>`);
            
            // Add to TOC
            tocHTML += `<a href="#${id}" class="toc-${level} toc-link" data-target="${id}">${text}</a>`;
        });
        
        this.tocNav.innerHTML = tocHTML;
        this.tocSection.style.display = 'block';
        
        // Add click handlers
        this.tocNav.addEventListener('click', this.handleTOCClick.bind(this));
        
        // Set up intersection observer for active highlighting
        this.setupIntersectionObserver();
        
        return updatedContent;
    }
    
    handleTOCClick(event) {
        event.preventDefault();
        const link = event.target.closest('.toc-link');
        if (!link) return;
        
        const targetId = link.getAttribute('data-target');
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            AnimationUtils.scrollTo(targetElement);
            this.setActiveLink(link);
        }
    }
    
    setupIntersectionObserver() {
        const options = {
            rootMargin: '-80px 0px -80% 0px',
            threshold: 0
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    const link = this.tocNav.querySelector(`[data-target="${id}"]`);
                    if (link) {
                        this.setActiveLink(link);
                    }
                }
            });
        }, options);
        
        // Observe all headings after content is loaded
        setTimeout(() => {
            document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]').forEach(heading => {
                observer.observe(heading);
            });
        }, 500);
    }
    
    setActiveLink(activeLink) {
        // Remove active class from all links
        this.tocNav.querySelectorAll('.toc-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current link
        activeLink.classList.add('active');
        this.activeHeading = activeLink;
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Article statistics calculator
class ArticleStats {
    constructor() {
        this.wordCountEl = document.getElementById('word-count');
        this.charCountEl = document.getElementById('char-count');
        this.paragraphCountEl = document.getElementById('paragraph-count');
    }
    
    calculate(content) {
        // Remove HTML tags for accurate counting
        const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Count words
        const words = textContent.split(/\s+/).filter(word => word.length > 0);
        const wordCount = words.length;
        
        // Count characters (excluding spaces)
        const charCount = textContent.replace(/\s/g, '').length;
        
        // Count paragraphs
        const paragraphCount = (content.match(/<p[^>]*>/g) || []).length;
        
        // Update display with animation
        this.animateCount(this.wordCountEl, wordCount);
        this.animateCount(this.charCountEl, charCount);
        this.animateCount(this.paragraphCountEl, paragraphCount);
        
        return { wordCount, charCount, paragraphCount };
    }
    
    animateCount(element, targetValue) {
        element.textContent = targetValue.toLocaleString();
    }
}

// Related articles manager
class RelatedArticlesManager {
    constructor() {
        this.container = document.getElementById('related-articles');
    }
    
    async loadRelated(currentBlog) {
        try {
            // Get all blogs if not already loaded
            if (detailAllBlogs.length === 0) {
                const response = await fetch('/api/blogs');
                detailAllBlogs = await response.json();
            }
            
            // Find related articles based on category and tags
            const related = this.findRelatedArticles(currentBlog, detailAllBlogs);
            this.render(related.slice(0, 5)); // Show top 5 related articles
        } catch (error) {
            console.error('Error loading related articles:', error);
            this.container.innerHTML = '<p class="error-message">Failed to load related articles</p>';
        }
    }
    
    findRelatedArticles(currentBlog, detailAllBlogs) {
        const currentTags = this.parseTags(currentBlog.tags);
        const currentCategory = currentBlog.category;
        
        return detailAllBlogs
            .filter(blog => blog.id !== currentBlog.id)
            .map(blog => {
                let score = 0;
                
                // Category match (higher weight)
                if (blog.category === currentCategory) {
                    score += 3;
                }
                
                // Tag matches
                const blogTags = this.parseTags(blog.tags);
                const commonTags = currentTags.filter(tag => blogTags.includes(tag));
                score += commonTags.length;
                
                return { ...blog, relevanceScore: score };
            })
            .filter(blog => blog.relevanceScore > 0)
            .sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    
    parseTags(tags) {
        if (!tags) return [];
        if (Array.isArray(tags)) return tags;
        if (typeof tags === 'string') {
            try {
                return JSON.parse(tags);
            } catch {
                return tags.split(',').map(tag => tag.trim());
            }
        }
        return [];
    }
    
    render(articles) {
        if (articles.length === 0) {
            this.container.innerHTML = '<p class="no-related">No related articles found</p>';
            return;
        }
        
        const html = articles.map(article => `
            <div class="related-article" onclick="loadBlogDetail(${article.id})">
                <h4 class="related-article-title">${this.escapeHtml(article.title)}</h4>
                <p class="related-article-meta">${article.category} • ${this.formatDate(article.created_at)}</p>
            </div>
        `).join('');
        
        this.container.innerHTML = html;
        
        // Animate in the related articles
        this.container.querySelectorAll('.related-article').forEach((article, index) => {
            AnimationUtils.fadeIn(article, index * 100);
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Main blog detail loader
class BlogDetailLoader {
    constructor() {
        this.tocManager = new TOCManager();
        this.articleStats = new ArticleStats();
        this.relatedManager = new RelatedArticlesManager();
        this.progressTracker = new ReadingProgressTracker();
        
        this.titleEl = document.getElementById('article-title');
        this.contentEl = document.getElementById('article-content');
        this.categoryEl = document.getElementById('article-category');
        this.dateEl = document.getElementById('article-date');
        this.tagsEl = document.getElementById('article-tags');
        this.readingTimeEl = document.getElementById('reading-time');
        this.pageLoader = document.getElementById('page-loader');
    }
    
    async loadBlog(blogId) {
        if (isLoading) return;
        
        isLoading = true;
        detailCurrentBlogId = blogId;
        
        try {
            // Check cache first
            const cacheKey = `blog_${blogId}`;
            const cachedBlog = sessionStorage.getItem(cacheKey);
            
            let blog;
            if (cachedBlog) {
                // Use cached data for faster loading
                blog = JSON.parse(cachedBlog);
                // Render immediately from cache
                await this.renderBlog(blog);
                
                // Fetch fresh data in background
                this.fetchAndUpdateBlog(blogId, cacheKey);
            } else {
                // Fetch blog data
                const response = await fetch(`/api/blogs/${blogId}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                blog = await response.json();
                
                // Cache the data
                sessionStorage.setItem(cacheKey, JSON.stringify(blog));
                
                // Render blog content
                await this.renderBlog(blog);
            }
            
            // Load related articles
            this.relatedManager.loadRelated(blog);
            
        } catch (error) {
            console.error('Error loading blog:', error);
            this.showError('Failed to load article. Please try again.');
        } finally {
            isLoading = false;
        }
    }
    
    async fetchAndUpdateBlog(blogId, cacheKey) {
        try {
            const response = await fetch(`/api/blogs/${blogId}`);
            if (response.ok) {
                const freshBlog = await response.json();
                sessionStorage.setItem(cacheKey, JSON.stringify(freshBlog));
            }
        } catch (error) {
            console.log('Background update failed:', error);
        }
    }
    
    async renderBlog(blog) {
        // Update document title
        document.title = `${blog.title} - Blog Detail`;
        
        // Render markdown content
        const rawContent = blog.content || 'No content available';
        let renderedContent = this.renderMarkdown(rawContent);
        
        // Generate table of contents
        renderedContent = this.tocManager.generate(renderedContent);
        
        // Calculate reading time
        const readingTime = this.calculateReadingTime(rawContent);
        
        // Update header information immediately
        this.titleEl.textContent = blog.title;
        this.categoryEl.textContent = blog.category || 'Uncategorized';
        this.dateEl.textContent = this.formatDate(blog.created_at);
        this.readingTimeEl.textContent = `${readingTime} min read`;
        
        // Render tags immediately
        this.renderTags(blog.tags);
        
        // Update content immediately
        this.contentEl.innerHTML = `<div class="content-wrapper">${renderedContent}</div>`;
        
        // Enhance code blocks with copy buttons
        this.enhanceCodeBlocks();
        
        // Apply syntax highlighting
        if (typeof hljs !== 'undefined') {
            hljs.highlightAll();
        }
        
        // Calculate and display article stats
        this.articleStats.calculate(renderedContent);
    }
    
    renderMarkdown(content) {
        if (typeof marked === 'undefined') {
            return content.replace(/\n/g, '<br>');
        }
        
        // Configure marked options
        marked.setOptions({
            highlight: function(code, lang) {
                if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (err) {}
                }
                return code;
            },
            breaks: true,
            gfm: true
        });
        
        return marked.parse(content);
    }
    
    renderTags(tags) {
        if (!tags) {
            this.tagsEl.innerHTML = '';
            return;
        }
        
        let tagArray = [];
        if (Array.isArray(tags)) {
            tagArray = tags;
        } else if (typeof tags === 'string') {
            try {
                tagArray = JSON.parse(tags);
            } catch {
                tagArray = tags.split(',').map(tag => tag.trim());
            }
        }
        
        const tagHTML = tagArray.map(tag => 
            `<span class="tag" onclick="filterByTag('${this.escapeHtml(tag)}')">${this.escapeHtml(tag)}</span>`
        ).join('');
        
        this.tagsEl.innerHTML = tagHTML;
    }
    
    calculateReadingTime(content) {
        const wordsPerMinute = 200;
        const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
        return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
    }
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    showLoading() {
        this.pageLoader.classList.remove('hidden');
    }
    
    hideLoading() {
        setTimeout(() => {
            this.pageLoader.classList.add('hidden');
        }, 150);
    }
    
    showError(message) {
        this.contentEl.innerHTML = `
            <div class="content-wrapper">
                <div class="error-state">
                    <h2>Oops! Something went wrong</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="retry-button">Try Again</button>
                </div>
            </div>
        `;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    enhanceCodeBlocks() {
        const codeBlocks = this.contentEl.querySelectorAll('pre code');
        
        codeBlocks.forEach((codeElement, index) => {
            const preElement = codeElement.parentElement;
            if (preElement.classList.contains('enhanced')) return; // 避免重复处理
            
            // 获取语言信息
            const classList = codeElement.className.match(/language-(\w+)/);
            const language = classList ? classList[1].toUpperCase() : 'CODE';
            
            // 生成唯一ID
            const blockId = `code-block-${Date.now()}-${index}`;
            preElement.id = blockId;
            
            // 创建容器
            const container = document.createElement('div');
            container.className = 'code-block-container';
            
            // 创建头部
            const header = document.createElement('div');
            header.className = 'code-block-header';
            header.innerHTML = `
                <div class="code-header-left">
                    <div class="traffic-lights">
                        <div class="traffic-light red"></div>
                        <div class="traffic-light yellow"></div>
                        <div class="traffic-light green"></div>
                    </div>
                    <span class="code-language">${language}</span>
                </div>
                <button class="copy-button" onclick="blogDetailLoader.copyCodeBlock('${blockId}')">
                    <svg class="copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    <span class="copy-text">Copy</span>
                </button>
            `;
            
            // 包装原有的pre元素
            preElement.parentNode.insertBefore(container, preElement);
            container.appendChild(header);
            container.appendChild(preElement);
            
            // 标记为已处理
            preElement.classList.add('enhanced');
        });
    }
    
    copyCodeBlock(blockId) {
        const codeBlock = document.getElementById(blockId);
        if (!codeBlock) return;
        
        const codeElement = codeBlock.querySelector('code');
        const code = codeElement ? codeElement.textContent || codeElement.innerText : '';
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(code).then(() => {
                this.showCopySuccess(blockId);
            }).catch(err => {
                console.error('Failed to copy code:', err);
                this.fallbackCopyTextToClipboard(code, blockId);
            });
        } else {
            this.fallbackCopyTextToClipboard(code, blockId);
        }
    }
    
    fallbackCopyTextToClipboard(text, blockId) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showCopySuccess(blockId);
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        
        document.body.removeChild(textArea);
    }
    
    showCopySuccess(blockId) {
        const container = document.getElementById(blockId).closest('.code-block-container');
        const button = container.querySelector('.copy-button');
        const originalText = button.querySelector('.copy-text').textContent;
        
        button.querySelector('.copy-text').textContent = 'Copied!';
        button.style.background = 'rgba(40, 201, 64, 0.2)';
        button.style.borderColor = 'rgba(40, 201, 64, 0.4)';
        button.style.color = '#28c940';
        
        setTimeout(() => {
            button.querySelector('.copy-text').textContent = originalText;
            button.style.background = '';
            button.style.borderColor = '';
            button.style.color = '';
        }, 2000);
    }
}

// Global variable for blogDetailLoader
let blogDetailLoader;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    blogDetailLoader = new BlogDetailLoader();
    
    // Get blog ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const blogId = urlParams.get('id');
    
    if (blogId) {
        blogDetailLoader.loadBlog(blogId);
    } else {
        // Redirect to home if no blog ID
        window.location.href = '/';
    }
    
    // Back button functionality
    document.getElementById('back-to-home').addEventListener('click', function(e) {
        e.preventDefault();
        window.history.back();
    });
    
    // Scroll to top button
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollToTopBtn.style.display = 'flex';
        } else {
            scrollToTopBtn.style.display = 'none';
        }
    });
    
    scrollToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});

// Global functions for external access
window.loadBlogDetail = function(blogId) {
    window.location.href = `/blog-detail.html?id=${blogId}`;
};

window.filterByTag = function(tag) {
    // 跳转到主页并传递标签参数
    window.location.href = `/?tag=${encodeURIComponent(tag)}`;
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BlogDetailLoader,
        TOCManager,
        ArticleStats,
        RelatedArticlesManager,
        AnimationUtils
    };
}