# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ucm_app', '0003_auto_20260126_1801'),
    ]

    operations = [
        migrations.AddField(
            model_name='ucmrequirement',
            name='note',
            field=models.TextField(blank=True, null=True, verbose_name='备注'),
        ),
    ]