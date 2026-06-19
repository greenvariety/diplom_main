from django.core.management.base import BaseCommand
from datetime import date
from core.models import (
    Institution, Faculty, Position, Employee, Group, Student,
    Parent, StudentParent, Subject, GroupSubjectEmployee, User, EmailCode,
)


class Command(BaseCommand):
    help = 'Заполнить базу реалистичными данными МКАГ'

    def handle(self, *args, **kwargs):
        self.stdout.write('Очистка базы...')
        GroupSubjectEmployee.objects.all().delete()
        StudentParent.objects.all().delete()
        Student.objects.all().delete()
        Group.objects.all().delete()
        Faculty.objects.all().delete()
        Employee.objects.all().delete()
        Position.objects.all().delete()
        Parent.objects.all().delete()
        Subject.objects.all().delete()
        User.objects.all().delete()
        Institution.objects.all().delete()
        EmailCode.objects.all().delete()

        # --- Owner ---
        owner = User(username='direktormkag', display_name='Харитонова Светлана Борисовна',
                     email='kharitonova@mkag.ru', role='owner', is_staff=True, is_superuser=True, is_active=True)
        owner.set_password('admin_-1')
        owner.save()

        inst = Institution.objects.create(
            owner=owner, code='МКАГ',
            name='Московский колледж архитектуры и градостроительства'
        )
        owner.institution = inst
        owner.save(update_fields=['institution'])
        self.stdout.write(f'  Организация: {inst.name}')

        # --- Должности ---
        pos_dir    = Position.objects.create(name='Директор', institution=inst)
        pos_zavuch = Position.objects.create(name='Заместитель директора', institution=inst)
        pos_meth   = Position.objects.create(name='Методист', institution=inst)
        pos_teach  = Position.objects.create(name='Преподаватель', institution=inst)
        pos_master = Position.objects.create(name='Мастер производственного обучения', institution=inst)
        pos_cur    = Position.objects.create(name='Куратор', institution=inst)
        self.stdout.write('  Должности: 6')

        # --- Факультеты ---
        f_isp = Faculty.objects.create(institution=inst,
            full_name='Информационные системы и программирование', short_name='ИСП',
            created_at=date(2010, 9, 1))
        f_at = Faculty.objects.create(institution=inst,
            full_name='Аддитивные технологии', short_name='АТ',
            created_at=date(2016, 9, 1))
        f_umd = Faculty.objects.create(institution=inst,
            full_name='Управление многоквартирными домами', short_name='УМД',
            created_at=date(2012, 9, 1))
        f_vks = Faculty.objects.create(institution=inst,
            full_name='Веб-разработка и компьютерные сети', short_name='ВКС',
            created_at=date(2018, 9, 1))
        self.stdout.write('  Специальности: 4 (ИСП, АТ, УМД, ВКС)')

        # --- Сотрудники ---
        def emp(ln, fn, mn, bd, ph, email, pos):
            return Employee.objects.create(institution=inst, last_name=ln, first_name=fn,
                middle_name=mn, birth_date=bd, phone=ph, email=email, position=pos)

        e_dir   = emp('Харитонова','Светлана','Борисовна', date(1968,4,12), '+7 495 111-00-01', 'kharitonova@mkag.ru', pos_dir)
        e_zav   = emp('Громов',    'Виктор',  'Павлович',  date(1972,8,25), '+7 495 111-00-02', 'gromov@mkag.ru',      pos_zavuch)
        e_meth  = emp('Белякова',  'Ирина',   'Олеговна',  date(1980,2,17), '+7 495 111-00-03', 'belyakova@mkag.ru',   pos_meth)

        # ИСП
        e_isp1 = emp('Соколов',   'Андрей',  'Игоревич',  date(1979,5,3),  '+7 495 222-00-01', 'sokolov@mkag.ru',     pos_teach)
        e_isp2 = emp('Фёдорова',  'Марина',  'Сергеевна', date(1985,11,14),'+7 495 222-00-02', 'fedorova@mkag.ru',    pos_teach)
        e_isp3 = emp('Тарасов',   'Денис',   'Алексеевич',date(1990,3,28), '+7 495 222-00-03', 'tarasov@mkag.ru',     pos_master)

        # АТ
        e_at1  = emp('Власов',    'Роман',   'Викторович', date(1983,7,9),  '+7 495 333-00-01', 'vlasov@mkag.ru',      pos_teach)
        e_at2  = emp('Орехова',   'Наталья', 'Дмитриевна', date(1987,1,22), '+7 495 333-00-02', 'orekhova@mkag.ru',    pos_master)

        # УМД
        e_umd1 = emp('Крылова',   'Ольга',   'Владимировна',date(1975,9,5), '+7 495 444-00-01', 'krylova@mkag.ru',     pos_teach)
        e_umd2 = emp('Зимин',     'Сергей',  'Николаевич', date(1981,6,18), '+7 495 444-00-02', 'zimin@mkag.ru',       pos_teach)

        # ВКС
        e_vks1 = emp('Панов',     'Алексей', 'Романович',  date(1992,4,11), '+7 495 555-00-01', 'panov@mkag.ru',       pos_teach)
        e_vks2 = emp('Лукьянова', 'Екатерина','Петровна',  date(1988,12,3), '+7 495 555-00-02', 'lukyanova@mkag.ru',   pos_teach)

        self.stdout.write('  Сотрудников: 13')

        # --- Группы ---
        g_isp22 = Group.objects.create(faculty=f_isp, year=2022, headteacher=e_isp1)
        g_isp23 = Group.objects.create(faculty=f_isp, year=2023, headteacher=e_isp2)
        g_isp24 = Group.objects.create(faculty=f_isp, year=2024, headteacher=e_isp3)
        g_at22  = Group.objects.create(faculty=f_at,  year=2022, headteacher=e_at1)
        g_at23  = Group.objects.create(faculty=f_at,  year=2023, headteacher=e_at2)
        g_umd22 = Group.objects.create(faculty=f_umd, year=2022, headteacher=e_umd1)
        g_umd23 = Group.objects.create(faculty=f_umd, year=2023, headteacher=e_umd2)
        g_vks23 = Group.objects.create(faculty=f_vks, year=2023, headteacher=e_vks1)
        g_vks24 = Group.objects.create(faculty=f_vks, year=2024, headteacher=e_vks2)
        self.stdout.write('  Группы: 9')

        # --- Студенты ---
        def stu(ln, fn, mn, bd, ph, em, fac, grp):
            return Student.objects.create(institution=inst, last_name=ln, first_name=fn,
                middle_name=mn, birth_date=bd, phone=ph, email=em, faculty=fac, group=grp)

        students = []

        # ИСП-22
        students += [
            stu('Антонов',   'Дмитрий',   'Сергеевич',   date(2004,3,12),  '+7 916 201-01-01', 'antonov.d@mail.ru',   f_isp, g_isp22),
            stu('Белкина',   'Анастасия', 'Олеговна',    date(2004,7,25),  '+7 916 201-01-02', 'belkina.a@mail.ru',   f_isp, g_isp22),
            stu('Воронов',   'Илья',      'Максимович',  date(2004,11,8),  '+7 916 201-01-03', 'voronov.i@mail.ru',   f_isp, g_isp22),
            stu('Горбунова', 'Юлия',      'Андреевна',   date(2004,1,30),  '+7 916 201-01-04', 'gorbunova.y@mail.ru', f_isp, g_isp22),
            stu('Дмитриев',  'Павел',     'Викторович',  date(2004,5,17),  '+7 916 201-01-05', 'dmitriev.p@mail.ru',  f_isp, g_isp22),
            stu('Ершова',    'Ксения',    'Николаевна',  date(2004,9,4),   '+7 916 201-01-06', 'ershova.k@mail.ru',   f_isp, g_isp22),
        ]
        # ИСП-23
        students += [
            stu('Жуков',     'Артём',     'Евгеньевич',  date(2005,2,14),  '+7 916 202-02-01', 'zhukov.a@mail.ru',    f_isp, g_isp23),
            stu('Зайцева',   'Валерия',   'Ивановна',    date(2005,6,28),  '+7 916 202-02-02', 'zajtseva.v@mail.ru',  f_isp, g_isp23),
            stu('Иванченко', 'Никита',    'Романович',   date(2005,10,3),  '+7 916 202-02-03', 'ivanchenko.n@mail.ru',f_isp, g_isp23),
            stu('Карпова',   'Дарья',     'Станиславовна',date(2005,4,19), '+7 916 202-02-04', 'karpova.d@mail.ru',   f_isp, g_isp23),
            stu('Лысенко',   'Роман',     'Петрович',    date(2005,8,7),   '',                 '',                    f_isp, g_isp23),
            stu('Макарова',  'Полина',    'Алексеевна',  date(2005,12,22), '+7 916 202-02-06', 'makarova.p@mail.ru',  f_isp, g_isp23),
        ]
        # ИСП-24
        students += [
            stu('Нестеров',  'Глеб',      'Дмитриевич',  date(2006,1,15),  '+7 916 203-03-01', 'nesterov.g@mail.ru',  f_isp, g_isp24),
            stu('Орлова',    'Алина',     'Сергеевна',   date(2006,5,9),   '+7 916 203-03-02', 'orlova.a@mail.ru',    f_isp, g_isp24),
            stu('Попов',     'Кирилл',    'Андреевич',   date(2006,9,27),  '+7 916 203-03-03', 'popov.k@mail.ru',     f_isp, g_isp24),
            stu('Романова',  'Виктория',  'Леонидовна',  date(2006,3,11),  '+7 916 203-03-04', 'romanova.v@mail.ru',  f_isp, g_isp24),
            stu('Смирнов',   'Егор',      'Павлович',    date(2006,7,30),  '+7 916 203-03-05', 'smirnov.e@mail.ru',   f_isp, g_isp24),
        ]
        # АТ-22
        students += [
            stu('Тихомиров', 'Вадим',     'Олегович',    date(2004,4,6),   '+7 916 301-01-01', 'tikhomirov.v@mail.ru',f_at,  g_at22),
            stu('Уварова',   'Мария',     'Константиновна',date(2004,8,21),'+7 916 301-01-02', 'uvarova.m@mail.ru',   f_at,  g_at22),
            stu('Филиппов',  'Антон',     'Борисович',   date(2004,12,14), '+7 916 301-01-03', 'filippov.a@mail.ru',  f_at,  g_at22),
            stu('Харитонов', 'Степан',    'Юрьевич',     date(2004,2,28),  '+7 916 301-01-04', 'kharitonov.s@mail.ru',f_at,  g_at22),
            stu('Цветкова',  'Надежда',   'Владимировна',date(2004,6,17),  '+7 916 301-01-05', 'tsvetkova.n@mail.ru', f_at,  g_at22),
        ]
        # АТ-23
        students += [
            stu('Чернов',    'Максим',    'Игоревич',    date(2005,1,9),   '+7 916 302-02-01', 'chernov.m@mail.ru',   f_at,  g_at23),
            stu('Шестакова', 'Елена',     'Александровна',date(2005,5,24), '+7 916 302-02-02', 'shestakova.e@mail.ru',f_at,  g_at23),
            stu('Щукин',     'Николай',   'Витальевич',  date(2005,9,13),  '+7 916 302-02-03', '',                    f_at,  g_at23),
            stu('Яковлева',  'Светлана',  'Романовна',   date(2005,3,5),   '+7 916 302-02-04', 'yakovleva.s@mail.ru', f_at,  g_at23),
        ]
        # УМД-22
        students += [
            stu('Абрамов',   'Владислав', 'Сергеевич',   date(2004,10,18), '+7 916 401-01-01', 'abramov.vl@mail.ru',  f_umd, g_umd22),
            stu('Баранова',  'Ирина',     'Петровна',    date(2004,2,7),   '+7 916 401-01-02', 'baranova.i@mail.ru',  f_umd, g_umd22),
            stu('Виноградов','Михаил',    'Дмитриевич',  date(2004,6,23),  '+7 916 401-01-03', 'vinogradov.m@mail.ru',f_umd, g_umd22),
            stu('Герасимова','Татьяна',   'Алексеевна',  date(2004,11,1),  '+7 916 401-01-04', 'gerasimova.t@mail.ru',f_umd, g_umd22),
            stu('Демидов',   'Алексей',   'Николаевич',  date(2004,4,14),  '+7 916 401-01-05', 'demidov.a@mail.ru',   f_umd, g_umd22),
            stu('Ефимова',   'Галина',    'Васильевна',  date(2004,8,29),  '+7 916 401-01-06', 'efimova.g@mail.ru',   f_umd, g_umd22),
        ]
        # УМД-23
        students += [
            stu('Жданов',    'Евгений',   'Андреевич',   date(2005,3,16),  '+7 916 402-02-01', 'zhdanov.e@mail.ru',   f_umd, g_umd23),
            stu('Зимина',    'Алёна',     'Игоревна',    date(2005,7,4),   '+7 916 402-02-02', 'zimina.al@mail.ru',   f_umd, g_umd23),
            stu('Киреев',    'Борис',     'Станиславович',date(2005,11,20),'+7 916 402-02-03', 'kireev.b@mail.ru',    f_umd, g_umd23),
            stu('Лебедев',   'Артём',     'Олегович',    date(2005,5,8),   '+7 916 402-02-04', 'lebedev.ar@mail.ru',  f_umd, g_umd23),
            stu('Морозова',  'Валентина', 'Сергеевна',   date(2005,9,25),  '+7 916 402-02-05', 'morozova.val@mail.ru',f_umd, g_umd23),
        ]
        # ВКС-23
        students += [
            stu('Никифоров', 'Руслан',    'Павлович',    date(2005,2,11),  '+7 916 501-01-01', 'nikiforov.r@mail.ru', f_vks, g_vks23),
            stu('Овчинникова','Карина',   'Дмитриевна',  date(2005,6,26),  '+7 916 501-01-02', 'ovchinnikova.k@mail.ru',f_vks,g_vks23),
            stu('Пименов',   'Сергей',    'Александрович',date(2005,10,12),'+7 916 501-01-03', 'pimenov.s@mail.ru',   f_vks, g_vks23),
            stu('Рогова',    'Людмила',   'Викторовна',  date(2005,4,1),   '+7 916 501-01-04', 'rogova.l@mail.ru',    f_vks, g_vks23),
            stu('Савельев',  'Денис',     'Михайлович',  date(2005,8,18),  '+7 916 501-01-05', 'saveliev.d@mail.ru',  f_vks, g_vks23),
        ]
        # ВКС-24
        students += [
            stu('Тарасова',  'Инна',      'Евгеньевна',  date(2006,1,7),   '+7 916 502-02-01', 'tarasova.i@mail.ru',  f_vks, g_vks24),
            stu('Ульянов',   'Геннадий',  'Борисович',   date(2006,5,22),  '+7 916 502-02-02', 'ulyanov.g@mail.ru',   f_vks, g_vks24),
            stu('Фролова',   'Оксана',    'Николаевна',  date(2006,9,10),  '+7 916 502-02-03', 'frolova.o@mail.ru',   f_vks, g_vks24),
            stu('Хомяков',   'Владимир',  'Юрьевич',     date(2006,3,28),  '+7 916 502-02-04', 'khomyakov.v@mail.ru', f_vks, g_vks24),
            stu('Шаповалов', 'Тимур',     'Алексеевич',  date(2006,7,15),  '+7 916 502-02-05', '',                    f_vks, g_vks24),
        ]

        self.stdout.write(f'  Студентов: {len(students)}')

        # --- Опекуны ---
        def par(ln, fn, mn, bd, ph, em):
            return Parent.objects.create(institution=inst, last_name=ln, first_name=fn,
                middle_name=mn, birth_date=bd, phone=ph, email=em)

        p1  = par('Антонов',  'Сергей',  'Владимирович',date(1978,6,10), '+7 916 901-00-01', 'antonov.sv@mail.ru')
        p2  = par('Антонова', 'Людмила', 'Фёдоровна',   date(1980,3,22), '+7 916 901-00-02', 'antonova.lf@mail.ru')
        p3  = par('Белкин',   'Олег',    'Петрович',     date(1975,9,14), '+7 916 901-00-03', 'belkin.op@mail.ru')
        p4  = par('Жукова',   'Татьяна', 'Сергеевна',   date(1982,1,30), '+7 916 901-00-04', 'zhukova.ts@mail.ru')
        p5  = par('Воронов',  'Максим',  'Андреевич',   date(1979,7,5),  '+7 916 901-00-05', 'voronov.ma@mail.ru')
        p6  = par('Карпов',   'Иван',    'Николаевич',  date(1977,11,18),'+7 916 901-00-06', 'karpov.in@mail.ru')
        p7  = par('Тихомирова','Елена',  'Борисовна',   date(1981,4,8),  '+7 916 901-00-07', 'tikhomirova.eb@mail.ru')
        p8  = par('Чернова',  'Надежда', 'Юрьевна',     date(1983,8,27), '+7 916 901-00-08', 'chernova.ny@mail.ru')

        StudentParent.objects.create(student=students[0],  parent=p1,  relation_type='father')
        StudentParent.objects.create(student=students[0],  parent=p2,  relation_type='mother')
        StudentParent.objects.create(student=students[1],  parent=p3,  relation_type='father')
        StudentParent.objects.create(student=students[6],  parent=p4,  relation_type='mother')
        StudentParent.objects.create(student=students[7],  parent=p5,  relation_type='father')
        StudentParent.objects.create(student=students[10], parent=p6,  relation_type='father')
        StudentParent.objects.create(student=students[19], parent=p7,  relation_type='mother')
        StudentParent.objects.create(student=students[24], parent=p8,  relation_type='mother')
        self.stdout.write('  Опекунов: 8')

        # --- Предметы ---
        subj_names = [
            'Математика', 'Физика', 'Русский язык и культура речи',
            'Программирование на Python', 'Базы данных', 'Веб-разработка',
            'Компьютерные сети', 'Операционные системы',
            'Основы 3D-моделирования', 'Аддитивные технологии и 3D-печать',
            'Материаловедение', 'Техническое черчение',
            'Жилищное законодательство', 'Управление недвижимостью',
            'Техническая эксплуатация зданий', 'Физкультура',
        ]
        subjects = {n: Subject.objects.create(name=n, institution=inst) for n in subj_names}
        self.stdout.write(f'  Предметов: {len(subjects)}')

        # --- Назначения предмет-группа-преподаватель ---
        assignments = [
            # ИСП-22
            (g_isp22, 'Математика',                  e_isp1),
            (g_isp22, 'Программирование на Python',  e_isp1),
            (g_isp22, 'Базы данных',                 e_isp2),
            (g_isp22, 'Веб-разработка',              e_isp2),
            (g_isp22, 'Операционные системы',        e_isp3),
            (g_isp22, 'Физкультура',                 e_zav),
            # ИСП-23
            (g_isp23, 'Математика',                  e_isp1),
            (g_isp23, 'Программирование на Python',  e_isp1),
            (g_isp23, 'Базы данных',                 e_isp2),
            (g_isp23, 'Компьютерные сети',           e_isp3),
            (g_isp23, 'Физкультура',                 e_zav),
            # ИСП-24
            (g_isp24, 'Программирование на Python',  e_isp1),
            (g_isp24, 'Базы данных',                 e_isp2),
            (g_isp24, 'Русский язык и культура речи',e_meth),
            # АТ-22
            (g_at22,  'Основы 3D-моделирования',     e_at1),
            (g_at22,  'Аддитивные технологии и 3D-печать', e_at1),
            (g_at22,  'Материаловедение',             e_at2),
            (g_at22,  'Техническое черчение',         e_at2),
            (g_at22,  'Математика',                  e_isp1),
            (g_at22,  'Физкультура',                 e_zav),
            # АТ-23
            (g_at23,  'Основы 3D-моделирования',     e_at1),
            (g_at23,  'Аддитивные технологии и 3D-печать', e_at2),
            (g_at23,  'Материаловедение',             e_at2),
            (g_at23,  'Физика',                      e_at1),
            # УМД-22
            (g_umd22, 'Жилищное законодательство',   e_umd1),
            (g_umd22, 'Управление недвижимостью',    e_umd1),
            (g_umd22, 'Техническая эксплуатация зданий', e_umd2),
            (g_umd22, 'Математика',                  e_isp1),
            (g_umd22, 'Физкультура',                 e_zav),
            # УМД-23
            (g_umd23, 'Жилищное законодательство',   e_umd1),
            (g_umd23, 'Управление недвижимостью',    e_umd2),
            (g_umd23, 'Техническая эксплуатация зданий', e_umd2),
            (g_umd23, 'Русский язык и культура речи',e_meth),
            # ВКС-23
            (g_vks23, 'Компьютерные сети',           e_vks1),
            (g_vks23, 'Веб-разработка',              e_vks2),
            (g_vks23, 'Операционные системы',        e_vks1),
            (g_vks23, 'Программирование на Python',  e_isp1),
            (g_vks23, 'Физкультура',                 e_zav),
            # ВКС-24
            (g_vks24, 'Компьютерные сети',           e_vks1),
            (g_vks24, 'Веб-разработка',              e_vks2),
            (g_vks24, 'Математика',                  e_isp1),
            (g_vks24, 'Русский язык и культура речи',e_meth),
        ]
        for grp, subj_name, emp_obj in assignments:
            GroupSubjectEmployee.objects.create(group=grp, subject=subjects[subj_name], employee=emp_obj)
        self.stdout.write(f'  Назначений предметов: {len(assignments)}')

        # --- Пользователи ---
        def make_user(username, display_name, email, role, employee=None):
            u = User(username=username, display_name=display_name, email=email,
                     role=role, institution=inst, is_active=True, employee=employee)
            u.set_password('admin_-1')
            u.save()
            return u

        make_user('admin_gromov',    'Громов Виктор Павлович',          'gromov@mkag.ru',      'admin')
        make_user('admin_belyakova', 'Белякова Ирина Олеговна',         'belyakova@mkag.ru',   'admin')
        make_user('sokolov_teach',   'Соколов Андрей Игоревич',         'sokolov@mkag.ru',     'teacher', e_isp1)
        make_user('fedorova_teach',  'Фёдорова Марина Сергеевна',       'fedorova@mkag.ru',    'teacher', e_isp2)
        make_user('tarasov_teach',   'Тарасов Денис Алексеевич',        'tarasov@mkag.ru',     'teacher', e_isp3)
        make_user('vlasov_teach',    'Власов Роман Викторович',         'vlasov@mkag.ru',      'teacher', e_at1)
        make_user('orekhova_teach',  'Орехова Наталья Дмитриевна',      'orekhova@mkag.ru',    'teacher', e_at2)
        make_user('krylova_teach',   'Крылова Ольга Владимировна',      'krylova@mkag.ru',     'teacher', e_umd1)
        make_user('zimin_teach',     'Зимин Сергей Николаевич',         'zimin@mkag.ru',       'teacher', e_umd2)
        make_user('panov_teach',     'Панов Алексей Романович',         'panov@mkag.ru',       'teacher', e_vks1)
        make_user('lukyanova_teach', 'Лукьянова Екатерина Петровна',    'lukyanova@mkag.ru',   'teacher', e_vks2)

        total_users = User.objects.filter(institution=inst).count() + 1  # +owner
        self.stdout.write(f'  Пользователей: {total_users}')

        self.stdout.write(self.style.SUCCESS('\nБаза заполнена! Данные МКАГ готовы.'))
        self.stdout.write('  Владелец:      direktormkag / admin_-1')
        self.stdout.write('  Администратор: admin_gromov  / admin_-1')
        self.stdout.write('  Преподаватель: sokolov_teach / admin_-1')
