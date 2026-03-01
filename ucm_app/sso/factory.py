"""
SSO 认证工厂
根据配置选择具体的认证实现
"""
from typing import Optional
from django.conf import settings
from .base import AuthInterface, UserInfo
from .real_auth import RealAuth
from .mock_auth import MockAuth
import logging

logger = logging.getLogger(__name__)

# 全局认证后端实例缓存
_auth_backend: Optional[AuthInterface] = None


def get_auth_backend() -> AuthInterface:
    """
    获取认证后端实例（单例模式）
    
    根据配置 SSO_USE_MOCK 选择使用 Mock 或生产认证
    
    Returns:
        AuthInterface 实例
    """
    global _auth_backend
    
    if _auth_backend is not None:
        return _auth_backend
    
    # 获取配置
    use_mock = getattr(settings, 'SSO_USE_MOCK', True)
    admin_users = getattr(settings, 'ADMIN_USERS', [])
    
    if use_mock:
        # Mock 模式：使用 create 项目的 mock-sso 接口
        mock_url = getattr(settings, 'SSO_MOCK_URL', 'http://localhost:8000/mock-sso')
        _auth_backend = MockAuth(mock_url, admin_users)
        logger.info(f"SSO 认证模式: Mock, URL: {mock_url}")
    else:
        # 生产模式：使用生产 SSO
        sso_url = getattr(settings, 'SSO_BASE_URL', 'https://sso.netm.icbc')
        _auth_backend = RealAuth(sso_url, admin_users)
        logger.info(f"SSO 认证模式: Production, URL: {sso_url}")
    
    return _auth_backend


def reset_auth_backend():
    """
    重置认证后端实例
    用于配置变更后重新初始化
    """
    global _auth_backend
    _auth_backend = None
    logger.info("SSO 认证后端已重置")


def get_sso_config() -> dict:
    """
    获取 SSO 配置信息
    用于前端获取当前认证模式
    
    Returns:
        配置信息字典
    """
    use_mock = getattr(settings, 'SSO_USE_MOCK', True)
    
    return {
        'use_mock': use_mock,
        'mode': 'mock' if use_mock else 'production',
        'login_url': '/api/auth/sso/login',
    }
