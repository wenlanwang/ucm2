@echo off
cd D:\dev\ucm2
set DJANGO_SETTINGS_MODULE=ucm_backend.settings
python manage.py shell -c "from ucm_app.models import UCMDateConfig; c, created = UCMDateConfig.objects.get_or_create(id=1, defaults={'wednesday_deadline_hours': 7, 'saturday_deadline_hours': 31}); print('Created' if created else 'Already exists')"
