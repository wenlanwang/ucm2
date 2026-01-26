#!/usr/bin/env python
"""
UCM系统自动化诊断脚本
自动测试重复记录功能并收集诊断信息
"""

import requests
import json
import sqlite3
import sys
import time
from datetime import datetime

# 配置
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5175"
DB_PATH = "d:/database/mydb_ucm.db"

class Colors:
    """终端颜色"""
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

class UCMDiagnoser:
    def __init__(self):
        self.session = requests.Session()
        self.diagnosis_report = []
        self.errors = []
        self.warnings = []
        
    def log(self, message, level="info"):
        """记录日志"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        if level == "error":
            print(f"{Colors.RED}[ERROR]{Colors.RESET} {message}")
            self.errors.append(message)
        elif level == "warning":
            print(f"{Colors.YELLOW}[WARN]{Colors.RESET} {message}")
            self.warnings.append(message)
        elif level == "success":
            print(f"{Colors.GREEN}[OK]{Colors.RESET} {message}")
        elif level == "info":
            print(f"{Colors.BLUE}[INFO]{Colors.RESET} {message}")
        else:
            print(message)
        
        self.diagnosis_report.append(f"[{timestamp}] {message}")
    
    def test_backend_health(self):
        """测试后端服务健康状态"""
        self.log("=" * 70, "info")
        self.log("测试1: 后端服务健康检查", "info")
        self.log("=" * 70, "info")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/api/", timeout=5)
            if response.status_code == 200:
                self.log("后端API服务正常运行", "success")
                return True
            else:
                self.log(f"后端API返回异常状态码: {response.status_code}", "error")
                return False
        except Exception as e:
            self.log(f"无法连接到后端服务: {e}", "error")
            return False
    
    def test_login(self):
        """测试登录功能"""
        self.log("\n" + "=" * 70, "info")
        self.log("测试2: 登录功能测试", "info")
        self.log("=" * 70, "info")
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/api/auth/login/",
                json={"username": "admin", "password": "admin123"},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200 and response.json().get("success"):
                self.log("登录成功", "success")
                user = response.json().get("user", {})
                self.log(f"用户: {user.get('username')} (ID: {user.get('id')})")
                return True
            else:
                self.log(f"登录失败: {response.text}", "error")
                return False
        except Exception as e:
            self.log(f"登录测试失败: {e}", "error")
            return False
    
    def test_duplicate_detection(self):
        """测试重复记录检测功能"""
        self.log("\n" + "=" * 70, "info")
        self.log("测试3: 重复记录检测功能测试", "info")
        self.log("=" * 70, "info")
        
        # 准备测试数据（使用已存在的IP）
        test_data = {
            "requirement_type": "import",
            "ucm_change_date": "2026-01-03",
            "excel_data": [
                {"名称": "测试设备1", "IP": "76.10.23.2", "设备类型": "防火墙"},
                {"名称": "测试设备2", "IP": "192.168.1.1", "设备类型": "路由器"}
            ],
            "validation_results": [
                {"row_index": 0, "errors": {}, "warnings": {}},
                {"row_index": 1, "errors": {}, "warnings": {}}
            ]
        }
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/api/requirements/submit_requirement/",
                json=test_data,
                headers={"Content-Type": "application/json"}
            )
            
            self.log(f"请求状态码: {response.status_code}", "info")
            
            if response.status_code == 400:
                response_data = response.json()
                self.log("检测到重复记录（符合预期）", "warning")
                self.log(f"错误信息: {response_data.get('error')}", "info")
                
                duplicates = response_data.get('duplicate_records', [])
                if duplicates:
                    self.log(f"发现 {len(duplicates)} 条重复记录:", "warning")
                    for idx, dup in enumerate(duplicates, 1):
                        self.log(f"  {idx}. 名称: {dup.get('device_name', 'N/A')}, IP: {dup.get('ip')}, 日期: {dup.get('existing_date')}", "warning")
                
                # 保存详细响应数据
                self.duplicate_response = response_data
                return True
            elif response.status_code == 200:
                self.log("提交成功（没有重复记录）", "success")
                return True
            else:
                self.log(f"意外状态码: {response.status_code}", "error")
                self.log(f"响应内容: {response.text}", "error")
                return False
                
        except Exception as e:
            self.log(f"测试失败: {e}", "error")
            return False
    
    def analyze_database(self):
        """分析数据库配置"""
        self.log("\n" + "=" * 70, "info")
        self.log("测试4: 数据库配置分析", "info")
        self.log("=" * 70, "info")
        
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            # 检查模板配置
            cursor.execute("SELECT template_type, column_definitions FROM ucm_app_templateconfig")
            templates = cursor.fetchall()
            
            self.log("模板配置:", "info")
            for template in templates:
                template_type = template[0]
                columns = json.loads(template[1])
                self.log(f"  {template_type}: {columns}", "info")
                
                # 检查是否有"名称"列
                if '名称' in columns:
                    self.log(f"    ✓ 包含'名称'列", "success")
                elif '设备名称' in columns:
                    self.log(f"    ⚠  包含'设备名称'列（应为'名称'）", "warning")
                else:
                    self.log(f"    ✗ 未找到名称列", "error")
            
            # 检查现有需求数据
            cursor.execute("SELECT COUNT(*) FROM ucm_app_ucmrequirement WHERE status='pending'")
            count = cursor.fetchone()[0]
            self.log(f"待处理需求数量: {count}", "info")
            
            conn.close()
            return True
            
        except Exception as e:
            self.log(f"数据库分析失败: {e}", "error")
            return False
    
    def check_frontend_code(self):
        """检查前端代码"""
        self.log("\n" + "=" * 70, "info")
        self.log("测试5: 前端代码检查", "info")
        self.log("=" * 70, "info")
        
        try:
            # 检查前端服务是否运行
            response = requests.get(f"{FRONTEND_URL}/", timeout=5)
            if response.status_code == 200:
                self.log("前端服务运行正常", "success")
            else:
                self.log("前端服务可能未运行", "warning")
            
            # 由于无法直接读取前端源文件，我们测试API端点
            self.log("前端访问地址: http://localhost:5175", "info")
            
            return True
            
        except Exception as e:
            self.log(f"前端检查失败: {e}", "warning")
            return False
    
    def generate_diagnosis_report(self):
        """生成诊断报告"""
        self.log("\n" + "=" * 70, "info")
        self.log("诊断报告生成", "info")
        self.log("=" * 70, "info")
        
        report_file = f"diagnosis_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write("=" * 70 + "\n")
            f.write("UCM系统诊断报告\n")
            f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 70 + "\n\n")
            
            f.write("诊断详情:\n")
            f.write("-" * 70 + "\n")
            for line in self.diagnosis_report:
                f.write(line + "\n")
            
            f.write("\n" + "=" * 70 + "\n")
            f.write("问题总结:\n")
            f.write("=" * 70 + "\n")
            
            if self.errors:
                f.write("\n严重错误:\n")
                for error in self.errors:
                    f.write(f"  - {error}\n")
            
            if self.warnings:
                f.write("\n警告信息:\n")
                for warning in self.warnings:
                    f.write(f"  - {warning}\n")
            
            if not self.errors and not self.warnings:
                f.write("\n✓ 系统运行正常，未发现问题\n")
        
        self.log(f"诊断报告已保存到: {report_file}", "success")
        return report_file
    
    def provide_recommendations(self):
        """提供优化建议"""
        self.log("\n" + "=" * 70, "info")
        self.log("优化建议", "info")
        self.log("=" * 70, "info")
        
        recommendations = []
        
        if hasattr(self, 'duplicate_response'):
            self.log("基于测试结果，提供以下建议:", "info")
            
            # 检查前端是否正确处理重复记录响应
            recommendations.append("1. 前端重复记录处理:")
            recommendations.append("   - 确保前端代码包含重复记录检测逻辑")
            recommendations.append("   - 检查Modal.confirm是否正确调用")
            recommendations.append("   - 验证错误处理分支是否被执行")
            
            # 检查模板配置
            recommendations.append("\n2. 模板配置检查:")
            recommendations.append("   - 确认模板列名使用'名称'而非'设备名称'")
            recommendations.append("   - 检查Excel文件列名是否与模板匹配")
            
            # 检查网络请求
            recommendations.append("\n3. 网络请求检查:")
            recommendations.append("   - 使用浏览器开发者工具监控submit_requirement请求")
            recommendations.append("   - 确认请求返回400状态码和重复记录数据")
            recommendations.append("   - 检查前端是否接收到正确的错误响应")
            
            for rec in recommendations:
                self.log(rec, "info")
        else:
            self.log("未能完成重复记录测试，无法提供具体建议", "warning")
        
        return recommendations
    
    def run_full_diagnosis(self):
        """运行完整诊断"""
        print(Colors.BOLD + Colors.CYAN)
        print("=" * 70)
        print("UCM系统自动化诊断工具")
        print("=" * 70)
        print(Colors.RESET)
        
        # 运行所有测试
        results = []
        results.append(("后端健康检查", self.test_backend_health()))
        results.append(("登录功能测试", self.test_login()))
        results.append(("重复记录检测测试", self.test_duplicate_detection()))
        results.append(("数据库配置分析", self.analyze_database()))
        results.append(("前端代码检查", self.check_frontend_code()))
        
        # 生成报告
        report_file = self.generate_diagnosis_report()
        
        # 提供建议
        recommendations = self.provide_recommendations()
        
        # 总结
        self.log("\n" + "=" * 70, "info")
        self.log("诊断完成", "info")
        self.log("=" * 70, "info")
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        self.log(f"测试通过: {passed}/{total}", "info")
        
        if self.errors:
            self.log(f"发现 {len(self.errors)} 个严重错误", "error")
        if self.warnings:
            self.log(f"发现 {len(self.warnings)} 个警告", "warning")
        
        self.log(f"\n详细诊断报告已保存到: {report_file}", "success")
        self.log("请查看报告了解详细信息", "info")
        
        return report_file, recommendations

if __name__ == "__main__":
    diagnoser = UCMDiagnoser()
    report_file, recommendations = diagnoser.run_full_diagnosis()
    
    print("\n" + Colors.GREEN + "诊断完成！" + Colors.RESET)
    print(f"报告文件: {report_file}")
    print("\n请查看报告文件获取详细信息和优化建议。")
