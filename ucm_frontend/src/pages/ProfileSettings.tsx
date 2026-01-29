import { useState } from 'react';
import { Card, Tabs, Form, Input, Button, message, Descriptions, Avatar, Tag } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

export default function ProfileSettings() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [passwordForm] = Form.useForm();

  // 修改密码
  const handlePasswordChange = async (values: any) => {
    try {
      setLoading(true);
      await api.post('/auth/change_password/', {
        old_password: values.old_password,
        new_password: values.new_password,
      });
      message.success('密码修改成功，请重新登录');
      passwordForm.resetFields();
      // 可以在这里触发退出登录
    } catch (error: any) {
      message.error(error.response?.data?.error || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Card title="个人设置" variant="outlined">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'info',
              label: (
                <span>
                  <UserOutlined />
                  基本信息
                </span>
              ),
              children: (
                <div style={{ padding: '24px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                    <Avatar size={80} icon={<UserOutlined />} style={{ marginRight: 16 }} />
                    <div>
                      <h2 style={{ margin: 0 }}>{user?.username}</h2>
                      <p style={{ margin: '8px 0 0 0', color: '#666' }}>
                        {user?.is_staff ? <Tag color="red">管理员</Tag> : <Tag color="blue">普通用户</Tag>}
                      </p>
                    </div>
                  </div>

                  <Descriptions bordered column={1}>
                    <Descriptions.Item label="账号">{user?.username}</Descriptions.Item>
                    <Descriptions.Item label="邮箱">{user?.email || '未设置'}</Descriptions.Item>
                    <Descriptions.Item label="用户ID">{user?.id}</Descriptions.Item>
                    <Descriptions.Item label="权限">
                      {user?.is_staff ? (
                        <Tag color="red">管理员</Tag>
                      ) : (
                        <Tag color="blue">普通用户</Tag>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                      {user?.date_joined ? new Date(user.date_joined).toLocaleString('zh-CN') : '未知'}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              ),
            },
            {
              key: 'password',
              label: (
                <span>
                  <LockOutlined />
                  修改密码
                </span>
              ),
              children: (
                <div style={{ padding: '24px 0', maxWidth: 400 }}>
                  <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={handlePasswordChange}
                  >
                    <Form.Item
                      label="原密码"
                      name="old_password"
                      rules={[
                        { required: true, message: '请输入原密码' },
                        { min: 6, message: '密码至少6位' },
                      ]}
                    >
                      <Input.Password placeholder="请输入原密码" />
                    </Form.Item>

                    <Form.Item
                      label="新密码"
                      name="new_password"
                      rules={[
                        { required: true, message: '请输入新密码' },
                        { min: 6, message: '密码至少6位' },
                      ]}
                    >
                      <Input.Password placeholder="请输入新密码（至少6位）" />
                    </Form.Item>

                    <Form.Item
                      label="确认新密码"
                      name="confirm_password"
                      dependencies={['new_password']}
                      rules={[
                        { required: true, message: '请确认新密码' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('new_password') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('两次输入的密码不一致'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password placeholder="请再次输入新密码" />
                    </Form.Item>

                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={loading} block>
                        修改密码
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}