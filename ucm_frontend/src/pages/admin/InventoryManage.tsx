import { useState, useEffect } from 'react';
import { Card, Table, message, Upload, Alert } from 'antd';
import { InboxOutlined, DatabaseOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import api from '../../services/api';

const { Dragger } = Upload;

interface Device {
  id: number;
  device_name: string;
  device_type: string;
  manufacturer: string;
  version: string;
  ip: string;
  group: string;
  import_time: string;
}

export default function InventoryManage() {
  const [data, setData] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/devices/');
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

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xls',
    beforeUpload: (file) => {
      const isXls = file.name.endsWith('.xls');
      if (!isXls) {
        message.error('只能上传 .xls 格式的文件!');
        return false;
      }
      return false;
    },
    onChange: async (info) => {
      const file = info.file;
      if (!file) return;

      setUploading(true);
      setUploadResult(null);

      const formData = new FormData();
      formData.append('file', file as any);

      try {
        const response = await api.post('/devices/upload_inventory/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setUploadResult(response.data);
        if (response.data.success) {
          message.success(response.data.message);
          loadData();
        }
      } catch (error: any) {
        message.error(error.response?.data?.error || '上传失败');
      } finally {
        setUploading(false);
      }
    },
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'device_name',
      width: 150,
    },
    {
      title: '设备类型',
      dataIndex: 'device_type',
      width: 100,
    },
    {
      title: '厂商',
      dataIndex: 'manufacturer',
      width: 100,
    },
    {
      title: '版本',
      dataIndex: 'version',
      width: 120,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      width: 120,
    },
    {
      title: '分组',
      dataIndex: 'group',
      width: 100,
    },
    {
      title: '导入时间',
      dataIndex: 'import_time',
      width: 150,
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>设备清单管理</h1>
      
      <Card
        title="上传设备清单"
        style={{ marginBottom: 24 }}
      >
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽Excel文件到此处上传</p>
          <p className="ant-upload-hint">
            支持 .xls 格式，名称+IP相同的记录将覆盖原有数据
          </p>
        </Dragger>

        {uploadResult && (
          <Alert
            message={
              <div style={{ marginTop: 16 }}>
                <div>上传结果：{uploadResult.message}</div>
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div>错误记录：</div>
                    <ul>
                      {uploadResult.errors.map((error: any, idx: number) => (
                        <li key={idx}>第 {error.row} 行: {error.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            }
            type={uploadResult.success ? 'success' : 'error'}
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      <Card
        title={<span><DatabaseOutlined /> 设备清单 ({data.length}台)</span>}
      >
        <Table
          columns={columns}
          dataSource={data}
          loading={loading || uploading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 台设备`,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}
