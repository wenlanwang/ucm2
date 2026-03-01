# SSO 认证模块
from .base import AuthInterface, UserInfo
from .factory import get_auth_backend, get_sso_config
from .sso_client import SSOClient

__all__ = [
    'AuthInterface',
    'UserInfo',
    'get_auth_backend',
    'get_sso_config',
    'SSOClient',
]
