import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
django.setup()

from ucm_app.models import UCMRequirement

# 查询数据
reqs = UCMRequirement.objects.filter(ucm_change_date='2026-01-31')
print(f'Found {reqs.count()} requirements')

for req in reqs[:5]:
    print(f'ID: {req.id}, Type: {req.requirement_type}, Name: {req.device_name}')
    # 打印部分数据
    if req.requirement_data:
        print(f'  Data length: {len(req.requirement_data)} bytes')