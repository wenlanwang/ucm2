import { useState, useEffect } from 'react';
import { Card, Table, Button, message, Space, Tag, Popconfirm, Input } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, ExportOutlined, LeftOutlined, RightOutlined, ImportOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

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
  note?: string;
  requirement_data_dict?: Record<string, any>;
}

interface WeeklyDate {
  date: string;
  day_type: string;
  label: string;
}

interface DateStatistics {
  [date: string]: {
    import: { count: number; pending: number; processed: number };
    delete: { count: number; pending: number; processed: number };
    modify: { count: number; pending: number; processed: number };
  };
}

export default function RequirementList() {
  const [data, setData] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // 新增状态
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [weeklyDates, setWeeklyDates] = useState<WeeklyDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'import' | 'modify' | 'delete'>('import');
  const [dateStatistics, setDateStatistics] = useState<DateStatistics>({});
  const [templateColumns, setTemplateColumns] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // 筛选状态
  const [filterSubmitter, setFilterSubmitter] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterKeyword, setFilterKeyword] = useState<string>('');

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

  const requirementTypeIcons = {
    import: <ImportOutlined />,
    delete: <DeleteOutlined />,
    modify: <EditOutlined />
  };

  // 加载周日期列表
  useEffect(() => {
    loadWeeklyDates();
  }, [weekOffset]);

  // 加载选中日期的统计
  useEffect(() => {
    if (weeklyDates.length > 0) {
      weeklyDates.forEach(date => loadDateStatistics(date.date));
    }
  }, [weeklyDates]);

  // 加载需求列表
  useEffect(() => {
    if (selectedDate && selectedType) {
      loadData();
    }
  }, [selectedDate, selectedType]);

  // 加载模板列配置
  useEffect(() => {
    loadTemplateColumns();
  }, []);

  const loadWeeklyDates = async () => {
    try {
      const response = await api.get('/requirements/weekly_dates/', {
        params: { week_offset: weekOffset }
      });
      setWeeklyDates(response.data.dates);

      // 如果还没有选中日期，默认选中第一个
      if (!selectedDate && response.data.dates.length > 0) {
        setSelectedDate(response.data.dates[0].date);
      }
    } catch (error) {
      message.error('加载日期列表失败');
    }
  };

  const loadDateStatistics = async (date: string) => {
    try {
      const response = await api.get('/requirements/date_statistics/', {
        params: { date }
      });
      setDateStatistics(prev => ({
        ...prev,
        [date]: response.data.statistics
      }));
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {
        ucm_change_date: selectedDate,
        requirement_type: selectedType
      };

      const response = await api.get('/requirements/', { params });
      setData(response.data.results || response.data);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateColumns = async () => {
    try {
      const response = await api.get('/templates/');
      console.log('=== 模板API返回数据 ===');
      console.log('response.data:', response.data);
      
      // 后端返回分页数据结构：{ count, results }
      const templates = response.data.results || response.data;
      console.log('templates 数量:', templates.length);
      
      if (templates.length > 0) {
        const template = templates.find((t: any) => t.template_type === 'import');
        console.log('找到的导入模板:', template);
        
        if (template) {
          const columns = template.get_column_definitions || [];
          console.log('设置的列配置:', columns);
          setTemplateColumns(columns);
        } else {
          console.error('未找到导入类型的模板');
        }
      } else {
        console.error('模板列表为空');
      }
    } catch (error) {
      console.error('加载模板配置失败:', error);
    }
  };

  const handleNoteChange = async (id: number, value: string) => {
    try {
      await api.patch(`/requirements/${id}/`, { note: value });
      message.success('备注已保存');

      // 更新本地状态
      setData(prevData =>
        prevData.map(item =>
          item.id === id ? { ...item, note: value } : item
        )
      );
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/requirements/${id}/`);
      message.success('删除成功');
      setData(prevData => prevData.filter(item => item.id !== id));
      // 重新加载统计
      if (selectedDate) loadDateStatistics(selectedDate);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await api.post(`/requirements/${id}/mark_as_processed/`);
      message.success('标记完成成功');
      loadData();
      // 重新加载统计
      if (selectedDate) loadDateStatistics(selectedDate);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleBatchComplete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要完成的记录');
      return;
    }

    try {
      await api.post('/requirements/batch_complete/', {
        requirement_ids: selectedRowKeys
      });
      message.success('批量完成成功');
      setSelectedRowKeys([]);
      loadData();
      // 重新加载统计
      if (selectedDate) loadDateStatistics(selectedDate);
    } catch (error) {
      message.error('批量完成失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的记录');
      return;
    }

    try {
      await api.post('/requirements/batch_delete/', {
        requirement_ids: selectedRowKeys
      });
      message.success('批量删除成功');
      setSelectedRowKeys([]);
      setData(prevData => prevData.filter(item => !selectedRowKeys.includes(item.id)));
      // 重新加载统计
      if (selectedDate) loadDateStatistics(selectedDate);
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  // 构建左侧固定列
  const leftFixedColumns = [
    {
      title: '序号',
      width: 60,
      fixed: 'left' as const,
      render: (_: any, __: any, index: number) => {
        // 全局计算序号，考虑分页
        return (currentPage - 1) * pageSize + index + 1;
      },
    },
    {
      title: '需求人',
      dataIndex: 'submitter_name',
      width: 100,
      fixed: 'left' as const,
    },
  ];

  // 构建可滚动列
  const scrollableColumns = [
    {
      title: '登记时间',
      dataIndex: 'submit_time',
      width: 150,
      render: (time: string) => <span style={{ whiteSpace: 'nowrap' }}>{dayjs(time).format('YYYY-MM-DD HH:mm:ss')}</span>,
    },
    {
      title: 'UCM变更日期',
      dataIndex: 'ucm_change_date',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    // 动态列（根据模板配置）
    ...templateColumns.map((col: any) => ({
      title: col.name,
      dataIndex: ['requirement_data_dict', col.name],
      width: 120,
      ellipsis: true,
      render: (value: any) => value || '-'
    })),
  ];

  // 构建右侧固定列
  const rightFixedColumns = [
    {
      title: '操作',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: Requirement) => (
        <Space size="small">
          {record.status === 'pending' && (
            <Popconfirm
              title="确认完成?"
              onConfirm={() => handleComplete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                size="small"
                type="text"
                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                title="完成"
              />
            </Popconfirm>
          )}
          <Popconfirm
            title="确认删除?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              size="small"
              danger
              type="text"
              icon={<DeleteOutlined />}
              title="删除"
            />
          </Popconfirm>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      fixed: 'right' as const,
      render: (status: string) => (
        <Tag color={status === 'processed' ? 'green' : 'orange'}>
          {status === 'processed' ? '已处理' : '待处理'}
        </Tag>
      ),
    },
  ];

  // 组合所有列
  const allColumns = [...leftFixedColumns, ...scrollableColumns, ...rightFixedColumns];

  console.log('=== 列配置调试信息 ===');
  console.log('templateColumns 数量:', templateColumns.length);
  console.log('leftFixedColumns 数量:', leftFixedColumns.length);
  console.log('scrollableColumns 数量:', scrollableColumns.length);
  console.log('rightFixedColumns 数量:', rightFixedColumns.length);
  console.log('allColumns 总数:', allColumns.length);
  console.log('allColumns 标题列表:', allColumns.map(col => col.title));
  console.log('========================');

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys as number[]);
    },
  };

  // 获取当前选中日期的统计
  const currentStats = dateStatistics[selectedDate] || {
    import: { count: 0, pending: 0, processed: 0 },
    delete: { count: 0, pending: 0, processed: 0 },
    modify: { count: 0, pending: 0, processed: 0 }
  };

  // 计算总数
  const totalCount = currentStats.import.count + currentStats.delete.count + currentStats.modify.count;

  // 筛选逻辑
  const filteredData = data.filter(item => {
    // 需求人筛选
    if (filterSubmitter !== 'all' && item.submitter_name !== filterSubmitter) {
      return false;
    }
    // 状态筛选
    if (filterStatus !== 'all' && item.status !== filterStatus) {
      return false;
    }
    // 关键词搜索
    if (filterKeyword) {
      const keyword = filterKeyword.toLowerCase();
      const searchableText = [
        item.device_name,
        item.ip,
        item.submitter_name
      ].join(' ').toLowerCase();
      if (!searchableText.includes(keyword)) {
        return false;
      }
    }
    return true;
  });

  // 获取所有唯一的需求人列表
  const uniqueSubmitters = Array.from(new Set(data.map(item => item.submitter_name))).sort();

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>需求列表</h1>

      <Card>
        {/* 日期导航 */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flex: 1 }}>
            <Button
            icon={<LeftOutlined />}
            onClick={() => {
              setWeekOffset(weekOffset - 1);
              setSelectedDate(''); // 清空选中状态，等待新日期加载
            }}
            disabled={weekOffset <= -100}
          />
          {weeklyDates.map(date => (
            <div
              key={date.date}
              style={{
                flex: 1,
                maxWidth: 400,
                padding: 8,
                border: selectedDate === date.date ? '2px solid #69b1ff' : '1px solid #d9d9d9',
                borderRadius: 6,
                backgroundColor: selectedDate === date.date ? '#e6f7ff' : '#fff',
                cursor: 'pointer'
              }}
              onClick={() => {
                setSelectedDate(date.date);
                // 如果当前选中的类型在新日期下有数据，保持不变；否则选择第一个有数据的类型
                const stats = dateStatistics[date.date];
                if (stats && stats[selectedType]?.count > 0) {
                  // 保持当前类型
                } else {
                  // 选择第一个有数据的类型
                  if (stats?.import?.count > 0) {
                    setSelectedType('import');
                  } else if (stats?.delete?.count > 0) {
                    setSelectedType('delete');
                  } else if (stats?.modify?.count > 0) {
                    setSelectedType('modify');
                  }
                }
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
                {date.label}
              </div>

              {/* 类型统计 */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                {(['import', 'delete', 'modify'] as const).map(type => (
                  <div
                    key={type}
                    style={{
                      flex: 1,
                      padding: 6,
                      backgroundColor:
                        selectedDate === date.date && selectedType === type
                          ? '#91d5ff'
                          : (dateStatistics[date.date]?.[type]?.count || 0) > 0
                          ? '#f5f5f5'
                          : '#fafafa',
                      borderRadius: 4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: selectedDate === date.date && selectedType === type ? '2px solid #69b1ff' : '1px solid #d9d9d9',
                      opacity: (dateStatistics[date.date]?.[type]?.count || 0) === 0 ? 0.5 : 1
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if ((dateStatistics[date.date]?.[type]?.count || 0) > 0) {
                        setSelectedDate(date.date);
                        setSelectedType(type);
                      }
                    }}
                  >
                    <div style={{ fontSize: 11, marginBottom: 3 }}>
                      {requirementTypeIcons[type]} {requirementTypeText[type]}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 'bold', color: selectedDate === date.date && selectedType === type ? '#0050b3' : '#000' }}>
                      {dateStatistics[date.date]?.[type]?.count || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Button
            icon={<RightOutlined />}
            onClick={() => {
              setWeekOffset(weekOffset + 1);
              setSelectedDate(''); // 清空选中状态，等待新日期加载
            }}
          />
          </div>
          <Button
            icon={<ExportOutlined />}
            onClick={() => message.info('导出功能待实现')}
          >
            导出Excel
          </Button>
        </div>

        {/* 当前选择提示 */}
        {selectedDate && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
            当前选中：{weeklyDates.find(d => d.date === selectedDate)?.label} - {requirementTypeText[selectedType]}类型 - 共{totalCount}条需求
          </div>
        )}

        {/* 批量操作 */}
        <div style={{ marginBottom: 16 }}>
          <Space>
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
          </Space>
        </div>

        {/* 筛选功能 */}
        <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#fafafa', borderRadius: 4 }}>
          <Space wrap>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#666' }}>需求人:</span>
              <select
                value={filterSubmitter}
                onChange={(e) => {
                  setFilterSubmitter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #d9d9d9', minWidth: 120 }}
              >
                <option value="all">全部</option>
                {uniqueSubmitters.map(submitter => (
                  <option key={submitter} value={submitter}>{submitter}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#666' }}>状态:</span>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #d9d9d9', minWidth: 120 }}
              >
                <option value="all">全部</option>
                <option value="pending">待处理</option>
                <option value="processed">已处理</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#666' }}>搜索:</span>
              <Input
                placeholder="设备名称/IP"
                value={filterKeyword}
                onChange={(e) => {
                  setFilterKeyword(e.target.value);
                  setCurrentPage(1);
                }}
                allowClear
                style={{ width: 200 }}
              />
            </div>

            {filterSubmitter !== 'all' || filterStatus !== 'all' || filterKeyword ? (
              <Button
                size="small"
                onClick={() => {
                  setFilterSubmitter('all');
                  setFilterStatus('all');
                  setFilterKeyword('');
                  setCurrentPage(1);
                }}
              >
                清除筛选
              </Button>
            ) : null}
          </Space>

          {/* 筛选结果提示 */}
          <div style={{ marginTop: 12, fontSize: 13, color: '#999' }}>
            筛选结果: {filteredData.length} 条 / 共 {data.length} 条
          </div>
        </div>

        {/* 表格 */}
        <Table
          rowSelection={rowSelection}
          columns={allColumns}
          dataSource={filteredData}
          loading={loading}
          rowKey="id"
          size="small"
          scroll={{ x: 'max-content', y: 440 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            onShowSizeChange: (current, size) => {
              setCurrentPage(1);
              setPageSize(size);
            },
          }}
        />
      </Card>
    </div>
  );
}