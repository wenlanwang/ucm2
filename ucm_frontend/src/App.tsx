import { BrowserRouter, Routes, Route, Navigate, useSearchParams, Outlet } from 'react-router-dom';
import { ConfigProvider, Spin, Result } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore } from './store/useAuthStore';
import { useEffect, useState } from 'react';

// 管理员路由保护组件
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!user?.is_staff) {
    return (
      <Result
        status="403"
        title="无权限访问"
        subTitle="您没有权限访问此页面，请联系管理员"
      />
    );
  }

  return <>{children}</>;
}

// 嵌入模式布局组件（无侧边栏、无顶部导航）
function EmbedLayout() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, embedLogin } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      // 有 session_id 参数，尝试自动认证
      embedLogin(sessionId).then(() => {
        setLoading(false);
      });
    } else {
      // 没有 session_id，检查是否已登录
      setLoading(false);
    }
  }, [searchParams, embedLogin]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="正在验证登录状态..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Result
        status="403"
        title="未登录"
        subTitle="请通过父网站访问此页面"
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Outlet />
    </div>
  );
}

import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import RequirementRegister from './pages/requirements/RequirementRegister';
import RequirementList from './pages/requirements/RequirementList';
import ManufacturerManage from './pages/admin/ManufacturerManage';
import ColumnOptionsManage from './pages/admin/ColumnOptionsManage';
import InventoryManage from './pages/admin/InventoryManage';
import TemplateManage from './pages/admin/TemplateManage';
import DeadlineSettings from './pages/admin/DeadlineSettings';
import UserManagement from './pages/admin/UserManagement';
import ProfileSettings from './pages/ProfileSettings';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const { isAuthenticated, checkAuth, ssoStatus, fetchSSOStatus, ssoLogin } = useAuthStore();

  useEffect(() => {
    checkAuth();
    fetchSSOStatus();
  }, [checkAuth, fetchSSOStatus]);

  // 生产模式下未认证用户直接跳转 SSO 登录
  useEffect(() => {
    if (ssoStatus && !ssoStatus.use_mock && !isAuthenticated) {
      ssoLogin();
    }
  }, [ssoStatus, isAuthenticated, ssoLogin]);

  // SSO 状态加载中，显示加载页面
  if (ssoStatus === null) {
    return (
      <ConfigProvider locale={zhCN}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Spin size="large" tip="正在加载..." />
        </div>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated 
                ? <Navigate to="/" /> 
                : (ssoStatus?.use_mock ? <Login /> : <Navigate to="/" />)
            } 
          />
          <Route path="/" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="requirements">
              <Route path="register" element={<RequirementRegister key="requirement-register" />} />
              <Route path="list" element={<RequirementList />} />
            </Route>
            <Route path="admin">
              <Route path="users" element={<AdminRoute><ErrorBoundary><UserManagement /></ErrorBoundary></AdminRoute>} />
              <Route path="manufacturers" element={<AdminRoute><ErrorBoundary><ManufacturerManage /></ErrorBoundary></AdminRoute>} />
              <Route path="column-options" element={<AdminRoute><ErrorBoundary><ColumnOptionsManage /></ErrorBoundary></AdminRoute>} />
              <Route path="inventory" element={<AdminRoute><ErrorBoundary><InventoryManage /></ErrorBoundary></AdminRoute>} />
              <Route path="templates" element={<AdminRoute><ErrorBoundary><TemplateManage /></ErrorBoundary></AdminRoute>} />
              <Route path="deadline-settings" element={<AdminRoute><ErrorBoundary><DeadlineSettings /></ErrorBoundary></AdminRoute>} />
            </Route>
            <Route path="settings" element={<ErrorBoundary><ProfileSettings /></ErrorBoundary>} />
          </Route>

          {/* 嵌入模式路由（无侧边栏、无顶部导航） */}
          <Route path="/embed" element={<EmbedLayout />}>
            <Route path="requirements">
              <Route index element={<Dashboard embedMode />} />
              <Route path="register" element={<RequirementRegister key="embed-register" embedMode />} />
              <Route path="list" element={<RequirementList embedMode />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
