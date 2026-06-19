from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import User, Institution, Employee


# employee_email — ищем сотрудника по email и привязываем к юзеру
USERS = [
    # teacher (3) — сотрудники из seed_mkag
    {
        'username': 'sokolov_teach',
        'display_name': 'Соколов Андрей Игоревич',
        'email': 'sokolov@mkag.ru',
        'role': 'teacher',
        'is_staff': False,
        'is_superuser': False,
        'employee_email': 'sokolov@mkag.ru',
    },
    {
        'username': 'fedorova_teach',
        'display_name': 'Фёдорова Марина Сергеевна',
        'email': 'fedorova@mkag.ru',
        'role': 'teacher',
        'is_staff': False,
        'is_superuser': False,
        'employee_email': 'fedorova@mkag.ru',
    },
    {
        'username': 'vlasov_teach',
        'display_name': 'Власов Роман Викторович',
        'email': 'vlasov@mkag.ru',
        'role': 'teacher',
        'is_staff': False,
        'is_superuser': False,
        'employee_email': 'vlasov@mkag.ru',
    },
    # admin (2) — сотрудники из seed_mkag
    {
        'username': 'admin_gromov',
        'display_name': 'Громов Виктор Павлович',
        'email': 'gromov@mkag.ru',
        'role': 'admin',
        'is_staff': True,
        'is_superuser': False,
        'employee_email': 'gromov@mkag.ru',
    },
    {
        'username': 'admin_belyakova',
        'display_name': 'Белякова Ирина Олеговна',
        'email': 'belyakova@mkag.ru',
        'role': 'admin',
        'is_staff': True,
        'is_superuser': False,
        'employee_email': 'belyakova@mkag.ru',
    },
]


class Command(BaseCommand):
    help = 'Очистить пользователей (без owner) и создать 5 тестовых с привязкой к сотрудникам МКАГ'

    def handle(self, *args, **options):
        deleted, _ = User.objects.exclude(role='owner').delete()
        self.stdout.write(f'Удалено пользователей (без owner): {deleted}')

        institution = Institution.objects.first()
        if not institution:
            self.stdout.write(self.style.ERROR('Организация не найдена. Сначала запустите seed_mkag.'))
            return

        now = timezone.now()
        for data in USERS:
            employee = None
            emp_email = data.get('employee_email')
            if emp_email:
                employee = Employee.objects.filter(email=emp_email, institution=institution).first()
                if not employee:
                    self.stdout.write(self.style.WARNING(f'  ! Сотрудник {emp_email} не найден, пропускаем привязку'))

            u = User(
                username=data['username'],
                display_name=data['display_name'],
                email=data['email'],
                role=data['role'],
                institution=institution,
                is_active=True,
                is_staff=data['is_staff'],
                is_superuser=data['is_superuser'],
                password_changed_at=now,
                employee=employee,
            )
            u.set_password('admin_-1')
            u.save()
            u.allowed_institutions.set([institution])
            emp_info = f'-> сотрудник #{employee.id}' if employee else '-> без сотрудника'
            self.stdout.write(f'  + {data["role"]:8s}  {data["username"]:20s}  {data["display_name"]}  {emp_info}')

        self.stdout.write(self.style.SUCCESS(
            f'\nГотово. Создано {len(USERS)} пользователей. Пароль у всех: admin_-1'
        ))
