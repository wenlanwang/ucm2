# 工具集集成UCM需求管理指南

## 概述

本文档说明运维工具集（create项目）如何集成UCM需求管理系统，实现用户在工具集登录后，点击UCM链接无需重新登录。

## 方案说明

采用**携带session_id跳转**方案：
- 用户在工具集登录后，SSO返回session_id
- 工具集存储session_id
- 点击UCM链接时，携带session_id跳转到UCM后端验证接口
- UCM验证成功后自动建立登录状态

## 工具集需要的修改

### 1. 登录成功后存储session_id

在SSO登录回调成功后，存储session_id：

```javascript
// api/auth.js 或 stores/auth.js

// SSO回调处理
async function handleSSOCallback(sessionId) {
  // 存储session_id到localStorage
  localStorage.setItem('sso_session_id', sessionId);
  
  // 获取用户信息等其他操作...
}
```

### 2. 首页添加UCM链接模块

#### Vue 3 + Element Plus 示例

```vue
<!-- views/Home.vue 或相关首页组件 -->
<template>
  <div class="tool-links">
    <el-card 
      v-for="tool in tools" 
      :key="tool.name"
      class="tool-card"
      shadow="hover"
      @click="openTool(tool)"
    >
      <div class="tool-icon">
        <el-icon :size="32"><component :is="tool.icon" /></el-icon>
      </div>
      <div class="tool-name">{{ tool.name }}</div>
      <div class="tool-desc">{{ tool.desc }}</div>
    </el-card>
  </div>
</template>

<script setup>
import { Document, Setting, DataAnalysis } from '@element-plus/icons-vue';

const tools = [
  {
    name: 'UCM需求管理',
    desc: '需求登记与管理',
    icon: Document,
    type: 'ucm'
  },
  // 其他工具...
];

const openTool = (tool) => {
  if (tool.type === 'ucm') {
    openUCM();
  }
  // 其他工具处理...
};

const openUCM = () => {
  const ssoSessionId = localStorage.getItem('sso_session_id');
  
  // UCM后端验证接口地址
  // 测试环境
  const ucmVerifyUrl = 'http://localhost:8000/api/auth/sso/verify_session';
  // 生产环境（根据实际部署地址修改）
  // const ucmVerifyUrl = 'https://ucm.example.com/api/auth/sso/verify_session';
  
  if (ssoSessionId) {
    // 已登录，携带session_id跳转
    window.location.href = `${ucmVerifyUrl}?session_id=${ssoSessionId}`;
  } else {
    // 未登录，跳转UCM前端（会触发登录流程）
    window.location.href = 'http://127.0.0.1:5173/';
  }
};
</script>

<style scoped>
.tool-links {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 20px;
}

.tool-card {
  cursor: pointer;
  text-align: center;
  transition: transform 0.2s;
}

.tool-card:hover {
  transform: translateY(-4px);
}

.tool-icon {
  margin-bottom: 12px;
  color: #409eff;
}

.tool-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.tool-desc {
  font-size: 12px;
  color: #909399;
}
</style>
```

### 3. 配置文件

建议将UCM地址配置化：

```javascript
// config/tools.js 或环境变量

export const TOOL_CONFIG = {
  ucm: {
    // 测试环境
    development: {
      frontend: 'http://127.0.0.1:5173',
      backend: 'http://localhost:8000'
    },
    // 生产环境
    production: {
      frontend: 'https://ucm.example.com',
      backend: 'https://ucm.example.com'
    }
  }
};

// 使用
const env = import.meta.env.MODE; // 'development' 或 'production'
const ucmConfig = TOOL_CONFIG.ucm[env];

// 跳转UCM
const verifyUrl = `${ucmConfig.backend}/api/auth/sso/verify_session?session_id=${sessionId}`;
```

## 跳转URL说明

| 场景 | URL格式 |
|------|---------|
| 已登录跳转 | `{UCM后端}/api/auth/sso/verify_session?session_id={session_id}` |
| 未登录跳转 | `{UCM前端}/` |

## 完整跳转流程

```
1. 用户点击"UCM需求管理"
         ↓
2. 检查 localStorage 中的 sso_session_id
         ↓
3. 存在 → 拼接URL跳转到UCM后端验证接口
         ↓
4. UCM后端验证session_id
         ↓
5. 验证成功 → 创建Django Session → 重定向UCM前端首页
   验证失败 → 重定向UCM登录页
```

## 注意事项

1. **session_id有效期**：session_id由SSO服务管理，过期后需要重新登录
2. **跨域问题**：确保工具集和UCM的SSO配置一致（同一SSO服务）
3. **生产部署**：修改URL为生产环境实际地址
4. **安全性**：session_id通过URL传递，建议使用HTTPS

## 环境配置对照

| 环境 | SSO服务 | 工具集地址 | UCM地址 |
|------|---------|-----------|---------|
| 测试 | Mock SSO (localhost:8000/mock-sso) | localhost:3000 | localhost:5173 |
| 生产 | https://sso.netm.icbc | 生产域名 | 生产域名 |
