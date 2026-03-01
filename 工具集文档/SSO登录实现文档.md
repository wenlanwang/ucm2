# SSO 单点登录实现文档

## 概述

本项目集成了 SSO 单点登录功能，支持测试环境和生产环境的无缝切换。

## 架构设计

### 模块结构

```
core/auth/
├── __init__.py           # 模块导出
├── base.py               # AuthInterface 抽象接口
├── sso_client.py         # SSO HTTP 客户端
├── session_manager.py    # Session/JWT 管理
├── real_auth.py          # 生产 SSO 实现
├── mock_auth.py          # 测试 SSO 实现
├── factory.py            # 认证工厂
├── models.py             # UserSession 数据库模型
└── dependencies.py       # FastAPI 依赖注入

api/
├── auth.py               # 认证 API 路由
└── mock_sso.py           # Mock SSO 服务器（测试环境）
```

### 设计模式

采用 **工厂模式 + 策略模式** 组合：
- `AuthInterface` 定义统一接口
- `RealAuth` 实现生产环境 SSO 认证
- `MockAuth` 实现测试环境模拟认证
- `AuthFactory` 根据配置选择具体实现

---

## 环境配置

### 配置项说明

在 `core/config.py` 中配置：

```python
# SSO 基础配置
sso_base_url: str = "https://sso.netm.icbc"  # SSO 服务器地址
sso_use_mock: bool = True                     # 是否使用 Mock SSO

# 应用配置
app_base_url: str = "http://localhost:3000"   # 前端应用地址

# Session 配置
session_expire_hours: int = 24                # Session 过期时间（小时）
session_secret_key: str = "your-secret-key"   # JWT 密钥（生产环境需修改）

# 管理员账号
admin_users: List[str] = ["000735977"]

# Mock 测试用户
sso_mock_users: Dict[str, Dict] = {
    "000735977": {"userid": "000735977", "username": "管理员", "password": "123456", "rolelist": ["admin"]},
    "000735978": {"userid": "000735978", "username": "操作员", "password": "123456", "rolelist": ["operator"]},
    "000735979": {"userid": "000735979", "username": "访客", "password": "123456", "rolelist": ["viewer"]}
}
```

### 环境切换

| 配置 | 测试环境 | 生产环境 |
|------|----------|----------|
| `sso_use_mock` | `true` | `false` |
| `sso_base_url` | `http://localhost:8000/mock-sso` | `https://sso.netm.icbc` |

可通过环境变量覆盖：
```bash
# 测试环境
SSO_USE_MOCK=true

# 生产环境
SSO_USE_MOCK=false
SSO_BASE_URL=https://sso.netm.icbc
SESSION_SECRET_KEY=your-production-secret-key
```

---

## API 接口

### 认证接口

| 方法 | 路径 | 说明 | 环境 |
|------|------|------|------|
| GET | `/api/auth/login` | 重定向到 SSO 登录页 | 通用 |
| GET | `/api/auth/verify_session` | SSO 回调接口 | 通用 |
| POST | `/api/auth/mock/login` | Mock 登录 | 测试 |
| GET | `/api/auth/userinfo` | 获取当前用户信息 | 通用 |
| GET | `/api/auth/status` | 获取认证状态 | 通用 |
| POST | `/api/auth/logout` | 登出 | 通用 |
| GET | `/api/auth/config` | 获取认证配置 | 通用 |

### Mock SSO 接口

测试环境模拟 SSO 服务器的接口，完全模拟生产 SSO 的行为：

#### 1. Mock SSO 登录页面

**接口：** `GET /mock-sso/login`

**说明：** 返回 Mock SSO 登录页面，模拟生产 SSO 的登录入口。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| next | string | 否 | 登录成功后的回调地址 |

**响应：** HTML 登录页面

**使用示例：**
```
GET /mock-sso/login?next=http://localhost:3000/api/auth/verify_session
```

**页面功能：**
- 显示用户ID和密码输入框
- 显示测试账号列表（方便快速登录）
- 提交到 `/mock-sso/login/new`

---

#### 2. Mock SSO 登录提交

**接口：** `POST /mock-sso/login/new`

