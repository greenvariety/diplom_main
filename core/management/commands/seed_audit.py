import json
from django.core.management.base import BaseCommand
from core.models import (
    AuditLog, Institution, Faculty, Position, Employee, Group,
    Subject, Student, Parent, User,
)
from core.utils import model_to_dict_safe


def jdump(d):
    return json.dumps(d, ensure_ascii=False, default=str) if d else ''


class Command(BaseCommand):
    help = 'Заполняет журнал изменений на основе существующих данных'

    def handle(self, *args, **kwargs):
        AuditLog.objects.all().delete()

        owner = User.objects.get(username='AAArionchik')
        inst = Institution.objects.get(code='МКАГ')

        logs = []

        def rec(action, obj, old=None, new=None):
            logs.append(AuditLog(
                user=owner,
                institution=inst,
                action=action,
                object_type=obj.__class__.__name__,
                object_id=obj.pk,
                old_data=jdump(old),
                new_data=jdump(new),
            ))

        # Организация
        rec('created', inst, new=model_to_dict_safe(inst))

        # Факультеты
        for obj in Faculty.objects.filter(institution=inst):
            rec('created', obj, new=model_to_dict_safe(obj))

        # Должности
        for obj in Position.objects.filter(institution=inst):
            rec('created', obj, new=model_to_dict_safe(obj))

        # Сотрудники
        for obj in Employee.objects.filter(institution=inst).order_by('pk'):
            rec('created', obj, new=model_to_dict_safe(obj))

        # Группы
        for obj in Group.objects.filter(faculty__institution=inst).order_by('pk'):
            rec('created', obj, new=model_to_dict_safe(obj))

        # Предметы
        for obj in Subject.objects.filter(institution=inst).order_by('pk'):
            rec('created', obj, new=model_to_dict_safe(obj))

        # Студенты
        for obj in Student.objects.filter(institution=inst).order_by('pk'):
            rec('created', obj, new=model_to_dict_safe(obj))

        # Опекуны
        for obj in Parent.objects.filter(institution=inst).order_by('pk'):
            rec('created', obj, new=model_to_dict_safe(obj))

        AuditLog.objects.bulk_create(logs)
        self.stdout.write(f'  Записей "создано": {len(logs)}')

        # --- Последние 3 записи: 2 обновления + 1 удаление ---

        # 1. Обновление: Ермолов — добавлен email и телефон
        ermolov = Employee.objects.get(last_name='Ермолов')
        old = model_to_dict_safe(ermolov)
        old['email'] = ''
        old['phone'] = ''
        new = model_to_dict_safe(ermolov)
        new['email'] = 'ermolov@mcag.ru'
        new['phone'] = '+7 916 234-11-87'
        AuditLog.objects.create(
            user=owner, institution=inst, action='updated',
            object_type='Employee', object_id=ermolov.pk,
            old_data=jdump(old), new_data=jdump(new),
        )

        # 2. Обновление: Пушков — добавлен email
        pushkov = Student.objects.get(last_name='Пушков', first_name='Никита')
        old = model_to_dict_safe(pushkov)
        old['email'] = ''
        new = model_to_dict_safe(pushkov)
        new['email'] = 'pushkov.nikita@student.mcag.ru'
        AuditLog.objects.create(
            user=owner, institution=inst, action='updated',
            object_type='Student', object_id=pushkov.pk,
            old_data=jdump(old), new_data=jdump(new),
        )

        # 3. Удаление: студент, отчисленный до внесения в систему
        isip_fac = Faculty.objects.get(short_name='ИСиП')
        isip_3_22 = Group.objects.get(faculty=isip_fac, year=2022, group_number=3)
        AuditLog.objects.create(
            user=owner, institution=inst, action='deleted',
            object_type='Student', object_id=0,
            old_data=jdump({
                'last_name': 'Соловьев',
                'first_name': 'Артем',
                'middle_name': 'Игоревич',
                'birth_date': '2004-03-21',
                'phone': '+7 903 512-44-09',
                'email': 'solovev@mail.ru',
                'faculty_id': str(isip_fac.pk),
                'group_id': str(isip_3_22.pk),
                'institution_id': str(inst.pk),
                'is_flagged': 'False',
                'photo': None,
            }),
            new_data='',
        )

        total = AuditLog.objects.filter(institution=inst).count()
        self.stdout.write(self.style.SUCCESS(f'Журнал заполнен. Всего записей: {total}'))
        self.stdout.write('  Последние 3: updated(Ермолов), updated(Пушков), deleted(Соловьев)')
