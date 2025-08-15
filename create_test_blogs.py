#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json
import random
import time

# 博客服务器配置
BASE_URL = "http://localhost:8080"
API_URL = f"{BASE_URL}/api/blogs"

# 测试数据
categories = [
    "技术分享", "生活随笔", "读书笔记", "项目总结", "学习心得", 
    "工具推荐", "思考感悟", "旅行游记", "编程技巧", "开源项目"
]

tags_pool = [
    "Python", "JavaScript", "React", "Vue", "Flask", "Django", "Node.js",
    "机器学习", "人工智能", "数据分析", "Web开发", "前端", "后端",
    "数据库", "MySQL", "PostgreSQL", "Redis", "Docker", "Kubernetes",
    "Git", "Linux", "算法", "数据结构", "设计模式", "架构设计",
    "性能优化", "安全", "测试", "DevOps", "云计算", "微服务",
    "读书", "思考", "生活", "旅行", "摄影", "音乐", "电影", "美食"
]

def generate_blog_content(index):
    """生成博客内容"""
    
    # 预定义的博客模板
    if index == 0:
        return {
            "title": "Python Flask 博客系统开发实战",
            "category": "技术分享",
            "tags": "Python,Flask,Web开发,后端",
            "content": """# Python Flask 博客系统开发实战

## 项目概述

最近完成了一个基于Flask的博客系统,在这里分享一下开发过程中的经验和心得。

## 技术栈选择

- **后端框架**: Flask
- **数据库**: SQLite
- **前端**: 原生HTML/CSS/JavaScript
- **Markdown解析**: marked.js
- **代码高亮**: highlight.js

## 核心功能实现

### 1. 博客管理系统

```python
from flask import Flask, jsonify, request
from models import Blog

@app.route('/api/blogs', methods=['POST'])
def create_blog():
    data = request.get_json()
    new_blog = Blog(
        title=data['title'],
        content=data['content'],
        category=data.get('category'),
        tags=data.get('tags')
    )
    db_session.add(new_blog)
    db_session.commit()
    return jsonify({"message": "Blog created successfully"})
```

### 2. 实时预览功能

实现了Markdown实时预览,支持:
- 语法高亮
- 代码块复制
- 表格渲染
- 链接处理

## 总结

这个项目让我深入理解了:
- Flask框架的灵活性
- 前后端分离的设计思路
- Markdown渲染的技术细节
- 响应式设计的最佳实践

下一步计划添加用户系统和评论功能。
"""
        }
    
    elif index == 1:
        return {
            "title": "JavaScript ES6+ 新特性深度解析",
            "category": "技术分享",
            "tags": "JavaScript,ES6,前端,编程技巧",
            "content": """# JavaScript ES6+ 新特性深度解析

## 前言

ES6及后续版本为JavaScript带来了许多强大的新特性。

## 1. 箭头函数

```javascript
// 传统函数
function add(a, b) {
    return a + b;
}

// 箭头函数
const add = (a, b) => a + b;
```

## 2. 解构赋值

```javascript
const numbers = [1, 2, 3, 4, 5];
const [first, second, ...rest] = numbers;

const user = { name: 'Alice', age: 30 };
const { name, age } = user;
```

## 3. 模板字符串

模板字符串提供了更好的字符串处理方式。

## 4. Promise 和 async/await

```javascript
async function getData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
    }
}
```

## 总结

ES6+的新特性大大提升了JavaScript的开发体验。
"""
        }
    
    elif index == 2:
        return {
            "title": "React Hooks 深入理解",
            "category": "技术分享",
            "tags": "React,Hooks,前端,JavaScript",
            "content": """# React Hooks 深入理解

## 什么是Hooks?

React Hooks是React 16.8引入的新特性。

## useState

```jsx
import React, { useState } from 'react';

function Counter() {
    const [count, setCount] = useState(0);
    
    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>
                Click me
            </button>
        </div>
    );
}
```

## useEffect

```jsx
import React, { useState, useEffect } from 'react';

function UserProfile({ userId }) {
    const [user, setUser] = useState(null);
    
    useEffect(() => {
        fetchUser(userId).then(setUser);
    }, [userId]);
    
    return user ? <div>{user.name}</div> : <div>Loading...</div>;
}
```

## 自定义Hooks

```jsx
function useLocalStorage(key, initialValue) {
    const [value, setValue] = useState(() => {
        return localStorage.getItem(key) || initialValue;
    });
    
    const setStoredValue = (newValue) => {
        setValue(newValue);
        localStorage.setItem(key, newValue);
    };
    
    return [value, setStoredValue];
}
```

## 总结

Hooks让React开发变得更加函数式和声明式。
"""
        }
    
    # 生成其他博客
    titles = [
        f"Docker容器化实践指南 - 第{index-2}部分",
        f"机器学习入门教程 - 第{index-2}章",
        f"Vue.js 3.0 开发实战 - 案例{index-2}",
        f"Node.js 后端开发 - 第{index-2}节",
        f"数据库优化技巧 - 第{index-2}篇",
        f"前端性能优化 - 第{index-2}期",
        f"微服务架构设计 - 第{index-2}章",
        f"Git版本控制 - 第{index-2}课",
        f"Linux系统管理 - 第{index-2}讲",
        f"算法与数据结构 - 第{index-2}题",
        f"设计模式详解 - 第{index-2}种",
        f"网络安全基础 - 第{index-2}节",
        f"云计算技术 - 第{index-2}篇",
        f"人工智能应用 - 第{index-2}例",
        f"移动端开发 - 第{index-2}章",
        f"测试驱动开发 - 第{index-2}步",
        f"代码重构实践 - 第{index-2}次"
    ]
    
    title_index = (index - 3) % len(titles)
    title = titles[title_index]
    
    category = random.choice(categories)
    tags = ','.join(random.sample(tags_pool, random.randint(3, 6)))
    
    current_time = time.strftime('%Y-%m-%d %H:%M:%S')
    
    content = f"""# {title}

## 概述

这是第{index+1}篇测试博客文章,用于测试博客系统的功能。

## 主要内容

### 1. 技术要点

本文将介绍以下技术要点:
- 核心概念解析
- 实际应用场景
- 最佳实践分享
- 常见问题解决

### 2. 代码示例

```python
def hello_world():
    print("Hello, World!")
    return "Success"

# 调用函数
result = hello_world()
print(f"Result: {{result}}")
```

```javascript
function greet(name) {{
    return 'Hello, ' + name + '!';
}}

const message = greet('Developer');
console.log(message);
```

### 3. 配置文件

```json
{{
  "name": "test-project",
  "version": "1.0.0",
  "description": "A test project",
  "main": "index.js",
  "scripts": {{
    "start": "node index.js",
    "test": "jest"
  }}
}}
```

## 实践建议

1. **理论结合实践**: 学习新技术时要多动手实践
2. **持续学习**: 技术更新很快,要保持学习的习惯
3. **分享交流**: 与同行交流能获得更多见解
4. **文档记录**: 好记性不如烂笔头

## 总结

通过本文的学习,我们了解了相关技术的核心概念和应用方法。希望这些内容对大家有所帮助。

> 学而时习之,不亦说乎?

## 参考资料

- [官方文档](https://example.com/docs)
- [GitHub仓库](https://github.com/example/repo)
- [相关教程](https://example.com/tutorial)

---

*本文创建时间: {current_time}*
"""
    
    return {
        "title": title,
        "category": category,
        "tags": tags,
        "content": content
    }

