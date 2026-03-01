"""
Mock SSO 认证实现
用于测试环境，调用 create 项目的 mock-sso 接口
"""
from typing import Optional, List
from .base import AuthInterface, UserInfo
from .sso_client import SSOClient
import logging

logger = logging.getLogger(__name__)


class MockAuth(AuthInterface):
    """Mock SSO 认证（测试环境）"""
    
    def __init__(self, mock_base_url: str, admin_users: List[str] = None):
        """
        初始化 Mock 认证
        
        Args:
            mock_base_url: Mock SSO 服务地址 (如 http://localhost:8000/mock-sso)
            admin_users: 管理员用户 ID 列表
        """
        self.client = SSOClient(mock_base_url)
        self.admin_users = admin_users or []
        logger.info(f"MockAuth 初始化，base_url: {mock_base_url}")
    
    def get_login_url(self, callback_url: str) -> str:
        """获取 Mock SSO 登录页面 URL"""
        url = self.client.get_login_url(callback_url)
        logger.info(f"Mock 登录 URL: {url}")
        return url
    
    def verify_session(self, session_id: str) -> Optional[UserInfo]:
        """验证 session_id 并获取用户信息"""
        logger.info(f"Mock 验证 session_id: {session_id}")
        data = self.client.check_session(session_id)
        
        if data:
            logger.info(f"Mock 验证成功: {data}")
            return UserInfo.from_sso_response(data, self.admin_users)
        
        logger.warning(f"Mock 验证失败: session_id={session_id}")
        return None
    
    def logout(self, session_id: str) -> bool:
        """Mock SSO 登出"""
        result = self.client.logout(session_id)
        logger.info(f"Mock 登出: session_id={session_id}, result={result}")
        return result
    
    def get_mode(self) -> str:
        """获取认证模式"""
        return 'mock'
