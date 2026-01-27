import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
django.setup()

from ucm_app.models import TemplateConfig, UCMRequirement
import json

# 获取模板配置
t = TemplateConfig.objects.get(template_type='import')
template_cols = set(col['name'] for col in t.get_column_definitions())

# 获取数据库中实际使用的列名
db_cols = set()
for r in UCMRequirement.objects.all()[:100]:
    data = json.loads(r.requirement_data)
    db_cols.update(data.keys())

print('=' * 60)
print('模板配置列数:', len(template_cols))
print('数据库列数:', len(db_cols))
print('=' * 60)
print('\n模板中的列（不在数据库中）:')
for col in sorted(template_cols - db_cols):
    print(f'  - {col}')

print('\n数据库中的列（不在模板中）:')
for col in sorted(db_cols - template_cols):
    print(f'  - {col}')

print('\n' + '=' * 60)
print('推荐的统一列名（使用数据库中实际存在的列）:')
print('=' * 60)
recommended_cols = sorted(db_cols)
for i, col in enumerate(recommended_cols, 1):
    print(f'{i:2d}. {col}')

print('\n' + '=' * 60)
print('生成新的模板配置:')
print('=' * 60)
new_columns = []
for col in recommended_cols:
    # 判断是否为必填项（这里简单判断，你可以根据需要调整）
    required = col in ['名称', '设备类型', '厂商', '版本', 'IP', '认证方式', '部署地点']
    new_columns.append({
        'name': col,
        'required': required,
        'example': ''
    })

print(json.dumps(new_columns, indent=2, ensure_ascii=False))

print('\n' + '=' * 60)
print('更新模板配置到数据库...')
print('=' * 60)
t.set_column_definitions(new_columns)
t.save()
print('✓ 模板配置已更新！')