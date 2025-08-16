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

## TODO
增加 WSGI 服务层 

