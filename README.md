# Python Blog + Admin + Resume

现代化 Flask + 前端静态页面的博客与后台管理系统，内置可编辑的简历（About）页面：
- 博客：创建/编辑/管理、分类、标签（Tagify）
- 后台：登录保护、导入导出、实时 SSE 提示
- 简历：`/about` 动态渲染，支持管理员在 `/admin/resume` 编辑，支持预览与打印为 PDF

## 目录结构

```
backend/        # Flask 应用、API、模型与数据库会话
frontend/       # 前端静态页面、样式与脚本
```

## 快速开始

1) 创建与激活虚拟环境（可选）并安装依赖

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2) 初始化数据库（首次）

```bash
python -c "from database import init_db; init_db()"
```

3) 启动服务

```bash
python app.py --port 8086
```

打开浏览器访问：
- 首页：http://127.0.0.1:8086/
- 后台：http://127.0.0.1:8086/admin （默认账号：admin / 123456）
- 简历（About）：http://127.0.0.1:8086/about

## 主要功能与端点

- 公共页面
	- `/` 首页
	- `/about` 简历页面（支持打印为 PDF）
	- `/blog-detail.html` 博客详情页
- 后台页面
	- `/admin` 后台首页
	- `/admin/manage` 管理博客
	- `/admin/create` 新建博客
	- `/admin/edit` 编辑博客
	- `/admin/import-export` 导入导出
	- `/admin/resume` 编辑简历（支持教育 logo、多行经历、项目技能标签、实时预览）
- API（部分）
	- `GET /api/blogs` 列出博客
	- `GET /api/blogs/<id>` 获取博客详情
	- `POST /api/blogs` 创建博客
	- `PUT /api/blogs/<id>` 更新博客
	- `DELETE /api/blogs/<id>` 删除博客
	- `GET /api/categories` 获取分类列表
	- `GET /api/tags` 获取标签列表
	- `GET /api/resume` 获取简历
	- `PUT /api/resume` 更新简历
	- `GET /api/events` 服务端事件（SSE）

## 简历编辑与预览

- 在 `/admin/resume` 编辑内容，点击“预览 About”将在新标签页打开 `/about?preview=1`，使用 localStorage 中的临时数据进行渲染（无需先保存）。
- 点击“保存”会将完整 JSON 提交到 `PUT /api/resume` 并持久化到数据库。

## 开发说明

- 后端：Flask + SQLAlchemy（SQLite）
- 前端：原生 HTML/CSS/JS，Tagify 提供标签/分类下拉体验
- 打印：About 页面支持浏览器打印为 PDF（含打印样式）
- 登录：演示账号密码写在 `backend/app.py` 中，可按需替换

