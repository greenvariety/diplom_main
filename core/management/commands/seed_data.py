from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date
from core.models import (
    Faculty, Position, Employee, Group, Student, Parent,
    StudentParent, Subject, GroupSubjectEmployee, User,
)


class Command(BaseCommand):
    help = 'Заполняет базу тестовыми данными'

    def handle(self, *args, **kwargs):
        self.stdout.write('Очистка старых данных...')
        GroupSubjectEmployee.objects.all().delete()
        StudentParent.objects.all().delete()
        Student.objects.all().delete()
        Group.objects.all().delete()
        Faculty.objects.all().delete()
        Employee.objects.all().delete()
        Position.objects.all().delete()
        Parent.objects.all().delete()
        Subject.objects.all().delete()
        User.objects.filter(role__in=['admin', 'teacher']).delete()

        # --- Должности ---
        pos_director = Position.objects.create(name='Директор', is_teacher=False)
        pos_admin = Position.objects.create(name='Завуч', is_teacher=False)
        pos_teacher = Position.objects.create(name='Преподаватель', is_teacher=True)
        pos_master = Position.objects.create(name='Мастер производственного обучения', is_teacher=True)
        self.stdout.write('  Должности: 4')

        # --- Факультеты ---
        f1 = Faculty.objects.create(
            full_name='Информационные системы и программирование',
            short_name='ИСП', created_at=date(2010, 9, 1))
        f2 = Faculty.objects.create(
            full_name='Экономика и бухгалтерский учёт',
            short_name='ЭБУ', created_at=date(2008, 9, 1))
        f3 = Faculty.objects.create(
            full_name='Техническое обслуживание и ремонт автомобилей',
            short_name='ТОРА', created_at=date(2005, 9, 1))
        self.stdout.write('  Факультеты: 3')

        # --- Сотрудники ---
        e1 = Employee.objects.create(last_name='Смирнова', first_name='Ольга', middle_name='Викторовна',
            birth_date=date(1975, 3, 12), phone='+7 900 111-22-33', email='smirnova@college.ru',
            position=pos_director)
        e2 = Employee.objects.create(last_name='Козлов', first_name='Андрей', middle_name='Петрович',
            birth_date=date(1980, 7, 5), phone='+7 900 222-33-44', email='kozlov@college.ru',
            position=pos_teacher)
        e3 = Employee.objects.create(last_name='Петрова', first_name='Наталья', middle_name='Сергеевна',
            birth_date=date(1983, 11, 20), phone='+7 900 333-44-55', email='petrova@college.ru',
            position=pos_teacher)
        e4 = Employee.objects.create(last_name='Фёдоров', first_name='Иван', middle_name='Александрович',
            birth_date=date(1978, 4, 18), phone='+7 900 444-55-66', email='fedorov@college.ru',
            position=pos_teacher)
        e5 = Employee.objects.create(last_name='Морозова', first_name='Елена', middle_name='Николаевна',
            birth_date=date(1990, 6, 30), phone='+7 900 555-66-77', email='morozova@college.ru',
            position=pos_master)
        e6 = Employee.objects.create(last_name='Тихонов', first_name='Сергей', middle_name='Юрьевич',
            birth_date=date(1985, 2, 14), phone='+7 900 666-77-88', email='tikhonov@college.ru',
            position=pos_teacher)
        self.stdout.write('  Сотрудники: 6')

        # --- Группы ---
        g1 = Group.objects.create(faculty=f1, year=2022, headteacher=e2)
        g2 = Group.objects.create(faculty=f1, year=2023, headteacher=e3)
        g3 = Group.objects.create(faculty=f2, year=2022, headteacher=e4)
        g4 = Group.objects.create(faculty=f2, year=2023, headteacher=e4)
        g5 = Group.objects.create(faculty=f3, year=2023, headteacher=e5)
        self.stdout.write('  Группы: 5')

        # --- Студенты ---
        students_data = [
            # ИСП-1-22
            ('Иванов', 'Алексей', 'Дмитриевич', date(2004, 5, 14), '+7 901 100-00-01', 'ivanov@mail.ru', 'enrolled', f1, g1),
            ('Сидорова', 'Мария', 'Олеговна', date(2004, 8, 22), '+7 901 100-00-02', 'sidorova@mail.ru', 'enrolled', f1, g1),
            ('Новиков', 'Кирилл', 'Андреевич', date(2004, 1, 30), '+7 901 100-00-03', 'novikov@mail.ru', 'enrolled', f1, g1),
            ('Захарова', 'Анна', 'Игоревна', date(2004, 11, 5), '+7 901 100-00-04', 'zaharova@mail.ru', 'enrolled', f1, g1),
            ('Орлов', 'Денис', 'Васильевич', date(2004, 3, 17), '', '', 'pending_expulsion', f1, g1),
            # ИСП-2-23
            ('Васильев', 'Никита', 'Романович', date(2005, 6, 9), '+7 901 200-00-01', 'vasiliev@mail.ru', 'enrolled', f1, g2),
            ('Лебедева', 'Дарья', 'Максимовна', date(2005, 2, 27), '+7 901 200-00-02', 'lebedeva@mail.ru', 'enrolled', f1, g2),
            ('Семёнов', 'Артём', 'Павлович', date(2005, 10, 13), '+7 901 200-00-03', '', 'enrolled', f1, g2),
            ('Козлова', 'Полина', 'Евгеньевна', date(2005, 4, 4), '+7 901 200-00-04', 'kozlova@mail.ru', 'enrolled', f1, g2),
            # ЭБУ-1-22
            ('Попова', 'Виктория', 'Андреевна', date(2004, 7, 16), '+7 901 300-00-01', 'popova@mail.ru', 'enrolled', f2, g3),
            ('Лазарев', 'Михаил', 'Сергеевич', date(2004, 12, 3), '+7 901 300-00-02', 'lazarev@mail.ru', 'enrolled', f2, g3),
            ('Громова', 'Ксения', 'Дмитриевна', date(2004, 9, 25), '+7 901 300-00-03', 'gromova@mail.ru', 'pending_enrollment', f2, g3),
            # ЭБУ-2-23
            ('Зайцев', 'Роман', 'Николаевич', date(2005, 3, 8), '+7 901 400-00-01', 'zajcev@mail.ru', 'enrolled', f2, g4),
            ('Белова', 'Алина', 'Ивановна', date(2005, 8, 19), '+7 901 400-00-02', 'belova@mail.ru', 'enrolled', f2, g4),
            # ТОРА-1-23
            ('Гусев', 'Владислав', 'Константинович', date(2005, 1, 22), '+7 901 500-00-01', 'gusev@mail.ru', 'enrolled', f3, g5),
            ('Никитин', 'Егор', 'Алексеевич', date(2005, 5, 11), '+7 901 500-00-02', '', 'enrolled', f3, g5),
            ('Соловьёва', 'Татьяна', 'Вячеславовна', date(2005, 9, 7), '+7 901 500-00-03', 'solovieva@mail.ru', 'enrolled', f3, g5),
            # Абитуриенты
            ('Куликов', 'Антон', 'Борисович', date(2006, 4, 28), '+7 901 600-00-01', '', 'pending_review', f1, None),
            ('Миронова', 'Екатерина', 'Леонидовна', date(2006, 7, 15), '+7 901 600-00-02', 'mironova@mail.ru', 'pending_review', f2, None),
        ]
        created_students = []
        for ln, fn, mn, bd, ph, em, st, fac, grp in students_data:
            s = Student.objects.create(
                last_name=ln, first_name=fn, middle_name=mn,
                birth_date=bd, phone=ph, email=em, status=st,
                faculty=fac, group=grp)
            created_students.append(s)
        self.stdout.write(f'  Студентов: {len(created_students)}')

        # --- Опекуны ---
        p1 = Parent.objects.create(last_name='Иванов', first_name='Дмитрий', middle_name='Сергеевич',
            birth_date=date(1978, 3, 10), phone='+7 902 100-00-01', email='ivanov_d@mail.ru')
        p2 = Parent.objects.create(last_name='Сидорова', first_name='Татьяна', middle_name='Петровна',
            birth_date=date(1980, 6, 14), phone='+7 902 100-00-02', email='sidorova_t@mail.ru')
        p3 = Parent.objects.create(last_name='Новикова', first_name='Светлана', middle_name='Владимировна',
            birth_date=date(1975, 11, 5), phone='+7 902 200-00-01', email='novikova_s@mail.ru')
        p4 = Parent.objects.create(last_name='Васильев', first_name='Роман', middle_name='Игоревич',
            birth_date=date(1982, 2, 20), phone='+7 902 300-00-01', email='vasiliev_r@mail.ru')
        self.stdout.write('  Опекуны: 4')

        # Привязки опекунов
        StudentParent.objects.create(student=created_students[0], parent=p1, relation_type='father')
        StudentParent.objects.create(student=created_students[0], parent=p2, relation_type='mother')
        StudentParent.objects.create(student=created_students[1], parent=p2, relation_type='mother')
        StudentParent.objects.create(student=created_students[5], parent=p3, relation_type='mother')
        StudentParent.objects.create(student=created_students[5], parent=p4, relation_type='father')
        self.stdout.write('  Связей студент-опекун: 5')

        # --- Предметы ---
        subj_names = [
            'Математика', 'Информатика', 'Программирование',
            'Базы данных', 'Веб-разработка',
            'Бухгалтерский учёт', 'Экономика', 'Финансы',
            'Техническое обслуживание', 'Устройство автомобиля',
            'Физкультура', 'Русский язык',
        ]
        subjects = {name: Subject.objects.create(name=name) for name in subj_names}
        self.stdout.write(f'  Предметов: {len(subjects)}')

        # --- Назначения предмет-группа-преподаватель ---
        assignments = [
            (g1, 'Математика', e2),
            (g1, 'Информатика', e2),
            (g1, 'Программирование', e3),
            (g1, 'Базы данных', e3),
            (g1, 'Веб-разработка', e6),
            (g1, 'Физкультура', e4),
            (g2, 'Математика', e2),
            (g2, 'Программирование', e3),
            (g2, 'Базы данных', e6),
            (g2, 'Веб-разработка', e6),
            (g3, 'Бухгалтерский учёт', e4),
            (g3, 'Экономика', e4),
            (g3, 'Финансы', e6),
            (g3, 'Математика', e2),
            (g4, 'Бухгалтерский учёт', e4),
            (g4, 'Экономика', e4),
            (g5, 'Техническое обслуживание', e5),
            (g5, 'Устройство автомобиля', e5),
            (g5, 'Физкультура', e4),
        ]
        for grp, subj_name, emp in assignments:
            GroupSubjectEmployee.objects.create(group=grp, subject=subjects[subj_name], employee=emp)
        self.stdout.write(f'  Назначений предметов: {len(assignments)}')

        # --- Пользователи ---
        admin_user = User.objects.create_user(username='admin_user', password='admin123', role='admin', employee=e1)
        teacher1 = User.objects.create_user(username='kozlov', password='teacher123', role='teacher', employee=e2)
        teacher2 = User.objects.create_user(username='petrova', password='teacher123', role='teacher', employee=e3)
        self.stdout.write('  Пользователи: admin_user / kozlov / petrova (+ superadmin)')

        self.stdout.write(self.style.SUCCESS('\nБаза заполнена успешно!'))
        self.stdout.write('  Суперадмин:  admin / admin123')
        self.stdout.write('  Администратор: admin_user / admin123')
        self.stdout.write('  Преподаватель: kozlov / teacher123')
        self.stdout.write('  Преподаватель: petrova / teacher123')
