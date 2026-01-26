# Generated manually for UCMDateConfig model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ucm_app', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='UCMDateConfig',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('wednesday_deadline_hours', models.IntegerField(default=7, verbose_name='周三截止提前小时数')),
                ('saturday_deadline_hours', models.IntegerField(default=31, verbose_name='周六截止提前小时数')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
            ],
            options={
                'verbose_name': 'UCM日期配置',
                'verbose_name_plural': 'UCM日期配置',
            },
        ),
    ]
