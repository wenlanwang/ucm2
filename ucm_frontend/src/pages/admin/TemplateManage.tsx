import { useState, useEffect } from 'react';
import { Card, Table, Button, message, Space, Modal, Form, Input, Checkbox, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, UpOutlined, DownOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../../services/api';

interface ColumnDefinition {
  name: string;
  required: boolean;
  example: string;
}

interface TemplateConfig {
  id: number;
  template_type: 'import' | 'modify' | 'delete';
  column_definitions: ColumnDefinition[] | string;
}

interface ColumnEditForm {
  name: string;
  required: boolean;
  example: string;
}

export default function TemplateManage() {
  const [data, setData] = useState<TemplateConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<TemplateConfig | null>(null);
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);
  const [form] = Form.useForm<ColumnEditForm>();

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
      
      // 处理column_definitions字段，转换为对象数组
      const processedData = dataArray.map(item => {
        const processedItem = { ...item };
        
        if (typeof processedItem.column_definitions === 'string') {
          try {
            const parsed = JSON.parse(processedItem.column_definitions);
            if (Array.isArray(parsed)) {
              // 如果是新格式（对象数组）
              if (parsed.length === 0 || typeof parsed[0] === 'object') {
                processedItem.column_definitions = parsed;
              } 
              // 如果是旧格式（字符串数组），转换为新格式
              else if (typeof parsed[0] === 'string') {
                processedItem.column_definitions = parsed.map((col: string) => ({
                  name: col,
                  required: false,
                  example: ''
                }));
              }
            } else {
              processedItem.column_definitions = [];
            }
          } catch (e) {
            // 如果是逗号分隔的字符串（旧格式）
            const columns = processedItem.column_definitions
              .split(',')
              .map((col: string) => col.trim())
              .filter((col: string) => col);
            processedItem.column_definitions = columns.map((col: string) => ({
              name: col,
              required: false,
              example: ''
            }));
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

  const showAddColumnModal = (template: TemplateConfig) => {
    setEditingTemplate(template);
    setEditingColumnIndex(null);
    setModalTitle(`添加列 - ${getTemplateTypeText(template.template_type)}`);
    form.setFieldsValue({
      name: '',
      required: false,
      example: ''
    });
    setModalVisible(true);
  };

  const showEditColumnModal = (template: TemplateConfig, columnIndex: number) => {
    const column = template.column_definitions[columnIndex] as ColumnDefinition;
    setEditingTemplate(template);
    setEditingColumnIndex(columnIndex);
    setModalTitle(`编辑列 - ${column.name}`);
    form.setFieldsValue({
      name: column.name,
      required: column.required,
      example: column.example || ''
    });
    setModalVisible(true);
  };

  const handleSaveColumn = async () => {
    try {
      const values = await form.validateFields();
      
      if (!editingTemplate) return;
      
      const templateIndex = data.findIndex(t => t.id === editingTemplate.id);
      if (templateIndex === -1) return;
      
      const newData = [...data];
      const columns = [...(newData[templateIndex].column_definitions as ColumnDefinition[])];
      
      if (editingColumnIndex === null) {
        // 添加新列
        columns.push(values);
      } else {
        // 编辑现有列
        columns[editingColumnIndex] = values;
      }
      
      newData[templateIndex].column_definitions = columns;
      
      // 保存到后端
      await api.put(`/templates/${editingTemplate.id}/`, {
        template_type: editingTemplate.template_type,
        column_definitions: JSON.stringify(columns)
      });
      
      setData(newData);
      message.success(editingColumnIndex === null ? '添加成功' : '修改成功');
      setModalVisible(false);
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误，不显示错误消息
        return;
      }
      message.error('保存失败');
    }
  };

  const handleMoveColumn = async (template: TemplateConfig, columnIndex: number, direction: 'up' | 'down') => {
    const templateIndex = data.findIndex(t => t.id === template.id);
    if (templateIndex === -1) return;
    
    const newData = [...data];
    const columns = [...(newData[templateIndex].column_definitions as ColumnDefinition[])];
    
    if (direction === 'up' && columnIndex > 0) {
      // 上移
      [columns[columnIndex - 1], columns[columnIndex]] = [columns[columnIndex], columns[columnIndex - 1]];
    } else if (direction === 'down' && columnIndex < columns.length - 1) {
      // 下移
      [columns[columnIndex], columns[columnIndex + 1]] = [columns[columnIndex + 1], columns[columnIndex]];
    }
    
    newData[templateIndex].column_definitions = columns;
    
    try {
      await api.put(`/templates/${template.id}/`, {
        template_type: template.template_type,
        column_definitions: JSON.stringify(columns)
      });
      
      setData(newData);
      message.success('移动成功');
    } catch (error) {
      message.error('移动失败');
    }
  };

  const handleDeleteColumn = async (template: TemplateConfig, columnIndex: number) => {
    const column = template.column_definitions[columnIndex] as ColumnDefinition;
    
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除列 "${column.name}" 吗？`,
      onOk: async () => {
        const templateIndex = data.findIndex(t => t.id === template.id);
        if (templateIndex === -1) return;
        
        const newData = [...data];
        const columns = [...(newData[templateIndex].column_definitions as ColumnDefinition[])];
        columns.splice(columnIndex, 1);
        
        newData[templateIndex].column_definitions = columns;
        
        try {
          await api.put(`/templates/${template.id}/`, {
            template_type: template.template_type,
            column_definitions: JSON.stringify(columns)
          });
          
          setData(newData);
          message.success('删除成功');
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const getTemplateTypeText = (type: string) => {
    const typeMap = {
      import: '导入',
      modify: '修改',
      delete: '删除'
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  const renderColumnTable = (template: TemplateConfig) => {
    const columns = template.column_definitions as ColumnDefinition[];
    
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>列配置</strong>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => showAddColumnModal(template)}
          >
            添加列
          </Button>
        </div>
        
        <div style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}>
          {columns.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>
              暂无列配置，请点击"添加列"
            </div>
          ) : (
            <div>
              {columns.map((column, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderBottom: index < columns.length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}
                >
                  <span style={{ flex: 1, fontWeight: 500 }}>{column.name}</span>
                  
                  <Tag color={column.required ? 'error' : 'default'} style={{ marginRight: 16 }}>
                    {column.required ? '必填' : '可选'}
                  </Tag>
                  
                  {column.example && (
                    <span style={{ color: '#999', marginRight: 16, fontSize: 12 }}>
                      例: {column.example}
                    </span>
                  )}
                  
                  <Space>
                    <Button
                      size="small"
                      icon={<UpOutlined />}
                      disabled={index === 0}
                      onClick={() => handleMoveColumn(template, index, 'up')}
                    />
                    <Button
                      size="small"
                      icon={<DownOutlined />}
                      disabled={index === columns.length - 1}
                      onClick={() => handleMoveColumn(template, index, 'down')}
                    />
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => showEditColumnModal(template, index)}
                    />
                    <Button
                      size="small"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={() => handleDeleteColumn(template, index)}
                    />
                  </Space>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>模板配置管理</h1>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {data.map(template => (
          <Card
            key={template.id}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{getTemplateTypeText(template.template_type)}模板</span>
                <Tag>{template.template_type}</Tag>
              </div>
            }
            loading={loading}
          >
            {renderColumnTable(template)}
          </Card>
        ))}
      </Space>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onOk={handleSaveColumn}
        onCancel={() => setModalVisible(false)}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="列名"
            rules={[{ required: true, message: '请输入列名' }]}
          >
            <Input placeholder="例如：名称" />
          </Form.Item>

          <Form.Item
            name="required"
            label="是否必填"
            valuePropName="checked"
          >
            <Checkbox>是</Checkbox>
          </Form.Item>

          <Form.Item
            name="example"
            label="样例数据"
            rules={[{ required: false }]}
          >
            <Input placeholder="例如：Router-01（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}