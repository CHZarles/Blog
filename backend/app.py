from flask import Flask, jsonify, request, render_template, Response, session, redirect, url_for
from flask_cors import CORS
from database import db_session
from models import Blog, Resume
import markdown
import json
import time
from threading import Lock

# 全局变量用于SSE连接管理
sse_connections = []
sse_lock = Lock()

def send_sse_notification(event_type, data=None):
    """发送SSE通知给所有连接的客户端"""
    with sse_lock:
        message = f"event: {event_type}\ndata: {json.dumps(data or {})}\n\n"
        # 移除已断开的连接
        active_connections = []
        for connection in sse_connections:
            try:
                connection.put(message)
                active_connections.append(connection)
            except:
                pass  # 连接已断开
        sse_connections[:] = active_connections

def create_app():

    app = Flask(__name__, instance_relative_config=True, template_folder='../frontend', static_folder='../frontend/static')
    app.config.from_mapping(
        SECRET_KEY='dev',
        DATABASE=f'sqlite:///{app.instance_path}/blog.sqlite',
    )

    # 简易管理员账号（演示用）
    ADMIN_USERNAME = 'admin'
    ADMIN_PASSWORD = '123456'

    # Enable CORS: allow cross-origin requests to API endpoints. We allow credentials
    # so the admin session cookie can be sent from same-origin admin UI when needed.
    # For production, restrict origins explicitly (CORS resources list).
    CORS(app, resources={r"/api/*": {"origins": "*"}, r"/admin/*": {"origins": "*"}}, supports_credentials=True)

    # 兼容老前端: /api/blog/<id>
    @app.route('/api/blog/<int:blog_id>', methods=['GET'])
    def get_blog_compat(blog_id):
        print(f"[DEBUG] /api/blog/<int:blog_id> called with blog_id={blog_id}")
        blog = Blog.query.filter_by(id=blog_id).first()
        print(f"[DEBUG] Blog found: {blog}")
        if blog:
            return jsonify(blog.to_dict(with_content=True))
        return jsonify({"error": "Blog not found"}), 404

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/api/blog/list')
    def get_blog_list():
        blogs = Blog.query.all()
        return jsonify({
            "status": "success",
            "data": {
                "blogs": [blog.to_dict() for blog in blogs]
            }
        })

    @app.route('/api/blog/detail')
    def get_blog_detail():
        blog_id = request.args.get('id')
        blog = Blog.query.filter_by(id=blog_id).first()
        if blog:
            return jsonify({
                "status": "success",
                "data": blog.to_dict(with_content=True)
            })
        return jsonify({"status": "error", "message": "Blog not found"}), 404

    @app.route('/admin')
    def admin():
        return render_template('admin.html')
    
    @app.route('/admin/manage')
    def admin_manage():
        return render_template('admin-manage.html')
    
    @app.route('/admin/create')
    def admin_create():
        return render_template('admin-create.html')
    
    @app.route('/admin/import-export')
    def admin_import_export():
        return render_template('admin-import-export.html')
    
    @app.route('/admin/edit')
    def admin_edit():
        return render_template('admin-edit.html')
    
    @app.route('/admin/resume')
    def admin_resume():
        return render_template('admin-resume.html')

    # 登录页路由（后台登录入口）
    @app.route('/login')
    def login_page():
        return render_template('admin-login.html')

    # 登录接口：校验成功后进入后台首页
    @app.route('/api/login', methods=['POST'])
    def api_login():
        # 支持表单和JSON
        data = request.get_json(silent=True) or {}
        username = data.get('username') or request.form.get('username')
        password = data.get('password') or request.form.get('password')

        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['logged_in'] = True
            session['username'] = username
            # 普通表单提交：重定向到后台；如果是JSON期望也返回JSON
            if request.is_json:
                return jsonify({"status": "success", "redirect": url_for('admin')}), 200
            return redirect(url_for('admin'))

        # 登录失败
        if request.is_json:
            return jsonify({"status": "error", "message": "Invalid credentials"}), 401
        return redirect(url_for('login_page') + '?error=1')

    # 登出接口
    @app.route('/api/logout', methods=['GET'])
    def api_logout():
        session.clear()
        return redirect(url_for('login_page') + '?logout=1')

    # 统一登录校验：保护 /admin* 页面与 /api/admin* 接口
    @app.before_request
    def require_login_for_admin():
        path = request.path or ''
        # 放行静态与公开路径（不要把'/'作为前缀放进去，否则所有路径都被放行了）
        public_prefixes = (
            '/login', '/api/login', '/api/logout', '/static/', '/api/events',
            '/api/blog/', '/api/blogs', '/api/categories', '/blog-detail.html'
        )
        if path == '/' or any(path == p or path.startswith(p) for p in public_prefixes):
            return None
        # 保护后台入口与后台接口
        if path.startswith('/admin') or path.startswith('/api/admin'):
            if not session.get('logged_in'):
                # API 请求返回401，页面请求重定向
                if path.startswith('/api/'):
                    return jsonify({"status": "error", "message": "Unauthorized"}), 401
                return redirect(url_for('login_page'))
        return None

    @app.route('/blog-detail.html')
    def blog_detail():
        return render_template('blog-detail.html')
    
    # About resume page (public)
    @app.route('/about')
    def about_page():
        return render_template('about.html')
    
    @app.route('/api/events')
    def events():
        """SSE端点，用于实时通知前端数据变更"""
        def event_stream():
            import queue
            q = queue.Queue()
            with sse_lock:
                sse_connections.append(q)
            
            try:
                # 发送初始连接确认
                yield f"event: connected\ndata: {{\"message\": \"Connected to blog updates\"}}\n\n"
                
                while True:
                    try:
                        # 等待消息，超时后发送心跳
                        message = q.get(timeout=30)
                        yield message
                    except queue.Empty:
                        # 发送心跳保持连接
                        yield f"event: heartbeat\ndata: {{\"timestamp\": {int(time.time())}}}\n\n"
            except GeneratorExit:
                # 客户端断开连接
                with sse_lock:
                    if q in sse_connections:
                        sse_connections.remove(q)
        
        return Response(event_stream(), mimetype='text/event-stream', headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        })

    # New unified API endpoints
    @app.route('/api/blogs', methods=['GET'])
    def get_blogs():
        blogs = Blog.query.all()
        return jsonify([blog.to_dict() for blog in blogs])
    
    @app.route('/api/blogs/<int:blog_id>', methods=['GET'])
    def get_blog(blog_id):
        blog = Blog.query.filter_by(id=blog_id).first()
        if blog:
            return jsonify(blog.to_dict(with_content=True))
        return jsonify({"error": "Blog not found"}), 404
    
    @app.route('/api/blogs', methods=['POST'])
    def create_blog():
        data = request.get_json()
        
        if not data.get('title') or not data.get('content'):
            return jsonify({"error": "Title and content are required"}), 400
        
        new_blog = Blog(
            title=data['title'],
            content=data['content'],
            category=data.get('category'),
            tags=data.get('tags')
        )
        db_session.add(new_blog)
        db_session.commit()
        
        # 发送SSE通知
        send_sse_notification('blog_created', {
            'id': new_blog.id,
            'title': new_blog.title,
            'category': new_blog.category
        })
        
        return jsonify({"message": "Blog created successfully", "id": new_blog.id}), 201
    
    @app.route('/api/blogs/<int:blog_id>', methods=['PUT'])
    def update_blog(blog_id):
        data = request.get_json()
        blog = Blog.query.filter_by(id=blog_id).first()
        
        if not blog:
            return jsonify({"error": "Blog not found"}), 404
        
        if not data.get('title') or not data.get('content'):
            return jsonify({"error": "Title and content are required"}), 400
        
        blog.title = data['title']
        blog.content = data['content']
        blog.category = data.get('category')
        blog.tags = data.get('tags')
        db_session.commit()
        
        # 发送SSE通知
        send_sse_notification('blog_updated', {
            'id': blog.id,
            'title': blog.title,
            'category': blog.category
        })
        
        return jsonify({"message": "Blog updated successfully"})
    
    @app.route('/api/blogs/<int:blog_id>', methods=['DELETE'])
    def delete_blog(blog_id):
        blog = Blog.query.filter_by(id=blog_id).first()
        
        if not blog:
            return jsonify({"error": "Blog not found"}), 404
        
        # 保存删除前的信息用于通知
        deleted_blog_info = {
            'id': blog.id,
            'title': blog.title,
            'category': blog.category
        }
        
        db_session.delete(blog)
        db_session.commit()
        
        # 发送SSE通知
        send_sse_notification('blog_deleted', deleted_blog_info)
        
        return jsonify({"message": "Blog deleted successfully"})
    
    @app.route('/api/categories', methods=['GET'])
    def get_categories():
        """获取所有现有的分类"""
        # 查询所有不为空的分类
        categories = db_session.query(Blog.category).filter(Blog.category.isnot(None), Blog.category != '').distinct().all()
        # 提取分类名称并排序
        category_list = sorted([cat[0] for cat in categories if cat[0] and cat[0].strip()])
        return jsonify(category_list)
    
    @app.route('/api/tags', methods=['GET'])
    def get_tags():
        """获取所有不重复的标签列表"""
        # 从数据库获取所有tags字段
        rows = db_session.query(Blog.tags).filter(Blog.tags.isnot(None), Blog.tags != '').all()
        tag_set = set()
        for (tag_str,) in rows:
            # tags stored as comma-separated
            for tag in tag_str.split(','):
                t = tag.strip()
                if t:
                    tag_set.add(t)
        return jsonify(sorted(tag_set))
    
    # Legacy API endpoints for backward compatibility
    @app.route('/api/admin/blog/list')
    def admin_get_blog_list():
        blogs = Blog.query.all()
        return jsonify([blog.to_dict() for blog in blogs])

    @app.route('/api/admin/blog/add', methods=['POST'])
    def admin_add_blog():
        data = request.get_json()
        new_blog = Blog(
            title=data['title'],
            content=data['content'],
            category=data.get('category'),
            tags=data.get('tags')
        )
        db_session.add(new_blog)
        db_session.commit()
        return jsonify({"status": "success", "message": "Blog added successfully"})

    @app.route('/api/admin/blog/update', methods=['POST'])
    def admin_update_blog():
        data = request.get_json()
        blog = Blog.query.filter_by(id=data['id']).first()
        if blog:
            blog.title = data['title']
            blog.content = data['content']
            blog.category = data.get('category')
            blog.tags = data.get('tags')
            db_session.commit()
            return jsonify({"status": "success", "message": "Blog updated successfully"})
        return jsonify({"status": "error", "message": "Blog not found"}), 404

    @app.route('/api/admin/blog/delete', methods=['POST'])
    def admin_delete_blog():
        data = request.get_json()
        blog = Blog.query.filter_by(id=data['id']).first()
        if blog:
            db_session.delete(blog)
            db_session.commit()
            return jsonify({"status": "success", "message": "Blog deleted successfully"})
        return jsonify({"status": "error", "message": "Blog not found"}), 404

    @app.route('/api/resume', methods=['GET'])
    def get_resume():
        resume = db_session.query(Resume).first()
        if not resume:
            # Create a default resume if none exists
            resume = Resume(
                name="Charles",
                title="Software Engineer · Backend / Full‑Stack",
                summary="专注高性能后端与优雅产品体验。热爱系统设计、数据库与工程效率。",
                github_username="CHZarles",
                education=[
                    {"school": "中国矿业大学", "duration": "2015-2019"},
                    {"school": "澳门大学", "duration": "2019-2022"}
                ],
                location="上海 / 澳门",
                experience=[
                    {"title": "后端工程师 · 某互联网公司", "duration": "2022 — 至今", "details": ["主导核心服务稳定性与性能优化，99.95% 可用性", "设计并落地异步任务系统，吞吐提升 3x", "建设监控告警闭环，故障恢复时间缩短 50%"]},
                    {"title": "全栈开发 · 初创项目", "duration": "2020 — 2022", "details": ["从零搭建博客/后台系统，端到端交付", "实现 Markdown 渲染、搜索与多端适配"]}
                ],
                projects=[
                    {"name": "高性能日志采集与查询平台（C++/SQLite）"},
                    {"name": "个人知识库与博客系统（Flask/JS）"},
                    {"name": "轻量化数据可视化组件库（Web）"}
                ],
                skills=["C++", "Python", "Go", "JavaScript", "Flask", "FastAPI", "Django", "SQLite", "MySQL", "PostgreSQL", "Redis", "Linux", "Docker", "Git", "CI/CD"],
                contact={"github": "https://github.com/charles", "email": "you@example.com", "linkedin": "https://linkedin.com/in/yourprofile"}
            )
            db_session.add(resume)
            db_session.commit()
        return jsonify(resume.to_dict())

    @app.route('/api/resume', methods=['PUT'])
    def update_resume():
        data = request.get_json()
        resume = db_session.query(Resume).first()
        if not resume:
            return jsonify({"error": "Resume not found"}), 404
        
        for key, value in data.items():
            setattr(resume, key, value)
        
        db_session.commit()
        return jsonify({"message": "Resume updated successfully"})
    
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()

    return app

if __name__ == '__main__':
    import os
    import argparse

    parser = argparse.ArgumentParser(description='Run the blog Flask app')
    parser.add_argument('--port', type=int, default=int(os.getenv('PORT', 8082)), help='Port to run the server on')
    args = parser.parse_args()

    app = create_app()
    app.run(host='127.0.0.1', port=args.port, debug=True)