import { useState, useEffect } from 'react';
import { Card, Table, Button, message, Space, Modal, Form, Input, Select, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Option } = Select;

interface ColumnOption {
  id: number;
  column_name: string;
  option_value: string;
}

export default function ColumnOptionsManage() {
  const [data, setData] = useState<ColumnOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [columns, setColumns] = useState<string[]>([]);
  const [newColumnName, setNewColumnName] = useState('');

  useEffect(() => {
    loadData();
    loadColumns();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/column-options/');
      const responseData = response.data;
      if (Array.isArray(responseData)) {
        setData(responseData);
      } else if (responseData && Array.isArray(responseData.results)) {
        setData(responseData.results);
      } else if (responseData && typeof responseData === 'object') {
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

  const loadColumns = async () => {
    try {
      const columnSet = new Set<string>();
      const response = await api.get('/column-options/');
      response.data.forEach((item: ColumnOption) => {
        columnSet.add(item.column_name);
      });
      setColumns(Array.from(columnSet));
    } catch (error) {
      console.error('加载列名失败:', error);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/column-options/${id}/`);
      message.success('删除成功');
      loadData();
      loadColumns();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await api.post('/column-options/', values);
      message.success('添加成功');
      setModalVisible(false);
      loadData();
      loadColumns();
    } catch (error: any) {
      message.error('保存失败');
    }
  };

  const tableColumns = [
    {
      title: '列名',
      dataIndex: 'column_name',
      key: 'column_name',
      width: 200,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '可选项值',
      dataIndex: 'option_value',
      key: 'option_value',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: ColumnOption) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.id)}
        />
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>列可选值管理</h1>
      
      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加
          </Button>
        }
      >
        <Table
          columns={tableColumns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      <Modal
        title="添加列可选值"
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="column_name"
            label="列名"
            rules={[{ required: true, message: '请输入列名' }]}
          >
            <Select
              placeholder="选择或输入列名"
              dropdownRender={menu => (
                <>
                  {menu}
                  <div style={{ padding: '8px', borderTop: '1px solid #d9d9d9' }}>
                    <Input
                      placeholder="输入新列名"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newColumnName) {
                            form.setFieldsValue({ column_name: newColumnName });
                            setNewColumnName('');
                          }
                        }
                      }}
                      autoFocus
                    />
                  </div>
                </>
              )}
            >
              {columns.map(col => (
                <Option key={col} value={col}>{col}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="option_value"
            label="可选项值"
            rules={[{ required: true, message: '请输入可选项值' }]}
          >
            <Input placeholder="例如：外高桥网络设备、OATH认证" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
