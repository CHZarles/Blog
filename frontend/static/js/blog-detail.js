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
        // Find headings and build nested TOC with collapsible groups
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const headings = Array.from(tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6'));

        if (headings.length === 0) {
            // hide TOC via class so animations stay in CSS
            this.tocSection.classList.add('hidden');
            return content;
        }

        let updatedContent = content;
        const tocRoot = document.createElement('ul');

        // determine minimum heading level in document (e.g., 1 for h1)
        const minLevel = Math.min(...headings.map(h => parseInt(h.tagName.substring(1))));
        const collapseThreshold = minLevel + 1; // collapse deeper than this by default

        // stack keeps track of current list container per level
        const stack = [{ ul: tocRoot, level: minLevel - 1 }];

        headings.forEach((heading, index) => {
            const id = `heading-${index}`;
            const level = parseInt(heading.tagName.substring(1));
            const text = heading.textContent.trim();

            // ensure heading has id in content
            const headingRegex = new RegExp(`<${heading.tagName}([^>]*)>${this.escapeRegex(text)}</${heading.tagName}>`, 'i');
            updatedContent = updatedContent.replace(headingRegex, `<${heading.tagName}$1 id="${id}">${text}</${heading.tagName}>`);

            // find parent container for this level
            while (stack.length && level <= stack[stack.length - 1].level) stack.pop();
            const currentParent = stack[stack.length - 1];

            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = `toc-h${level} toc-link`;
            a.setAttribute('data-target', id);
            a.href = `#${id}`;
            a.textContent = text;
            li.appendChild(a);
            currentParent.ul.appendChild(li);

            // if next heading is deeper, create nested list
            const next = headings[index + 1];
                if (next && parseInt(next.tagName.substring(1)) > level) {
                li.classList.add('collapsible');
                const initiallyCollapsed = level >= collapseThreshold;
                if (initiallyCollapsed) li.classList.add('collapsed'); else li.classList.add('expanded');

                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'toggle-icon';
                toggleBtn.type = 'button';
                toggleBtn.setAttribute('aria-label', initiallyCollapsed ? 'Expand section' : 'Collapse section');
                li.insertBefore(toggleBtn, a);

                const newUl = document.createElement('ul');
                newUl.className = 'nested';
                // reflect collapsed state for assistive tech; actual show/hide is handled by CSS
                if (initiallyCollapsed) newUl.setAttribute('aria-hidden', 'true');
                else newUl.setAttribute('aria-hidden', 'false');
                li.appendChild(newUl);
                stack.push({ ul: newUl, level });
            }
        });

        this.tocNav.innerHTML = '';
        this.tocNav.appendChild(tocRoot);
    // show TOC via class so layout and transitions are consistent
    this.tocSection.classList.remove('hidden');

        // click handlers
        this.tocNav.removeEventListener('click', this._boundHandle);
        this._boundHandle = this.handleTOCClick.bind(this);
        this.tocNav.addEventListener('click', this._boundHandle);

        // intersection observer to highlight active heading
        this.setupIntersectionObserver();

        return updatedContent;
    }
    
    handleTOCClick(event) {
        const toggle = event.target.closest('.toggle-icon');
        if (toggle) {
            event.preventDefault();
            const li = toggle.parentElement;
            const nested = li.querySelector(':scope > .nested');
            // toggle collapsed class; aria-hidden is used to indicate visibility
            const isNowCollapsed = li.classList.toggle('collapsed');
            if (isNowCollapsed) {
                li.classList.remove('expanded');
                if (nested) nested.setAttribute('aria-hidden', 'true');
                toggle.setAttribute('aria-label', 'Expand section');
            } else {
                li.classList.add('expanded');
                if (nested) nested.setAttribute('aria-hidden', 'false');
                toggle.setAttribute('aria-label', 'Collapse section');
            }
            return;
        }

        const link = event.target.closest('.toc-link');
        if (!link) return;
        event.preventDefault();
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
        this.tocNav.querySelectorAll('.toc-link').forEach(link => link.classList.remove('active'));

        // Add active class to current link
        activeLink.classList.add('active');
        this.activeHeading = activeLink;

        // ensure all parent collapsible groups are expanded so the active link is visible
        let parent = activeLink.parentElement;
        while (parent && parent !== this.tocNav) {
                if (parent.classList && parent.classList.contains('collapsible')) {
                    parent.classList.remove('collapsed');
                    parent.classList.add('expanded');
                    const nested = parent.querySelector(':scope > .nested');
                    if (nested) nested.setAttribute('aria-hidden', 'false');
                }
            parent = parent.parentElement;
        }
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

    // Mind map renderer
    this.mindMap = new MindMapRenderer();
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

    // Prepare mind map with current content
    this.mindMap.prepareFromHTML(this.contentEl.querySelector('.content-wrapper'));
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
            scrollToTopBtn.classList.remove('hidden');
        } else {
            scrollToTopBtn.classList.add('hidden');
        }
    });
    
    scrollToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Mind map modal open/close
    const fab = document.getElementById('mindmap-fab');
    const modal = document.getElementById('mindmap-modal');
    const closeBtn = document.getElementById('mindmap-close');
    const backdrop = modal.querySelector('.mindmap-backdrop');
    
    function openMindMap() {
        modal.classList.remove('hidden');
        blogDetailLoader.mindMap.render();
    }
    function closeMindMap() { modal.classList.add('hidden'); }
    
    fab.addEventListener('click', openMindMap);
    closeBtn.addEventListener('click', closeMindMap);
    backdrop.addEventListener('click', closeMindMap);
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
        AnimationUtils,
        MindMapRenderer
    };
}

