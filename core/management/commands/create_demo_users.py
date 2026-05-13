from django.core.management.base import BaseCommand
from core.models import User, Institution


class Command(BaseCommand):
    help = 'Создать/обновить демо-пользователей с паролем 1234'

    def handle(self, *args, **options):
        inst = Institution.objects.first()
        if not inst:
            inst = Institution.objects.create(code='КОЛ', name='Колледж')
            self.stdout.write('Создано учреждение: КОЛ')

        users = [
            ('superadmin', 'superadmin', True, True),
            ('admin',      'admin',      False, False),
            ('teacher1',   'teacher',    False, False),
        ]

        for username, role, is_staff, is_superuser in users:
            u, created = User.objects.get_or_create(username=username)
            u.role = role
            u.institution = inst
            u.is_active = True
            u.is_staff = is_staff
            u.is_superuser = is_superuser
            u.set_password('1234')
            u.save()
            status = 'Создан' if created else 'Обновлён'
            self.stdout.write(self.style.SUCCESS(
                f'{status}: {username}  роль={role}  пароль=1234'
            ))
