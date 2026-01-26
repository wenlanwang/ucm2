#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from ucm_app.views import TemplateConfigViewSet

# 创建请求工厂
factory = APIRequestFactory()

# 创建GET请求
request = factory.get('/api/templates/')

# 创建ViewSet实例
viewset = TemplateConfigViewSet()
viewset.request = request
viewset.format_kwarg = None

try:
    response = viewset.list(request)
    print(f"Status Code: {response.status_code}")
    print(f"Response Data (first template):")
    if response.data and len(response.data) > 0:
        import json
        print(json.dumps(response.data[0], indent=2, ensure_ascii=False))
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()