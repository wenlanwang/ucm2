import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from ucm_app.models import ManufacturerVersionInfo, ColumnOptions

print('ManufacturerVersionInfo count:', ManufacturerVersionInfo.objects.count())
for item in ManufacturerVersionInfo.objects.all()[:10]:
    print(f"  {item.device_type} - {item.manufacturer} - {item.version}")

print('\nColumnOptions count:', ColumnOptions.objects.count())
print('Column names with options:')
for col in ColumnOptions.objects.values('column_name').distinct():
    col_name = col['column_name']
    options = list(ColumnOptions.objects.filter(column_name=col_name).values_list('option_value', flat=True))
    print(f"  {col_name}: {options}")