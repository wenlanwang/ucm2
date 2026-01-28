import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Button, message } from 'antd';
import { UserOutlined, LogoutOutlined, HomeOutlined, FormOutlined, TableOutlined, SettingOutlined, DatabaseOutlined, FileExcelOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/useAuthStore';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    message.success('已退出登录');
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: 'requirements',
      icon: <FormOutlined />,
      label: '需求管理',
      children: [
        {
          key: '/requirements/register',
          label: '需求登记',
        },
        {
          key: '/requirements/list',
          label: '需求列表',
        },
      ],
    },
    {
      key: 'admin',
      icon: <SettingOutlined />,
      label: '后台管理',
      children: [
        {
          key: '/admin/manufacturers',
          label: '厂商版本管理',
        },
        {
          key: '/admin/column-options',
          label: '列可选值管理',
        },
        {
          key: '/admin/inventory',
          label: '设备清单管理',
        },
        {
          key: '/admin/templates',
          label: '模板配置管理',
        },
        {
          key: '/admin/deadline-settings',
          label: '登记截止设置',
          icon: <ClockCircleOutlined />,
        },
      ],
    },
  ];

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path === '/') return ['/'];
    if (path.startsWith('/requirements/register')) return ['/requirements/register'];
    if (path.startsWith('/requirements/list')) return ['/requirements/list'];
    if (path.startsWith('/admin/manufacturers')) return ['/admin/manufacturers'];
    if (path.startsWith('/admin/column-options')) return ['/admin/column-options'];
    if (path.startsWith('/admin/inventory')) return ['/admin/inventory'];
    if (path.startsWith('/admin/templates')) return ['/admin/templates'];
    if (path.startsWith('/admin/deadline-settings')) return ['/admin/deadline-settings'];
    return [];
  };

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed} 
        theme="light"
        width={200}
        collapsedWidth={60}
        style={{ flex: '0 0 auto' }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <h3 style={{ margin: 0, color: '#1890ff', fontSize: collapsed ? '14px' : '16px' }}>{collapsed ? 'UCM' : 'UCM系统'}</h3>
        </div>
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={menuItems}
          onClick={(e) => {
            e.domEvent.preventDefault();
            if (e.key && typeof e.key === 'string') {
              navigate(e.key);
            }
          }}
          style={{ borderRight: 0, height: 'calc(100vh - 64px)', overflowY: 'auto' }}
        />
      </Sider>
      
      <Layout style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,.08)', flex: '0 0 auto' }}>
          <Button
            type="text"
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px' }}
          >
            {collapsed ? '☰' : '☰'}
          </Button>
          
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
              <span>{user?.username}</span>
            </div>
          </Dropdown>
        </Header>
        
        <Content style={{ flex: '1 1 auto', margin: '24px', padding: 24, background: '#fff', borderRadius: 8, overflow: 'auto', minWidth: 0 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
