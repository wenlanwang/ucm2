import os
import sys
import django
import json

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from ucm_app.models import TemplateConfig

# 初始化模板配置
templates = {
    'import': ['名称', '设备类型', '厂商', '版本', 'IP', '其他IP', '安装位置', '分组', '认证方式'],
    'modify': ['名称', '设备类型', '厂商', '版本', 'IP', '其他IP', '安装位置', '现有分组', '新分组', '认证方式'],
    'delete': ['名称', '操作类型', 'IP', '备注信息']
}

for template_type, columns in templates.items():
    template, created = TemplateConfig.objects.get_or_create(
        template_type=template_type,
        defaults={
            'column_definitions': json.dumps(columns, ensure_ascii=False)
        }
    )
    
    if created:
        print(f"创建模板: {template.get_template_type_display()}")
    else:
        print(f"模板已存在: {template.get_template_type_display()}")

print("模板初始化完成！")
