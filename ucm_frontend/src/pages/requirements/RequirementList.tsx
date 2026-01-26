import { useState, useEffect } from 'react';
import { Card, Table, Button, message, Space, Tag, Modal, DatePicker, Select, Input } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, ExportOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

const { Option } = Select;

interface Requirement {
  id: number;
  requirement_type: 'import' | 'modify' | 'delete';
  device_name: string;
  ip: string;
  submitter_name: string;
  submit_time: string;
  ucm_change_date: string;
  status: 'pending' | 'processed';
  processor_name?: string;
  process_time?: string;
}

export default function RequirementList() {
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');
  const [data, setData] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [filters, setFilters] = useState({
    submitter: '',
    requirement_type: '',
    ucm_change_date: null as dayjs.Dayjs | null,
    search: ''
  });
  const [counts, setCounts] = useState({
    pending: 0,
    processed: 0
  });

  const { user } = useAuthStore();

  const requirementTypeText = {
    import: '导入',
    modify: '修改',
    delete: '删除'
  };

  const requirementTypeColors = {
    import: 'blue',
    modify: 'orange',
    delete: 'red'
  };

  useEffect(() => {
    loadData();
    loadCounts();
  }, [activeTab, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { status: activeTab };
      
      if (filters.submitter) params.submitter = filters.submitter;
      if (filters.requirement_type) params.requirement_type = filters.requirement_type;
      if (filters.ucm_change_date) params.ucm_change_date = filters.ucm_change_date.format('YYYY-MM-DD');
      if (filters.search) params.search = filters.search;

      const response = await api.get('/requirements/', { params });
      setData(response.data.results || response.data);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      // 加载待处理数量
      const pendingParams: any = { status: 'pending', page_size: 1 };
      if (filters.submitter) pendingParams.submitter = filters.submitter;
      if (filters.requirement_type) pendingParams.requirement_type = filters.requirement_type;
      if (filters.ucm_change_date) pendingParams.ucm_change_date = filters.ucm_change_date.format('YYYY-MM-DD');
      if (filters.search) pendingParams.search = filters.search;
      
      const pendingResponse = await api.get('/requirements/', { params: pendingParams });
      const pendingCount = pendingResponse.data.count || 
                          (pendingResponse.data.results ? pendingResponse.data.results.length : 0);

      // 加载已处理数量
      const processedParams: any = { status: 'processed', page_size: 1 };
      if (filters.submitter) processedParams.submitter = filters.submitter;
      if (filters.requirement_type) processedParams.requirement_type = filters.requirement_type;
      if (filters.ucm_change_date) processedParams.ucm_change_date = filters.ucm_change_date.format('YYYY-MM-DD');
      if (filters.search) processedParams.search = filters.search;
      
      const processedResponse = await api.get('/requirements/', { params: processedParams });
      const processedCount = processedResponse.data.count || 
                            (processedResponse.data.results ? processedResponse.data.results.length : 0);

      setCounts({ pending: pendingCount, processed: processedCount });
    } catch (error) {
      console.error('加载数量失败:', error);
    }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条需求吗？',
      onOk: async () => {
        try {
          await api.delete(`/requirements/${id}/`);
          message.success('删除成功');
          loadData();
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的记录');
      return;
    }

    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条记录吗？`,
      onOk: async () => {
        try {
          await api.post('/requirements/batch_delete/', {
            requirement_ids: selectedRowKeys
          });
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          loadData();
        } catch (error) {
          message.error('批量删除失败');
        }
      }
    });
  };

  const handleBatchComplete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要完成的记录');
      return;
    }

    Modal.confirm({
      title: '确认批量完成',
      content: `确定要将选中的 ${selectedRowKeys.length} 条记录标记为已处理吗？`,
      onOk: async () => {
        try {
          await api.post('/requirements/batch_complete/', {
            requirement_ids: selectedRowKeys
          });
          message.success('批量完成成功');
          setSelectedRowKeys([]);
          loadData();
        } catch (error) {
          message.error('批量完成失败');
        }
      }
    });
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      
      const params: any = { status: activeTab };
      
      if (filters.submitter) params.submitter = filters.submitter;
      if (filters.requirement_type) params.requirement_type = filters.requirement_type;
      if (filters.ucm_change_date) params.start_date = filters.ucm_change_date.format('YYYY-MM-DD');
      if (filters.ucm_change_date) params.end_date = filters.ucm_change_date.format('YYYY-MM-DD');
      if (filters.search) params.search = filters.search;

      // 调用导出API
      const response = await api.get('/requirements/export_excel/', {
        params,
        responseType: 'blob', // 重要：指定响应类型为blob
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // 从响应头获取文件名
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'UCM需求列表.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await api.post(`/requirements/${id}/mark_as_processed/`);
      message.success('标记完成成功');
      loadData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '序号',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '需求类型',
      dataIndex: 'requirement_type',
      width: 80,
      render: (type: string) => (
        <Tag color={requirementTypeColors[type as keyof typeof requirementTypeColors]}>
          {requirementTypeText[type as keyof typeof requirementTypeText]}
        </Tag>
      ),
    },
    {
      title: '名称',
      dataIndex: 'device_name',
      width: 150,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      width: 120,
    },
    {
      title: '需求人',
      dataIndex: 'submitter_name',
      width: 100,
    },
    {
      title: '需求时间',
      dataIndex: 'submit_time',
      width: 150,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: 'UCM变更日期',
      dataIndex: 'ucm_change_date',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'processed' ? 'green' : 'orange'}>
          {status === 'processed' ? '已处理' : '待处理'}
        </Tag>
      ),
    },
    ...(activeTab === 'processed' ? [
      {
        title: '处理人',
        dataIndex: 'processor_name',
        width: 100,
      },
      {
        title: '处理时间',
        dataIndex: 'process_time',
        width: 150,
        render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
      }
    ] : []),
    {
      title: '操作',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: Requirement) => (
        <Space>
          {activeTab === 'pending' && (
            <Button
              size="small"
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleComplete(record.id)}
            >
              完成
            </Button>
          )}
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys as number[]);
    },
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>需求列表</h1>
      
      <Card
        extra={
          <Space>
            {activeTab === 'pending' && (
              <>
                <Button
                  icon={<CheckCircleOutlined />}
                  onClick={handleBatchComplete}
                  disabled={selectedRowKeys.length === 0}
                >
                  批量完成
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBatchDelete}
                  disabled={selectedRowKeys.length === 0}
                >
                  批量删除
                </Button>
              </>
            )}
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
            >
              导出Excel
            </Button>
          </Space>
        }
        tabList={[
          {
            key: 'pending',
            tab: `待处理需求 (${counts.pending})`,
          },
          {
            key: 'processed',
            tab: `已处理需求 (${counts.processed})`,
          },
        ]}
        activeTabKey={activeTab}
        onTabChange={(key) => {
          setActiveTab(key as 'pending' | 'processed');
          setSelectedRowKeys([]);
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="搜索名称或IP"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{ width: 200 }}
            />
            
            <Select
              placeholder="需求类型"
              value={filters.requirement_type}
              onChange={(value) => setFilters({ ...filters, requirement_type: value })}
              style={{ width: 120 }}
              allowClear
            >
              <Option value="import">导入</Option>
              <Option value="modify">修改</Option>
              <Option value="delete">删除</Option>
            </Select>

            <DatePicker
              placeholder="UCM变更日期"
              value={filters.ucm_change_date}
              onChange={(date) => setFilters({ ...filters, ucm_change_date: date })}
            />

            {user?.is_staff && (
              <Input
                placeholder="申请人"
                value={filters.submitter}
                onChange={(e) => setFilters({ ...filters, submitter: e.target.value })}
                style={{ width: 150 }}
              />
            )}
          </Space>
        </div>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  );
}
