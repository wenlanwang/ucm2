from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'manufacturers', views.ManufacturerVersionInfoViewSet)
router.register(r'column-options', views.ColumnOptionsViewSet)
router.register(r'devices', views.UCMDeviceInventoryViewSet)
router.register(r'requirements', views.UCMRequirementViewSet)
router.register(r'templates', views.TemplateConfigViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', views.user_login, name='user_login'),
    path('auth/logout/', views.user_logout, name='user_logout'),
    path('auth/current-user/', views.get_current_user, name='get_current_user'),
    path('ucm-date-config/', views.get_ucm_date_config, name='get_ucm_date_config'),
]