**说明：** 处理登录表单提交，验证用户账号密码。

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userid | string | 是 | 用户ID |
| password | string | 是 | 密码 |
| next | string | 是 | 登录成功后的回调地址 |

**响应：**
- 成功：302 重定向到 `next` 地址，并附带 `session_id` 参数
- 失败：弹出错误提示（用户不存在/密码错误）

**使用示例：**
```
POST /mock-sso/login/new
Content-Type: application/x-www-form-urlencoded

userid=000735977&password=123456&next=http://localhost:3000/api/auth/verify_session
```

**重定向示例：**
```
HTTP/1.1 302 Found
Location: http://localhost:3000/api/auth/verify_session?session_id=mock_session_000735977_abc123
```

---

#### 3. Mock SSO 验证 Session

**接口：** `GET /mock-sso/check_session`

**说明：** 验证 session_id 是否有效，返回用户信息。模拟生产的 `/check_session` 接口。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| session_id | string | 是 | Mock SSO 返回的 session_id |

**响应格式：**

成功响应：
```json
{
    "status": "valid",
    "userid": "000735977",
    "username": "管理员",
    "rolelist": ["admin"]
}
```

失败响应：
```json
{
    "status": "invalid",
    "message": "Session不存在或已过期"
}
```

**使用示例：**
```
GET /mock-sso/check_session?session_id=mock_session_000735977_abc123

Response:
{
    "status": "valid",
    "userid": "000735977",
    "username": "管理员",
    "rolelist": ["admin"]
}
```

---

#### 4. Mock SSO 登出

**接口：** `GET /mock-sso/logout`

**说明：** 注销 session，返回登录页面。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| session_id | string | 是 | 要注销的 session_id |

**响应：** HTML 登录页面

**使用示例：**
```
GET /mock-sso/logout?session_id=mock_session_000735977_abc123
```

---

#### 5. Mock 获取验证码

**接口：** `POST /mock-sso/verificationcode`

**说明：** 模拟获取验证码接口。测试环境不需要真实验证码，直接返回成功。

**请求参数（JSON）：**

```json
{
    "userid": "000735977"
}
```

**响应格式：**
```json
{
    "success": true,
    "message": "",
    "verifyRequestNo": "verify_abc123def456",
    "src": ""
}
```

**注意：** Mock 环境下 `src` 为空，不需要真实验证码图片。

**使用示例：**
```
POST /mock-sso/verificationcode
Content-Type: application/x-www-form-urlencoded

userid=000735977

Response:
{
    "success": true,
    "message": "",
    "verifyRequestNo": "verify_abc123def456",
    "src": ""
}
```

---

#### Mock SSO 与生产 SSO 对比

| 功能 | 生产 SSO | Mock SSO |
|------|----------|----------|
| 登录页面 | SSO 服务器提供 | 本地 HTML 页面 |
| 验证码 | 真实验证码图片 | 跳过验证 |
| 用户验证 | 统一认证系统 | 配置文件中的测试用户 |
| Session 存储 | SSO 服务器 | 内存（重启丢失） |
| 接口格式 | 完全一致 | 完全一致 |

---

## 登录流程

### 生产环境流程

```
用户 -> 应用前端 -> 重定向到 SSO 登录页 -> 用户登录 ->
SSO 回调应用(带 session_id) -> 应用验证 session_id -> 获取用户信息 ->
创建本地会话 -> 完成
```

详细步骤：

1. 用户访问应用，前端检测未登录
2. 前端重定向到 `/api/auth/login`
3. 后端重定向到 SSO 登录页 `https://sso.netm.icbc/login?next=回调地址`
4. 用户在 SSO 页面登录
5. SSO 登录成功后回调 `/api/auth/verify_session?session_id=xxx`
6. 后端调用 SSO 的 `/check_session` 验证 session_id
7. 验证成功，创建本地会话，生成 JWT token
8. 重定向回前端，前端保存 token

### 测试环境流程

```
用户 -> 应用前端 -> 跳转到本地登录页 -> 输入测试账号 ->
调用 Mock 登录 API -> 创建本地会话 -> 完成
```

