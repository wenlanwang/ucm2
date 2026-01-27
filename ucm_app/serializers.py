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

    class Meta:
        model = UCMRequirement
        fields = '__all__'

    def get_requirement_data_dict(self, obj):
        """返回解析后的 requirement_data 字典"""
        return obj.get_requirement_data_dict()


class TemplateConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateConfig
        fields = '__all__'
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # 添加解析后的列定义
        data['get_column_definitions'] = instance.get_column_definitions()
        return data
