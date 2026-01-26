import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucm_backend.settings')
django.setup()

from ucm_app.models import UCMDateConfig

config, created = UCMDateConfig.objects.get_or_create(
    id=1,
    defaults={
        'wednesday_deadline_hours': 7,
        'saturday_deadline_hours': 31
    }
)

if created:
    print(f'UCMDateConfig created: 周三提前{config.wednesday_deadline_hours}小时, 周六提前{config.saturday_deadline_hours}小时')
else:
    print(f'UCMDateConfig already exists: 周三提前{config.wednesday_deadline_hours}小时, 周六提前{config.saturday_deadline_hours}小时')