// Mind Map Renderer - Pure JS SVG
class MindMapRenderer {
    constructor() {
        this.svg = document.getElementById('mindmap-svg');
        this.nodes = [];
        this.root = null;
        this.index = [];
        this.padding = { x: 40, y: 24 };
    this.nodeSize = { w: 180, h: 36, rx: 8 };
    // text and wrapping config
    this.minNodeWidth = 160;
    this.maxNodeWidth = 300; // clamp to avoid overly wide nodes
    this.textPadding = { x: 12, y: 8 };
    this.lineGap = 6;
        this.levelGapX = 220;
        this.levelGapY = 16;
        this.fontSize = 13;
        this.measureCanvas = document.createElement('canvas');
        this.ctx = this.measureCanvas.getContext('2d');
        this.ctx.font = `${this.fontSize}px Georgia, serif`;
        window.addEventListener('resize', () => {
            if (!document.getElementById('mindmap-modal').classList.contains('hidden')) {
                this.render();
            }
        });

        // Event delegation on SVG for toggle and navigation
        this.svg.addEventListener('click', (e) => {
            const group = e.target.closest('g[data-node-idx]');
            if (!group) return;
            const idx = parseInt(group.getAttribute('data-node-idx'), 10);
            const node = this.index[idx];
            if (!node) return;
            const role = e.target.getAttribute('data-role');
            if (role === 'toggle') {
                node.collapsed = !node.collapsed;
                this.render();
                return;
            }
            // Navigate to heading if available
            if (node.hrefId) {
                const modal = document.getElementById('mindmap-modal');
                modal.classList.add('hidden');
                const target = document.getElementById(node.hrefId);
                if (target) {
                    setTimeout(() => AnimationUtils.scrollTo(target), 50);
                }
            }
        });
    }

    // Wrap text into multiple lines to fit within maxContentWidth
    wrapText(text, maxContentWidth) {
        const words = String(text || '').split(/\s+/).filter(Boolean);
        const lines = [];
        let current = '';
        const measure = (s) => this.ctx.measureText(s).width;
        for (const w of words) {
            if (current === '') {
                // start a new line; if single word too long, break it
                if (measure(w) <= maxContentWidth) {
                    current = w;
                } else {
                    // hard-wrap the long word
                    let buf = '';
                    for (const ch of w) {
                        if (measure(buf + ch) <= maxContentWidth) buf += ch; else {
                            if (buf) lines.push(buf);
                            buf = ch;
                        }
                    }
                    current = buf;
                }
            } else if (measure(current + ' ' + w) <= maxContentWidth) {
                current += ' ' + w;
            } else {
                lines.push(current);
                if (measure(w) <= maxContentWidth) {
                    current = w;
                } else {
                    // hard-wrap the long word across lines
                    let buf = '';
                    for (const ch of w) {
                        if (measure(buf + ch) <= maxContentWidth) buf += ch; else {
                            if (buf) lines.push(buf);
                            buf = ch;
                        }
                    }
                    current = buf;
                }
            }
        }
        if (current) lines.push(current);
        return lines.length ? lines : [''];
    }

