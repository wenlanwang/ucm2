import { useState, useEffect } from 'react';
import { Card, Table, Button, message, Space, Modal, Form, Input, Tag } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import api from '../../services/api';

interface TemplateConfig {
  id: number;
  template_type: 'import' | 'modify' | 'delete';
  column_definitions: string[] | string;
}

export default function TemplateManage() {
  const [data, setData] = useState<TemplateConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TemplateConfig | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/templates/');
      const responseData = response.data;
      let dataArray: TemplateConfig[] = [];
      
      if (Array.isArray(responseData)) {
        dataArray = responseData;
      } else if (responseData && Array.isArray(responseData.results)) {
        dataArray = responseData.results;
      } else if (responseData && typeof responseData === 'object') {
        console.error('API返回数据格式错误:', responseData);
        setData([]);
        message.error('数据格式错误：期望数组格式');
        setLoading(false);
        return;
      } else {
        setData([]);
        setLoading(false);
        return;
      }
      
      // 处理column_definitions字段，确保它是数组
      const processedData = dataArray.map(item => {
        const processedItem = { ...item };
        if (typeof processedItem.column_definitions === 'string') {
          try {
            const parsed = JSON.parse(processedItem.column_definitions);
            if (Array.isArray(parsed)) {
              processedItem.column_definitions = parsed;
            } else {
              // 如果是逗号分隔的字符串
              processedItem.column_definitions = processedItem.column_definitions
                .split(',')
                .map((col: string) => col.trim())
                .filter((col: string) => col);
            }
          } catch (e) {
            // 如果是逗号分隔的字符串
            processedItem.column_definitions = processedItem.column_definitions
              .split(',')
              .map((col: string) => col.trim())
              .filter((col: string) => col);
          }
        }
        return processedItem;
      });
      
      setData(processedData);
    } catch (error) {
      message.error('加载数据失败');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: TemplateConfig) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      column_definitions: record.column_definitions.join(',')
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const columnDefinitions = values.column_definitions
        .split(',')
        .map((col: string) => col.trim())
        .filter((col: string) => col);

      if (editingRecord) {
        await api.put(`/templates/${editingRecord.id}/`, {
          ...values,
          column_definitions: JSON.stringify(columnDefinitions)
        });
        message.success('修改成功');
      }
      
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      message.error('保存失败');
    }
  };

  const templateTypeText = {
    import: '导入',
    modify: '修改',
    delete: '删除'
  };

  const columns = [
    {
      title: '模板类型',
      dataIndex: 'template_type',
      key: 'template_type',
      width: 100,
      render: (type: string) => templateTypeText[type as keyof typeof templateTypeText],
    },
    {
      title: '列定义',
      dataIndex: 'column_definitions',
      key: 'column_definitions',
      render: (columns: string[]) => (
        <Space wrap>
          {columns.map((col, idx) => (
            <Tag key={idx} color="blue">{col}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: TemplateConfig) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        />
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>模板配置管理</h1>
      
      <Card>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title="编辑模板配置"
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="template_type"
            label="模板类型"
          >
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="column_definitions"
            label="列定义（用逗号分隔）"
            rules={[{ required: true, message: '请输入列定义' }]}
          >
            <Input.TextArea 
              rows={4}
              placeholder="例如：名称,设备类型,厂商,版本,IP,其他IP,安装位置,分组,认证方式"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
