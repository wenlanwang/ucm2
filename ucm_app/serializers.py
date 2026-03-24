from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    ManufacturerVersionInfo, ColumnOptions, UCMDeviceInventory,
    UCMRequirement, TemplateConfig
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff']


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
    submitter_name = serializers.CharField(source='submitter.username', read_only=True)
    processor_name = serializers.CharField(source='processor.username', read_only=True, allow_null=True)
    requirement_data_dict = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    requirement_type_display = serializers.CharField(source='get_requirement_type_display', read_only=True)
    related_requirement_info = serializers.SerializerMethodField()

    class Meta:
        model = UCMRequirement
        fields = '__all__'

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


class TemplateConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateConfig
        fields = '__all__'
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # 添加解析后的列定义
        data['get_column_definitions'] = instance.get_column_definitions()
        return data
