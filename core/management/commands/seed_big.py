"""
seed_big — заполняет БД так, что числа на дашборде кодируют слово SYNTHKEYA:
  S=19 faculties, Y=25 groups, N=14 students, T=20 employees,
  H=8 subjects, K=11 parents, E=5 positions, Y=25 users, A=1 audit
"""
import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from core.models import (
    Institution, Faculty, Position, Employee, Group,
    Student, Parent, StudentParent, Subject, User, AuditLog,
)

LAST_M = ['Иванов','Смирнов','Кузнецов','Попов','Васильев','Петров','Соколов',
          'Михайлов','Новиков','Фёдоров','Морозов','Волков','Алексеев','Лебедев',
          'Семёнов','Егоров','Павлов','Козлов','Степанов','Николаев']
LAST_F = ['Иванова','Смирнова','Кузнецова','Попова','Васильева','Петрова','Соколова',
          'Михайлова','Новикова','Фёдорова','Морозова','Волкова','Алексеева','Лебедева',
          'Семёнова','Егорова','Павлова','Козлова','Степанова','Николаева']
FIRST_M = ['Александр','Дмитрий','Максим','Сергей','Андрей','Алексей','Артём','Илья',
           'Кирилл','Михаил','Никита','Роман','Иван','Егор','Антон','Владислав']
FIRST_F = ['Анастасия','Мария','Екатерина','Анна','Наталья','Ольга','Виктория','Елена',
           'Дарья','Татьяна','Полина','Юлия','Ксения','Алина','Валерия','Светлана']
MID_M = ['Александрович','Дмитриевич','Сергеевич','Андреевич','Алексеевич','Михайлович',
         'Иванович','Николаевич','Петрович','Владимирович']
MID_F = ['Александровна','Дмитриевна','Сергеевна','Андреевна','Алексеевна','Михайловна',
         'Ивановна','Николаевна','Петровна','Владимировна']

_counter = [0]


def uid():
    _counter[0] += 1
    return _counter[0]


def name(m=True):
    if m:
        return random.choice(LAST_M), random.choice(FIRST_M), random.choice(MID_M)
    return random.choice(LAST_F), random.choice(FIRST_F), random.choice(MID_F)


def rdate(y0=1970, y1=2000):
    s = date(y0, 1, 1)
    return s + timedelta(days=random.randint(0, (date(y1, 12, 31) - s).days))


