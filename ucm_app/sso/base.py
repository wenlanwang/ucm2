"""
SSO 认证基础模块
定义认证接口和数据结构
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, List


@dataclass
class UserInfo:
    """用户信息数据类"""
    userid: str
    username: str
    rolelist: List[str]
    is_admin: bool = False
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            'userid': self.userid,
            'username': self.username,
            'rolelist': self.rolelist,
            'is_admin': self.is_admin,
        }
    
    @classmethod
    def from_sso_response(cls, data: dict, admin_users: List[str] = None) -> 'UserInfo':
        """从 SSO 响应创建 UserInfo"""
        admin_users = admin_users or []
        return cls(
            userid=data.get('userid', ''),
            username=data.get('username', ''),
            rolelist=data.get('rolelist', []),
            is_admin=data.get('userid', '') in admin_users,
        )


class AuthInterface(ABC):
    """认证接口抽象类"""
    
    @abstractmethod
    def get_login_url(self, callback_url: str) -> str:
        """
        获取 SSO 登录页面 URL
        
        Args:
            callback_url: 登录成功后的回调地址
            
        Returns:
            SSO 登录页面 URL
        """
        pass
    
    @abstractmethod
    def verify_session(self, session_id: str) -> Optional[UserInfo]:
        """
        验证 SSO session_id 并获取用户信息
        
        Args:
            session_id: SSO 返回的 session_id
            
        Returns:
            验证成功返回 UserInfo，失败返回 None
        """
        pass
    
    @abstractmethod
    def logout(self, session_id: str) -> bool:
        """
        SSO 登出
        
        Args:
            session_id: 要注销的 session_id
            
        Returns:
            登出是否成功
        """
        pass
    
    @abstractmethod
    def get_mode(self) -> str:
        """
        获取当前认证模式
        
        Returns:
            'mock' 或 'production'
        """
        pass