    prepareFromHTML(container) {
        // Extract headings and build a hierarchy
        const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        if (headings.length === 0) { this.root = null; return; }

        // Build nodes list with level and text
        const items = headings.map((h, i) => {
            // Ensure heading has an id for navigation
            if (!h.id) {
                h.id = `mm-heading-${i}`;
            }
            return { level: parseInt(h.tagName.substring(1)), text: h.textContent.trim(), hrefId: h.id };
        });

        // Determine root: first h1 if present, otherwise use first heading level as root
        const minLevel = Math.min(...items.map(i => i.level));
        const stack = [];
        const root = { text: 'Article', level: minLevel - 1, hrefId: null, children: [], collapsed: false };
        stack.push(root);
        for (const item of items) {
            while (stack.length && item.level <= stack[stack.length - 1].level) stack.pop();
            const node = { text: item.text, level: item.level, hrefId: item.hrefId, children: [], collapsed: false };
            stack[stack.length - 1].children.push(node);
            stack.push(node);
        }
        this.root = root;
    }

    computeLayout() {
        if (!this.root) return { width: 0, height: 0 };
        // Measure text widths for node boxes
        const measureTextWidth = (text) => {
            const metrics = this.ctx.measureText(text);
            return Math.ceil(metrics.width) + 24; // padding inside node
        };

        const nodeSize = this.nodeSize;

        // First compute subtree sizes and assign y positions with tidy layout
        let yCursor = 0;
        function layout(node, depth) {
            node.depth = depth;
            const hasChildren = node.children && node.children.length > 0;
            const leftPad = hasChildren ? 18 : 0; // space for toggle
            // wrap text within max node width
            const maxContentWidth = Math.max(40, Math.min(
                (thisRef.maxNodeWidth - leftPad - 2 * thisRef.textPadding.x),
                1000
            ));
            const lines = thisRef.wrapText(node.text, maxContentWidth);
            const lineHeight = thisRef.fontSize + thisRef.lineGap;
            const contentWidth = Math.ceil(Math.max(...lines.map(l => thisRef.ctx.measureText(l).width), 0));
            const paddedWidth = contentWidth + 2 * thisRef.textPadding.x;
            node.width = Math.max(thisRef.minNodeWidth, Math.min(thisRef.maxNodeWidth - leftPad, paddedWidth));
            node.height = Math.max(thisRef.nodeSize.h, lines.length * lineHeight + 2 * thisRef.textPadding.y);
            node._lines = lines;
            node._leftPad = leftPad;
            if (!hasChildren || node.collapsed) {
                node.subtreeHeight = node.height;
                node.y = yCursor + node.height / 2;
                yCursor += node.height + 12; // leaf gap
                return;
            }
            let firstY = null, lastY = null, totalHeight = 0;
            for (const child of node.children) {
                layout(child, depth + 1);
                if (firstY === null) firstY = child.y;
                lastY = child.y;
                totalHeight += child.subtreeHeight + 12;
            }
            totalHeight -= 12; // remove last gap
            node.subtreeHeight = Math.max(totalHeight, node.height);
            node.y = (firstY + lastY) / 2;
        }
        const thisRef = this;
        layout(this.root, 0);

        // Compute column widths per depth so long titles don't overlap
        const depthWidths = [];
        (function collect(node) {
            const leftPad = node._leftPad || 0;
            depthWidths[node.depth] = Math.max(depthWidths[node.depth] || 0, node.width + leftPad);
            for (const c of node.children || []) collect(c);
        })(this.root);

        // Build x-offsets for each depth as cumulative sum of previous columns + gap
        const colGap = 40; // horizontal gap between columns
        const colX = [];
        colX[0] = 20;
        for (let d = 1; d < depthWidths.length; d++) {
            const prev = depthWidths[d - 1] || this.nodeSize.w;
            colX[d] = (colX[d - 1] || 20) + prev + colGap;
        }

        (function assignX(node) {
            node.x = colX[node.depth] || (20 + node.depth * (nodeSize.w + colGap));
            for (const child of node.children || []) assignX(child);
        })(this.root);

        // Compute overall size
        const totalWidth = depthWidths.reduce((sum, w, i) => {
            if (typeof w !== 'number') return sum;
            if (i === 0) return 20 + w;
            return sum + colGap + w;
        }, 0);
        const width = totalWidth + 200; // right-side padding
        const height = yCursor + 20;
        return { width, height };
    }

    clearSVG() {
        while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
    }

