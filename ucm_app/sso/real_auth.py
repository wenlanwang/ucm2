"""
生产环境 SSO 认证实现
"""
from typing import Optional, List
from .base import AuthInterface, UserInfo
from .sso_client import SSOClient
import logging

logger = logging.getLogger(__name__)


class RealAuth(AuthInterface):
    """生产环境 SSO 认证"""
    
    def __init__(self, base_url: str, admin_users: List[str] = None):
        """
        初始化生产认证
        
        Args:
            base_url: SSO 服务器地址 (如 https://sso.netm.icbc)
            admin_users: 管理员用户 ID 列表
        """
        self.client = SSOClient(base_url)
        self.admin_users = admin_users or []
    
    def get_login_url(self, callback_url: str) -> str:
        """获取 SSO 登录页面 URL"""
        return self.client.get_login_url(callback_url)
    
    def verify_session(self, session_id: str) -> Optional[UserInfo]:
        """验证 session_id 并获取用户信息"""
        data = self.client.check_session(session_id)
        
        if data:
            return UserInfo.from_sso_response(data, self.admin_users)
        return None
    
    def logout(self, session_id: str) -> bool:
        """SSO 登出"""
        return self.client.logout(session_id)
    
    def get_mode(self) -> str:
        """获取认证模式"""
        return 'production'
