from django.db import migrations


def fix_group_numbers(apps, schema_editor):
    Group = apps.get_model('core', 'Group')
    for fy in Group.objects.values('faculty_id', 'year').distinct():
        groups = list(Group.objects.filter(
            faculty_id=fy['faculty_id'],
            year=fy['year']
        ).order_by('id'))
        for i, group in enumerate(groups, 1):
            if group.group_number != i:
                Group.objects.filter(pk=group.pk).update(group_number=i)


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0026_remove_student_status'),
    ]

    operations = [
        migrations.RunPython(fix_group_numbers, migrations.RunPython.noop),
    ]
