import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
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
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
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
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
