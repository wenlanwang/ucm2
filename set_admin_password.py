import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
django.setup()

from django.contrib.auth.models import User

try:
    admin = User.objects.get(username='admin')
    admin.set_password('admin123')
    admin.save()
    print("密码设置成功！")
except User.DoesNotExist:
    print("用户admin不存在")
