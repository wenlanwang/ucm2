import os
import sys
import django
import json

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from ucm_app.models import TemplateConfig

# 等待通知字段定义
# 通用等待通知字段（用于新增、修改、删除类型）
wait_notification_columns = [
    {"name": "等待通知", "required": False, "example": ""},
    {"name": "等待说明", "required": False, "example": ""},
]

# 删除后新增专用字段
delete_then_add_wait_columns = [
    {"name": "删除等待通知", "required": False, "example": ""},
    {"name": "删除等待说明", "required": False, "example": ""},
    {"name": "新增等待通知", "required": False, "example": ""},
    {"name": "新增等待说明", "required": False, "example": ""},
]

def update_template(template_type, additional_columns):
    """更新模板配置，将等待通知字段放在最前面"""
    try:
        template = TemplateConfig.objects.get(template_type=template_type)
        existing_columns = template.get_column_definitions()
        
        # 创建字段名到新配置的映射
        additional_map = {col['name']: col for col in additional_columns}
        additional_names = set(additional_map.keys())
        existing_names = [col['name'] for col in existing_columns]
        
        # 过滤掉旧的等待通知字段，保留其他字段
        other_columns = [col for col in existing_columns if col['name'] not in additional_names]
        
        # 将等待通知字段放在最前面
        updated_columns = additional_columns + other_columns
        
        # 统计变化
        added_count = len([name for name in additional_names if name not in existing_names])
        moved_count = len([name for name in additional_names if name in existing_names])
        
        if added_count > 0 or moved_count > 0:
            template.column_definitions = json.dumps(updated_columns, ensure_ascii=False)
            template.save()
            if added_count > 0:
                print(f"更新模板 [{template.get_template_type_display()}]: 添加 {added_count} 列，等待通知字段已置于最前")
            else:
                print(f"更新模板 [{template.get_template_type_display()}]: 等待通知字段已移至最前")
        else:
            print(f"模板 [{template.get_template_type_display()}]: 无需更新")
        
        return template
    except TemplateConfig.DoesNotExist:
        print(f"警告: 模板 [{template_type}] 不存在，跳过")
        return None


# 获取导入模板作为基础
try:
    import_template = TemplateConfig.objects.get(template_type='import')
    import_columns = import_template.get_column_definitions()
    print(f"使用现有导入模板: {len(import_columns)} 列")
except TemplateConfig.DoesNotExist:
    print("错误: 导入模板不存在，请先在模板管理中配置导入模板")
    sys.exit(1)

# 1. 更新导入模板（新增类型）
update_template('import', wait_notification_columns)

# 2. 更新修改模板
update_template('modify', wait_notification_columns)

# 3. 更新删除模板
update_template('delete', wait_notification_columns)

# 4. 更新或创建删除后新增模板 - 等待通知字段放在最前面
delete_then_add_columns = delete_then_add_wait_columns + import_columns

template, created = TemplateConfig.objects.update_or_create(
    template_type='delete_then_add',
    defaults={
        'column_definitions': json.dumps(delete_then_add_columns, ensure_ascii=False)
    }
)

if created:
    print(f"创建模板: {template.get_template_type_display()}")
else:
    print(f"更新模板: {template.get_template_type_display()}")

print("\n模板初始化完成！")
print("\n各类型模板等待通知字段说明：")
print("  - 新增(import): 等待通知、等待说明 (2列)")
print("  - 修改(modify): 等待通知、等待说明 (2列)")
print("  - 删除(delete): 等待通知、等待说明 (2列)")
print("  - 删除后新增(delete_then_add): 删除等待通知、删除等待说明、新增等待通知、新增等待说明 (4列)")