详细步骤：

1. 用户访问应用，前端检测未登录
2. 前端跳转到 `/login` 页面
3. 用户输入测试账号密码
4. 前端调用 `/api/auth/mock/login`
5. 后端验证账号密码，创建会话
6. 返回 JWT token，前端保存

---

## 前端集成

### 路由守卫

在 `router/index.js` 中实现了路由守卫：

```javascript
router.beforeEach(async (to, from, next) => {
  // 检查认证状态
  // Mock 模式：跳转本地登录页
  // 生产模式：重定向到 SSO
})
```

### API 拦截器

在 `api.js` 中实现了请求拦截：

```javascript
// 请求拦截器：自动添加 token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：处理 401 错误
api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
  return Promise.reject(error)
})
```

### 认证状态管理

使用 Vue 3 reactive 实现状态管理（`stores/auth.js`）：

```javascript
const { state, mockLogin, logout, checkAuth } = useAuthStore()
```

---

## 测试账号

| 用户ID | 用户名 | 密码 | 角色 |
|--------|--------|------|------|
| 000735977 | 管理员 | 123456 | admin |
| 000735978 | 操作员 | 123456 | operator |
| 000735979 | 访客 | 123456 | viewer |

---

## 后端依赖注入

### 获取当前用户

```python
from core.auth import get_current_user, UserInfo

@router.get("/protected")
async def protected_route(current_user: UserInfo = Depends(get_current_user)):
    return {"userid": current_user.userid, "is_admin": current_user.is_admin}
```

### 可选认证

```python
from core.auth import get_current_user_optional

@router.get("/optional")
async def optional_route(current_user: UserInfo = Depends(get_current_user_optional)):
    if current_user:
        return {"user": current_user.userid}
    return {"user": None}
```

### 管理员权限

```python
from core.auth import get_current_admin

@router.get("/admin-only")
async def admin_route(current_user: UserInfo = Depends(get_current_admin)):
    return {"message": "管理员专属"}
```

---

## 部署注意事项

### 生产环境部署前检查

1. **配置检查**
   - 确认 `sso_use_mock = false`
   - 确认 `sso_base_url` 正确
   - 确认 `app_base_url` 为前端实际地址

2. **安全检查**
   - 修改 `session_secret_key` 为安全的随机字符串
   - 确保 HTTPS 部署

3. **网络检查**
   - 确认应用服务器能访问 `sso.netm.icbc`
   - 确认 SSO 能回调应用地址

4. **日志检查**
   - 登录流程有详细日志记录
   - 生产环境建议调整日志级别为 INFO

### 数据库

首次部署时会自动创建 `user_sessions` 表：

```sql
CREATE TABLE user_sessions (
    id INTEGER PRIMARY KEY,
    session_id VARCHAR UNIQUE NOT NULL,     -- JWT token
    sso_session_id VARCHAR,                  -- SSO 原始 session_id
    userid VARCHAR NOT NULL,
    username VARCHAR,
    rolelist VARCHAR,                        -- JSON 格式
    is_admin BOOLEAN DEFAULT FALSE,
    created_at DATETIME,
    expires_at DATETIME NOT NULL
);
```

---

## 常见问题

### Q: 如何添加新的测试账号？

在 `core/config.py` 的 `sso_mock_users` 中添加：

```python
sso_mock_users: Dict[str, Dict] = {
    # 现有账号...
    "新用户ID": {
        "userid": "新用户ID",
        "username": "新用户名",
        "password": "密码",
        "rolelist": ["角色"]
    }
}
```

### Q: 如何设置管理员？

在 `core/config.py` 的 `admin_users` 中添加用户ID：

```python
admin_users: List[str] = ["000735977", "新管理员ID"]
```

### Q: Session 过期时间如何修改？

修改 `core/config.py`：

```python
session_expire_hours: int = 8  # 修改为需要的过期时间（小时）
```

### Q: 如何手动清理过期 Session？

```python
from core.database import SessionLocal
from core.auth import SessionManager

db = SessionLocal()
count = SessionManager.cleanup_expired_sessions(db)
print(f"清理了 {count} 个过期会话")
```
