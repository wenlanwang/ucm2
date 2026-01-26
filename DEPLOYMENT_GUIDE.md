# UCM需求登记系统 - 部署指南

## 系统概述

UCM需求登记系统是一个基于Django + React的前后端分离系统，用于管理UCM设备的需求登记、审批和跟踪。

## 环境要求

### 后端环境
- Python 3.8+
- SQLite (已内置)

### 前端环境
- Node.js 16+
- npm 8+

## 部署步骤

### 1. 后端部署

#### 1.1 安装Python依赖

```bash
cd D:\dev\ucm2
pip install -r requirements.txt
```

#### 1.2 数据库配置

数据库文件路径：`d:/database/mydb_ucm.db`

首次部署需要执行迁移：

```bash
python manage.py migrate
```

#### 1.3 创建管理员账户

```bash
python manage.py createsuperuser
```

#### 1.4 初始化数据

```bash
python init_templates.py      # 初始化模板
python init_sample_data.py    # 初始化示例数据（可选）
```

#### 1.5 启动开发服务器

```bash
# 方式1：使用启动脚本
start_backend.bat

# 方式2：手动启动
python manage.py runserver 0.0.0.0:8000
```

#### 1.6 生产环境部署（Windows服务）

```bash
# 安装django-windows-tools
pip install django-windows-tools

# 配置Windows服务
python manage.py installtasks

# 启动服务
net start ucm_backend
```

### 2. 前端部署

#### 2.1 安装依赖

```bash
cd D:\dev\ucm2\ucm_frontend
npm install
```

#### 2.2 开发环境启动

```bash
# 方式1：使用启动脚本
..\start_frontend.bat

# 方式2：手动启动
npm run dev
```

前端访问地址：http://localhost:5173

#### 2.3 生产环境构建

```bash
npm run build
```

构建后的文件在 `dist/` 目录，可以部署到Nginx或直接使用静态文件服务。

#### 2.4 生产环境部署（使用静态文件服务）

```bash
# 安装serve
npm install -g serve

# 启动静态文件服务
serve -s dist -l 5173
```

### 3. 系统访问

#### 3.1 管理后台

- 地址：http://localhost:8000/admin
- 用户名：admin
- 密码：admin123

#### 3.2 前端系统

- 地址：http://localhost:5173
- 测试用户：user1/user123

#### 3.3 API文档

- API根路径：http://localhost:8000/api/

## 系统配置

### 后端配置 (ucm_backend/settings.py)

#### 数据库配置
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': 'd:/database/mydb_ucm.db',
    }
}
```

#### CORS配置
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

#### REST Framework配置
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}
```

### 前端配置 (ucm_frontend/vite.config.ts)

#### API代理配置
```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      secure: false
    }
  }
}
```

## 目录结构

```
D:\dev\ucm2
├── ucm_backend/              # Django项目
│   ├── settings.py          # Django配置
│   ├── urls.py              # 主URL配置
│   ├── wsgi.py              # WSGI配置
│   └── ...
├── ucm_app/                 # Django应用
│   ├── models.py            # 数据模型
│   ├── views.py             # API视图
│   ├── serializers.py       # 序列化器
│   ├── urls.py              # API路由
│   ├── admin.py             # 后台管理
│   └── migrations/          # 数据库迁移文件
├── ucm_frontend/            # React前端
│   ├── src/
│   │   ├── store/           # 状态管理 (Zustand)
│   │   ├── services/        # API服务
│   │   ├── pages/           # 页面组件
│   │   ├── components/      # 公共组件
│   │   └── App.tsx          # 主应用
│   ├── vite.config.ts       # Vite配置
│   └── package.json         # 前端依赖
├── requirements.txt         # Python依赖
├── start_backend.bat        # 后端启动脚本
├── start_frontend.bat       # 前端启动脚本
├── init_templates.py        # 模板初始化脚本
├── init_sample_data.py      # 示例数据初始化脚本
├── set_admin_password.py    # 设置管理员密码
├── progress_summary.md      # 开发进度文档
└── DEPLOYMENT_GUIDE.md      # 本文档
```

## 数据备份与恢复

### 备份数据库

```bash
# 直接复制数据库文件
copy d:\database\mydb_ucm.db d:\backup\mydb_ucm_$(date +%Y%m%d).db
```

### 恢复数据库

```bash
# 停止服务后替换数据库文件
copy d:\backup\mydb_ucm_20240124.db d:\database\mydb_ucm.db
```

## 常见问题

### 1. CORS跨域问题

确保后端settings.py中的CORS_ALLOWED_ORIGINS包含前端地址。

### 2. 数据库连接失败

检查数据库文件路径是否正确，确保D:\database目录存在。

### 3. 前端无法访问API

检查Vite代理配置是否正确，确保后端服务已启动。

### 4. Excel文件解析失败

确保上传的是.xls格式文件（Excel 97-2003），不是.xlsx格式。

## 技术支持

如有问题，请联系系统管理员或查看开发文档。
