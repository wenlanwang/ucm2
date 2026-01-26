import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
django.setup()

from ucm_app.models import ColumnOptions

print("所有列可选值:")
print("-" * 80)
for opt in ColumnOptions.objects.all().order_by('column_name', 'option_value'):
    print(f"{opt.column_name}: {opt.option_value}")