from django.contrib import admin
from .models import (
    ManufacturerVersionInfo, ColumnOptions, UCMDeviceInventory, 
    UCMRequirement, TemplateConfig
)


@admin.register(ManufacturerVersionInfo)
class ManufacturerVersionInfoAdmin(admin.ModelAdmin):
    list_display = ['device_type', 'manufacturer', 'version', 'auth_method', 'updated_at']
    list_filter = ['device_type', 'manufacturer', 'version']
    search_fields = ['device_type', 'manufacturer', 'version', 'auth_method']
    ordering = ['device_type', 'manufacturer', 'version']


@admin.register(ColumnOptions)
class ColumnOptionsAdmin(admin.ModelAdmin):
    list_display = ['column_name', 'option_value', 'updated_at']
    list_filter = ['column_name']
    search_fields = ['column_name', 'option_value']
    ordering = ['column_name', 'option_value']


@admin.register(UCMDeviceInventory)
class UCMDeviceInventoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'device_type', 'manufacturer', 'version', 'ip', 'group', 'import_time']
    list_filter = ['device_type', 'manufacturer', 'version', 'group']
    search_fields = ['name', 'ip', 'other_ips', 'location']
    ordering = ['-import_time']


@admin.register(UCMRequirement)
class UCMRequirementAdmin(admin.ModelAdmin):
    list_display = ['requirement_type', 'device_name', 'ip', 'ucm_change_date', 'submitter', 'status', 'submit_time']
    list_filter = ['requirement_type', 'status', 'ucm_change_date', 'submitter']
    search_fields = ['device_name', 'ip']
    ordering = ['-submit_time']
    readonly_fields = ['submit_time', 'process_time']


@admin.register(TemplateConfig)
class TemplateConfigAdmin(admin.ModelAdmin):
    list_display = ['template_type', 'updated_at']
    ordering = ['template_type']
