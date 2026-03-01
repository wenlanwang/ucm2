import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Button, message, Typography, Divider, Alert } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/useAuthStore';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { login, ssoLogin, ssoStatus, fetchSSOStatus } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // 获取 URL 中的错误信息
  const errorMsg = searchParams.get('error');

  // 组件加载时获取 SSO 状态
  useEffect(() => {
    fetchSSOStatus();
  }, [fetchSSOStatus]);

  // 显示错误提示
  useEffect(() => {
    if (errorMsg) {
      if (errorMsg === 'missing_session_id') {
        message.error('SSO 登录回调缺少必要参数');
      } else if (errorMsg === 'invalid_session') {
        message.error('SSO 会话验证失败，请重新登录');
      }
    }
  }, [errorMsg]);

  // 本地登录处理
  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const success = await login(values.username, values.password);
      if (success) {
        message.success('登录成功！');
        navigate('/');
      } else {
        message.error('用户名或密码错误！');
      }
    } catch (error) {
      message.error('登录失败，请稍后重试！');
    } finally {
      setLoading(false);
    }
  };

  // SSO 登录处理
  const handleSSOLogin = () => {
    ssoLogin();
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3}>UCM需求登记系统</Title>
          <p style={{ color: '#666' }}>请登录您的账户</p>
        </div>
        
        {/* 错误提示 */}
        {errorMsg && (
          <Alert 
            type="error" 
            message="登录失败" 
            description={
              errorMsg === 'missing_session_id' 
                ? 'SSO 登录回调缺少必要参数' 
                : 'SSO 会话验证失败，请重新登录'
            }
            style={{ marginBottom: 16 }}
            closable
          />
        )}

        {/* SSO 登录按钮 */}
        <Button 
          type="primary" 
          size="large"
          icon={<LoginOutlined />}
          onClick={handleSSOLogin}
          style={{ width: '100%', marginBottom: 16 }}
        >
          {ssoStatus?.use_mock ? 'Mock SSO 登录' : '统一认证登录'}
        </Button>

        <Divider style={{ margin: '16px 0' }}>
          <Text type="secondary">或使用本地账户</Text>
        </Divider>
        
        {/* 本地登录表单 */}
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名！' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码！' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="default" 
              htmlType="submit" 
              loading={loading}
              size="large"
              style={{ width: '100%' }}
            >
              本地登录
            </Button>
          </Form.Item>
        </Form>
        
        {/* Mock 模式提示 */}
        {ssoStatus?.use_mock && (
          <div style={{ textAlign: 'center', marginTop: 16, padding: 12, background: '#fff7e6', borderRadius: 4 }}>
            <Text type="warning">测试环境 (Mock SSO)</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              测试账号：000735977 / 123456
            </Text>
          </div>
        )}
        
        {/* 生产模式提示 */}
        {!ssoStatus?.use_mock && ssoStatus && (
          <div style={{ textAlign: 'center', marginTop: 16, color: '#999' }}>
            <Text type="secondary">使用统一认证号登录</Text>
          </div>
        )}
      </Card>
    </div>
  );
}
