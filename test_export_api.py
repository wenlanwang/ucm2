import os
import django
import json
import io
import zipfile

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
django.setup()

from ucm_app.models import UCMRequirement, TemplateConfig
from ucm_app.views import UCMRequirementViewSet

try:
    # 查询数据
    requirements = UCMRequirement.objects.filter(ucm_change_date='2026-01-31')
    print(f"查询到 {requirements.count()} 条需求数据")

    # 创建视图实例
    viewset = UCMRequirementViewSet()

    # 测试分组
    grouped_data = viewset._group_by_type_and_location(requirements)
    print(f"分组数据: {json.dumps(grouped_data, ensure_ascii=False, indent=2)}")

    # 测试地点识别
    for req in requirements[:3]:
        req_data = json.loads(req.requirement_data) if req.requirement_data else {}
        location = viewset._get_location(req_data, req.requirement_type)
        print(f"需求 {req.device_name} (类型: {req.requirement_type}) -> 地点: {location}")

    # 测试生成变更方案
    print("\n开始生成变更方案...")
    change_files = viewset._generate_change_plans(grouped_data, '2026-01-31')
    print(f"生成了 {len(change_files)} 个变更方案文件")
    for f in change_files:
        print(f"  - {f['filename']} ({len(f['data'])} bytes)")

    print("\n导出测试成功！")

except Exception as e:
    import traceback
    print(f"错误: {str(e)}")
    print(f"详细错误:\n{traceback.format_exc()}")