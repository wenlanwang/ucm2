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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAllValid, setIsAllValid] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const nextRowId = useRef(0);
  
  // 加载可用UCM日期
  useEffect(() => {
    loadAvailableDates();
  }, []);
  
  // 加载模板配置和列可选值
  useEffect(() => {
    if (activeTab) {
      loadTemplateConfig();
      loadColumnOptions();
    }
  }, [activeTab]);
  
  // 检查所有行是否校验通过
  useEffect(() => {
    const allValid = tableData.every(row => row.validation.isValid);
    setIsAllValid(allValid && tableData.length > 0);
  }, [tableData]);
  
  const loadAvailableDates = async () => {
    try {
      const response = await api.get('/requirements/available_dates/');
      setAvailableDates(response.data.dates);
      setDeadlines(response.data.deadlines);
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
  
  const handleTabChange = (key: string) => {
    setActiveTab(key as 'import' | 'modify' | 'delete');
    setTableData([]);
    setUcmChangeDate(null);
  };
  
  const handleAddRow = useCallback(() => {
    // 初始化所有列为空字符串
    const rowData: Record<string, string> = {};
    templateColumns.forEach(col => {
      rowData[col.name] = '';
    });
    
    const newRow: RequirementRow = {
      id: nextRowId.current++,
      data: rowData,
      validation: {
        isValid: false,
        errors: {},
        warnings: {}
      }
    };
    setTableData([...tableData, newRow]);
  }, [templateColumns]);
  
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
    setTableData(prevData => {
      return prevData.map(row => {
        if (row.id === rowId) {
          const newData = { ...row.data, [columnName]: value };
          const validation = validateRow(newData);
          return { ...row, data: newData, validation };
        }
        return row;
      });
    });
  }, []);
  
  const validateRow = (rowData: Record<string, string>): ValidationResult => {
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
    
    return {
      is_valid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  };
  
  const handleValidateAll = async () => {
    if (!ucmChangeDate) {
      message.warning('请先选择UCM变更日期');
      return;
    }
    
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
      
      // 确认导入
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
        onOk: async () => {
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
          
          setTableData(newRows);
          setFileList([]);
          setUploadModalVisible(false);
          message.success(`成功导入 ${rows.length} 条数据`);
        }
      });
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
    const hasOptions = columnOptions[columnName] && columnOptions[columnName].length > 0;
    
    return (
      <EditableCell
        key={`${row.id}-${columnName}`}
        value={value}
        onChange={(newValue) => handleCellChange(row.id, columnName, newValue)}
        placeholder={templateColumns.find(c => c.name === columnName)?.example}
        hasOptions={hasOptions}
        options={hasOptions ? columnOptions[columnName] : []}
        hasError={!!hasError}
        hasWarning={!!hasWarning}
        errorMessage={hasError || hasWarning}
      />
    );
  }, [handleCellChange, templateColumns, columnOptions]);
  
  // 构建表格列
  const tableColumns = useMemo(() => {
    const columns = [
      {
        title: '校验',
        width: 60,
        fixed: 'right' as const,
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
        fixed: 'right' as const,
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
    ];
    
    // 添加模板列
    const templateCols = Array.isArray(templateColumns) ? templateColumns : [];
    
    templateCols.forEach(col => {
      columns.push({
        title: (
          <span>
            {col.name}
            {col.required && <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>}
          </span>
        ),
        dataIndex: col.name,
        width: 150,
        render: (_: any, row: RequirementRow) => renderEditableCell(row, col.name),
      });
    });
    
    return columns;
  }, [templateColumns, handleCopyRow, handleDeleteRow, renderEditableCell]);
  
  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>需求登记</h1>
      
      <Card>
        {/* 顶部控制栏 */}
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
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
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
            >
              下载模板
            </Button>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={handleValidateAll}
              loading={loading}
            >
              校验
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!isAllValid || !ucmChangeDate || tableData.length === 0}
            >
              登记需求
            </Button>
          </Space>
        </div>
        
        {/* 数据操作按钮 */}
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Button
              icon={<PlusOutlined />}
              onClick={handleAddRow}
            >
              新增行
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              导入需求
            </Button>
          </Space>
        </div>
        
        {/* 数据表格 */}
        <Table
          columns={tableColumns}
          dataSource={tableData}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={false}
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
        <Dragger
          fileList={fileList}
          onChange={handleUploadChange}
          beforeUpload={() => false}
          accept=".xls,.xlsx"
          maxCount={1}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">支持 .xls 和 .xlsx 格式，文件大小不超过10MB，最多500行数据</p>
        </Dragger>
      </Modal>
    </div>
  );
}