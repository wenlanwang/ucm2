import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
django.setup()

from django.contrib.auth.models import User

# 设置 admin 用户密码
try:
    admin = User.objects.get(username='admin')
    admin.set_password('admin123')
    admin.save()
    print("用户 admin 密码设置成功！")
except User.DoesNotExist:
    print("用户 admin 不存在")

# 设置 SSO 用户 000735977 的密码
try:
    user = User.objects.get(username='000735977')
    user.set_password('123456')
    user.save()
    print("用户 000735977 密码设置成功！")
except User.DoesNotExist:
    print("用户 000735977 不存在")