def create_blog(blog_data):
    """创建单个博客"""
    try:
        response = requests.post(API_URL, json=blog_data, timeout=10)
        if response.status_code == 201:
            result = response.json()
            print(f"✅ 成功创建博客: {blog_data['title']} (ID: {result.get('id')})")
            return True
        else:
            print(f"❌ 创建博客失败: {blog_data['title']} - {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ 网络错误: {e}")
        return False

def main():
    """主函数:创建20篇测试博客"""
    print("🚀 开始创建测试博客...")
    print(f"📡 API地址: {API_URL}")
    print("="*50)
    
    success_count = 0
    total_blogs = 20
    
    for i in range(total_blogs):
        print(f"\n📝 创建第 {i+1}/{total_blogs} 篇博客...")
        
        # 生成博客数据
        blog_data = generate_blog_content(i)
        
        # 创建博客
        if create_blog(blog_data):
            success_count += 1
        
        # 添加小延迟避免请求过快
        time.sleep(0.5)
    
    print("\n" + "="*50)
    print(f"📊 创建完成!成功: {success_count}/{total_blogs}")
    
    if success_count == total_blogs:
        print("🎉 所有测试博客创建成功!")
    else:
        print(f"⚠️  有 {total_blogs - success_count} 篇博客创建失败")
    
    print(f"\n🌐 访问博客系统: {BASE_URL}")
    print(f"⚙️  管理后台: {BASE_URL}/admin")

if __name__ == "__main__":
    main()