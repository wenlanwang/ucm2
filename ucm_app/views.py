from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone
from django.http import HttpResponse
import json
import xlrd
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

from .models import (
    ManufacturerVersionInfo, ColumnOptions, UCMDeviceInventory,
    UCMRequirement, TemplateConfig, UCMDateConfig
)
from .serializers import (
    UserSerializer, ManufacturerVersionInfoSerializer, ColumnOptionsSerializer,
    UCMDeviceInventorySerializer, UCMRequirementSerializer, TemplateConfigSerializer
)


class ManufacturerVersionInfoViewSet(viewsets.ModelViewSet):
    """厂商版本信息管理API"""
    queryset = ManufacturerVersionInfo.objects.all()
    serializer_class = ManufacturerVersionInfoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ManufacturerVersionInfo.objects.all()
        device_type = self.request.query_params.get('device_type')
        if device_type:
            queryset = queryset.filter(device_type=device_type)
        return queryset
    
    @action(detail=False, methods=['get'])
    def get_manufacturers(self, request):
        """根据设备类型获取厂商列表"""
        device_type = request.query_params.get('device_type')
        if not device_type:
            return Response({'error': 'device_type参数必填'}, status=status.HTTP_400_BAD_REQUEST)
        
        manufacturers = ManufacturerVersionInfo.objects.filter(
            device_type=device_type
        ).values_list('manufacturer', flat=True).distinct()
        return Response(list(manufacturers))
    
    @action(detail=False, methods=['get'])
    def get_versions(self, request):
        """根据设备类型和厂商获取版本列表"""
        device_type = request.query_params.get('device_type')
        manufacturer = request.query_params.get('manufacturer')
        if not device_type or not manufacturer:
            return Response({'error': 'device_type和manufacturer参数必填'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        versions = ManufacturerVersionInfo.objects.filter(
            device_type=device_type,
            manufacturer=manufacturer
        ).values_list('version', flat=True).distinct()
        return Response(list(versions))
    
    @action(detail=False, methods=['get'])
    def get_login_methods(self, request):
        """根据设备类型、厂商和版本获取认证方式"""
        device_type = request.query_params.get('device_type')
        manufacturer = request.query_params.get('manufacturer')
        version = request.query_params.get('version')
        if not all([device_type, manufacturer, version]):
            return Response({'error': 'device_type、manufacturer和version参数必填'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        login_methods = ManufacturerVersionInfo.objects.filter(
            device_type=device_type,
            manufacturer=manufacturer,
            version=version
        ).values_list('auth_method', flat=True).distinct()
        return Response(list(login_methods))


class ColumnOptionsViewSet(viewsets.ModelViewSet):
    """列可选值管理API"""
    queryset = ColumnOptions.objects.all()
    serializer_class = ColumnOptionsSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def get_options_by_column(self, request):
        """根据列名获取可选值"""
        column_name = request.query_params.get('column_name')
        if not column_name:
            return Response({'error': 'column_name参数必填'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        options = ColumnOptions.objects.filter(
            column_name=column_name
        ).values_list('option_value', flat=True)
        return Response(list(options))


class UCMDeviceInventoryViewSet(viewsets.ModelViewSet):
    """UCM设备清单管理API"""
    queryset = UCMDeviceInventory.objects.all()
    serializer_class = UCMDeviceInventorySerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def upload_inventory(self, request):
        """上传UCM设备清单Excel"""
        file = request.FILES.get('file')
        if not file:
            return Response({'error': '请上传文件'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # 解析Excel文件
            workbook = xlrd.open_workbook(file_contents=file.read())
            sheet = workbook.sheet_by_index(0)
            
            # 获取列名（第一行）
            headers = [str(cell.value).strip() for cell in sheet.row(0)]
            
            # 清空现有数据
            UCMDeviceInventory.objects.all().delete()
            
            # 导入数据
            import_time = timezone.now()
            success_count = 0
            error_rows = []
            
            for row_idx in range(1, sheet.nrows):
                try:
                    row_data = {}
                    for col_idx, header in enumerate(headers):
                        if col_idx < sheet.ncols:
                            row_data[header] = str(sheet.cell(row_idx, col_idx).value).strip()
                    
                    # 创建设备记录
                    device = UCMDeviceInventory(
                        name=row_data.get('名称', ''),
                        device_type=row_data.get('设备类型', ''),
                        manufacturer=row_data.get('厂商', ''),
                        version=row_data.get('版本', ''),
                        ip=row_data.get('IP', ''),
                        other_ips=row_data.get('其他IP', ''),
                        location=row_data.get('安装位置', ''),
                        group=row_data.get('分组', ''),
                        auth_method=row_data.get('认证方式', ''),
                        import_time=import_time
                    )
                    device.save()
                    success_count += 1
                    
                except Exception as e:
                    error_rows.append({
                        'row': row_idx + 1,
                        'error': str(e)
                    })
            
            return Response({
                'success': True,
                'message': f'成功导入 {success_count} 条记录',
                'errors': error_rows
            })
            
        except Exception as e:
            return Response({'error': f'文件解析失败: {str(e)}'}, 
                          status=status.HTTP_400_BAD_REQUEST)


class UCMRequirementViewSet(viewsets.ModelViewSet):
    """UCM需求登记管理API"""
    queryset = UCMRequirement.objects.all()
    serializer_class = UCMRequirementSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # 获取筛选参数
        status_filter = self.request.query_params.get('status', 'pending')
        ucm_change_date = self.request.query_params.get('ucm_change_date')
        requirement_type = self.request.query_params.get('requirement_type')
        search = self.request.query_params.get('search')
        submitter = self.request.query_params.get('submitter')
        
        # 构建查询条件
        queryset = UCMRequirement.objects.all()
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if ucm_change_date:
            queryset = queryset.filter(ucm_change_date=ucm_change_date)
        if requirement_type:
            queryset = queryset.filter(requirement_type=requirement_type)
        if submitter:
            queryset = queryset.filter(submitter__username=submitter)
        if search:
            queryset = queryset.filter(
                Q(device_name__icontains=search) | Q(ip__icontains=search)
            )
        
        # 排序
        return queryset.order_by('-submit_time')
    
    @action(detail=False, methods=['post'])
    def upload_excel(self, request):
        """上传Excel文件并解析"""
        file = request.FILES.get('file')
        requirement_type = request.data.get('requirement_type')
        
        if not file:
            return Response({'error': '请上传文件'}, status=status.HTTP_400_BAD_REQUEST)
        if not requirement_type:
            return Response({'error': '请选择需求类型'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # 解析Excel
            workbook = xlrd.open_workbook(file_contents=file.read())
            sheet = workbook.sheet_by_index(0)
            
            # 获取列名和数据
            headers = [str(cell.value).strip() for cell in sheet.row(0)]
            data = []
            
            for row_idx in range(1, sheet.nrows):
                row_data = {}
                for col_idx, header in enumerate(headers):
                    if col_idx < sheet.ncols:
                        row_data[header] = str(sheet.cell(row_idx, col_idx).value).strip()
                data.append(row_data)
            
            return Response({
                'headers': headers,
                'data': data,
                'total_rows': len(data)
            })
            
        except Exception as e:
            return Response({'error': f'文件解析失败: {str(e)}'}, 
                          status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def available_dates(self, request):
        """获取可用的UCM变更日期"""
        try:
            from datetime import timedelta
            
            config = UCMDateConfig.objects.first()
            if not config:
                config = UCMDateConfig.objects.create(
                    wednesday_deadline_hours=7,
                    saturday_deadline_hours=31
                )
            
            now = timezone.now()
            available_dates = []
            deadlines = {}
            
            # 计算本周三
            this_wednesday = now + timedelta(days=(2 - now.weekday()) % 7)
            this_wednesday = this_wednesday.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # 计算本周六
            this_saturday = now + timedelta(days=(5 - now.weekday()) % 7)
            this_saturday = this_saturday.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # 计算下周三
            next_wednesday = this_wednesday + timedelta(days=7)
            
            # 计算下周六
            next_saturday = this_saturday + timedelta(days=7)
            
            # 检查是否可选（周三提前7小时，周六提前31小时）
            wednesday_deadline = this_wednesday - timedelta(hours=config.wednesday_deadline_hours)
            saturday_deadline = this_saturday - timedelta(hours=config.saturday_deadline_hours)
            
            candidates = [
                (this_wednesday, wednesday_deadline, '周三'),
                (this_saturday, saturday_deadline, '周六'),
                (next_wednesday, wednesday_deadline + timedelta(days=7), '周三'),
                (next_saturday, saturday_deadline + timedelta(days=7), '周六')
            ]
            
            for date, deadline, day_type in candidates:
                if now < deadline:
                    date_str = date.strftime('%Y-%m-%d')
                    available_dates.append(date_str)
                    deadlines[date_str] = f"{day_type}UCM变更，最晚登记时间在{deadline.strftime('%Y-%m-%d %H:%M')}前"
            
            return Response({
                'dates': available_dates,
                'deadlines': deadlines
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def validate_data(self, request):
        """校验数据"""
        requirement_type = request.data.get('requirement_type')
        excel_data = request.data.get('excel_data', [])
        
        if not requirement_type or not excel_data:
            return Response({'error': '参数不完整'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 获取模板配置
        try:
            template = TemplateConfig.objects.get(template_type=requirement_type)
            template_columns = template.get_column_definitions()
            template_column_names = [col['name'] for col in template_columns]
        except TemplateConfig.DoesNotExist:
            return Response({'error': '模板配置不存在'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 列名校验
        excel_headers = list(excel_data[0].keys()) if excel_data else []
        missing_columns = []
        extra_columns = []
        
        # 检查缺少的列
        for col_def in template_columns:
            if col_def['name'] not in excel_headers:
                missing_columns.append(col_def['name'])
        
        # 检查多余的列
        for header in excel_headers:
            if header not in template_column_names:
                extra_columns.append(header)
        
        if missing_columns or extra_columns:
            return Response({
                'valid': False,
                'error_type': 'column_mismatch',
                'missing_columns': missing_columns,
                'extra_columns': extra_columns
            })
        
        # 数据校验
        validation_results = []
        column_options = {}
        
        # 获取所有列的可选值
        for col in excel_headers:
            options = list(ColumnOptions.objects.filter(
                column_name=col
            ).values_list('option_value', flat=True))
            if options:
                column_options[col] = options
        
        for row_idx, row_data in enumerate(excel_data):
            row_validation = {
                'row_index': row_idx,
                'is_valid': True,
                'errors': {},
                'warnings': {}
            }
            
            # 校验每列数据
            for col_def in template_columns:
                col_name = col_def['name']
                value = row_data.get(col_name, '').strip()
                
                # 必填字段校验
                if col_def['required'] and not value:
                    row_validation['errors'][col_name] = '此字段为必填项'
                    row_validation['is_valid'] = False
                    continue
                
                # IP地址格式校验
                if col_name == 'IP' and value:
                    import re
                    ipv4_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
                    if not re.match(ipv4_pattern, value):
                        row_validation['errors'][col_name] = 'IP地址格式不正确（IPv4）'
                        row_validation['is_valid'] = False
                        continue
                
                # 可选值校验
                if col_name in column_options and value:
                    if value not in column_options[col_name]:
                        row_validation['errors'][col_name] = '不在可选值清单中'
                        row_validation['is_valid'] = False
                
                # 级联关系校验（设备类型→厂商→版本）
                if col_name == '厂商' and value:
                    device_type = row_data.get('设备类型')
                    if device_type:
                        valid_manufacturers = ManufacturerVersionInfo.objects.filter(
                            device_type=device_type
                        ).values_list('manufacturer', flat=True).distinct()
                        if value not in valid_manufacturers:
                            row_validation['warnings'][col_name] = '厂商与设备类型不匹配'
                
                elif col_name == '版本' and value:
                    device_type = row_data.get('设备类型')
                    manufacturer = row_data.get('厂商')
                    if device_type and manufacturer:
                        valid_versions = ManufacturerVersionInfo.objects.filter(
                            device_type=device_type,
                            manufacturer=manufacturer
                        ).values_list('version', flat=True).distinct()
                        if value not in valid_versions:
                            row_validation['warnings'][col_name] = '版本与设备类型、厂商不匹配'
            
            validation_results.append(row_validation)
        
        return Response({
            'valid': True,
            'validation_results': validation_results
        })
    
    @action(detail=False, methods=['post'])
    def check_duplicates(self, request):
        """检查重复需求"""
        ucm_change_date = request.data.get('ucm_change_date')
        requirements = request.data.get('requirements', [])
        
        if not ucm_change_date or not requirements:
            return Response({'error': '参数不完整'}, status=status.HTTP_400_BAD_REQUEST)
        
        duplicates = []
        
        for req_data in requirements:
            name = req_data.get('名称', '')
            ip = req_data.get('IP', '')
            
            # 检查名称+UCM变更日期
            existing_by_name = UCMRequirement.objects.filter(
                device_name=name,
                ucm_change_date=ucm_change_date,
                status='pending'
            ).first()
            
            # 检查IP+UCM变更日期
            existing_by_ip = UCMRequirement.objects.filter(
                ip=ip,
                ucm_change_date=ucm_change_date,
                status='pending'
            ).first()
            
            if existing_by_name or existing_by_ip:
                duplicate_info = {
                    'name': name,
                    'ip': ip
                }
                if existing_by_name:
                    duplicate_info['duplicate_by_name'] = {
                        'existing_date': existing_by_name.ucm_change_date.strftime('%Y-%m-%d'),
                        'existing_submitter': existing_by_name.submitter.username
                    }
                if existing_by_ip:
                    duplicate_info['duplicate_by_ip'] = {
                        'existing_date': existing_by_ip.ucm_change_date.strftime('%Y-%m-%d'),
                        'existing_submitter': existing_by_ip.submitter.username
                    }
                duplicates.append(duplicate_info)
        
        return Response({
            'has_duplicates': len(duplicates) > 0,
            'duplicates': duplicates
        })
    
    @action(detail=False, methods=['post'])
    def batch_submit(self, request):
        """批量提交需求（带事务）"""
        requirement_type = request.data.get('requirement_type')
        ucm_change_date = request.data.get('ucm_change_date')
        requirements = request.data.get('requirements', [])
        
        if not all([requirement_type, ucm_change_date, requirements]):
            return Response({'error': '参数不完整'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 使用事务确保数据一致性
        from django.db import transaction
        
        try:
            with transaction.atomic():
                submitted_count = 0
                skipped_count = 0
                skipped_records = []
                submitted_ids = []
                
                for req_data in requirements:
                    name = req_data.get('名称', '')
                    ip = req_data.get('IP', '')
                    
                    # 检查重复（名称+UCM变更日期 或 IP+UCM变更日期）
                    existing = UCMRequirement.objects.filter(
                        Q(device_name=name) | Q(ip=ip),
                        ucm_change_date=ucm_change_date,
                        status='pending'
                    ).first()
                    
                    if existing:
                        skipped_count += 1
                        skipped_records.append({
                            'name': name,
                            'ip': ip,
                            'reason': '重复记录'
                        })
                        continue
                    
                    # 创建需求记录
                    requirement = UCMRequirement(
                        requirement_type=requirement_type,
                        ucm_change_date=ucm_change_date,
                        submitter=request.user,
                        requirement_data=json.dumps(req_data, ensure_ascii=False),
                        device_name=name,
                        ip=ip
                    )
                    requirement.save()
                    submitted_count += 1
                    submitted_ids.append(requirement.id)
                
                return Response({
                    'success': True,
                    'submitted_count': submitted_count,
                    'skipped_count': skipped_count,
                    'skipped_records': skipped_records,
                    'submitted_ids': submitted_ids
                })
        except Exception as e:
            transaction.set_rollback(True)
            return Response({'error': f'提交失败: {str(e)}'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def submit_requirement(self, request):
        """提交需求登记"""
        requirement_type = request.data.get('requirement_type')
        ucm_change_date = request.data.get('ucm_change_date')
        excel_data = request.data.get('excel_data', [])
        validation_results = request.data.get('validation_results', [])
        
        if not all([requirement_type, ucm_change_date, excel_data]):
            return Response({'error': '参数不完整'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 检查是否有校验失败的记录
        has_errors = any(
            len(result.get('errors', {})) > 0 
            for result in validation_results
        )
        if has_errors:
            return Response({'error': '存在校验失败的记录，无法提交'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # 检查重复记录
        duplicate_records = []
        for row_data in excel_data:
            name = row_data.get('名称', '')
            ip = row_data.get('IP', '')
            
            existing_requirement = UCMRequirement.objects.filter(
                Q(device_name=name) | Q(ip=ip),
                ucm_change_date=ucm_change_date,
                status='pending'
            ).first()
            
            if existing_requirement:
                duplicate_records.append({
                    'device_name': name,
                    'ip': ip,
                    'existing_date': existing_requirement.ucm_change_date
                })
        
        if duplicate_records:
            return Response({
                'error': '存在重复记录',
                'duplicate_records': duplicate_records
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 创建需求记录
        success_count = 0
        for row_data in excel_data:
            try:
                requirement = UCMRequirement(
                    requirement_type=requirement_type,
                    ucm_change_date=ucm_change_date,
                    submitter=request.user,
                    requirement_data=json.dumps(row_data, ensure_ascii=False),
                    device_name=row_data.get('名称', ''),
                    ip=row_data.get('IP', '')
                )
                requirement.save()
                success_count += 1
            except Exception as e:
                continue
        
        return Response({
            'success': True,
            'message': f'成功登记 {success_count} 条需求'
        })
    
    @action(detail=True, methods=['post'])
    def mark_as_processed(self, request, pk=None):
        """标记需求为已处理"""
        requirement = self.get_object()
        requirement.status = 'processed'
        requirement.processor = request.user
        requirement.process_time = timezone.now()
        requirement.save()
        return Response({'success': True})
    
    @action(detail=False, methods=['post'])
    def batch_complete(self, request):
        """批量完成需求"""
        requirement_ids = request.data.get('requirement_ids', [])
        if not requirement_ids:
            return Response({'error': '请选择要完成的记录'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        count = UCMRequirement.objects.filter(
            id__in=requirement_ids,
            status='pending'
        ).update(
            status='processed',
            processor=request.user,
            process_time=timezone.now()
        )
        
        return Response({'success': True, 'count': count})
    
    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """导出需求列表为Excel文件"""
        try:
            # 获取筛选参数
            status_filter = request.query_params.get('status', 'pending')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            requirement_type = request.query_params.get('requirement_type')
            
            # 构建查询条件
            queryset = UCMRequirement.objects.all()
            
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            if start_date:
                queryset = queryset.filter(ucm_change_date__gte=start_date)
            if end_date:
                queryset = queryset.filter(ucm_change_date__lte=end_date)
            if requirement_type:
                queryset = queryset.filter(requirement_type=requirement_type)
            
            # 排序
            queryset = queryset.order_by('-submit_time')
            
            # 创建工作簿
            wb = Workbook()
            ws = wb.active
            ws.title = "需求列表"
            
            # 定义样式
            header_font = Font(bold=True, color="FFFFFF")
            header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
            border = Border(
                left=Side(style='thin'),
                right=Side(style='thin'),
                top=Side(style='thin'),
                bottom=Side(style='thin')
            )
            alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            
            # 定义表头
            headers = [
                '需求ID',
                '需求类型',
                '名称',
                'IP地址',
                'UCM变更日期',
                '提交人',
                '提交时间',
                '状态',
                '处理人',
                '处理时间',
                '需求详情'
            ]
            
            # 写入表头
            for col_idx, header in enumerate(headers, 1):
                cell = ws.cell(row=1, column=col_idx, value=header)
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = alignment
                cell.border = border
            
            # 写入数据
            row_idx = 2
            for requirement in queryset:
                # 解析需求数据
                try:
                    requirement_data = json.loads(requirement.requirement_data) if requirement.requirement_data else {}
                except:
                    requirement_data = {}
                
                # 写入行数据
                ws.cell(row=row_idx, column=1, value=requirement.id).border = border
                ws.cell(row=row_idx, column=2, value=requirement.get_requirement_type_display()).border = border
                ws.cell(row=row_idx, column=3, value=requirement.device_name).border = border
                ws.cell(row=row_idx, column=4, value=requirement.ip).border = border
                ws.cell(row=row_idx, column=5, value=requirement.ucm_change_date.strftime('%Y-%m-%d') if requirement.ucm_change_date else '').border = border
                ws.cell(row=row_idx, column=6, value=requirement.submitter.username if requirement.submitter else '').border = border
                ws.cell(row=row_idx, column=7, value=requirement.submit_time.strftime('%Y-%m-%d %H:%M:%S') if requirement.submit_time else '').border = border
                ws.cell(row=row_idx, column=8, value=requirement.get_status_display()).border = border
                ws.cell(row=row_idx, column=9, value=requirement.processor.username if requirement.processor else '').border = border
                ws.cell(row=row_idx, column=10, value=requirement.process_time.strftime('%Y-%m-%d %H:%M:%S') if requirement.process_time else '').border = border
                
                # 需求详情（将JSON转换为可读格式）
                detail_text = ""
                if requirement_data:
                    detail_items = []
                    for key, value in requirement_data.items():
                        if key not in ['名称', 'IP']:  # 避免重复
                            detail_items.append(f"{key}: {value}")
                    detail_text = "; ".join(detail_items)
                
                detail_cell = ws.cell(row=row_idx, column=11, value=detail_text)
                detail_cell.border = border
                detail_cell.alignment = Alignment(wrap_text=True)
                
                row_idx += 1
            
            # 调整列宽
            column_widths = [10, 15, 20, 15, 15, 15, 20, 10, 15, 20, 50]
            for i, width in enumerate(column_widths, 1):
                ws.column_dimensions[chr(64 + i)].width = width
            
            # 创建HTTP响应
            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            
            # 设置文件名
            status_text = '待处理' if status_filter == 'pending' else '已处理'
            filename = f'UCM需求列表_{status_text}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            # 保存工作簿到响应
            wb.save(response)
            
            return response
            
        except Exception as e:
            return Response({'error': f'导出失败: {str(e)}'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TemplateConfigViewSet(viewsets.ModelViewSet):
    """模板配置管理API"""
    queryset = TemplateConfig.objects.all()
    serializer_class = TemplateConfigSerializer
    permission_classes = [IsAuthenticated]
    
    def update(self, request, *args, **kwargs):
        """更新模板配置，验证列定义格式"""
        column_definitions = request.data.get('column_definitions')
        
        if column_definitions:
            try:
                # 尝试解析JSON
                if isinstance(column_definitions, str):
                    columns = json.loads(column_definitions)
                else:
                    columns = column_definitions
                
                # 验证格式
                if not isinstance(columns, list):
                    return Response(
                        {'error': 'column_definitions必须是数组'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # 验证每个列定义的格式
                for idx, col in enumerate(columns):
                    if not isinstance(col, dict):
                        return Response(
                            {'error': f'列定义[{idx}]必须是对象'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    if 'name' not in col or not isinstance(col['name'], str):
                        return Response(
                            {'error': f'列定义[{idx}]必须包含name字段（字符串）'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    if 'required' not in col or not isinstance(col['required'], bool):
                        return Response(
                            {'error': f'列定义[{idx}]必须包含required字段（布尔值）'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    if 'example' not in col or not isinstance(col['example'], str):
                        return Response(
                            {'error': f'列定义[{idx}]必须包含example字段（字符串）'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                
                # 确保数据是JSON字符串格式
                request.data['column_definitions'] = json.dumps(columns, ensure_ascii=False)
                
            except json.JSONDecodeError:
                return Response(
                    {'error': 'column_definitions必须是有效的JSON'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return super().update(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def download_template(self, request):
        """下载模板文件（.xls格式）"""
        template_type = request.query_params.get('template_type')
        
        if not template_type:
            return Response({'error': '请指定模板类型'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # 获取模板配置
        try:
            template = TemplateConfig.objects.get(template_type=template_type)
            columns = template.get_column_definitions()
        except TemplateConfig.DoesNotExist:
            return Response({'error': '模板配置不存在'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # 使用xlwt创建.xls文件
        import xlwt
        
        # 创建工作簿
        workbook = xlwt.Workbook(encoding='utf-8')
        sheet = workbook.add_sheet('模板')
        
        # 定义样式
        header_style = xlwt.XFStyle()
        header_font = xlwt.Font()
        header_font.bold = True
        header_font.height = 280  # 14pt
        header_style.font = header_font
        
        header_pattern = xlwt.Pattern()
        header_pattern.pattern = xlwt.Pattern.SOLID_PATTERN
        header_pattern.pattern_fore_colour = xlwt.Style.colour_map['light_blue']
        header_style.pattern = header_pattern
        
        header_alignment = xlwt.Alignment()
        header_alignment.horz = xlwt.Alignment.HORZ_CENTER
        header_alignment.vert = xlwt.Alignment.VERT_CENTER
        header_style.alignment = header_alignment
        
        header_borders = xlwt.Borders()
        header_borders.left = xlwt.Borders.THIN
        header_borders.right = xlwt.Borders.THIN
        header_borders.top = xlwt.Borders.THIN
        header_borders.bottom = xlwt.Borders.THIN
        header_style.borders = header_borders
        
        data_style = xlwt.XFStyle()
        data_borders = xlwt.Borders()
        data_borders.left = xlwt.Borders.THIN
        data_borders.right = xlwt.Borders.THIN
        data_borders.top = xlwt.Borders.THIN
        data_borders.bottom = xlwt.Borders.THIN
        data_style.borders = data_borders
        
        # 写入表头
        for col_idx, col_def in enumerate(columns):
            header = col_def['name']
            if col_def['required']:
                header += '*'
            sheet.write(0, col_idx, header, header_style)
            # 设置列宽
            sheet.col(col_idx).width = 4000  # 约20个字符
        
        # 写入样例数据
        for col_idx, col_def in enumerate(columns):
            if col_def['example']:
                sheet.write(1, col_idx, col_def['example'], data_style)
        
        # 创建HTTP响应
        response = HttpResponse(content_type='application/vnd.ms-excel')
        
        # 设置文件名
        type_map = {
            'import': '导入',
            'modify': '修改',
            'delete': '删除'
        }
        type_name = type_map.get(template_type, template_type)
        filename = f'{type_name}_模板.xls'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        # 保存工作簿到响应
        workbook.save(response)
        
        return response


@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    """用户登录API"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({'error': '请输入用户名和密码'}, 
                      status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(username=username, password=password)
    if user is not None:
        login(request, user)
        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff
            }
        })
    else:
        return Response({'error': '用户名或密码错误'}, 
                      status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_logout(request):
    """用户退出API"""
    logout(request)
    return Response({'success': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """获取当前登录用户信息"""
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ucm_date_config(request):
    """获取UCM日期配置"""
    try:
        config = UCMDateConfig.objects.first()
        if not config:
            # 如果没有配置，创建默认配置
            config = UCMDateConfig.objects.create(
                wednesday_deadline_hours=7,
                saturday_deadline_hours=31
            )
        
        return Response({
            'wednesday_deadline_hours': config.wednesday_deadline_hours,
            'saturday_deadline_hours': config.saturday_deadline_hours
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)