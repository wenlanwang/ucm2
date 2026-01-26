import { Card, Row, Col, Statistic } from 'antd';
import { FormOutlined, CheckCircleOutlined, ClockCircleOutlined, DatabaseOutlined } from '@ant-design/icons';

export default function Dashboard() {
  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>系统首页</h1>
      
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理需求"
              value={12}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="已处理需求"
              value={89}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="设备总数"
              value={156}
              prefix={<DatabaseOutlined style={{ color: '#1890ff' }} />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="本月登记"
              value={23}
              prefix={<FormOutlined style={{ color: '#722ed1' }} />}
              styles={{ content: { color: '#722ed1' } }}
            />
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
              <li>设备导入、修改、删除需求登记</li>
              <li>Excel文件上传和自动校验</li>
              <li>需求审批和跟踪</li>
              <li>设备清单管理</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