class Command(BaseCommand):
    help = 'Заполняет БД данными — числа дашборда кодируют SYNTHKEYA'

    def handle(self, *args, **kwargs):
        self.stdout.write('Очистка...')
        from core.models import GroupSubjectEmployee, StudentParent, DeleteRequest, EmailCode
        GroupSubjectEmployee.objects.all().delete()
        StudentParent.objects.all().delete()
        AuditLog.objects.all().delete()
        DeleteRequest.objects.all().delete()
        Student.objects.all().delete()
        Group.objects.all().delete()
        Faculty.objects.all().delete()
        Employee.objects.all().delete()
        Position.objects.all().delete()
        Parent.objects.all().delete()
        Subject.objects.all().delete()
        User.objects.filter(role__in=['admin', 'teacher']).delete()
        Institution.objects.all().delete()

        # --- Владелец ---
        owner, _ = User.objects.get_or_create(username='admin', defaults={'role': 'owner'})
        owner.role = 'owner'
        owner.display_name = 'Главный администратор'
        owner.set_password('1234')
        owner.save()

        inst = Institution.objects.create(owner=owner, code='КТ-2024', name='Колледж Технологий')
        owner.institution = inst
        owner.allowed_institutions.add(inst)
        owner.save(update_fields=['institution'])

        # E=5 должностей
        pos_names = ['Директор', 'Завуч', 'Преподаватель', 'Мастер производственного обучения', 'Методист']
        positions = [Position.objects.create(name=n, institution=inst) for n in pos_names]
        self.stdout.write(f'  Должностей: {len(positions)} (E=5)')

        # H=8 предметов
        subj_names = [
            'Математика', 'Информатика', 'Программирование',
            'Экономика', 'Бухгалтерский учёт',
            'Русский язык', 'Физкультура', 'История',
        ]
        subjects = [Subject.objects.create(name=n, institution=inst) for n in subj_names]
        self.stdout.write(f'  Предметов: {len(subjects)} (H=8)')

        # T=20 сотрудников
        employees = []
        for i in range(20):
            m = i % 2 == 0
            ln, fn, mn = name(m)
            emp = Employee.objects.create(
                institution=inst, last_name=ln, first_name=fn, middle_name=mn,
                birth_date=rdate(1965, 1990),
                phone=f'+7 900 {100+i:03d}-00-{i%99+1:02d}',
                email=f'emp{uid()}@college.ru',
                position=positions[i % len(positions)],
            )
            employees.append(emp)
        self.stdout.write(f'  Сотрудников: {len(employees)} (T=20)')

        # S=19 факультетов
        fac_data = [
            ('Информационные системы и программирование', 'ИСП'),
            ('Экономика и бухгалтерский учёт', 'ЭБУ'),
            ('Техническое обслуживание автомобилей', 'ТОРА'),
            ('Правоведение и социальная работа', 'ПСР'),
            ('Менеджмент и маркетинг', 'МиМ'),
            ('Строительство и архитектура', 'СиА'),
            ('Медицина и здравоохранение', 'МиЗ'),
            ('Туризм и гостиничный сервис', 'ТиГ'),
            ('Дизайн и визуальные коммуникации', 'ДиВ'),
            ('Физическая культура и спорт', 'ФКС'),
            ('Педагогика и психология', 'ПиП'),
            ('Логистика и транспорт', 'ЛиТ'),
            ('Сварочное производство', 'СвП'),
            ('Электротехника и энергетика', 'ЭиЭ'),
            ('Парикмахерское искусство', 'ПарИ'),
            ('Поварское и кондитерское дело', 'ПКД'),
            ('Агрономия', 'Агр'),
            ('Ветеринария', 'Вет'),
            ('Пожарная безопасность', 'ПожБ'),
        ]
        faculties = []
        for full_name, short_name in fac_data:
            faculties.append(Faculty.objects.create(
                institution=inst, full_name=full_name, short_name=short_name,
                created_at=rdate(2005, 2015),
            ))
        self.stdout.write(f'  Факультетов: {len(faculties)} (S=19)')

        # Y=25 групп — по 1-2 на факультет
        groups = []
        years = [2022, 2023, 2024]
        for i in range(25):
            fac = faculties[i % len(faculties)]
            yr = years[i % len(years)]
            ht = employees[i % len(employees)]
            groups.append(Group.objects.create(faculty=fac, year=yr, headteacher=ht))
        self.stdout.write(f'  Групп: {len(groups)} (Y=25)')

        # N=14 студентов
        students = []
        for i in range(14):
            m = i % 2 != 0
            ln, fn, mn = name(m)
            stu = Student.objects.create(
                institution=inst, last_name=ln, first_name=fn, middle_name=mn,
                birth_date=rdate(2004, 2007),
                phone=f'+7 901 {200+i:03d}-00-{i%99+1:02d}',
                email=f'stu{uid()}@mail.ru',
                faculty=faculties[i % len(faculties)],
                group=groups[i % len(groups)],
            )
            students.append(stu)
        self.stdout.write(f'  Студентов: {len(students)} (N=14)')

        # K=11 опекунов
        parents = []
        for i in range(11):
            m = i % 2 == 0
            ln, fn, mn = name(m)
            par = Parent.objects.create(
                institution=inst, last_name=ln, first_name=fn, middle_name=mn,
                birth_date=rdate(1965, 1985),
                phone=f'+7 902 {300+i:03d}-00-{i%99+1:02d}',
                email=f'par{uid()}@mail.ru',
            )
            parents.append(par)
            if i < len(students):
                StudentParent.objects.create(
                    student=students[i], parent=par,
                    relation_type='mother' if m else 'father',
                )
        self.stdout.write(f'  Опекунов: {len(parents)} (K=11)')

        # Y=25 пользователей (не считая владельца — он уже добавлен)
        # нужно ещё 24 в allowed_institutions
        new_users = []
        for i in range(24):
            role = 'admin' if i < 4 else 'teacher'
            emp = employees[i % len(employees)] if role == 'teacher' else None
            u = User.objects.create_user(
                username=f'user{i+1}', password='demo_1234',
                role=role, institution=inst,
                display_name=f'Пользователь {i+1}',
                employee=emp if role == 'teacher' else None,
            )
            u.allowed_institutions.add(inst)
            new_users.append(u)
        self.stdout.write(f'  Пользователей: 25 (owner + 24) (Y=25)')

        # A=1 запись в журнале
        AuditLog.objects.create(
            user=owner, institution=inst,
            action='created',
            object_type='Institution',
            object_id=inst.pk,
            old_data='', new_data='',
        )
        self.stdout.write('  Записей в журнале: 1 (A=1)')

        self.stdout.write(self.style.SUCCESS('\nГотово! Дашборд зашифрует: S-Y-N-T-H-K-E-Y-A'))
        self.stdout.write('  19 факультетов   = S')
        self.stdout.write('  25 групп         = Y')
        self.stdout.write('  14 студентов     = N')
        self.stdout.write('  20 сотрудников   = T')
        self.stdout.write('   8 предметов     = H')
        self.stdout.write('  11 опекунов      = K')
        self.stdout.write('   5 должностей    = E')
        self.stdout.write('  25 пользователей = Y')
        self.stdout.write('   1 запись журн.  = A')
        self.stdout.write('\n  Логин владельца: admin / 1234')
