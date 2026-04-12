from django.core.management.base import BaseCommand
from core.models import User


class Command(BaseCommand):
    help = 'Create initial superadmin account'

    def handle(self, *args, **options):
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                password='admin123',
            )
            self.stdout.write(self.style.SUCCESS(
                'Superadmin created: login=admin  password=admin123'
            ))
        else:
            self.stdout.write('Superadmin already exists.')
