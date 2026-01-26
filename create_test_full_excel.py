import openpyxl

# Create test Excel file with all required columns matching the template
wb = openpyxl.Workbook()
ws = wb.active

# Headers based on the template (27 columns)
headers = [
    '名称', '设备类型', '厂商', '版本', '型号', 'IP', '其他IP',
    '认证方式', '认证服务器', '密钥', 'Console Server', '功能类别',
    '部署位置', '操作用户', 'enable密码', '连接协议', '连接端口', '连接超时',
    'authorized-table', 'class', 'level', 'privilege', 'role', 'shell',
    'service-type', '所属组', '访问URL'
]
ws.append(headers)

# Test data row 1 - valid data
ws.append([
    '测试交换机1', '交换机', '华为', 'V200R021', 'S5735-L48T4S-A',
    '192.168.1.100', '192.168.1.101', 'AAA认证', '192.168.1.1',
    'testkey123', '192.168.1.1', '核心设备', '机房A',
    'admin', 'Enable123!', 'SSH', '22', '30',
    '', '', '', '', '', '', '', '', ''
])

# Test data row 2 - valid data
ws.append([
    '测试交换机2', '交换机', '华三', 'V7.1.075', 'S5130S-28P-EI',
    '192.168.1.200', '192.168.1.201', 'Radius认证', '192.168.1.2',
    'testkey456', '192.168.1.2', '接入设备', '机房B',
    'admin', 'Enable456!', 'SSH', '22', '30',
    '', '', '', '', '', '', '', '', ''
])

wb.save('D:\\dev\\ucm2\\test_import_full.xls')
print('Test file created: test_import_full.xls')
print('Columns:', len(headers))
print('Rows:', ws.max_row)