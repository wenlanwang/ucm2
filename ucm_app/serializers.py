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
    
    class Meta:
        model = UCMRequirement
        fields = '__all__'


class TemplateConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateConfig
        fields = '__all__'
