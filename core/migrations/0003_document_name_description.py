from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_feedbackcomment_alter_student_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='document',
            name='name',
            field=models.CharField(default='', max_length=255, verbose_name='Название'),
        ),
        migrations.AddField(
            model_name='document',
            name='description',
            field=models.TextField(blank=True, default='', verbose_name='Описание'),
        ),
        migrations.AlterField(
            model_name='document',
            name='doc_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('passport', 'Паспорт'), ('snils', 'СНИЛС'), ('policy', 'Полис ОМС'),
                    ('certificate', 'Аттестат'), ('order', 'Приказ'), ('other', 'Прочее'),
                ],
                default='',
                max_length=20,
                verbose_name='Тип документа',
            ),
        ),
    ]
