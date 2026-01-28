import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, Button, message, Space, Tabs, DatePicker, Select, Upload, Modal, Table, Input, Tooltip, Tag } from 'antd';
import { PlusOutlined, DownloadOutlined, CheckCircleOutlined, DeleteOutlined, CopyOutlined, UploadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import EditableCell from '../../components/EditableCell';

const { Option } = Select;
const { Dragger } = Upload;

interface ColumnDefinition {
  name: string;
  required: boolean;
  example: string;
}

interface RequirementRow {
  id: number;
  data: Record<string, string>;
  validation: {
    isValid: boolean;
    errors: Record<string, string>;
    warnings: Record<string, string>;
  };
}

interface ValidationResult {
  is_valid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export default function RequirementRegister() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // 状态管理
  const [activeTab, setActiveTab] = useState<'import' | 'modify' | 'delete'>('import');
  const [ucmChangeDate, setUcmChangeDate] = useState<dayjs.Dayjs | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [deadlines, setDeadlines] = useState<Record<string, string>>({});
  const [tableData, setTableData] = useState<RequirementRow[]>([]);
  const [templateColumns, setTemplateColumns] = useState<ColumnDefinition[]>([]);
  const [columnOptions, setColumnOptions] = useState<Record<string, string[]>>({});
  const [vendorVersionData, setVendorVersionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAllValid, setIsAllValid] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const nextRowId = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 加载可用UCM日期
  useEffect(() => {
    loadAvailableDates();
  }, []);
  
  // 加载模板配置和列可选值
  useEffect(() => {
    if (activeTab) {
      loadTemplateConfig();
      loadColumnOptions();
      loadVendorVersionData();
    }
  }, [activeTab]);
  
  // 检查所有行是否校验通过
  useEffect(() => {
    const allValid = tableData.every(row => row.validation.isValid);
    setIsAllValid(allValid && tableData.length > 0);
  }, [tableData]);

  // 自动选择最近的可选日期（优先周三和周六）
  const selectNearestAvailableDate = (dates: string[]): dayjs.Dayjs | null => {
    if (!dates || dates.length === 0) return null;

    const today = dayjs();
    const currentWeekStart = today.startOf('week');

    // 生成本周及未来几周的周三和周六日期列表
    const priorityOrder: string[] = [];
    for (let week = 0; week < 8; week++) {
      const wednesday = currentWeekStart.add(3 + week * 7, 'day').format('YYYY-MM-DD');
      const saturday = currentWeekStart.add(6 + week * 7, 'day').format('YYYY-MM-DD');
      priorityOrder.push(wednesday, saturday);
    }

    // 找到第一个在可选日期中且未过期的日期
    const selectedDate = priorityOrder.find(date =>
      dates.includes(date) && dayjs(date).isAfter(today, 'day')
    );

    return selectedDate ? dayjs(selectedDate) : null;
  };

  const loadAvailableDates = async () => {
    try {
      const response = await api.get('/requirements/available_dates/');
      const dates = response.data.dates;
      setAvailableDates(dates);
      setDeadlines(response.data.deadlines);

      // 自动选择最近的可选日期
      const autoSelectedDate = selectNearestAvailableDate(dates);
      if (autoSelectedDate) {
        setUcmChangeDate(autoSelectedDate);
      }
    } catch (error) {
      message.error('加载可用日期失败');
    }
  };
  
  const loadTemplateConfig = async () => {
    try {
      const response = await api.get('/templates/');
      console.log('Templates response:', response.data);
      
      const templates = response.data.results || response.data;
      console.log('Templates array:', templates);
      
      const template = templates.find((t: any) => t.template_type === activeTab);
      console.log('Found template for type', activeTab, ':', template);
      
      if (template) {
        // 使用后端提供的get_column_definitions方法
        let columns = [];
        if (template.get_column_definitions && Array.isArray(template.get_column_definitions)) {
          columns = template.get_column_definitions;
          console.log('Using get_column_definitions:', columns);
        } else if (typeof template.column_definitions === 'string') {
          // 备用方案：手动解析JSON字符串
          try {
            columns = JSON.parse(template.column_definitions);
            console.log('Parsed column_definitions:', columns);
          } catch (e) {
            console.error('Failed to parse column_definitions:', e);
            message.error('模板配置格式错误');
            return;
          }
        } else if (Array.isArray(template.column_definitions)) {
          columns = template.column_definitions;
          console.log('Using column_definitions as array:', columns);
        }
        
        console.log('Setting template columns:', columns);
        setTemplateColumns(columns);
      } else {
        console.error('Template not found for type:', activeTab);
        message.error(`未找到${activeTab}类型的模板配置`);
      }
    } catch (error: any) {
      console.error('加载模板配置失败:', error);
      message.error(`加载模板配置失败: ${error.message || '未知错误'}`);
    }
  };
  
  const loadColumnOptions = async () => {
    try {
      const response = await api.get('/column-options/');
      const options: Record<string, string[]> = {};
      response.data.results?.forEach((item: any) => {
        if (!options[item.column_name]) {
          options[item.column_name] = [];
        }
        options[item.column_name].push(item.option_value);
      });
      setColumnOptions(options);
    } catch (error) {
      console.error('加载列可选值失败:', error);
    }
  };

  const loadVendorVersionData = async () => {
    try {
      const response = await api.get('/manufacturers/');
      setVendorVersionData(response.data.results || []);
    } catch (error) {
      console.error('加载厂商版本数据失败:', error);
    }
  };

  const getDynamicColumnOptions = (columnName: string, rowData: Record<string, string>): string[] => {
    if (columnName === '设备类型') {
      // 返回所有唯一的设备类型
      const uniqueDeviceTypes = [...new Set(
        vendorVersionData.map(item => item.device_type)
      )];
      return uniqueDeviceTypes;
    }

    if (columnName === '厂商') {
      const deviceType = rowData['设备类型'];
      if (!deviceType) return [];

      const uniqueVendors = [...new Set(
        vendorVersionData
          .filter(item => item.device_type === deviceType)
          .map(item => item.manufacturer)
      )];
      return uniqueVendors;
    }

    if (columnName === '版本') {
      const deviceType = rowData['设备类型'];
      const manufacturer = rowData['厂商'];
      if (!deviceType || !manufacturer) return [];

      const uniqueVersions = [...new Set(
        vendorVersionData
          .filter(item => item.device_type === deviceType && item.manufacturer === manufacturer)
          .map(item => item.version)
      )];
      return uniqueVersions;
    }

    return columnOptions[columnName] || [];
  };

  // 校验单行数据
  const validateRow = useCallback((rowData: Record<string, string>): ValidationResult => {
    console.log('validateRow 被调用');
    console.log('  - rowData:', rowData);
    console.log('  - vendorVersionData 长度:', vendorVersionData.length);

    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    // 确保templateColumns是数组
    const columns = Array.isArray(templateColumns) ? templateColumns : [];

    columns.forEach(col => {
      const value = rowData[col.name]?.trim() || '';

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

    // 级联校验：设备类型、厂商、版本
    const deviceType = rowData['设备类型'];
    const manufacturer = rowData['厂商'];
    const version = rowData['版本'];

    console.log('  - 级联校验:', { deviceType, manufacturer, version });

    // 规则：如果选择了设备类型，必须选择厂商
    if (deviceType && !manufacturer) {
      errors['厂商'] = '请选择厂商';
    }

    // 规则：如果选择了厂商，必须选择版本
    if (manufacturer && !version) {
      errors['版本'] = '请选择版本';
    }

    // 规则：如果三者都填了，检查组合是否有效
    if (deviceType && manufacturer && version) {
      const isValidCombination = vendorVersionData.some(
        item => item.device_type === deviceType &&
                item.manufacturer === manufacturer &&
                item.version === version
      );

      console.log('  - 组合校验结果:', isValidCombination);

      if (!isValidCombination) {
        errors['版本'] = '设备类型、厂商、版本组合不匹配';
      }
    }

    const result = {
      is_valid: Object.keys(errors).length === 0,
      errors,
      warnings
    };

    console.log('  - 校验结果:', result);

    return result;
  }, [templateColumns, columnOptions, vendorVersionData]);

  const handleTabChange = (key: string) => {
    setActiveTab(key as 'import' | 'modify' | 'delete');
    setTableData([]);

    // 重新自动选择日期
    const autoSelectedDate = selectNearestAvailableDate(availableDates);
    setUcmChangeDate(autoSelectedDate);
  };
  
  const handleAddRow = useCallback(() => {
    // 初始化所有列，对于只有一个可选值的列自动填充
    const rowData: Record<string, string> = {};
    console.log('handleAddRow - templateColumns:', templateColumns);
    console.log('handleAddRow - columnOptions:', columnOptions);

    templateColumns.forEach(col => {
      // 检查该列是否有可选值配置
      const options = columnOptions[col.name];
      console.log(`列名: ${col.name}, 可选值:`, options);

      // 如果该列只有一个可选值，自动填充
      if (options && options.length === 1) {
        rowData[col.name] = options[0];
        console.log(`自动填充 ${col.name} = ${options[0]}`);
      } else {
        // 否则保持空值
        rowData[col.name] = '';
      }
    });

    console.log('最终填充的 rowData:', rowData);

    // 自动填充后立即进行前端校验
    const validation = validateRow(rowData);

    const newRow: RequirementRow = {
      id: nextRowId.current++,
      data: rowData,
      validation
    };
    console.log('新增行数据:', newRow);
    setTableData(prevData => {
      const newData = [...prevData, newRow];
      console.log('更新后的表格数据:', newData);
      return newData;
    });
  }, [templateColumns, columnOptions]);
  
  const handleDeleteRow = useCallback((id: number) => {
    const row = tableData.find(r => r.id === id);
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确定要删除第 {tableData.findIndex(r => r.id === id) + 1} 行数据吗？</p>
          {row && row.data['名称'] && <p>名称：{row.data['名称']}</p>}
          {row && row.data['IP'] && <p>IP：{row.data['IP']}</p>}
        </div>
      ),
      onOk: () => {
        setTableData(tableData.filter(r => r.id !== id));
        message.success('删除成功');
      }
    });
  }, [tableData]);
  
  const handleCopyRow = useCallback((id: number) => {
    const row = tableData.find(r => r.id === id);
    if (row) {
      const newRow: RequirementRow = {
        id: nextRowId.current++,
        data: { ...row.data },
        validation: { ...row.validation }
      };
      setTableData([...tableData, newRow]);
      message.success('复制成功');
    }
  }, [tableData]);
  
  const handleCellChange = useCallback((rowId: number, columnName: string, value: string) => {
    console.log(`handleCellChange 被调用: rowId=${rowId}, columnName=${columnName}, value=${value}`);

    setTableData(prevData => {
      return prevData.map(row => {
        if (row.id === rowId) {
          const newData = { ...row.data, [columnName]: value };

          // 级联处理
          if (columnName === '设备类型') {
            // 重新选择设备类型，清空厂商和版本
            newData['厂商'] = '';
            newData['版本'] = '';
            console.log('  - 级联清空厂商和版本');
          } else if (columnName === '厂商') {
            // 重新选择厂商，清空版本
            newData['版本'] = '';
            console.log('  - 级联清空版本');
          }

          console.log('  - 更新后的数据:', newData);

          const validation = validateRow(newData);

          console.log('  - 原validation:', row.validation);
          console.log('  - 新validation:', validation);

          // 强制创建新对象，确保 React 检测到变化
          const updatedRow = {
            ...row,
            data: newData,
            validation: {
              isValid: validation.is_valid,
              errors: { ...validation.errors },
              warnings: { ...validation.warnings }
            }
          };

          console.log('  - 更新后的行:', updatedRow);

          return updatedRow;
        }
        return row;
      });
    });
  }, [validateRow]);

  const handleValidateAll = async () => {
    setLoading(true);
    try {
      const response = await api.post('/requirements/validate_data/', {
        requirement_type: activeTab,
        excel_data: tableData.map(row => row.data)
      });
      
      const validationResults = response.data.validation_results;
      const newData = tableData.map((row, index) => ({
        ...row,
        validation: {
          isValid: validationResults[index]?.is_valid || false,
          errors: validationResults[index]?.errors || {},
          warnings: validationResults[index]?.warnings || {}
        }
      }));
      
      setTableData(newData);
      
      const hasErrors = newData.some(row => !row.validation.isValid);
      if (hasErrors) {
        message.warning('校验完成，存在错误数据');
      } else {
        message.success('校验通过');
      }
    } catch (error: any) {
      console.error('校验错误:', error);
      if (error.response?.data?.error_type === 'column_mismatch') {
        const missingColumns = error.response.data.missing_columns || [];
        const extraColumns = error.response.data.extra_columns || [];
        
        // 为缺少的列添加错误提示
        if (missingColumns.length > 0) {
          const newData = tableData.map(row => {
            const newErrors = { ...row.validation.errors };
            missingColumns.forEach(col => {
              newErrors[col] = '此列数据缺失';
            });
            return {
              ...row,
              validation: {
                ...row.validation,
                isValid: false,
                errors: newErrors
              }
            };
          });
          setTableData(newData);
        }
        
        Modal.error({
          title: '数据格式不匹配',
          content: (
            <div>
              {missingColumns.length > 0 && (
                <>
                  <p><strong>缺少列：</strong></p>
                  <p>{missingColumns.join(', ')}</p>
                </>
              )}
              {extraColumns.length > 0 && (
                <>
                  <p><strong>多余列：</strong></p>
                  <p>{extraColumns.join(', ')}</p>
                </>
              )}
              <p>请确保数据包含所有必需的列，且没有多余的列。</p>
              <p>建议：点击"下载模板"获取正确的列名格式。</p>
            </div>
          )
        });
      } else {
        message.error(error.response?.data?.error || '校验失败');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get(`/templates/download_template/?template_type=${activeTab}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const typeMap = {
        import: '导入',
        modify: '修改',
        delete: '删除'
      };
      link.setAttribute('download', `${typeMap[activeTab]}_模板.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('模板下载成功');
    } catch (error) {
      message.error('模板下载失败');
    }
  };
  
  const handleUploadChange = (info: any) => {
    setFileList(info.fileList.slice(-1));
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileList([{
        uid: '-1',
        name: file.name,
        status: 'done',
        originFileObj: file,
      }]);
    }
  };
  
  const handleImportExcel = async () => {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      message.warning('请选择文件');
      return;
    }
    
    console.log('开始导入Excel文件:', file.name, file.size);
    
    // 检查文件大小（10MB限制）
    if (file.size > 10 * 1024 * 1024) {
      message.error('文件大小不能超过10MB');
      return;
    }
    
    // 检查模板配置是否加载
    if (!templateColumns || templateColumns.length === 0) {
      message.error('模板配置未加载，请刷新页面重试');
      console.error('Template columns not loaded:', templateColumns);
      return;
    }
    
    console.log('当前模板列配置:', templateColumns);
    
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      console.log('文件读取成功，大小:', data.byteLength);
      
      const workbook = XLSX.read(data, { type: 'array' });
      console.log('工作簿读取成功，工作表数量:', workbook.SheetNames.length);
      
      const sheetName = workbook.SheetNames[0];
      console.log('使用工作表:', sheetName);
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      console.log('Excel解析成功，总行数:', jsonData.length);
      
      if (jsonData.length < 2) {
        message.error('Excel文件为空或格式不正确');
        return;
      }
      
      const headers = jsonData[0].map((h: any) => String(h).trim());
      console.log('Excel表头:', headers);
      
      const rows = jsonData.slice(1);
      console.log('数据行数:', rows.length);
      
      // 检查行数限制（500行）
      if (rows.length > 500) {
        message.error('数据行数不能超过500行');
        return;
      }
      
      // 检查列名是否匹配
      const templateColumnNames = templateColumns.map(col => col.name);
      console.log('模板列名:', templateColumnNames);
      
      const missingColumns = templateColumnNames.filter(name => !headers.includes(name));
      const extraColumns = headers.filter(name => !templateColumnNames.includes(name));
      
      console.log('缺少列:', missingColumns);
      console.log('多余列:', extraColumns);
      
      if (missingColumns.length > 0 || extraColumns.length > 0) {
        Modal.error({
          title: 'Excel格式错误',
          content: (
            <div>
              {missingColumns.length > 0 && (
                <p>缺少列：{missingColumns.join(', ')}</p>
              )}
              {extraColumns.length > 0 && (
                <p>多余列：{extraColumns.join(', ')}</p>
              )}
              <p>请确保Excel列名与模板完全一致</p>
            </div>
          )
        });
        return;
      }
      
      // 确认导入（只在有数据时显示覆盖提示）
      const doImport = async () => {
        // 解析数据
        const newRows: RequirementRow[] = rows.map(row => {
          const rowData: Record<string, string> = {};
          headers.forEach((header, index) => {
            rowData[header] = String(row[index] || '').trim();
          });
          const validation = validateRow(rowData);
          return {
            id: nextRowId.current++,
            data: rowData,
            validation
          };
        });

        console.log('成功解析数据行数:', newRows.length);

        // 立即调用后端API进行完整校验
        try {
          const response = await api.post('/requirements/validate_data/', {
            requirement_type: activeTab,
            excel_data: newRows.map(row => row.data)
          });

          const validationResults = response.data.validation_results;
          const validatedRows = newRows.map((row, index) => ({
            ...row,
            validation: {
              isValid: validationResults[index]?.is_valid || false,
              errors: validationResults[index]?.errors || {},
              warnings: validationResults[index]?.warnings || {}
            }
          }));

          setTableData(validatedRows);
          setFileList([]);
          setUploadModalVisible(false);

          const hasErrors = validatedRows.some(row => !row.validation.isValid);
          if (hasErrors) {
            message.success(`成功导入 ${rows.length} 条数据，存在校验错误`);
          } else {
            message.success(`成功导入 ${rows.length} 条数据，校验通过`);
          }
        } catch (error: any) {
          console.error('自动校验失败:', error);
          // 如果自动校验失败，仍然显示数据，但提示用户
          setTableData(newRows);
          setFileList([]);
          setUploadModalVisible(false);
          message.warning(`成功导入 ${rows.length} 条数据，但自动校验失败，请手动点击校验`);
        }
      };
      
      // 只有当前页面有数据时才显示覆盖提示
      if (tableData.length > 0) {
        Modal.confirm({
          title: '确认导入',
          icon: <ExclamationCircleOutlined />,
          content: (
            <div>
              <p>导入将覆盖页面上现有的所有数据，是否继续导入？</p>
              <p>Excel文件：{file.name}</p>
              <p>数据行数：{rows.length}</p>
            </div>
          ),
          onOk: doImport
        });
      } else {
        // 没有数据，直接导入
        doImport();
      }
    } catch (error: any) {
      console.error('Excel导入详细错误:', error);
      console.error('错误堆栈:', error.stack);
      
      let errorMessage = '文件解析失败';
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!ucmChangeDate) {
      message.warning('请先选择UCM变更日期');
      return;
    }
    
    if (tableData.length === 0) {
      message.warning('请先添加需求数据');
      return;
    }
    
    if (!isAllValid) {
      message.warning('请先确保所有数据校验通过');
      return;
    }
    
    setSubmitting(true);
    try {
      // 检查重复
      const checkResponse = await api.post('/requirements/check_duplicates/', {
        ucm_change_date: ucmChangeDate.format('YYYY-MM-DD'),
        requirements: tableData.map(row => row.data)
      });
      
      if (checkResponse.data.has_duplicates) {
        Modal.confirm({
          title: '发现重复数据',
          icon: <ExclamationCircleOutlined />,
          content: (
            <div>
              <p>以下数据与待处理需求重复：</p>
              {checkResponse.data.duplicates.map((dup: any, index: number) => (
                <p key={index}>名称：{dup.name}，IP：{dup.ip}</p>
              ))}
              <p>是否继续提交不重复的 {tableData.length - checkResponse.data.duplicates.length} 条记录？</p>
            </div>
          ),
          onOk: async () => {
            await submitRequirements();
          }
        });
      } else {
        await submitRequirements();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
      setSubmitting(false);
    }
  };
  
  const submitRequirements = async () => {
    try {
      const response = await api.post('/requirements/batch_submit/', {
        requirement_type: activeTab,
        ucm_change_date: ucmChangeDate.format('YYYY-MM-DD'),
        requirements: tableData.map(row => row.data)
      });
      
      Modal.success({
        title: '登记成功',
        content: `已成功登记 ${response.data.submitted_count} 条需求`,
        onOk: () => {
          // 跳转到需求列表页面，传递刚登记的需求ID用于高亮显示
          navigate('/requirements/list', {
            state: {
              highlightIds: response.data.submitted_ids || [],
              filters: {
                status: 'pending',
                submitter: user?.username
              }
            }
          });
        }
      });
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
      setSubmitting(false);
    }
  };
  
  // 渲染可编辑单元格
  const renderEditableCell = useCallback((row: RequirementRow, columnName: string) => {
    const value = row.data[columnName] || '';
    const hasError = row.validation.errors[columnName];
    const hasWarning = row.validation.warnings[columnName];

    // 使用动态可选值
    const dynamicOptions = getDynamicColumnOptions(columnName, row.data);
    const hasOptions = dynamicOptions.length > 0;

    return (
      <EditableCell
        key={`${row.id}-${columnName}`}
        value={value}
        onChange={(newValue) => handleCellChange(row.id, columnName, newValue)}
        placeholder={templateColumns.find(c => c.name === columnName)?.example}
        hasOptions={hasOptions}
        options={dynamicOptions}
        hasError={!!hasError}
        hasWarning={!!hasWarning}
        errorMessage={hasError || hasWarning}
      />
    );
  }, [handleCellChange, templateColumns, columnOptions, vendorVersionData]);
  
  // 构建表格列
  const tableColumns = useMemo(() => {
    console.log('tableColumns - currentPage:', currentPage, 'pageSize:', pageSize);
    const columns = [
      {
        title: '序号',
        width: 60,
        fixed: 'left' as const,
        render: (_: any, __: any, index: number) => {
          const seqNum = (currentPage - 1) * pageSize + index + 1;
          console.log('序号计算 - currentPage:', currentPage, 'pageSize:', pageSize, 'index:', index, '结果:', seqNum);
          return <span>{seqNum}</span>;
        },
      },
      {
        title: '校验',
        width: 60,
        fixed: 'left' as const,
        render: (_: any, row: RequirementRow) => (
          row.validation.isValid ? (
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
          ) : (
            <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
          )
        ),
      },
      {
        title: '操作',
        width: 100,
        fixed: 'left' as const,
        render: (_: any, row: RequirementRow) => (
          <Space size="small">
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyRow(row.id)}
            />
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteRow(row.id)}
            />
          </Space>
        ),
      },
      {
        title: '类型',
        width: 80,
        fixed: 'left' as const,
        render: () => {
          const typeMap = {
            import: { text: '导入', color: 'blue' },
            delete: { text: '删除', color: 'red' },
            modify: { text: '修改', color: 'orange' }
          };
          const typeConfig = typeMap[activeTab];
          return <Tag color={typeConfig.color}>{typeConfig.text}</Tag>;
        },
      },
    ];
    
    // 添加模板列
    const templateCols = Array.isArray(templateColumns) ? templateColumns : [];

    templateCols.forEach(col => {
      const columnConfig: any = {
        title: (
          <span>
            {col.name}
            {col.required && <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>}
          </span>
        ),
        dataIndex: col.name,
        width: 150,
        render: (_: any, row: RequirementRow) => renderEditableCell(row, col.name),
      };

      // 固定名称列在左侧
      if (col.name === '名称') {
        columnConfig.fixed = 'left';
        columnConfig.width = 200;
      }

      columns.push(columnConfig);
    });
    
    return columns;
  }, [templateColumns, handleCopyRow, handleDeleteRow, renderEditableCell, currentPage, pageSize]);
  
  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>需求登记</h1>
      
      <Card>
        {/* 顶部控制栏 */}
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <span>UCM变更日期：</span>
            <DatePicker
              placeholder="选择UCM变更日期"
              value={ucmChangeDate}
              onChange={(date) => setUcmChangeDate(date)}
              disabledDate={(current) => {
                return !availableDates.includes(current.format('YYYY-MM-DD'));
              }}
            />
            {ucmChangeDate && deadlines[ucmChangeDate.format('YYYY-MM-DD')] && (
              <Tag color="blue">{deadlines[ucmChangeDate.format('YYYY-MM-DD')]}</Tag>
            )}
          </Space>
        </div>
        
        {/* 选项卡 */}
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            { key: 'import', label: '导入' },
            { key: 'modify', label: '修改' },
            { key: 'delete', label: '删除' },
          ]}
        />
        
        {/* 操作按钮 */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', flexWrap: 'nowrap' }}>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            导入需求
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddRow}
            style={{ marginLeft: 8 }}
          >
            新增行
          </Button>
          <span style={{ borderLeft: '1px solid #d9d9d9', height: '24px', margin: '0 8px' }}></span>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
          >
            下载模板
          </Button>
          <Space size={8}>
            <Tooltip
              title={tableData.length === 0 ? '请先添加数据' : (isAllValid ? '校验已通过（所有数据校验成功）' : '点击校验数据')}
            >
              <Button
                icon={<CheckCircleOutlined />}
                onClick={handleValidateAll}
                loading={loading}
                disabled={tableData.length === 0}
                style={{
                  backgroundColor: tableData.length === 0 ? '#d9d9d9' : (isAllValid ? '#52c41a' : '#1890ff'),
                  borderColor: tableData.length === 0 ? '#d9d9d9' : (isAllValid ? '#52c41a' : '#1890ff'),
                  color: 'white',
                  marginLeft: 8
                }}
              >
                校验
              </Button>
            </Tooltip>
            <Tag color={tableData.length === 0 ? 'default' : (isAllValid ? 'green' : 'blue')}>
              {tableData.length === 0 ? '无数据' : (isAllValid ? '已通过' : '可校验')}
            </Tag>
          </Space>
          <Space size={8}>
            <Tooltip title={!isAllValid || !ucmChangeDate || tableData.length === 0 ? '校验通过后，才可登记需求' : '可以提交登记'}>
              <Button
                onClick={handleSubmit}
                loading={submitting}
                disabled={!isAllValid || !ucmChangeDate || tableData.length === 0}
                style={{
                  backgroundColor: (!isAllValid || !ucmChangeDate || tableData.length === 0) ? '#d9d9d9' : '#52c41a',
                  borderColor: (!isAllValid || !ucmChangeDate || tableData.length === 0) ? '#d9d9d9' : '#52c41a',
                  color: 'white'
                }}
              >
                登记需求
              </Button>
            </Tooltip>
            <Tag color={isAllValid && ucmChangeDate && tableData.length > 0 ? 'green' : 'default'}>
              {isAllValid && ucmChangeDate && tableData.length > 0 ? '可提交' : '需先校验'}
            </Tag>
          </Space>
        </div>
        
        {/* 数据表格 */}
        <Table
          columns={tableColumns}
          dataSource={tableData}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            pageSizeOptions: ['10', '20', '50', '100'],
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 行`,
            showQuickJumper: true,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            onShowSizeChange: (current, size) => {
              setCurrentPage(1);
              setPageSize(size);
            },
          }}
          size="small"
        />
        
        {/* 提示信息 */}
        <div style={{ marginTop: 16, color: '#999', fontSize: '12px' }}>
          如果选项没有您期望的数据，请联系wl5添加
        </div>
      </Card>
      
      {/* 导入Excel弹框 */}
      <Modal
        title="导入需求"
        open={uploadModalVisible}
        onOk={handleImportExcel}
        onCancel={() => {
          setUploadModalVisible(false);
          setFileList([]);
        }}
        confirmLoading={loading}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".xls,.xlsx"
          onChange={handleFileSelect}
        />
        {fileList.length > 0 ? (
          <div>
            <p>已选择文件：{fileList[0].name}</p>
            <p>文件大小：{(fileList[0].originFileObj.size / 1024).toFixed(2)} KB</p>
          </div>
        ) : (
          <p>请点击下方按钮选择文件</p>
        )}
        <Button
          type="primary"
          onClick={handleImportClick}
          style={{ marginTop: 16 }}
        >
          选择文件
        </Button>
        <p style={{ marginTop: 8, color: '#999' }}>
          支持 .xls 和 .xlsx 格式，文件大小不超过10MB，最多500行数据
        </p>
      </Modal>
    </div>
  );
}