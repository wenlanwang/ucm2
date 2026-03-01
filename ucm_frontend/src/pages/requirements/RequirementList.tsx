import { useState, useEffect } from 'react';
import { Card, Table, Button, message, Space, Tag, Popconfirm, Input, DatePicker, Modal, Form } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, ExportOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useSearchParams } from 'react-router-dom';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import api from '../../services/api';

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
  const [searchParams] = useSearchParams();

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

  // 编辑Modal状态
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<Requirement | null>(null);
  const [editForm] = Form.useForm();

  // 校验所需数据
  const [vendorVersionData, setVendorVersionData] = useState<any[]>([]);
  const [columnOptions, setColumnOptions] = useState<Record<string, string[]>>({});

  const requirementTypeText = {
    import: '导入',
    modify: '修改',
    delete: '删除'
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



  // 处理URL参数
  useEffect(() => {
    console.log('=== URL参数处理 ===');
    console.log('当前URL参数:', Object.fromEntries(searchParams.entries()));
    
    // 检查是否有高亮ID参数，只有当有高亮ID时，说明是从需求登记页跳转过来的
    const highlightIdsParam = searchParams.get('highlight_ids');
    console.log('highlightIdsParam:', highlightIdsParam);

    if (!highlightIdsParam) {
      // 如果没有高亮ID，说明是刷新页面或直接访问，不处理URL参数
      console.log('没有高亮ID参数，跳过');
      return;
    }

    const dateParam = searchParams.get('ucm_change_date');
    const typeParam = searchParams.get('requirement_type');
    const submitterParam = searchParams.get('submitter');

    // 设置高亮ID
    if (highlightIdsParam) {
      const ids = highlightIdsParam.split(',').map(Number).filter(n => !isNaN(n));
      console.log('高亮ID参数:', highlightIdsParam);
      console.log('解析后的ID数组:', ids);
      if (ids.length > 0) {
        setHighlightIds(ids);
        console.log('已设置高亮ID:', ids);
        setTimeout(() => {
          console.log('5秒后清除高亮ID');
          setHighlightIds([]);
        }, 5000);
      }
    }

    // 设置登记类型
    if (typeParam && ['import', 'modify', 'delete'].includes(typeParam)) {
      setSelectedType(typeParam as 'import' | 'modify' | 'delete');
    }

    // 设置登记日期
    if (dateParam) {
      setSelectedDate(dateParam);
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

  // 加载模板列配置和校验数据
  useEffect(() => {
    loadTemplateColumns();
    loadValidationData();
  }, []);

// 根据时间规则选择默认日期
  const selectDefaultDateByRule = (dates: string[]): dayjs.Dayjs | null => {
    if (!dates || dates.length === 0) return null;

    const now = dayjs().startOf('day');

    // 找到第一个大于等于当前日期的可用日期
    const targetDate = dates.find(date => {
      return dayjs(date).isAfter(now) || dayjs(date).isSame(now);
    });

    if (targetDate) {
      return dayjs(targetDate);
    }

    // 如果没有，选择第一个可用日期
    return dayjs(dates[0]);
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

  const loadValidationData = async () => {
    try {
      // 加载ManufacturerVersionInfo数据
      const vendorResponse = await api.get('/manufacturer-version-info/');
      setVendorVersionData(vendorResponse.data.results || vendorResponse.data);

      // 加载列的可选值
      const columnsResponse = await api.get('/column-options/');
      const options: Record<string, string[]> = {};
      (columnsResponse.data.results || columnsResponse.data).forEach((item: any) => {
        if (!options[item.column_name]) {
          options[item.column_name] = [];
        }
        options[item.column_name].push(item.option_value);
      });
      setColumnOptions(options);
    } catch (error) {
      console.error('加载校验数据失败:', error);
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

  const handleEdit = (record: Requirement) => {
    setEditingRecord(record);
    setEditModalVisible(true);
    // 填充表单数据
    editForm.setFieldsValue({
      ...record,
      ...record.requirement_data_dict
    });
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();

      // 自定义校验
      const validation = validateFormData(values);
      if (!validation.valid) {
        // 显示第一个错误
        const firstError = Object.values(validation.errors)[0];
        message.error(firstError);
        return;
      }

      const { id, ...updateData } = values;

      // 将表单数据转换为requirement_data_dict格式
      const requirementData: any = {};
      Object.keys(updateData).forEach(key => {
        // 排除固定字段
        if (!['id', 'requirement_type', 'submitter_name', 'submit_time', 'ucm_change_date', 'status', 'processor_name', 'process_time', 'note'].includes(key)) {
          requirementData[key] = updateData[key];
        }
      });

      await api.patch(`/requirements/${editingRecord?.id}/`, {
        requirement_data_dict: requirementData,
        ...updateData
      });

      message.success('编辑成功');
      setEditModalVisible(false);
      editForm.resetFields();
      loadData();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        message.error('请检查表单填写');
      } else {
        message.error('编辑失败');
      }
    }
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    editForm.resetFields();
    setEditingRecord(null);
  };

  // 校验表单数据
  const validateFormData = (values: any): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    // 获取当前类型的模板列
    const columns = editingRecord ? templateColumnsByType[editingRecord.requirement_type] || [] : [];

    columns.forEach((col: any) => {
      const value = values[col.name]?.trim() || '';

      // 必填字段校验
      if (col.required && !value) {
        errors[col.name] = '此字段为必填项';
      }

      // IP地址格式校验
      if (col.name === 'IP' && value) {
        const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipv4Pattern.test(value)) {
          errors[col.name] = 'IP地址格式不正确（IPv4）';
        }
      }

      // 可选值校验
      if (columnOptions[col.name] && value) {
        if (!columnOptions[col.name].includes(value)) {
          errors[col.name] = '不在可选值清单中';
        }
      }
    });

    // 级联校验：设备类型、品牌(厂商)、版本
    const deviceType = values['设备类型'];
    const manufacturer = values['品牌(厂商)'];
    const version = values['版本'];

    // 1. 获取有效的可选值
    const validDeviceTypes = [...new Set(vendorVersionData.map(item => item.device_type))];
    const validManufacturers = [...new Set(vendorVersionData.map(item => item.manufacturer))];
    const validVersions = [...new Set(vendorVersionData.map(item => item.version))];

    // 2. 独立校验设备类型（优先级最高）
    if (deviceType && !validDeviceTypes.includes(deviceType)) {
      errors['设备类型'] = '设备类型不在可选范围内';
      return { valid: false, errors };
    }

    // 3. 独立校验品牌(厂商)（优先级第二）
    if (manufacturer && !validManufacturers.includes(manufacturer)) {
      errors['品牌(厂商)'] = '品牌(厂商)不在可选范围内';
      return { valid: false, errors };
    }

    // 4. 独立校验版本（优先级第三）
    if (version && !validVersions.includes(version)) {
      errors['版本'] = '版本不在可选范围内';
      return { valid: false, errors };
    }

    // 5. 规则：如果选择了设备类型，必须选择品牌(厂商)
    if (deviceType && !manufacturer) {
      errors['品牌(厂商)'] = '请选择品牌(厂商)';
    }

    // 6. 规则：如果选择了品牌(厂商)，必须选择版本
    if (manufacturer && !version) {
      errors['版本'] = '请选择版本';
    }

    // 7. 规则：如果三者都填了，检查组合是否有效
    if (deviceType && manufacturer && version) {
      const isValidCombination = vendorVersionData.some(
        item => item.device_type === deviceType &&
                item.manufacturer === manufacturer &&
                item.version === version
      );

      if (!isValidCombination) {
        errors['版本'] = '设备类型、品牌(厂商)、版本组合不匹配';
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
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

  // 导出功能
  const handleExport = async () => {
    if (!selectedDate) {
      message.warning('请先选择日期');
      return;
    }

    message.loading('正在导出，请稍候...', 0);

    try {
      const zip = new JSZip();
      const typeConfig = {
        import: { text: '导入', bgColor: 'FFE6F7FF', textColor: 'FF0050B3' },
        modify: { text: '修改', bgColor: 'FFFFF7E6', textColor: 'FFD46B08' },
        delete: { text: '删除', bgColor: 'FFFFF1F0', textColor: 'FFCF1322' }
      };

      const types: ('import' | 'modify' | 'delete')[] = ['import', 'modify', 'delete'];

      for (const type of types) {
        // 检查该类型是否有数据（使用 dateStatistics）
        if (!dateStatistics[type]?.count || dateStatistics[type].count === 0) {
          continue; // 该类型无数据，跳过
        }

        // 获取该类型的实际数据
        const response = await api.get('/requirements/', {
          params: {
            ucm_change_date: selectedDate,
            requirement_type: type
          }
        });

        const typeData = response.data.results || response.data;

        if (typeData.length === 0) {
          continue;
        }

        // 获取该类型的模板列
        const columns = templateColumnsByType[type] || [];

        // 创建工作簿
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(typeConfig[type].text);

        // 构建表头
        const headers = ['序号', '需求人', '登记时间', 'UCM变更日期', '类型', ...columns.map(col => col.name)];

        // 添加表头行
        const headerRow = worksheet.addRow(headers);

        // 设置表头样式
        headerRow.eachCell((cell, colNumber) => {
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          // 为表头单元格添加边框
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };

          // 动态列列名染色
          if (colNumber >= 6) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: typeConfig[type].bgColor }
            };
            cell.font = {
              bold: true,
              color: { argb: typeConfig[type].textColor }
            };
          }
        });

        // 添加数据行
        typeData.forEach((item: any, index: number) => {
          const row = worksheet.addRow([
            index + 1,
            item.submitter_name,
            dayjs(item.submit_time).format('YYYY-MM-DD HH:mm:ss'),
            dayjs(item.ucm_change_date).format('YYYY-MM-DD'),
            typeConfig[type].text,
            ...columns.map(col => item.requirement_data_dict?.[col.name] || '-')
          ]);

          // 数据行不染色，只设置边框和对齐
          row.eachCell((cell) => {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            // 为数据单元格添加边框
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        });

        // 设置列宽
        worksheet.columns = [
          { width: 6 },   // 序号
          { width: 10 },  // 需求人
          { width: 20 },  // 登记时间
          { width: 12 },  // UCM变更日期
          { width: 8 },   // 类型
          ...columns.map(() => ({ width: 15 })) // 动态列
        ];

        // 生成 Buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // 添加到 ZIP
        zip.file(`UCM需求_${typeConfig[type].text}.xlsx`, buffer);
      }

      // 生成 ZIP 文件
      const content = await zip.generateAsync({ type: 'blob' });

      // 下载 ZIP 文件
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `UCM需求_${selectedDate}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.destroy();
      message.success('导出成功');
    } catch (error) {
      message.destroy();
      message.error('导出失败');
      console.error('导出错误:', error);
    }
  };

  // 导出变更方案功能
  const handleExportChangePlan = async () => {
    if (!selectedDate) {
      message.warning('请先选择日期');
      return;
    }

    message.loading('正在导出变更方案，请稍候...', 0);

    try {
      // 调用后端API
      const response = await api.post('/requirements/export_change_plan/', {
        ucm_change_date: selectedDate
      }, {
        responseType: 'blob'  // 重要：设置为blob以处理二进制数据
      });

      // 创建Blob对象
      const blob = new Blob([response.data], { type: 'application/zip' });

      // 下载文件
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `UCM变更方案_${selectedDate}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.destroy();
      message.success('导出变更方案成功');
    } catch (error: any) {
      message.destroy();
      if (error.response?.data) {
        // 尝试解析错误信息
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result as string);
            message.error(errorData.error || '导出变更方案失败');
          } catch {
            message.error('导出变更方案失败');
          }
        };
        reader.readAsText(error.response.data);
      } else {
        message.error('导出变更方案失败');
      }
      console.error('导出变更方案错误:', error);
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
    {
      title: '类型',
      dataIndex: 'requirement_type',
      width: 70,
      render: (type: 'import' | 'modify' | 'delete') => {
        const typeConfig = {
          import: { text: '导入', bgColor: '#e6f7ff', textColor: '#0050b3' },
          modify: { text: '修改', bgColor: '#fff7e6', textColor: '#d46b08' },
          delete: { text: '删除', bgColor: '#fff1f0', textColor: '#cf1322' }
        };
        const config = typeConfig[type];
        return (
          <span style={{
            backgroundColor: config.bgColor,
            color: config.textColor,
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {config.text}
          </span>
        );
      },
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
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: Requirement) => (
        <Space size="small">
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            title="编辑"
            onClick={() => handleEdit(record)}
          />
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
  const currentStats = dateStatistics;

  // 计算当前选中类型的总数
  const totalCount = currentStats[selectedType]?.count || 0;

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
                disabledDate={(date) => {
                  // 禁用不可选日期（非周三、非周六）
                  if (!availableDates.includes(date.format('YYYY-MM-DD'))) {
                    return true;
                  }
                  return false;
                }}
                placeholder="选择日期"
                format="YYYY-MM-DD（ddd）"
                placement="bottomLeft"
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

            {/* 导出按钮 */}
            <div style={{ marginLeft: 'auto' }}>
              <Space>
                <Button
                  icon={<ExportOutlined />}
                  onClick={handleExport}
                  disabled={data.length === 0}
                >
                  导出需求
                </Button>
                <Button
                  type="primary"
                  icon={<ExportOutlined />}
                  onClick={handleExportChangePlan}
                  disabled={!selectedDate}
                >
                  导出变更方案
                </Button>
              </Space>
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
            const isHighlighted = highlightIds.includes(record.id);
            const className = isHighlighted ? 'highlight-row' : '';
            console.log('rowClassName调用 - 记录ID:', record.id, 'isHighlighted:', isHighlighted, 'highlightIds:', highlightIds, '返回类名:', className);
            return className;
          }}
          onRow={(record) => {
            const isHighlighted = highlightIds.includes(record.id);
            if (!isHighlighted) return {};

            // 直接返回带动画的内联样式
            const style = {
              animation: 'highlightFadeOut 5s ease-out forwards',
            };

            // 动态创建keyframes样式 - 浅蓝色背景渐变消失
            const keyframes = `
              @keyframes highlightFadeOut {
                0% { background-color: #e6f7ff; }
                100% { background-color: transparent; }
              }
            `;

            // 创建或更新style标签
            let styleTag = document.getElementById('highlight-animation');
            if (!styleTag) {
              styleTag = document.createElement('style');
              styleTag.id = 'highlight-animation';
              document.head.appendChild(styleTag);
            }
            styleTag.textContent = keyframes;

            return { style };
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
            onShowSizeChange: (_, size) => {
              setCurrentPage(1);
              setPageSize(size);
            },
          }}
        />

        {/* 编辑Modal */}
        <Modal
          title={`编辑需求 - ID: ${editingRecord?.id}`}
          open={editModalVisible}
          onOk={handleEditSubmit}
          onCancel={handleEditCancel}
          width={800}
          okText="保存"
          cancelText="取消"
        >
          <Form
            form={editForm}
            layout="vertical"
            style={{ marginTop: 24 }}
          >
            <Form.Item
              label="设备名称"
              name="device_name"
              rules={[{ required: true, message: '请输入设备名称' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="IP地址"
              name="ip"
              rules={[{ required: true, message: '请输入IP地址' }]}
            >
              <Input />
            </Form.Item>
            {editingRecord && templateColumnsByType[editingRecord.requirement_type]?.map((col: any, index: number) => (
              <Form.Item
                key={index}
                label={col.name}
                name={col.name}
                rules={col.required ? [{ required: true, message: `请输入${col.name}` }] : []}
              >
                <Input placeholder={col.example} />
              </Form.Item>
            ))}
          </Form>
        </Modal>
      </Card>
    </div>
  );
}