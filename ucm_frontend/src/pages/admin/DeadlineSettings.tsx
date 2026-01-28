import { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Button, message, Space, Alert, Descriptions } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';

interface DeadlineConfig {
  wednesday_deadline_hours: number;
  saturday_deadline_hours: number;
}

export default function DeadlineSettings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<DeadlineConfig | null>(null);

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/deadline_config/');
      setConfig(response.data);
      form.setFieldsValue(response.data);
    } catch (error) {
      message.error('加载配置失败');
    }
  };

  // 保存配置
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await api.put('/deadline_config/', values);
      message.success('保存成功');
      loadConfig();
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 重置为默认值
  const handleReset = () => {
    form.setFieldsValue({
      wednesday_deadline_hours: 7,
      saturday_deadline_hours: 31
    });
    message.info('已重置为默认值，请点击保存按钮生效');
  };

  // 计算示例截止时间
  const calculateDeadline = (hours: number, dayType: 'wednesday' | 'saturday') => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // 计算本周三或本周六
    const targetDay = dayType === 'wednesday' ? 3 : 6;
    const daysUntilTarget = (targetDay - dayOfWeek + 7) % 7;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysUntilTarget);
    targetDate.setHours(0, 0, 0, 0);
    
    // 计算截止时间
    const deadline = new Date(targetDate);
    deadline.setHours(targetDate.getHours() - hours);
    
    const weekdayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const deadlineWeekday = weekdayMap[deadline.getDay()];
    
    return `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')} ${deadlineWeekday} ${String(deadline.getHours()).padStart(2, '0')}:${String(deadline.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="登记截止设置" variant="outlined">
        <Alert
          title="说明"
          description="设置需求登记的截止时间。截止时间是指在某一天之前需要完成登记的时间点。正数表示提前，负数表示延后。例如：周三截止提前7小时，表示在周三的7小时前（即周二17:00）停止登记；周三截止提前-7小时，表示在周三7小时后（即周三07:00）停止登记。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            wednesday_deadline_hours: 7,
            saturday_deadline_hours: 31
          }}
        >
          <Form.Item
            label="周三截止提前小时数"
            name="wednesday_deadline_hours"
            rules={[
              { required: true, message: '请输入周三截止提前小时数' },
              { type: 'number', min: -168, max: 168, message: '请输入-168到168之间的数字' }
            ]}
            tooltip="正数表示在周三之前停止登记，负数表示在周三之后停止登记"
          >
            <InputNumber
              min={-168}
              max={168}
              style={{ width: 200 }}
              placeholder="请输入小时数"
            />
          </Form.Item>

          <Form.Item
            label="周六截止提前小时数"
            name="saturday_deadline_hours"
            rules={[
              { required: true, message: '请输入周六截止提前小时数' },
              { type: 'number', min: -168, max: 168, message: '请输入-168到168之间的数字' }
            ]}
            tooltip="正数表示在周六之前停止登记，负数表示在周六之后停止登记"
          >
            <InputNumber
              min={-168}
              max={168}
              style={{ width: 200 }}
              placeholder="请输入小时数"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={loading}
              >
                保存
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
              >
                重置为默认值
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {config && (
          <Card title="当前配置示例" size="small" style={{ marginTop: 24 }} variant="outlined">
            <Descriptions column={1} bordered>
              <Descriptions.Item label="本周三截止时间">
                {calculateDeadline(config.wednesday_deadline_hours, 'wednesday')}
              </Descriptions.Item>
              <Descriptions.Item label="本周六截止时间">
                {calculateDeadline(config.saturday_deadline_hours, 'saturday')}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16, color: '#999', fontSize: 12 }}>
              * 以上示例基于当前时间计算，实际截止时间会根据具体日期变化
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
}