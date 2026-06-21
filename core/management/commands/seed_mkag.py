import os
import shutil
from datetime import date
from django.core.management.base import BaseCommand
from django.core.files import File
from django.core.files.base import ContentFile
from django.conf import settings

from core.models import (
    Institution, Faculty, Position, Employee, Group, Student, Parent,
    StudentParent, Subject, GroupSubjectEmployee, Document, User, EmailCode,
    AuditLog, DeleteRequest, RecordNote,
)

MALE = [
    ('Алексеев', 'Дмитрий', 'Андреевич'),   ('Борисов', 'Максим', 'Сергеевич'),
    ('Васильев', 'Иван', 'Николаевич'),      ('Гришин', 'Никита', 'Михайлович'),
    ('Денисов', 'Алексей', 'Дмитриевич'),   ('Егоров', 'Артем', 'Павлович'),
    ('Жуков', 'Кирилл', 'Игоревич'),        ('Захаров', 'Павел', 'Александрович'),
    ('Ильин', 'Роман', 'Владимирович'),     ('Карпов', 'Сергей', 'Алексеевич'),
    ('Лазарев', 'Михаил', 'Николаевич'),    ('Макаров', 'Андрей', 'Дмитриевич'),
    ('Нестеров', 'Владимир', 'Сергеевич'),  ('Орехов', 'Илья', 'Михайлович'),
    ('Платонов', 'Антон', 'Игоревич'),      ('Романов', 'Виталий', 'Павлович'),
    ('Степанов', 'Олег', 'Александрович'),  ('Тимофеев', 'Даниил', 'Владимирович'),
    ('Уваров', 'Вячеслав', 'Алексеевич'),   ('Фомин', 'Евгений', 'Николаевич'),
]

FEMALE = [
    ('Алексеева', 'Анастасия', 'Сергеевна'), ('Борисова', 'Екатерина', 'Дмитриевна'),
    ('Васильева', 'Мария', 'Николаевна'),    ('Гришина', 'Ольга', 'Андреевна'),
    ('Денисова', 'Юлия', 'Михайловна'),     ('Егорова', 'Елена', 'Сергеевна'),
    ('Жукова', 'Дарья', 'Алексеевна'),      ('Захарова', 'Наталья', 'Игоревна'),
    ('Ильина', 'Ирина', 'Дмитриевна'),      ('Карпова', 'Татьяна', 'Павловна'),
    ('Лазарева', 'Светлана', 'Николаевна'), ('Макарова', 'Анна', 'Владимировна'),
    ('Нестерова', 'Виктория', 'Михайловна'),('Орехова', 'Полина', 'Сергеевна'),
    ('Платонова', 'Кристина', 'Алексеевна'),('Романова', 'Валентина', 'Игоревна'),
    ('Степанова', 'Диана', 'Дмитриевна'),   ('Тимофеева', 'Марина', 'Николаевна'),
    ('Уварова', 'Алина', 'Павловна'),       ('Фомина', 'Людмила', 'Александровна'),
]


def ph(n):
    """Генерирует телефон формата 8-9XX-XXX-XX-XX по порядковому номеру."""
    digits = f'{9000000000 + n:010d}'
    return f'8-{digits[0:3]}-{digits[3:6]}-{digits[6:8]}-{digits[8:10]}'


