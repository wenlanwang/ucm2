import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
django.setup()

from ucm_app.models import ColumnOptions
from django.db.models import Count

result = ColumnOptions.objects.values('column_name').annotate(count=Count('id')).order_by('column_name')

print("每列的可选值数量:")
print("-" * 50)
for r in result:
    print(f"{r['column_name']}: {r['count']}")