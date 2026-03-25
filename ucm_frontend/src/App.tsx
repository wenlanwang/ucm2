import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore } from './store/useAuthStore';
import { useEffect } from 'react';
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
              <Route path="manufacturers" element={<ErrorBoundary><ManufacturerManage /></ErrorBoundary>} />
              <Route path="column-options" element={<ErrorBoundary><ColumnOptionsManage /></ErrorBoundary>} />
              <Route path="inventory" element={<ErrorBoundary><InventoryManage /></ErrorBoundary>} />
              <Route path="templates" element={<ErrorBoundary><TemplateManage /></ErrorBoundary>} />
              <Route path="deadline-settings" element={<ErrorBoundary><DeadlineSettings /></ErrorBoundary>} />
            </Route>
            <Route path="settings" element={<ErrorBoundary><ProfileSettings /></ErrorBoundary>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
