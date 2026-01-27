import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
django.setup()

from ucm_app.models import TemplateConfig
import json

# 获取当前模板配置
t = TemplateConfig.objects.get(template_type='import')
current_columns = t.get_column_definitions()

print('=' * 60)
print('当前模板配置（含重复列）:')
print('=' * 60)
for col in current_columns:
    print(f'  - {col["name"]}')

# 定义需要移除的重复列名（保留的列名）
keep_columns = {
    '其他IP',  # 保留，移除 '其它IP'
    '部署位置',  # 保留，移除 '部署地点'
    '所属组',  # 保留，移除 '分组'
}

# 过滤列配置，只保留需要的列
cleaned_columns = []
seen_columns = set()

for col in current_columns:
    col_name = col['name']

    # 如果列名在保留列表中，且已经遇到过类似的列，跳过
    if col_name in keep_columns and col_name in seen_columns:
        continue

    # 如果是重复列（例如 '其它IP' 在 keep_columns 中的保留列 '其他IP' 之后出现）
    # 简单的规则：如果遇到 '其它IP'、'部署地点'、'分组'，跳过
    if col_name in ['其它IP', '部署地点', '分组']:
        continue

    cleaned_columns.append(col)
    seen_columns.add(col_name)

print('\n' + '=' * 60)
print('清理后的模板配置:')
print('=' * 60)
for col in cleaned_columns:
    print(f'  - {col["name"]}')

print('\n' + '=' * 60)
print('更新模板配置到数据库...')
print('=' * 60)

t.set_column_definitions(cleaned_columns)
t.save()

print('✓ 模板配置已清理！')

print('\n' + '=' * 60)
print('最终列数统计:')
print('=' * 60)
print(f'  清理前: {len(current_columns)} 列')
print(f'  清理后: {len(cleaned_columns)} 列')
print(f'  移除了: {len(current_columns) - len(cleaned_columns)} 列')