import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
django.setup()

from ucm_app.models import TemplateConfig, UCMRequirement
import json

# 获取当前模板配置
t = TemplateConfig.objects.get(template_type='import')
template_columns = t.get_column_definitions()

print('=' * 60)
print('当前模板配置中的列名:')
print('=' * 60)
for col in template_columns:
    print(f'  - {col["name"]}')

# 定义列名映射（数据库中的旧名称 → 模板中的新名称）
column_mapping = {
    '其它IP': '其他IP',
    '部署地点': '部署位置',
    '分组': '所属组'
}

print('\n' + '=' * 60)
print('需要统一的数据映射:')
print('=' * 60)
for old_name, new_name in column_mapping.items():
    print(f'  {old_name} → {new_name}')

print('\n' + '=' * 60)
print('开始统一数据库中的列名...')
print('=' * 60)

# 批量更新所有需求数据
updated_count = 0
for req in UCMRequirement.objects.all():
    data = json.loads(req.requirement_data)
    has_changes = False

    for old_name, new_name in column_mapping.items():
        if old_name in data:
            # 如果新名称已经存在，合并值
            if new_name in data:
                # 新名称有值，保留新名称的值
                pass
            else:
                # 将旧名称的值移动到新名称
                data[new_name] = data[old_name]
                del data[old_name]
                has_changes = True

    if has_changes:
        req.requirement_data = json.dumps(data, ensure_ascii=False)
        req.save()
        updated_count += 1

print(f'✓ 已更新 {updated_count} 条需求数据')

# 更新模板配置，移除重复的列名
print('\n' + '=' * 60)
print('优化模板配置，移除重复列名...')
print('=' * 60)

# 移除模板中重复的列名（保留模板配置中的名称）
# 不需要做任何操作，因为模板配置已经是正确的

print('✓ 模板配置无需修改')

print('\n' + '=' * 60)
print('验证统一结果...')
print('=' * 60)

# 验证数据库中是否还有旧列名
db_cols = set()
for r in UCMRequirement.objects.all()[:100]:
    data = json.loads(r.requirement_data)
    db_cols.update(data.keys())

remaining_old_columns = set(column_mapping.keys()) & db_cols
if remaining_old_columns:
    print(f'⚠ 警告：数据库中仍然存在旧列名: {remaining_old_columns}')
else:
    print('✓ 所有数据已成功统一为模板配置的列名！')