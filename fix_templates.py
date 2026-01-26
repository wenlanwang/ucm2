#!/usr/bin/env python
"""修复模板配置中的列名"""

import sqlite3
import json

conn = sqlite3.connect('d:/database/mydb_ucm.db')
cursor = conn.cursor()

# 更新modify模板
cursor.execute("SELECT column_definitions FROM ucm_app_templateconfig WHERE template_type='modify'")
row = cursor.fetchone()
if row:
    columns = json.loads(row[0])
    # 将'设备名称'改为'名称'
    if '设备名称' in columns:
        idx = columns.index('设备名称')
        columns[idx] = '名称'
        cursor.execute("UPDATE ucm_app_templateconfig SET column_definitions=? WHERE template_type='modify'", 
                      [json.dumps(columns, ensure_ascii=False)])
        print('✓ 已更新modify模板')

# 更新delete模板
cursor.execute("SELECT column_definitions FROM ucm_app_templateconfig WHERE template_type='delete'")
row = cursor.fetchone()
if row:
    columns = json.loads(row[0])
    # 将'设备名称'改为'名称'
    if '设备名称' in columns:
        idx = columns.index('设备名称')
        columns[idx] = '名称'
        cursor.execute("UPDATE ucm_app_templateconfig SET column_definitions=? WHERE template_type='delete'", 
                      [json.dumps(columns, ensure_ascii=False)])
        print('✓ 已更新delete模板')

# 验证更新
cursor.execute("SELECT template_type, column_definitions FROM ucm_app_templateconfig")
templates = cursor.fetchall()
print('\n更新后的模板配置:')
for template in templates:
    template_type = template[0]
    columns = json.loads(template[1])
    print(f"  {template_type}: {columns}")

conn.commit()
conn.close()
print('\n模板配置更新完成')
