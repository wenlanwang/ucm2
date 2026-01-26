import os
import sys
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from ucm_app.models import ManufacturerVersionInfo, ColumnOptions, TemplateConfig
from django.contrib.auth.models import User

print("=" * 60)
print("UCM系统API测试")
print("=" * 60)

# 测试1: 检查数据库连接
print("\n1. 数据库连接测试...")
try:
    user_count = User.objects.count()
    print(f"   ✓ 数据库连接正常，用户数: {user_count}")
except Exception as e:
    print(f"   ✗ 数据库连接失败: {e}")

# 测试2: 检查厂商版本数据
print("\n2. 厂商版本数据测试...")
try:
    count = ManufacturerVersionInfo.objects.count()
    print(f"   ✓ 厂商版本记录数: {count}")
    if count > 0:
        sample = ManufacturerVersionInfo.objects.first()
        print(f"   示例: {sample.device_type} - {sample.manufacturer} - {sample.version}")
except Exception as e:
    print(f"   ✗ 厂商版本数据查询失败: {e}")

# 测试3: 检查列可选值数据
print("\n3. 列可选值数据测试...")
try:
    count = ColumnOptions.objects.count()
    print(f"   ✓ 列可选值记录数: {count}")
    if count > 0:
        columns = ColumnOptions.objects.values_list('column_name', flat=True).distinct()
        print(f"   已配置的列: {', '.join(columns)}")
except Exception as e:
    print(f"   ✗ 列可选值数据查询失败: {e}")

# 测试4: 检查模板配置
print("\n4. 模板配置测试...")
try:
    count = TemplateConfig.objects.count()
    print(f"   ✓ 模板配置数: {count}")
    for template in TemplateConfig.objects.all():
        columns = template.get_column_definitions()
        print(f"   {template.get_template_type_display()}: {len(columns)}列")
except Exception as e:
    print(f"   ✗ 模板配置查询失败: {e}")

# 测试5: 检查用户
print("\n5. 用户测试...")
try:
    admin = User.objects.get(username='admin')
    print(f"   ✓ 管理员admin存在")
    
    user1 = User.objects.filter(username='user1').first()
    if user1:
        print(f"   ✓ 普通用户user1存在")
    else:
        print(f"   ⚠ 普通用户user1不存在")
except Exception as e:
    print(f"   ✗ 用户查询失败: {e}")

# 测试6: 测试级联查询
print("\n6. 级联查询测试...")
try:
    # 获取所有设备类型
    device_types = ManufacturerVersionInfo.objects.values_list('device_type', flat=True).distinct()
    print(f"   ✓ 设备类型: {', '.join(device_types)}")
    
    # 测试设备类型->厂商
    if device_types:
        dt = device_types[0]
        manufacturers = ManufacturerVersionInfo.objects.filter(
            device_type=dt
        ).values_list('manufacturer', flat=True).distinct()
        print(f"   {dt}的厂商: {', '.join(manufacturers)}")
        
        # 测试厂商->版本
        if manufacturers:
            m = manufacturers[0]
            versions = ManufacturerVersionInfo.objects.filter(
                device_type=dt,
                manufacturer=m
            ).values_list('version', flat=True).distinct()
            print(f"   {dt}-{m}的版本: {', '.join(versions)}")
    
except Exception as e:
    print(f"   ✗ 级联查询失败: {e}")

print("\n" + "=" * 60)
print("测试完成！")
print("=" * 60)