class Command(BaseCommand):
    help = 'Заполняет базу данными МКАГ (сотрудники, группы, студенты, родители, документы)'

    def handle(self, *args, **kwargs):
        mkag_dir = os.path.join(str(settings.BASE_DIR), 'мкаг')
        media_root = str(settings.MEDIA_ROOT)
        _doc_n = [0]

        def set_photo(obj, filename):
            path = os.path.join(mkag_dir, filename)
            if os.path.exists(path):
                with open(path, 'rb') as f:
                    obj.photo.save(filename, File(f), save=True)
            else:
                self.stdout.write(f'  [!] Фото не найдено: {filename}')

        def add_doc(owner_type, owner_id, name, doc_type, desc=''):
            _doc_n[0] += 1
            content = f'{name}\n{desc}'.encode('utf-8')
            doc = Document(owner_type=owner_type, owner_id=owner_id,
                           name=name, doc_type=doc_type, description=desc)
            doc.file.save(f'doc_{_doc_n[0]}.txt', ContentFile(content), save=True)

        # --- Очистка ---
        self.stdout.write('Очистка данных...')
        for model in [AuditLog, DeleteRequest, RecordNote, GroupSubjectEmployee,
                      StudentParent, Document, Student, Group, Faculty, Subject,
                      Employee, Position, Parent, User, Institution, EmailCode]:
            model.objects.all().delete()

        for subdir in ['employees', 'students', 'parents', 'users', 'institutions', 'documents']:
            d = os.path.join(media_root, subdir)
            if os.path.exists(d):
                shutil.rmtree(d)
            os.makedirs(d, exist_ok=True)

        # --- Владелец ---
        self.stdout.write('Создание владельца...')
        owner = User.objects.create_superuser(
            username='AAArionchik', password='12345678Q-',
            display_name='Ариончик Александр Александрович',
        )
        set_photo(owner, 'Суперадмин.webp')

        # --- Организация ---
        inst = Institution.objects.create(
            owner=owner, code='МКАГ',
            name='Государственное бюджетное профессиональное образовательное учреждение '
                 'Московский колледж архитектуры и градостроительства',
        )
        set_photo(inst, 'ЛОГО МКАГ.jpg')
        owner.institution = inst
        owner.save(update_fields=['institution'])

        # --- Должности ---
        self.stdout.write('Создание должностей...')
        pos = {}
        for name, role_type in [
            ('Начальник отдела по содержанию образования', 'admin'),
            ('Заведующий учебной частью по содержанию образования', 'admin'),
            ('Документовед отдела по содержанию образования', 'admin'),
            ('Начальник отдела по учебно-производственной работе', 'admin'),
            ('Специалист по учебно-производственной работе', 'admin'),
            ('Педагог-библиотекарь', 'none'),
            ('Советник директора по воспитанию и взаимодействию с детскими общественными объединениями', 'admin'),
            ('Социальный педагог службы психолого-педагогического сопровождения', 'admin'),
            ('Рабочий по комплексному обслуживанию и ремонту зданий', 'none'),
            ('Специалист отдела организации питания', 'none'),
            ('Специалист по сетевому администрированию', 'admin'),
            ('Преподаватель ВПЦК строительных дисциплин', 'teacher'),
            ('Преподаватель ВПЦК информатики и экономики', 'teacher'),
            ('Мастер производственного обучения', 'teacher'),
            ('Преподаватель ПЦК общеобразовательных дисциплин и физической культуры', 'teacher'),
        ]:
            pos[name] = Position.objects.create(institution=inst, name=name, role_type=role_type)
        self.stdout.write(f'  Должностей: {len(pos)}')

        # --- Сотрудники ---
        # (фамилия, имя, отч, должность, фото, телефон, email, документы)
        self.stdout.write('Создание сотрудников...')
        emps = {}
        emp_docs = {}
        for i, (ln, fn, mn, pos_key, photo_file, phone, email, docs) in enumerate([
            ('Ломакин',    'Андрей',    'Александрович', 'Начальник отдела по содержанию образования',     'Ломакин.jpeg',   ph(1),  'lomakin@mcag.ru',       ['passport','snils','order','policy']),
            ('Баширова',   'Анастасия', 'Георгиевна',    'Заведующий учебной частью по содержанию образования', 'Баширова.jpeg', ph(2),  'bashirova@mcag.ru',     ['passport','snils']),
            ('Овчарова',   'Светлана',  'Алексеевна',    'Заведующий учебной частью по содержанию образования', 'Овчарова.jpeg', ph(3),  'ovcharova@mcag.ru',     ['passport','snils','policy']),
            ('Теплякова',  'Елена',     'Александровна', 'Документовед отдела по содержанию образования',  'Теплякова.jpeg', ph(4),  'teplyakova@mcag.ru',    ['snils','policy']),
            ('Шандрина',   'Ольга',     'Васильевна',    'Заведующий учебной частью по содержанию образования', 'Шандарина.jpeg', ph(5), 'shandrina@mcag.ru',    ['passport','snils']),
            ('Папошина',   'Ирина',     'Николаевна',    'Начальник отдела по учебно-производственной работе', 'Папошина.jpeg', ph(6),  'paposhina@mcag.ru',     ['passport','snils','order','policy']),
            ('Цветцих',    'Эдуард',    'Альбертович',   'Специалист по учебно-производственной работе',   'Цветцих.jpeg',   ph(7),  'cvetsikh@mcag.ru',      ['passport','snils']),
            ('Некрасова',  'Надежда',   'Николаевна',    'Педагог-библиотекарь',                           'Некрасова.jpeg', ph(8),  'nekrasova@mcag.ru',     ['snils','policy']),
            ('Глевицкая',  'Валерия',   'Евгеньевна',    'Советник директора по воспитанию и взаимодействию с детскими общественными объединениями', 'Глевицкая.jpeg', ph(9), 'glevitskaya@mcag.ru', ['passport','snils']),
            ('Реннь',      'Елена',     'Геннадьевна',   'Социальный педагог службы психолого-педагогического сопровождения', 'Реннь.jpeg', ph(10), 'renn@mcag.ru', ['passport','snils','policy']),
            ('Шумараев',   'Геннадий',  'Николаевич',    'Рабочий по комплексному обслуживанию и ремонту зданий', 'Шумараев.jpeg', ph(11), 'shumaraev@mcag.ru', ['snils']),
            ('Минаков',    'Павел',     'Геннадьевич',   'Рабочий по комплексному обслуживанию и ремонту зданий', 'Минаков.jpeg', ph(12), 'minakov@mcag.ru',    ['snils']),
            ('Краснов',    'Александр', 'Александрович', 'Специалист отдела организации питания',           'Краснов.jpeg',   ph(13), 'krasnov@mcag.ru',       ['passport','snils']),
            ('Карамян',    'Артур',     'Меликович',     'Специалист по сетевому администрированию',        'Карамян.jpeg',   ph(14), 'karamyan@mcag.ru',      ['passport','snils']),
            ('Суворов',    'Игорь',     'Сергеевич',     'Специалист по сетевому администрированию',        'Суворов.jpeg',   ph(15), 'suvorov@mcag.ru',       ['passport','snils']),
            ('Ермолов',    'Эдуард',    'Николаевич',    'Преподаватель ПЦК общеобразовательных дисциплин и физической культуры', 'Ермолов.jpeg', ph(16), 'ermolov@mcag.ru',    ['passport','snils','certificate','policy']),
            ('Оганисян',   'Вардануш',  'Мартуновна',    'Преподаватель ВПЦК строительных дисциплин',       'Оганисян.jpeg',  ph(17), 'oganisyan@mcag.ru',     ['passport','snils','certificate']),
            ('Гадецкая',   'Евгения',   'Генадьевна',    'Преподаватель ВПЦК информатики и экономики',      'Гадецкая.jpeg',  ph(18), 'gadetskaya@mcag.ru',    ['passport','snils','certificate']),
            ('Карсаков',   'Андрей',    'Юрьевич',       'Преподаватель ВПЦК информатики и экономики',      'Карсаков.jpeg',  ph(19), 'karsakov@mcag.ru',      ['passport','snils','policy']),
            ('Кашкина',    'Юлия',      'Андреевна',     'Преподаватель ВПЦК информатики и экономики',      'Кашкина.jpeg',   ph(20), 'kashkina@mcag.ru',      ['passport','snils']),
            ('Кондаурова', 'Любовь',    'Анатольевна',   'Преподаватель ВПЦК информатики и экономики',      'Кондаурова.jpeg',ph(21), 'kondaurova@mcag.ru',    ['passport','snils','certificate']),
            ('Белогруд',   'Павел',     'Алексеевич',    'Мастер производственного обучения',               'Белогруд.jpeg',  ph(22), 'belogrud@mcag.ru',      ['passport','snils']),
            ('Надежкин',   'Александр', 'Геннадьевич',   'Мастер производственного обучения',               'Надежкин.jpeg',  ph(23), 'nadezhkin@mcag.ru',     ['passport','snils','certificate']),
            ('Панченко',   'Варвара',   'Никитична',     'Мастер производственного обучения',               'Панченко.jpeg',  ph(24), 'panchenko@mcag.ru',     ['passport','snils']),
            ('Харламова',  'Мария',     'Павловна',      'Мастер производственного обучения',               'Харламова.jpeg', ph(25), 'harlamova@mcag.ru',     ['snils','policy']),
            ('Хилимендик', 'Алексей',   'Владимирович',  'Мастер производственного обучения',               'Хилимендик.jpeg',ph(26), 'hilimendik@mcag.ru',    ['passport','snils']),
            ('Желудова',   'Ирина',     'Анатольевна',   'Преподаватель ПЦК общеобразовательных дисциплин и физической культуры', 'Желудова.jpeg', ph(27), 'zheludova@mcag.ru', ['passport','snils','certificate']),
            ('Белова',     'Наталья',   'Викторовна',    'Преподаватель ПЦК общеобразовательных дисциплин и физической культуры', None, ph(28), 'belova@mcag.ru', ['passport','snils']),
        ]):
            emp = Employee.objects.create(institution=inst, last_name=ln, first_name=fn,
                                          middle_name=mn, position=pos[pos_key],
                                          phone=phone, email=email)
            if photo_file:
                set_photo(emp, photo_file)
            emps[ln] = emp
            emp_docs[ln] = docs
        self.stdout.write(f'  Сотрудников: {len(emps)}')

        # --- Факультеты ---
        f_umd  = Faculty.objects.create(institution=inst, full_name='Управление многоквартирными домами',        short_name='УМД',  created_at=date(2010, 9, 1))
        f_isip = Faculty.objects.create(institution=inst, full_name='Информационные системы и программирование', short_name='ИСиП', created_at=date(2010, 9, 1))
        f_at   = Faculty.objects.create(institution=inst, full_name='Аддитивные технологии',                     short_name='АТ',   created_at=date(2018, 9, 1))

        # --- Группы ---
        g_umd_1_22  = Group.objects.create(faculty=f_umd,  year=2022, headteacher=emps['Кашкина'])
        g_umd_2_22  = Group.objects.create(faculty=f_umd,  year=2022, headteacher=emps['Кондаурова'])
        g_umd_1_23  = Group.objects.create(faculty=f_umd,  year=2023, headteacher=emps['Надежкин'])
        g_umd_2_23  = Group.objects.create(faculty=f_umd,  year=2023, headteacher=emps['Панченко'])
        g_at_1_22   = Group.objects.create(faculty=f_at,   year=2022, headteacher=emps['Оганисян'])
        g_at_2_22   = Group.objects.create(faculty=f_at,   year=2022, headteacher=emps['Белогруд'])
        g_at_1_23   = Group.objects.create(faculty=f_at,   year=2023, headteacher=emps['Харламова'])
        g_at_1_24   = Group.objects.create(faculty=f_at,   year=2024, headteacher=emps['Хилимендик'])
        g_at_2_24   = Group.objects.create(faculty=f_at,   year=2024, headteacher=emps['Желудова'])
        g_isip_1_22 = Group.objects.create(faculty=f_isip, year=2022, headteacher=emps['Гадецкая'])
        g_isip_2_22 = Group.objects.create(faculty=f_isip, year=2022, headteacher=emps['Карсаков'])
        g_isip_3_22 = Group.objects.create(faculty=f_isip, year=2022, headteacher=emps['Ермолов'])
        self.stdout.write('  Групп: 12')

        # --- Предметы ---
        subj = {n: Subject.objects.create(institution=inst, name=n) for n in [
            'Физическая культура', 'Безопасность жизнедеятельности',
            'Основы безопасности и защиты Родины',
            'Охрана окружающей среды, ресурсосбережение и бережливое производство',
            'Основы безопасности на производстве',
            'Стандартизация, сертификация и техническое документоведение',
            'Управление и автоматизация баз данных',
            'Технология разработки программного обеспечения',
            'Визуальное программирование',
            'Разработка и администрирование систем обработки баз данных',
            'Учебная практика', 'Экономика отрасли',
            'Менеджмент в профессиональной деятельности',
            'Проектирование, разработка кода и тестирование информационных систем',
            'Компьютерные сети', 'Администрирование информационных систем',
            'Моделирование и анализ программного обеспечения',
            'Философия', 'История', 'Право',
            'Математические методы решения прикладных профессиональных задач',
        ]}
        self.stdout.write(f'  Предметов: {len(subj)}')

        # --- Назначения предметов ---
        all_isip = [g_isip_1_22, g_isip_2_22, g_isip_3_22]
        all_umd  = [g_umd_1_22, g_umd_2_22, g_umd_1_23, g_umd_2_23]
        all_at   = [g_at_1_22, g_at_2_22, g_at_1_23, g_at_1_24, g_at_2_24]
        y23_24   = [g_umd_1_23, g_umd_2_23, g_at_1_23, g_at_1_24, g_at_2_24]
        umd_22   = [g_umd_1_22, g_umd_2_22]
        at_22    = [g_at_1_22, g_at_2_22]

        cnt = [0]
        def assign(groups, subject_name, emp_last):
            for g in groups:
                _, created = GroupSubjectEmployee.objects.get_or_create(
                    group=g, subject=subj[subject_name], defaults={'employee': emps[emp_last]})
                if created:
                    cnt[0] += 1

        assign(all_isip + all_umd, 'Физическая культура', 'Ермолов')
        assign([g_at_1_24, g_at_2_24], 'Безопасность жизнедеятельности', 'Ермолов')
        assign(all_umd + all_at, 'Основы безопасности и защиты Родины', 'Ермолов')
        assign(all_umd, 'Охрана окружающей среды, ресурсосбережение и бережливое производство', 'Оганисян')
        assign(all_at, 'Основы безопасности на производстве', 'Оганисян')
        assign(all_isip, 'Стандартизация, сертификация и техническое документоведение', 'Оганисян')
        assign([g_isip_1_22, g_isip_2_22], 'Управление и автоматизация баз данных', 'Гадецкая')
        assign([g_isip_3_22],              'Управление и автоматизация баз данных', 'Харламова')
        assign(all_isip, 'Технология разработки программного обеспечения', 'Гадецкая')
        assign(all_isip, 'Визуальное программирование', 'Карсаков')
        assign(all_isip, 'Разработка и администрирование систем обработки баз данных', 'Кашкина')
        assign(all_at,   'Учебная практика', 'Кашкина')
        assign(umd_22 + all_isip, 'Экономика отрасли', 'Кондаурова')
        assign(all_at, 'Менеджмент в профессиональной деятельности', 'Кондаурова')
        assign(all_isip, 'Проектирование, разработка кода и тестирование информационных систем', 'Белогруд')
        assign(all_isip, 'Компьютерные сети', 'Надежкин')
        assign(all_isip, 'Администрирование информационных систем', 'Панченко')
        assign(all_isip, 'Моделирование и анализ программного обеспечения', 'Хилимендик')
        assign(y23_24, 'Философия', 'Желудова')
        assign(y23_24, 'История',   'Желудова')
        assign(y23_24, 'Право',     'Желудова')
        assign(at_22, 'Математические методы решения прикладных профессиональных задач', 'Белова')
        self.stdout.write(f'  Назначений: {cnt[0]}')

        # --- Студенты ИСиП-3-22 (конкретные, с телефонами и email) ---
        self.stdout.write('Создание студентов...')
        # (фам, имя, отч, дата рожд, фото, телефон, email, фам_отца, имя_отца, отч_отца, фам_матери, имя_матери, отч_матери)
        isip3_data = [
            ('Пушков',     'Никита',    'Максимович',  date(2004,10,15), 'Пушков.JPG',   ph(101), 'pushkov@student.mcag.ru',
             'Пушков',    'Максим',    'Иванович',    ph(201), 'pushkov.m@mail.ru',
             'Пушкова',   'Ирина',     'Викторовна',  ph(202), 'pushkova.i@mail.ru'),
            ('Орлов',      'Никита',    'Алексеевич',  date(2004, 3,22), 'Орлов.jpg',    ph(102), 'orlov@student.mcag.ru',
             'Орлов',     'Алексей',   'Петрович',    ph(203), 'orlov.a@mail.ru',
             None, None, None, None, None),
            ('Шармин',     'Петр',      'Сергеевич',   date(2004, 7, 8), 'Шармин.jpg',   ph(103), 'sharmin@student.mcag.ru',
             'Шармин',    'Сергей',    'Андреевич',   ph(204), 'sharmin.s@mail.ru',
             'Шармина',   'Наталья',   'Игоревна',    ph(205), 'sharmina.n@mail.ru'),
            ('Стеля',      'Дарья',     'Андриановна', date(2004,11, 5), None,           ph(104), 'stelya@student.mcag.ru',
             'Стеля',     'Андриан',   'Викторович',  ph(206), 'stelya.a@mail.ru',
             None, None, None, None, None),
            ('Игнатов',    'Никита',    'Евгеньевич',  date(2004, 5,18), 'Игнатов.jpg',  ph(105), 'ignatov@student.mcag.ru',
             'Игнатов',   'Евгений',   'Павлович',    ph(207), 'ignatov.e@mail.ru',
             'Игнатова',  'Марина',    'Александровна', ph(208), 'ignatova.m@mail.ru'),
            ('Суханов',    'Иван',      'Сергеевич',   date(2004, 9,30), 'Суханов.jpg',  ph(106), 'sukhanov@student.mcag.ru',
             'Суханов',   'Сергей',    'Николаевич',  ph(209), 'sukhanov.s@mail.ru',
             None, None, None, None, None),
            ('Суетнов',    'Артем',     'Викторович',  date(2004, 2,14), None,           ph(107), 'suetnov@student.mcag.ru',
             'Суетнов',   'Виктор',    'Александрович', ph(210), 'suetnov.v@mail.ru',
             'Суетнова',  'Елена',     'Михайловна',  ph(211), 'suetnova.e@mail.ru'),
            ('Почаи',      'Мирослав',  'Иммревич',    date(2004, 6,27), None,           ph(108), 'pochay@student.mcag.ru',
             'Почаи',     'Иммрей',    'Александрович', ph(212), 'pochay.i@mail.ru',
             None, None, None, None, None),
            ('Акульшин',   'Федор',     'Дмитриевич',  date(2004, 4, 3), None,           ph(109), 'akulshin@student.mcag.ru',
             'Акульшин',  'Дмитрий',   'Сергеевич',   ph(213), 'akulshin.d@mail.ru',
             'Акульшина', 'Ольга',     'Павловна',    ph(214), 'akulshina.o@mail.ru'),
            ('Тымчук',     'Максим',    'Андреевич',   date(2004,12,19), 'Тымчук.jpg',   ph(110), 'tymchuk@student.mcag.ru',
             'Тымчук',    'Андрей',    'Николаевич',  ph(215), 'tymchuk.a@mail.ru',
             None, None, None, None, None),
            ('Зимов',      'Даниил',    'Михайлович',  date(2004, 8,11), None,           ph(111), 'zimov@student.mcag.ru',
             'Зимов',     'Михаил',    'Сергеевич',   ph(216), 'zimov.m@mail.ru',
             'Зимова',    'Татьяна',   'Алексеевна',  ph(217), 'zimova.t@mail.ru'),
            ('Мирных',     'Андрей',    'Игоревич',    date(2004, 1,25), None,           ph(112), 'mirnykh@student.mcag.ru',
             'Мирных',    'Игорь',     'Дмитриевич',  ph(218), 'mirnykh.i@mail.ru',
             None, None, None, None, None),
            ('Бунаков',    'Константин','Алексеевич',  date(2004,10, 7), None,           ph(113), 'bunakov@student.mcag.ru',
             'Бунаков',   'Алексей',   'Павлович',    ph(219), 'bunakov.a@mail.ru',
             'Бунакова',  'Светлана',  'Николаевна',  ph(220), 'bunakova.s@mail.ru'),
            ('Хуторный',   'Илья',      'Романович',   date(2004, 3,16), None,           ph(114), 'khutorny@student.mcag.ru',
             'Хуторный',  'Роман',     'Андреевич',   ph(221), 'khutorny.r@mail.ru',
             None, None, None, None, None),
            ('Швецов',     'Алексей',   'Сергеевич',   date(2004, 7,29), None,           ph(115), 'shvetsov@student.mcag.ru',
             'Швецов',    'Сергей',    'Михайлович',  ph(222), 'shvetsov.s@mail.ru',
             'Швецова',   'Людмила',   'Ивановна',    ph(223), 'shvetsova.l@mail.ru'),
            ('Житинев',    'Артем',     'Алексеевич',  date(2004, 5,12), None,           ph(116), 'zitinev@student.mcag.ru',
             'Житинев',   'Алексей',   'Николаевич',  ph(224), 'zitinev.a@mail.ru',
             None, None, None, None, None),
            ('Молодчий',   'Никита',    'Игоревич',    date(2004,11,23), None,           ph(117), 'molodchy@student.mcag.ru',
             'Молодчий',  'Игорь',     'Дмитриевич',  ph(225), 'molodchy.i@mail.ru',
             'Молодчая',  'Анна',      'Сергеевна',   ph(226), 'molodchaya.a@mail.ru'),
            ('Реквием',    'Константин','Олегович',    date(2004, 9, 4), None,           ph(118), 'rekviem@student.mcag.ru',
             'Реквием',   'Олег',      'Владимирович', ph(227), 'rekviem.o@mail.ru',
             None, None, None, None, None),
            ('Лобанов',    'Андрей',    'Николаевич',  date(2004, 2,28), None,           ph(119), 'lobanov@student.mcag.ru',
             'Лобанов',   'Николай',   'Иванович',    ph(228), 'lobanov.n@mail.ru',
             'Лобанова',  'Елена',     'Андреевна',   ph(229), 'lobanova.e@mail.ru'),
            ('Смирницкий', 'Михаил',    'Дмитриевич',  date(2004, 6,15), None,           ph(120), 'smirnicky@student.mcag.ru',
             'Смирницкий','Дмитрий',   'Александрович', ph(230), 'smirnicky.d@mail.ru',
             None, None, None, None, None),
        ]

        isip3_students = []
        for row in isip3_data:
            ln, fn, mn, bd, photo_file, phone, email = row[0], row[1], row[2], row[3], row[4], row[5], row[6]
            st = Student.objects.create(institution=inst, last_name=ln, first_name=fn,
                                        middle_name=mn, birth_date=bd, phone=phone, email=email,
                                        faculty=f_isip, group=g_isip_3_22)
            if photo_file:
                set_photo(st, photo_file)
            isip3_students.append((st, row))

        # --- Рандомные студенты ---
        random_groups = [
            (f_umd,  g_umd_1_22,  2022, 0),  (f_umd,  g_umd_2_22,  2022, 5),
            (f_umd,  g_umd_1_23,  2023, 10), (f_umd,  g_umd_2_23,  2023, 15),
            (f_at,   g_at_1_22,   2022, 2),  (f_at,   g_at_2_22,   2022, 7),
            (f_at,   g_at_1_23,   2023, 12), (f_at,   g_at_1_24,   2024, 17),
            (f_at,   g_at_2_24,   2024, 4),  (f_isip, g_isip_1_22, 2022, 9),
            (f_isip, g_isip_2_22, 2022, 14),
        ]
        rand_students = []
        ph_counter = [300]
        for gi, (fac, grp, yr, off) in enumerate(random_groups):
            base_birth = yr - 17
            grp_students = []
            for i in range(5):
                ln, fn, mn = MALE[(off + i) % 20]
                ph_counter[0] += 1
                st = Student.objects.create(
                    institution=inst, last_name=ln, first_name=fn, middle_name=mn,
                    birth_date=date(base_birth, (off + i) % 12 + 1, (off + i * 3) % 28 + 1),
                    phone=ph(ph_counter[0]),
                    email=f'{ln.lower()}{ph_counter[0]}@mail.ru',
                    faculty=fac, group=grp)
                grp_students.append(st)
            for i in range(3):
                ln, fn, mn = FEMALE[(off + i) % 20]
                ph_counter[0] += 1
                st = Student.objects.create(
                    institution=inst, last_name=ln, first_name=fn, middle_name=mn,
                    birth_date=date(base_birth, (off + i + 3) % 12 + 1, (off + i * 5) % 28 + 1),
                    phone=ph(ph_counter[0]),
                    email=f'{ln.lower()}{ph_counter[0]}@mail.ru',
                    faculty=fac, group=grp)
                grp_students.append(st)
            rand_students.append((gi, grp_students))

        total_students = len(isip3_students) + sum(len(g[1]) for g in rand_students)
        self.stdout.write(f'  Студентов: {total_students}')

        # --- Родители ИСиП-3-22 ---
        self.stdout.write('Создание родителей...')
        parent_count = 0
        for st, row in isip3_students:
            f_ln, f_fn, f_mn, f_ph, f_em = row[7], row[8], row[9], row[10], row[11]
            m_ln, m_fn, m_mn, m_ph, m_em = row[12], row[13], row[14], row[15], row[16]

            if f_fn:
                dad = Parent.objects.create(
                    institution=inst, last_name=f_ln, first_name=f_fn, middle_name=f_mn,
                    birth_date=date(1972, (parent_count % 12) + 1, (parent_count % 28) + 1),
                    phone=f_ph, email=f_em)
                StudentParent.objects.create(student=st, parent=dad, relation_type='father')
                add_doc('parent', dad.pk, 'Паспорт', 'passport')
                add_doc('parent', dad.pk, 'СНИЛС', 'snils')
                parent_count += 1

            if m_fn:
                mom = Parent.objects.create(
                    institution=inst, last_name=m_ln, first_name=m_fn, middle_name=m_mn,
                    birth_date=date(1974, (parent_count % 12) + 1, (parent_count % 28) + 1),
                    phone=m_ph, email=m_em)
                StudentParent.objects.create(student=st, parent=mom, relation_type='mother')
                add_doc('parent', mom.pk, 'Паспорт', 'passport')
                add_doc('parent', mom.pk, 'СНИЛС', 'snils')
                parent_count += 1

        # --- Родители рандомных студентов ---
        male_f_names   = ['Александр', 'Сергей', 'Николай', 'Дмитрий', 'Андрей', 'Владимир', 'Михаил', 'Игорь']
        female_f_names = ['Татьяна', 'Елена', 'Ирина', 'Наталья', 'Светлана', 'Ольга', 'Людмила', 'Марина']
        m_pats = ['Александрович', 'Сергеевич', 'Николаевич', 'Дмитриевич', 'Андреевич', 'Владимирович', 'Михайлович', 'Игоревич']
        f_pats = ['Александровна', 'Сергеевна', 'Николаевна', 'Дмитриевна', 'Андреевна', 'Владимировна', 'Михайловна', 'Игоревна']

        for gi, grp_students in rand_students:
            for i, st in enumerate(grp_students):
                if i % 2 != 0:
                    continue
                idx = (gi + i) % 8
                ph_counter[0] += 1
                dad_ln = st.last_name
                if dad_ln.endswith('а') or dad_ln.endswith('я'):
                    dad_ln = dad_ln[:-1]
                dad = Parent.objects.create(
                    institution=inst, last_name=dad_ln,
                    first_name=male_f_names[idx], middle_name=m_pats[(idx + 1) % 8],
                    birth_date=date(1973, (gi + i) % 12 + 1, (gi + i * 2) % 28 + 1),
                    phone=ph(ph_counter[0]),
                    email=f'{dad_ln.lower()}.{male_f_names[idx].lower()}@mail.ru')
                StudentParent.objects.create(student=st, parent=dad, relation_type='father')
                add_doc('parent', dad.pk, 'СНИЛС', 'snils')
                parent_count += 1

                if i % 4 == 0:
                    ph_counter[0] += 1
                    mom_ln = st.last_name
                    if not (mom_ln.endswith('а') or mom_ln.endswith('я') or mom_ln.endswith('х')):
                        mom_ln = mom_ln + 'а'
                    mom = Parent.objects.create(
                        institution=inst, last_name=mom_ln,
                        first_name=female_f_names[idx], middle_name=f_pats[(idx + 2) % 8],
                        birth_date=date(1975, (gi + i + 3) % 12 + 1, (gi + i * 3) % 28 + 1),
                        phone=ph(ph_counter[0]),
                        email=f'{mom_ln.lower()}.{female_f_names[idx].lower()}@mail.ru')
                    StudentParent.objects.create(student=st, parent=mom, relation_type='mother')
                    add_doc('parent', mom.pk, 'Паспорт', 'passport')
                    add_doc('parent', mom.pk, 'СНИЛС', 'snils')
                    parent_count += 1

        self.stdout.write(f'  Родителей: {parent_count}')

        # --- Документы сотрудников ---
        self.stdout.write('Создание документов...')
        doc_names = {
            'passport': 'Паспорт', 'snils': 'СНИЛС', 'policy': 'Полис ОМС',
            'certificate': 'Диплом об образовании', 'order': 'Приказ о назначении', 'other': 'ИНН',
        }
        for ln, emp in emps.items():
            for dt in emp_docs.get(ln, []):
                add_doc('employee', emp.pk, doc_names[dt], dt)

        # Документы студентов ИСиП-3-22
        for i, (st, _) in enumerate(isip3_students):
            add_doc('student', st.pk, 'Паспорт', 'passport')
            add_doc('student', st.pk, 'СНИЛС', 'snils')
            if i % 3 == 0:
                add_doc('student', st.pk, 'Аттестат', 'certificate')
            if i % 4 == 0:
                add_doc('student', st.pk, 'Полис ОМС', 'policy')

        # Документы рандомных студентов
        for _, grp_sts in rand_students:
            for i, st in enumerate(grp_sts):
                add_doc('student', st.pk, 'СНИЛС', 'snils')
                if i % 2 == 0:
                    add_doc('student', st.pk, 'Паспорт', 'passport')

        self.stdout.write(f'  Документов: {_doc_n[0]}')

        # --- Пользователи ---
        self.stdout.write('Создание пользователей...')
        pwd = '12345678Q-'
        User.objects.create_user(username='Ovcharova', password=pwd, role='admin',
                                  institution=inst, display_name='Овчарова Светлана Алексеевна',
                                  employee=emps['Овчарова'])
        User.objects.create_user(username='Ermolov', password=pwd, role='teacher',
                                  institution=inst, display_name='Ермолов Эдуард Николаевич',
                                  employee=emps['Ермолов'])
        User.objects.create_user(username='Karsakov', password=pwd, role='teacher',
                                  institution=inst, display_name='Карсаков Андрей Юрьевич',
                                  employee=emps['Карсаков'])

        self.stdout.write(self.style.SUCCESS('\nГотово!'))
        self.stdout.write(f'  Владелец:       AAArionchik / {pwd}')
        self.stdout.write(f'  Администратор:  Ovcharova   / {pwd}')
        self.stdout.write(f'  Преподаватель:  Ermolov     / {pwd}')
        self.stdout.write(f'  Преподаватель:  Karsakov    / {pwd}')
        self.stdout.write(f'  Студентов: {total_students}, Родителей: {parent_count}, Документов: {_doc_n[0]}')
