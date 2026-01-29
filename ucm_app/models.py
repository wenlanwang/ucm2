from django.db import models
from django.contrib.auth.models import User
import json


class ManufacturerVersionInfo(models.Model):
    """厂商版本信息表"""
    device_type = models.CharField(max_length=100, verbose_name='设备类型')
    manufacturer = models.CharField(max_length=100, verbose_name='品牌(厂商)')
    version = models.CharField(max_length=100, verbose_name='版本')
    auth_method = models.CharField(max_length=100, verbose_name='认证方式')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '厂商版本信息'
        verbose_name_plural = '厂商版本信息'
        unique_together = ['device_type', 'manufacturer', 'version', 'auth_method']
        indexes = [
            models.Index(fields=['device_type', 'manufacturer', 'version']),
        ]

    def __str__(self):
        return f"{self.device_type}-{self.manufacturer}-{self.version}-{self.auth_method}"


class ColumnOptions(models.Model):
    """列的可选值清单表"""
    column_name = models.CharField(max_length=100, verbose_name='列名')
    option_value = models.CharField(max_length=200, verbose_name='可选项值')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '列可选值'
        verbose_name_plural = '列可选值清单'
        unique_together = ['column_name', 'option_value']
        indexes = [
            models.Index(fields=['column_name']),
        ]

    def __str__(self):
        return f"{self.column_name}: {self.option_value}"


class UCMDeviceInventory(models.Model):
    """UCM设备清单表"""
    name = models.CharField(max_length=200, verbose_name='名称')
    device_type = models.CharField(max_length=100, verbose_name='设备类型')
    manufacturer = models.CharField(max_length=100, verbose_name='品牌(厂商)')
    version = models.CharField(max_length=100, verbose_name='版本')
    ip = models.CharField(max_length=50, verbose_name='IP')
    other_ips = models.TextField(blank=True, null=True, verbose_name='其他IP')
    location = models.CharField(max_length=200, blank=True, null=True, verbose_name='安装位置')
    group = models.CharField(max_length=100, blank=True, null=True, verbose_name='分组')
    auth_method = models.CharField(max_length=100, blank=True, null=True, verbose_name='认证方式')
    import_time = models.DateTimeField(verbose_name='导入时间')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = 'UCM设备清单'
        verbose_name_plural = 'UCM设备清单'
        unique_together = ['name', 'ip']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['ip']),
            models.Index(fields=['device_type']),
            models.Index(fields=['manufacturer']),
        ]

    def __str__(self):
        return f"{self.name}({self.ip})"


class UCMRequirement(models.Model):
    """UCM需求登记表"""
    REQUIREMENT_TYPES = [
        ('import', '导入'),
        ('modify', '修改'),
        ('delete', '删除'),
    ]
    
    STATUS_CHOICES = [
        ('pending', '待处理'),
        ('processed', '已处理'),
    ]
    
    requirement_type = models.CharField(max_length=10, choices=REQUIREMENT_TYPES, verbose_name='需求类型')
    ucm_change_date = models.DateField(verbose_name='UCM变更日期')
    submitter = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='登记人')
    submit_time = models.DateTimeField(auto_now_add=True, verbose_name='登记时间')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending', verbose_name='状态')
    processor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_requirements', verbose_name='处理人')
    process_time = models.DateTimeField(null=True, blank=True, verbose_name='处理时间')
    requirement_data = models.TextField(verbose_name='需求数据(JSON)')
    note = models.TextField(blank=True, null=True, verbose_name='备注')
    
    # 用于快速查询的冗余字段（从requirement_data中提取）
    device_name = models.CharField(max_length=200, verbose_name='名称')
    ip = models.CharField(max_length=50, verbose_name='IP')

    class Meta:
        verbose_name = 'UCM需求登记'
        verbose_name_plural = 'UCM需求登记'
        indexes = [
            models.Index(fields=['ucm_change_date']),
            models.Index(fields=['submitter']),
            models.Index(fields=['status']),
            models.Index(fields=['device_name']),
            models.Index(fields=['ip']),
            models.Index(fields=['requirement_type']),
        ]

    def __str__(self):
        return f"{self.get_requirement_type_display()}-{self.device_name}({self.ip})-{self.ucm_change_date}"

    def get_requirement_data_dict(self):
        """将JSON字符串转换为字典"""
        try:
            return json.loads(self.requirement_data)
        except:
            return {}

    def set_requirement_data(self, data_dict):
        """将字典转换为JSON字符串"""
        self.requirement_data = json.dumps(data_dict, ensure_ascii=False)


class TemplateConfig(models.Model):
    """模板配置表"""
    TEMPLATE_TYPES = [
        ('import', '导入'),
        ('modify', '修改'),
        ('delete', '删除'),
    ]
    
    template_type = models.CharField(max_length=10, choices=TEMPLATE_TYPES, unique=True, verbose_name='模板类型')
    column_definitions = models.TextField(verbose_name='列定义(JSON)')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '模板配置'
        verbose_name_plural = '模板配置'

    def __str__(self):
        return self.get_template_type_display()

    def get_column_definitions(self):
        """获取列定义列表，自动处理旧格式数据"""
        try:
            data = json.loads(self.column_definitions)
            # 如果是旧格式（字符串数组），转换为新格式
            if isinstance(data, list) and len(data) > 0 and isinstance(data[0], str):
                return [{"name": col, "required": False, "example": ""} for col in data]
            return data
        except:
            return []

    def set_column_definitions(self, columns_list):
        """设置列定义"""
        self.column_definitions = json.dumps(columns_list, ensure_ascii=False)


class UCMDateConfig(models.Model):
    """UCM日期限制配置表"""
    wednesday_deadline_hours = models.IntegerField(
        default=7,
        verbose_name='周三截止提前小时数'
    )
    saturday_deadline_hours = models.IntegerField(
        default=31,
        verbose_name='周六截止提前小时数'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = 'UCM日期配置'
        verbose_name_plural = 'UCM日期配置'

    def __str__(self):
        return f"UCM日期配置 (周三提前{self.wednesday_deadline_hours}小时, 周六提前{self.saturday_deadline_hours}小时)"