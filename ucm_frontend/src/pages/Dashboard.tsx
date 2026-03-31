import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Button, Space, Typography } from 'antd';
import { FormOutlined, CalendarOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getDashboardStatistics } from '../services/api';
import type { DashboardStatistics } from '../services/api';
import EmbedNavigation from '../components/EmbedNavigation';

const { Title } = Typography;

interface DashboardProps {
  embedMode?: boolean;
}

export default function Dashboard({ embedMode }: DashboardProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  // 嵌入模式下的导航路径
  const getNavPath = (path: string) => embedMode ? `/embed${path}` : path;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStatistics();
        setStats(data);
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div style={{ padding: embedMode ? 16 : 0 }}>
      {embedMode && <EmbedNavigation embedMode />}
      
      <Title level={2} style={{ marginBottom: 24 }}>UCM需求概览</Title>
      
      <Row gutter={16}>
        <Col span={8}>
          <Card 
            loading={loading}
            hoverable
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (stats?.wednesday.date_iso) {
                navigate(`${getNavPath('/requirements/list')}?ucm_change_date=${stats.wednesday.date_iso}`);
              }
            }}
          >
            <Statistic
              title={
                <span style={{ color: '#333', fontWeight: 500 }}>
                  本周三（{stats?.wednesday.date || ''}）
                </span>
              }
              value={stats?.wednesday.count ?? 0}
              suffix="条需求"
              prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        
        <Col span={8}>
          <Card 
            loading={loading}
            hoverable
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (stats?.saturday.date_iso) {
                navigate(`${getNavPath('/requirements/list')}?ucm_change_date=${stats.saturday.date_iso}`);
              }
            }}
          >
            <Statistic
              title={
                <span style={{ color: '#333', fontWeight: 500 }}>
                  本周六（{stats?.saturday.date || ''}）
                </span>
              }
              value={stats?.saturday.count ?? 0}
              suffix="条需求"
              prefix={<CalendarOutlined style={{ color: '#52c41a' }} />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        
        <Col span={8}>
          <Card loading={loading}>
            <Statistic
              title={
                <span style={{ color: '#333', fontWeight: 500 }}>
                  累计登记
                </span>
              }
              value={stats?.total ?? 0}
              suffix="条需求"
              prefix={<AppstoreOutlined style={{ color: '#722ed1' }} />}
              styles={{ content: { color: '#722ed1' } }}
            />
          </Card>
        </Col>
      </Row>
      
      {/* 速达按钮 */}
      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card>
            <Space size="large">
              <Button 
                type="primary" 
                icon={<FormOutlined />} 
                size="large"
                onClick={() => navigate(getNavPath('/requirements/register'))}
              >
                需求登记
              </Button>
              <Button 
                icon={<AppstoreOutlined />} 
                size="large"
                onClick={() => navigate(getNavPath('/requirements/list'))}
              >
                需求列表
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
      
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title="快速开始">
            <p>欢迎使用UCM需求登记系统!</p>
            <ul>
              <li>通过"需求登记"菜单提交新的UCM变更需求</li>
              <li>在"需求列表"中查看和管理所有需求</li>
              <li>管理员可以在"后台管理"中配置系统参数</li>
            </ul>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title="系统说明">
            <p>本系统用于管理UCM设备的变更需求，包括：</p>
            <ul>
              <li>设备导入、修改、删除、先删除后新增需求登记</li>
              <li>Excel文件上传和自动校验</li>
              <li>需求审批和跟踪</li>
              <li>设备清单管理</li>
              <li>等需求部门通知后开始实施</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
