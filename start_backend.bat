@echo off
echo 正在启动Django开发服务器...
echo 访问地址: http://127.0.0.1:8000
echo 管理后台: http://127.0.0.1:8000/admin
echo 用户名: admin
echo 密码: admin123
echo.
python manage.py runserver 0.0.0.0:8000
pause
