import openpyxl

# Create test Excel file with valid data
wb = openpyxl.Workbook()
ws = wb.active
ws.append(['名称', 'IP', '部门', '用途'])
ws.append(['测试服务器1', '192.168.1.1', '技术部', '测试环境'])
ws.append(['测试服务器2', '192.168.1.2', '产品部', '开发环境'])
wb.save('D:\\dev\\ucm2\\test_import_valid.xls')
print('Test file created: test_import_valid.xls')