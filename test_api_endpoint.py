#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
django.setup()

from django.test import RequestFactory
from ucm_app.views import UCMRequirementViewSet

# 创建请求工厂
factory = RequestFactory()

# 创建GET请求
request = factory.get('/api/requirements/available_dates/')

# 创建ViewSet实例
viewset = UCMRequirementViewSet()
viewset.request = request
viewset.format_kwarg = None

try:
    response = viewset.available_dates(request)
    print(f"Status Code: {response.status_code}")
    print(f"Response Data: {response.data}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()