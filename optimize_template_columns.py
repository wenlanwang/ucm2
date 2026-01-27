import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
django.setup()

from ucm_app.models import TemplateConfig, UCMRequirement
import json

# 获取数据库中实际使用的列名
db_cols = set()
for r in UCMRequirement.objects.all()[:100]:
    data = json.loads(r.requirement_data)
    db_cols.update(data.keys())

# 排除不需要显示的字段
exclude_columns = {'rowIndex'}  # Excel导入时自动添加的索引列

# 获取有效的列名
valid_columns = sorted(db_cols - exclude_columns)

print('=' * 60)
print('有效的列名（排除不需要显示的字段）:')
print('=' * 60)
for i, col in enumerate(valid_columns, 1):
    print(f'{i:2d}. {col}')

print('\n' + '=' * 60)
print('生成优化后的模板配置:')
print('=' * 60)

# 优化后的列配置
optimized_columns = []
for col in valid_columns:
    # 判断是否为必填项（根据业务逻辑）
    required = col in [
        '名称', '设备类型', '厂商', '版本', 'IP',
        '认证方式', '部署地点', '操作用户', 'enable密码',
        '连接协议', '连接端口', '连接超时'
    ]
    optimized_columns.append({
        'name': col,
        'required': required,
        'example': ''
    })

print(json.dumps(optimized_columns, indent=2, ensure_ascii=False))

print('\n' + '=' * 60)
print('更新模板配置到数据库...')
print('=' * 60)
t = TemplateConfig.objects.get(template_type='import')
t.set_column_definitions(optimized_columns)
t.save()
print('✓ 模板配置已优化并更新！')