import { useState, useEffect } from 'react';
import { Card, Table, Button, message, Space, Tag, Modal, Form, Input, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Option } = Select;

interface ManufacturerInfo {
  id: number;
  device_type: string;
  manufacturer: string;
  version: string;
  auth_method: string;
}

export default function ManufacturerManage() {
  const [data, setData] = useState<ManufacturerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ManufacturerInfo | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/manufacturers/');
      // 确保data是数组
      const responseData = response.data;
      if (Array.isArray(responseData)) {
        setData(responseData);
      } else if (responseData && Array.isArray(responseData.results)) {
        // 处理分页格式 {results: [...]}
        setData(responseData.results);
      } else if (responseData && typeof responseData === 'object') {
        // 处理其他对象格式
        console.error('API返回数据格式错误:', responseData);
        setData([]);
        message.error('数据格式错误：期望数组格式');
      } else {
        setData([]);
      }
    } catch (error) {
      message.error('加载数据失败');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: ManufacturerInfo) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/manufacturers/${id}/`);
      message.success('删除成功');
      loadData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingRecord) {
        await api.put(`/manufacturers/${editingRecord.id}/`, values);
        message.success('修改成功');
      } else {
        await api.post('/manufacturers/', values);
        message.success('添加成功');
      }
      
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      if (error.response?.data) {
        message.error(Object.values(error.response.data).flat().join(', '));
      } else {
        message.error('保存失败');
      }
    }
  };

  const columns = [
    {
      title: '设备类型',
      dataIndex: 'device_type',
      key: 'device_type',
      width: 120,
    },
    {
      title: '厂商',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 120,
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 150,
    },
    {
      title: '认证方式',
      dataIndex: 'auth_method',
      key: 'auth_method',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: ManufacturerInfo) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确定删除吗？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>厂商版本管理</h1>
      
      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑厂商版本' : '添加厂商版本'}
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
            name="device_type"
            label="设备类型"
            rules={[{ required: true, message: '请输入设备类型' }]}
          >
            <Input placeholder="例如：路由器、交换机、防火墙" />
          </Form.Item>

          <Form.Item
            name="manufacturer"
            label="厂商"
            rules={[{ required: true, message: '请输入厂商' }]}
          >
            <Input placeholder="例如：华为、思科、华三" />
          </Form.Item>

          <Form.Item
            name="version"
            label="版本"
            rules={[{ required: true, message: '请输入版本' }]}
          >
            <Input placeholder="例如：VRP8.0、IOS15.6" />
          </Form.Item>

          <Form.Item
            name="auth_method"
            label="认证方式"
            rules={[{ required: true, message: '请输入认证方式' }]}
          >
            <Input placeholder="例如：SSH、Telnet、HTTPS" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
