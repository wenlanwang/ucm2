import os
import sys
import django
import json
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth.models import User
from ucm_app.models import ManufacturerVersionInfo, ColumnOptions, TemplateConfig

print("开始初始化示例数据...")

# 1. 创建普通用户
try:
    user, created = User.objects.get_or_create(
        username='user1',
        defaults={
            'email': 'user1@example.com',
            'is_staff': False,
            'is_active': True
        }
    )
    if created:
        user.set_password('user123')
        user.save()
        print("创建普通用户: user1/user123")
    else:
        print("用户user1已存在")
except Exception as e:
    print(f"创建用户失败: {e}")

# 2. 初始化厂商版本信息
manufacturer_data = [
    # 路由器
    {'device_type': '路由器', 'manufacturer': '华为', 'version': 'VRP8.0', 'login_method': 'SSH'},
    {'device_type': '路由器', 'manufacturer': '华为', 'version': 'VRP8.1', 'login_method': 'SSH'},
    {'device_type': '路由器', 'manufacturer': '思科', 'version': 'IOS15.6', 'login_method': 'Telnet'},
    {'device_type': '路由器', 'manufacturer': '思科', 'version': 'IOS15.7', 'login_method': 'Telnet'},
    {'device_type': '路由器', 'manufacturer': '华三', 'version': 'Comware7.1', 'login_method': 'SSH'},
    
    # 交换机
    {'device_type': '交换机', 'manufacturer': '华为', 'version': 'VRP8.0', 'login_method': 'SSH'},
    {'device_type': '交换机', 'manufacturer': '华为', 'version': 'VRP8.1', 'login_method': 'SSH'},
    {'device_type': '交换机', 'manufacturer': '思科', 'version': 'IOS15.6', 'login_method': 'Telnet'},
    {'device_type': '交换机', 'manufacturer': '华三', 'version': 'Comware7.1', 'login_method': 'SSH'},
    
    # 防火墙
    {'device_type': '防火墙', 'manufacturer': '华为', 'version': 'V500R001', 'login_method': 'SSH'},
    {'device_type': '防火墙', 'manufacturer': '深信服', 'version': 'AF8.0', 'login_method': 'HTTPS'},
]

for data in manufacturer_data:
    try:
        obj, created = ManufacturerVersionInfo.objects.get_or_create(
            device_type=data['device_type'],
            manufacturer=data['manufacturer'],
            version=data['version'],
            login_method=data['login_method']
        )
        if created:
            print(f"添加厂商版本: {data['device_type']}-{data['manufacturer']}-{data['version']}")
    except Exception as e:
        print(f"添加厂商版本失败: {e}")

# 3. 初始化列可选值
column_options_data = {
    '部署地点': ['外高桥网络设备', '嘉定网络设备', '浦东网络设备', '徐汇网络设备'],
    '认证方式': ['OATH认证', 'TSSS认证', 'RADIUS认证', '本地认证'],
    '分组': ['核心层', '汇聚层', '接入层', '边界层'],
    '操作类型': ['完全删除', '逻辑删除', '禁用'],
}

for column_name, options in column_options_data.items():
    for option_value in options:
        try:
            obj, created = ColumnOptions.objects.get_or_create(
                column_name=column_name,
                option_value=option_value
            )
            if created:
                print(f"添加列可选值: {column_name} - {option_value}")
        except Exception as e:
            print(f"添加列可选值失败: {e}")

# 4. 初始化模板配置（如果还没有数据）
templates = {
    'import': ['名称', '设备类型', '品牌(厂商)', '版本', 'IP', '其他IP', '安装位置', '分组', '认证方式'],
    'modify': ['名称', '设备类型', '品牌(厂商)', '版本', 'IP', '其他IP', '安装位置', '现有分组', '新分组', '认证方式'],
    'delete': ['名称', '操作类型', 'IP', '备注信息']
}

for template_type, columns in templates.items():
    try:
        template, created = TemplateConfig.objects.get_or_create(
            template_type=template_type,
            defaults={
                'column_definitions': json.dumps(columns, ensure_ascii=False)
            }
        )
        if created:
            print(f"创建模板: {template.get_template_type_display()}")
    except Exception as e:
        print(f"创建模板失败: {e}")

print("示例数据初始化完成！")
