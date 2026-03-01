"""
SSO HTTP 客户端
封装 SSO API 的 HTTP 调用
"""
import requests
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class SSOClient:
    """SSO HTTP 客户端"""
    
    def __init__(self, base_url: str, timeout: int = 10):
        """
        初始化 SSO 客户端
        
        Args:
            base_url: SSO 服务器基础 URL
            timeout: 请求超时时间（秒）
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
    
    def get_login_url(self, callback_url: str) -> str:
        """
        获取 SSO 登录页面 URL
        
        Args:
            callback_url: 登录成功后的回调地址
            
        Returns:
            完整的 SSO 登录 URL
        """
        return f"{self.base_url}/login?next={callback_url}"
    
    def check_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        验证 session_id 并获取用户信息
        
        Args:
            session_id: SSO 返回的 session_id
            
        Returns:
            验证成功返回用户信息字典，失败返回 None
        """
        url = f"{self.base_url}/check_session"
        params = {'session_id': session_id}
        
        try:
            logger.info(f"调用 SSO check_session: {url}")
            response = requests.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('status') == 'valid':
                logger.info(f"SSO session 验证成功: userid={data.get('userid')}")
                return data
            else:
                logger.warning(f"SSO session 验证失败: {data.get('message', 'unknown error')}")
                return None
                
        except requests.RequestException as e:
            logger.error(f"SSO check_session 请求失败: {e}")
            return None
        except Exception as e:
            logger.error(f"SSO check_session 处理异常: {e}")
            return None
    
    def logout(self, session_id: str) -> bool:
        """
        SSO 登出
        
        Args:
            session_id: 要注销的 session_id
            
        Returns:
            登出是否成功
        """
        url = f"{self.base_url}/logout"
        params = {'session_id': session_id}
        
        try:
            logger.info(f"调用 SSO logout: {url}")
            response = requests.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            return True
        except requests.RequestException as e:
            logger.error(f"SSO logout 请求失败: {e}")
            return False
        except Exception as e:
            logger.error(f"SSO logout 处理异常: {e}")
            return False
    
    def get_verification_code(self, userid: str) -> Optional[Dict[str, Any]]:
        """
        获取验证码（生产环境使用）
        
        Args:
            userid: 用户统一认证号
            
        Returns:
            验证码信息
        """
        url = f"{self.base_url}/verificationcode"
        
        try:
            response = requests.post(
                url, 
                json={'userid': userid}, 
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"获取验证码失败: {e}")
            return None