    drawNode(node, idx) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('transform', `translate(${node.x}, ${node.y - node.height / 2})`);
        group.setAttribute('data-node-idx', String(idx));
        group.setAttribute('class', 'mm-node');

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        // leave padding for toggle icon on the left
        const leftPad = node._leftPad || 0;
        rect.setAttribute('x', String(leftPad));
        rect.setAttribute('y', '0');
        rect.setAttribute('rx', String(this.nodeSize.rx));
        rect.setAttribute('ry', String(this.nodeSize.rx));
        rect.setAttribute('width', String(node.width));
        rect.setAttribute('height', String(node.height));
        rect.setAttribute('filter', '');
        rect.setAttribute('data-role', 'navigate');
        rect.style.cursor = node.hrefId ? 'pointer' : 'default';

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const textX = leftPad + this.textPadding.x;
        const baseY = this.textPadding.y + this.fontSize; // baseline for first line
        text.setAttribute('x', String(textX));
        text.setAttribute('y', String(baseY));
        text.setAttribute('font-size', String(this.fontSize));
        text.setAttribute('font-family', 'Georgia, serif');
        text.setAttribute('data-role', 'navigate');
        text.style.cursor = node.hrefId ? 'pointer' : 'default';
        // add tspans for lines
        const lineHeight = this.fontSize + this.lineGap;
        (node._lines || [node.text]).forEach((line, i) => {
            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan.setAttribute('x', String(textX));
            if (i === 0) {
                tspan.setAttribute('dy', '0');
            } else {
                tspan.setAttribute('dy', String(lineHeight));
            }
            tspan.textContent = line;
            tspan.setAttribute('data-role', 'navigate');
            text.appendChild(tspan);
        });

        // Toggle icon for nodes with children
        const hasChildren = node.children && node.children.length > 0;
        if (hasChildren) {
            const cx = 10, cy = node.height / 2; // center vertically to actual height
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', String(cx));
            circle.setAttribute('cy', String(cy));
            circle.setAttribute('r', '8');
            circle.setAttribute('class', 'mm-toggle');
            circle.setAttribute('data-role', 'toggle');
            circle.style.cursor = 'pointer';
            const hline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            hline.setAttribute('x1', String(cx - 5));
            hline.setAttribute('y1', String(cy));
            hline.setAttribute('x2', String(cx + 5));
            hline.setAttribute('y2', String(cy));
            hline.setAttribute('class', 'mm-toggle');
            hline.setAttribute('data-role', 'toggle');
            const vline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            vline.setAttribute('x1', String(cx));
            vline.setAttribute('y1', String(cy - 5));
            vline.setAttribute('x2', String(cx));
            vline.setAttribute('y2', String(node.collapsed ? cy + 5 : cy));
            vline.setAttribute('class', 'mm-toggle');
            vline.setAttribute('data-role', 'toggle');
            group.appendChild(circle);
            group.appendChild(hline);
            if (node.collapsed) group.appendChild(vline);
        }

        group.appendChild(rect);
        group.appendChild(text);
        this.svg.appendChild(group);
    }

    drawLink(parent, child) {
        const parentLeftPad = (parent.children && parent.children.length > 0) ? 18 : 0;
        const childLeftPad = (child.children && child.children.length > 0) ? 18 : 0;
        const x1 = parent.x + parentLeftPad + parent.width;
        const y1 = parent.y;
        const x2 = child.x + childLeftPad;
        const y2 = child.y;
        const mx = (x1 + x2) / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
    path.setAttribute('class', 'mm-link');
    path.setAttribute('fill', 'none');
    this.svg.appendChild(path);
    // endpoint dots
    const d1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    d1.setAttribute('cx', String(x1)); d1.setAttribute('cy', String(y1)); d1.setAttribute('r', '2'); d1.setAttribute('class', 'mm-dot');
    const d2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    d2.setAttribute('cx', String(x2)); d2.setAttribute('cy', String(y2)); d2.setAttribute('r', '2'); d2.setAttribute('class', 'mm-dot');
    this.svg.appendChild(d1);
    this.svg.appendChild(d2);
    }

    render() {
        if (!this.root) return;
        this.clearSVG();
        const { width, height } = this.computeLayout();
        // Auto-resize dialog to fit content (clamped to viewport)
        const dialog = document.querySelector('.mindmap-dialog');
        if (dialog) {
            const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
            const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
            const targetW = Math.min(width + 120, Math.floor(vw * 0.92));
            const targetH = Math.min(height + 120, Math.floor(vh * 0.86));
            dialog.style.width = `${Math.max(600, targetW)}px`;
            dialog.style.height = `${Math.max(400, targetH)}px`;
        }
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        // Build index mapping and draw links first
        this.index = [];
        let counter = 0;
        const traverse = (node) => {
            node._idx = counter++;
            this.index[node._idx] = node;
            if (!node.collapsed) {
                for (const child of node.children || []) {
                    this.drawLink(node, child);
                    traverse(child);
                }
            }
        };
        traverse(this.root);

        // Draw nodes
        const traverseNodes = (node) => {
            this.drawNode(node, node._idx);
            if (!node.collapsed) {
                for (const child of node.children || []) traverseNodes(child);
            }
        };
        traverseNodes(this.root);
    }
}