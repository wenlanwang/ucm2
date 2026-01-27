import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
django.setup()

from ucm_app.models import UCMRequirement
import json

columns = set()
for r in UCMRequirement.objects.all()[:10]:
    data = json.loads(r.requirement_data)
    columns.update(data.keys())

print('All unique columns in database:', sorted(columns))