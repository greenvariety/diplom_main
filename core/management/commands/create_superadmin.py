from django.core.management.base import BaseCommand
from core.models import User, Institution


class Command(BaseCommand):
    help = 'Создать начальный суперадмин-аккаунт (для разработки)'

    def handle(self, *args, **options):
        institution = Institution.objects.first()
        if not institution:
            institution = Institution.objects.create(code='ОУ', name='Образовательное учреждение')
            self.stdout.write('Создано учреждение: ОУ')

        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                password='admin_-1',
                institution=institution,
            )
            self.stdout.write(self.style.SUCCESS(
                'Суперадмин создан: логин=admin  пароль=admin_-1'
            ))
        else:
            self.stdout.write('Суперадмин уже существует.')
