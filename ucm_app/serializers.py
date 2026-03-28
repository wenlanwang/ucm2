from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    ManufacturerVersionInfo, ColumnOptions, UCMDeviceInventory,
    UCMRequirement, TemplateConfig
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'first_name', 'last_name']


class ManufacturerVersionInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManufacturerVersionInfo
        fields = '__all__'


class ColumnOptionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ColumnOptions
        fields = '__all__'


class UCMDeviceInventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = UCMDeviceInventory
        fields = '__all__'


class UCMRequirementSerializer(serializers.ModelSerializer):
    submitter_name = serializers.SerializerMethodField()
    processor_name = serializers.SerializerMethodField()
    requirement_data_dict = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    requirement_type_display = serializers.CharField(source='get_requirement_type_display', read_only=True)
    related_requirement_info = serializers.SerializerMethodField()
    has_prerequisite_delete = serializers.SerializerMethodField()

    def get_submitter_name(self, obj):
        """获取提交人姓名，优先显示姓名，无姓名则显示账号"""
        if obj.submitter:
            full_name = f"{obj.submitter.first_name}{obj.submitter.last_name}".strip()
            return full_name if full_name else obj.submitter.username
        return None

    def get_processor_name(self, obj):
        """获取处理人姓名，优先显示姓名，无姓名则显示账号"""
        if obj.processor:
            full_name = f"{obj.processor.first_name}{obj.processor.last_name}".strip()
            return full_name if full_name else obj.processor.username
        return None

    class Meta:
        model = UCMRequirement
        fields = '__all__'

    def validate(self, data):
        """验证等待通知字段：勾选等待通知时，等待说明必填"""
        if data.get('wait_notification') and not data.get('notification_note', '').strip():
            raise serializers.ValidationError({
                'notification_note': '勾选等待通知时，等待说明为必填项'
            })
        return data

    def get_requirement_data_dict(self, obj):
        """返回解析后的 requirement_data 字典"""
        return obj.get_requirement_data_dict()
    
    def get_related_requirement_info(self, obj):
        """返回关联需求的简要信息"""
        if obj.related_requirement:
            return {
                'id': obj.related_requirement.id,
                'requirement_type': obj.related_requirement.requirement_type,
                'requirement_type_display': obj.related_requirement.get_requirement_type_display(),
                'sequence': obj.related_requirement.sequence,
                'status': obj.related_requirement.status
            }
        return None
    
    def get_has_prerequisite_delete(self, obj):
        """判断是否有关联的删除需求需要先完成
        
        条件：
        1. 当前记录是 import 类型
        2. 有 related_requirement 且 sequence=2（表示是删除后新增的新增部分）
        3. 关联的删除记录未完成
        """
        if obj.requirement_type == 'import' and obj.sequence == 2 and obj.related_requirement:
            # 检查关联的删除记录是否已完成
            if obj.related_requirement.requirement_type == 'delete':
                # 如果删除记录未完成，则返回 True
                return obj.related_requirement.status != 'processed'
        return False


class TemplateConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateConfig
        fields = '__all__'
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # 添加解析后的列定义
        data['get_column_definitions'] = instance.get_column_definitions()
        return data
