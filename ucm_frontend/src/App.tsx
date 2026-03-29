import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin, Result } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore } from './store/useAuthStore';
import { useEffect } from 'react';

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
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
