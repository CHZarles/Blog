// 登录校验：未登录则跳转到登录页
fetch('/api/admin/blog/list', { credentials: 'same-origin' })
    .then(resp => {
        if (resp.status === 401) {
            window.location.href = '/admin-login.html';
        }
    });
document.addEventListener('DOMContentLoaded', function() {
    // Load dashboard statistics
    loadDashboardStats();
    
    // Set active navigation
    setActiveNavigation();
});

function loadDashboardStats() {
    // Fetch blog statistics
    fetch('/api/blogs')
        .then(response => response.json())
        .then(blogs => {
            const totalBlogs = blogs.length;
            const categories = new Set(blogs.map(blog => blog.category).filter(cat => cat));
            
            document.getElementById('total-blogs').textContent = totalBlogs;
            document.getElementById('total-categories').textContent = categories.size;
        })
        .catch(error => {
            console.error('Error loading dashboard stats:', error);
            document.getElementById('total-blogs').textContent = '0';
            document.getElementById('total-categories').textContent = '0';
        });
}

function setActiveNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
    
    // Default to dashboard if exact match not found
    if (currentPath === '/admin' || currentPath === '/admin/') {
        document.querySelector('.nav-link[href="/admin"]').classList.add('active');
    }
}

// Add some interactive effects
document.querySelectorAll('.dashboard-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-4px)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(-2px)';
    });
});