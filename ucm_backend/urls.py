"""
URL configuration for ucm_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse
from ucm_app import views as ucm_views
import os


def serve_frontend(request):
    """服务前端入口文件（支持 SPA 路由）"""
    index_path = os.path.join(settings.BASE_DIR, 'ucm_frontend', 'dist', 'index.html')
    return FileResponse(open(index_path, 'rb'))


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('ucm_app.urls')),
    # SSO 服务器回调兼容路由（不带 /api/ 前缀）
    path('verify_session', ucm_views.sso_verify_session, name='sso_verify_session_compat'),
]

# 开发模式：托管前端静态文件
if settings.DEBUG:
    # 静态文件路由
    static_path = os.path.join(settings.BASE_DIR, 'ucm_frontend', 'dist')
    urlpatterns += static('assets', document_root=os.path.join(static_path, 'assets'))

    # 前端入口 - 捕获所有非 API、非 admin、非 verify_session 的请求
    urlpatterns += [
        re_path(r'^(?!api/)(?!admin/)(?!verify_session).*$', serve_frontend),
    ]