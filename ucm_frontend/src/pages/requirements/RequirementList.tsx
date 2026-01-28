import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Card, Table, Button, message, Space, Tag, Popconfirm, Input, DatePicker } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, ExportOutlined, ImportOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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

interface DateStatistics {
  import: { count: number; pending: number; processed: number };
  delete: { count: number; pending: number; processed: number };
  modify: { count: number; pending: number; processed: number };
}

export default function RequirementList() {
  dayjs.locale('zh-cn');
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasInitializedRef = useRef(false);
  const initialSelectedDate = useRef<string | null>(null);

  const [data, setData] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [highlightIds, setHighlightIds] = useState<number[]>([]);

  // 新增状态
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'import' | 'modify' | 'delete'>('import');
  const [dateStatistics, setDateStatistics] = useState<DateStatistics>({
    import: { count: 0, pending: 0, processed: 0 },
    modify: { count: 0, pending: 0, processed: 0 },
    delete: { count: 0, pending: 0, processed: 0 }
  });
  const [templateColumnsByType, setTemplateColumnsByType] = useState<{
    import: any[];
    modify: any[];
    delete: any[];
  }>({ import: [], modify: [], delete: [] });
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

  // 列名样式配置
  const typeColumnStyles = {
    import: {
      backgroundColor: '#e6f7ff',
      borderColor: '#1890ff',
      textColor: '#0050b3'
    },
    modify: {
      backgroundColor: '#fff7e6',
      borderColor: '#fa8c16',
      textColor: '#d46b08'
    },
    delete: {
      backgroundColor: '#fff1f0',
      borderColor: '#f5222d',
      textColor: '#cf1322'
    }
  };

  // 类型按钮样式配置
  const typeButtonStyles = {
    import: {
      unselected: {
        backgroundColor: '#ffffff',
        borderColor: '#91d5ff',
        textColor: '#0050b3'
      },
      selected: {
        backgroundColor: '#bae7ff',
        borderColor: '#1890ff',
        textColor: '#0050b3'
      }
    },
    modify: {
      unselected: {
        backgroundColor: '#ffffff',
        borderColor: '#ffd591',
        textColor: '#d46b08'
      },
      selected: {
        backgroundColor: '#ffe7ba',
        borderColor: '#fa8c16',
        textColor: '#d46b08'
      }
    },
    delete: {
      unselected: {
        backgroundColor: '#ffffff',
        borderColor: '#ffa39e',
        textColor: '#cf1322'
      },
      selected: {
        backgroundColor: '#ffccc7',
        borderColor: '#f5222d',
        textColor: '#cf1322'
      }
    }
  };

  // 处理URL参数
  useEffect(() => {
    // 检查是否有高亮ID参数，只有当有高亮ID时，说明是从需求登记页跳转过来的
    const highlightIdsParam = searchParams.get('highlight_ids');

    if (!highlightIdsParam) {
      // 如果没有高亮ID，说明是刷新页面或直接访问，不处理URL参数
      return;
    }

    const dateParam = searchParams.get('ucm_change_date');
    const typeParam = searchParams.get('requirement_type');
    const submitterParam = searchParams.get('submitter');

    // 设置高亮ID
    if (highlightIdsParam) {
      const ids = highlightIdsParam.split(',').map(Number).filter(n => !isNaN(n));
      if (ids.length > 0) {
        setHighlightIds(ids);
        setTimeout(() => {
          setHighlightIds([]);
        }, 5000);
      }
    }

    // 设置登记类型
    if (typeParam && ['import', 'modify', 'delete'].includes(typeParam)) {
      setSelectedType(typeParam as 'import' | 'modify' | 'delete');
    }

    // 设置需求人筛选
    if (submitterParam) {
      setFilterSubmitter(submitterParam);
    }
  }, [searchParams]);

  // 加载可用日期
  useEffect(() => {
    loadAvailableDates();
  }, [searchParams]);

  // 加载选中日期的统计
  useEffect(() => {
    if (selectedDate) {
      loadDateStatistics(selectedDate);
    }
  }, [selectedDate]);

  // 自动选择第一个有数据的类型
  useEffect(() => {
    if (dateStatistics && !searchParams.get('requirement_type')) {
      selectFirstAvailableType(dateStatistics);
    }
  }, [dateStatistics, searchParams]);

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

// 根据时间规则选择默认日期
  const selectDefaultDateByRule = (dates: string[]): dayjs.Dayjs | null => {
    if (!dates || dates.length === 0) return null;

    const now = dayjs();

    // 计算本周三和本周六
    const currentDay = now.day(); // 0=周日, 1=周一, ..., 6=周六
    const wednesdayOffset = (3 - currentDay + 7) % 7; // 到周三的天数
    const saturdayOffset = (6 - currentDay + 7) % 7; // 到周六的天数

    const wednesday = now.add(wednesdayOffset, 'day');
    const saturday = now.add(saturdayOffset, 'day');
    const nextWednesday = wednesday.add(7, 'day');

    let targetDate: dayjs.Dayjs;

    // 判断当前时间区间
    // 周三 24:00 前（即周三 23:59:59 之前）
    if (now.isBefore(wednesday.endOf('day'))) {
      // 当前时间 < 周三 23:59，默认本周三
      targetDate = wednesday;
    } else if (now.isBefore(saturday.endOf('day'))) {
      // 周三 23:59 <= 当前时间 < 周六 23:59，默认本周六
      targetDate = saturday;
    } else {
      // 当前时间 >= 周六 23:59，默认下周三
      targetDate = nextWednesday;
    }

    const targetDateStr = targetDate.format('YYYY-MM-DD');

    // 检查目标日期是否在可用日期中
    if (dates.includes(targetDateStr)) {
      return targetDate;
    }

    // 如果目标日期不在可用日期中，返回 null
    return null;
  };

  // 加载可用日期
  const loadAvailableDates = async () => {
    try {
      const response = await api.get('/requirements/list_dates/');
      const dates = response.data.dates || [];
      setAvailableDates(dates);

      // 检查是否有 URL 参数中的日期（用于从需求登记页跳转）
      const dateParam = searchParams.get('ucm_change_date');
      const highlightIdsParam = searchParams.get('highlight_ids');

      // 如果有高亮ID参数，说明是从需求登记页跳转过来的，使用参数日期
      if (dateParam && highlightIdsParam) {
        setSelectedDate(dateParam);
      } else {
        // 否则按规则选择默认日期（刷新页面或直接访问时）
        const defaultDate = selectDefaultDateByRule(dates);
        if (defaultDate) {
          setSelectedDate(defaultDate.format('YYYY-MM-DD'));
        }
      }
    } catch (error) {
      console.error('加载可用日期失败:', error);
    }
  };

  // 加载选中日期的统计
  const loadDateStatistics = async (date: string) => {
    try {
      const response = await api.get('/requirements/date_statistics/', {
        params: { date }
      });
      setDateStatistics(response.data.statistics);
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  // 自动选择第一个有数据的类型
  const selectFirstAvailableType = (stats: DateStatistics) => {
    if (stats.import?.count > 0) {
      setSelectedType('import');
    } else if (stats.modify?.count > 0) {
      setSelectedType('modify');
    } else if (stats.delete?.count > 0) {
      setSelectedType('delete');
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

      const columnsMap: Record<string, any[]> = { import: [], modify: [], delete: [] };

      templates.forEach((t: any) => {
        if (columnsMap.hasOwnProperty(t.template_type)) {
          const columns = t.get_column_definitions || [];
          console.log(`加载 ${t.template_type} 模板列配置:`, columns);
          columnsMap[t.template_type] = columns;
        }
      });

      // 'delete'类型使用'import'的列配置
      if (columnsMap['import'] && columnsMap['import'].length > 0) {
        columnsMap['delete'] = columnsMap['import'];
        console.log('删除类型使用导入模板的列配置');
      }

      console.log('所有模板列配置:', columnsMap);
      setTemplateColumnsByType(columnsMap as { import: any[]; modify: any[]; delete: any[] });
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
    // 动态列（根据选中的类型对应的模板配置）
    ...(templateColumnsByType[selectedType] || []).map((col: any) => {
      // 当selectedType为'delete'时，使用'import'的列配置，但表头色调保持红色
      const displayType = selectedType === 'delete' ? 'delete' : selectedType;
      return {
        title: (
          <div style={{
            backgroundColor: typeColumnStyles[displayType].backgroundColor,
            borderLeft: `3px solid ${typeColumnStyles[displayType].borderColor}`,
            padding: '4px 8px',
            color: typeColumnStyles[displayType].textColor,
            fontWeight: 'bold',
            lineHeight: '1.2',
            fontSize: '13px'
          }}>
            {col.name}
          </div>
        ),
        dataIndex: ['requirement_data_dict', col.name],
        width: 120,
        ellipsis: true,
        render: (value: any) => value || '-'
      };
    }),
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
  console.log('当前选中类型:', selectedType);
  console.log(`${selectedType} 模板列数量:`, templateColumnsByType[selectedType]?.length || 0);
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
        {/* 日期选择和类型统计 */}
        <div style={{ marginBottom: 24 }}>
          {/* 日期选择器和类型统计按钮 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* 日期选择器 */}
            <div>
              <span style={{ marginRight: 8 }}>日期：</span>
              <DatePicker
                value={selectedDate ? dayjs(selectedDate) : null}
                onChange={(date) => {
                  if (date) {
                    setSelectedDate(date.format('YYYY-MM-DD'));
                  }
                }}
                disabledDate={(current) => {
                  // 禁用不可选日期（非周三、非周六）
                  if (!availableDates.includes(current.format('YYYY-MM-DD'))) {
                    return true;
                  }
                  return false;
                }}
                placeholder="选择日期"
                format="YYYY-MM-DD（ddd）"
                placement="bottomLeft"
                dropdownStyle={{ maxHeight: '400px', overflow: 'auto' }}
                style={{ width: 210 }}
              />
            </div>

            {/* 类型统计按钮 */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {(['import', 'modify', 'delete'] as const).map((type) => {
                const isSelected = selectedType === type;
                const count = dateStatistics[type]?.count || 0;
                const isDisabled = count === 0;
                const typeConfig = {
                  import: { bgColor: '#e6f7ff', borderColor: '#1890ff', textColor: '#0050b3' },
                  modify: { bgColor: '#fff7e6', borderColor: '#fa8c16', textColor: '#d46b08' },
                  delete: { bgColor: '#fff1f0', borderColor: '#f5222d', textColor: '#cf1322' }
                };
                const config = typeConfig[type];

                return (
                  <div
                    key={type}
                    onClick={() => !isDisabled && setSelectedType(type)}
                    style={{
                      padding: '4px 8px',
                      minWidth: '80px',
                      height: '32px',
                      backgroundColor: isSelected ? config.bgColor : '#ffffff',
                      border: isSelected ? `2px solid ${config.borderColor}` : `1px solid ${config.borderColor}`,
                      borderRadius: '4px',
                      color: isSelected ? config.textColor : '#666',
                      fontSize: '12px',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      userSelect: 'none'
                    }}
                  >
                    <span>{requirementTypeText[type]}：</span>
                    <span style={{ fontWeight: 'bold' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 当前选择提示 */}
        {selectedDate && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
            当前选中：{dayjs(selectedDate).format('YYYY-MM-DD（ddd）')} - {requirementTypeText[selectedType]}类型 - 共{totalCount}条需求
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
          rowClassName={(record) => {
            // 如果该记录ID在高亮列表中，返回高亮样式
            if (highlightIds.includes(record.id)) {
              return 'highlight-row';
            }
            return '';
          }}
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