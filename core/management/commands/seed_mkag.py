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
        self.stdout.write('Создание сотрудников...')
        emps = {}
        emp_docs = {}  # фамилия -> список типов документов
        for ln, fn, mn, pos_key, photo_file, docs in [
            ('Ломакин',    'Андрей',    'Александрович', 'Начальник отдела по содержанию образования',     'Ломакин.jpeg',    ['passport','snils','order','policy']),
            ('Баширова',   'Анастасия', 'Георгиевна',    'Заведующий учебной частью по содержанию образования', 'Баширова.jpeg', ['passport','snils']),
            ('Овчарова',   'Светлана',  'Алексеевна',    'Заведующий учебной частью по содержанию образования', 'Овчарова.jpeg', ['passport','snils','policy']),
            ('Теплякова',  'Елена',     'Александровна', 'Документовед отдела по содержанию образования',  'Теплякова.jpeg',  ['snils','policy']),
            ('Шандрина',   'Ольга',     'Васильевна',    'Заведующий учебной частью по содержанию образования', 'Шандарина.jpeg', ['passport','snils']),
            ('Папошина',   'Ирина',     'Николаевна',    'Начальник отдела по учебно-производственной работе', 'Папошина.jpeg', ['passport','snils','order','policy']),
            ('Цветцих',    'Эдуард',    'Альбертович',   'Специалист по учебно-производственной работе',   'Цветцих.jpeg',    ['passport','snils']),
            ('Некрасова',  'Надежда',   'Николаевна',    'Педагог-библиотекарь',                           'Некрасова.jpeg',  ['snils','policy']),
            ('Глевицкая',  'Валерия',   'Евгеньевна',    'Советник директора по воспитанию и взаимодействию с детскими общественными объединениями', 'Глевицкая.jpeg', ['passport','snils']),
            ('Реннь',      'Елена',     'Геннадьевна',   'Социальный педагог службы психолого-педагогического сопровождения', 'Реннь.jpeg', ['passport','snils','policy']),
            ('Шумараев',   'Геннадий',  'Николаевич',    'Рабочий по комплексному обслуживанию и ремонту зданий', 'Шумараев.jpeg', ['snils']),
            ('Минаков',    'Павел',     'Геннадьевич',   'Рабочий по комплексному обслуживанию и ремонту зданий', 'Минаков.jpeg', ['snils']),
            ('Краснов',    'Александр', 'Александрович', 'Специалист отдела организации питания',           'Краснов.jpeg',    ['passport','snils']),
            ('Карамян',    'Артур',     'Меликович',     'Специалист по сетевому администрированию',        'Карамян.jpeg',    ['passport','snils']),
            ('Суворов',    'Игорь',     'Сергеевич',     'Специалист по сетевому администрированию',        'Суворов.jpeg',    ['passport','snils']),
            ('Ермолов',    'Эдуард',    'Николаевич',    'Преподаватель ПЦК общеобразовательных дисциплин и физической культуры', 'Ермолов.jpeg', ['passport','snils','certificate','policy']),
            ('Оганисян',   'Вардануш',  'Мартуновна',    'Преподаватель ВПЦК строительных дисциплин',       'Оганисян.jpeg',   ['passport','snils','certificate']),
            ('Гадецкая',   'Евгения',   'Генадьевна',    'Преподаватель ВПЦК информатики и экономики',      'Гадецкая.jpeg',   ['passport','snils','certificate']),
            ('Карсаков',   'Андрей',    'Юрьевич',       'Преподаватель ВПЦК информатики и экономики',      'Карсаков.jpeg',   ['passport','snils','policy']),
            ('Кашкина',    'Юлия',      'Андреевна',     'Преподаватель ВПЦК информатики и экономики',      'Кашкина.jpeg',    ['passport','snils']),
            ('Кондаурова', 'Любовь',    'Анатольевна',   'Преподаватель ВПЦК информатики и экономики',      'Кондаурова.jpeg', ['passport','snils','certificate']),
            ('Белогруд',   'Павел',     'Алексеевич',    'Мастер производственного обучения',               'Белогруд.jpeg',   ['passport','snils']),
            ('Надежкин',   'Александр', 'Геннадьевич',   'Мастер производственного обучения',               'Надежкин.jpeg',   ['passport','snils','certificate']),
            ('Панченко',   'Варвара',   'Никитична',     'Мастер производственного обучения',               'Панченко.jpeg',   ['passport','snils']),
            ('Харламова',  'Мария',     'Павловна',      'Мастер производственного обучения',               'Харламова.jpeg',  ['snils','policy']),
            ('Хилимендик', 'Алексей',   'Владимирович',  'Мастер производственного обучения',               'Хилимендик.jpeg', ['passport','snils']),
            ('Желудова',   'Ирина',     'Анатольевна',   'Преподаватель ПЦК общеобразовательных дисциплин и физической культуры', 'Желудова.jpeg', ['passport','snils','certificate']),
            ('Белова',     'Наталья',   'Викторовна',    'Преподаватель ПЦК общеобразовательных дисциплин и физической культуры', None, ['passport','snils']),
        ]:
            emp = Employee.objects.create(institution=inst, last_name=ln, first_name=fn,
                                          middle_name=mn, position=pos[pos_key])
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
        # Гадецкая -> ИСиП-1-22, ИСиП-2-22; Харламова -> ИСиП-3-22
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

        # --- Студенты ИСиП-3-22 (конкретные) ---
        self.stdout.write('Создание студентов...')
        # (фамилия, имя, отчество, дата рождения, фото, фамилия_отца, имя_отца, отч_отца, фамилия_матери, имя_матери, отч_матери)
        # фамилия_матери = None -> нет матери; имя_отца = None -> нет отца
        isip3_data = [
            ('Пушков',     'Никита',    'Максимович',  date(2004,10,15), 'Пушков.JPG',
             'Пушков',    'Максим',    'Иванович',
             'Пушкова',   'Ирина',     'Викторовна'),
            ('Орлов',      'Никита',    'Алексеевич',  date(2004, 3,22), 'Орлов.jpg',
             'Орлов',     'Алексей',   'Петрович',
             None, None, None),
            ('Шармин',     'Петр',      'Сергеевич',   date(2004, 7, 8), 'Шармин.jpg',
             'Шармин',    'Сергей',    'Андреевич',
             'Шармина',   'Наталья',   'Игоревна'),
            ('Стеля',      'Дарья',     'Андриановна', date(2004,11, 5), None,
             'Стеля',     'Андриан',   'Викторович',
             None, None, None),
            ('Игнатов',    'Никита',    'Евгеньевич',  date(2004, 5,18), 'Игнатов.jpg',
             'Игнатов',   'Евгений',   'Павлович',
             'Игнатова',  'Марина',    'Александровна'),
            ('Суханов',    'Иван',      'Сергеевич',   date(2004, 9,30), 'Суханов.jpg',
             'Суханов',   'Сергей',    'Николаевич',
             None, None, None),
            ('Суетнов',    'Артем',     'Викторович',  date(2004, 2,14), None,
             'Суетнов',   'Виктор',    'Александрович',
             'Суетнова',  'Елена',     'Михайловна'),
            ('Почаи',      'Мирослав',  'Иммревич',    date(2004, 6,27), None,
             'Почаи',     'Иммрей',    'Александрович',
             None, None, None),
            ('Акульшин',   'Федор',     'Дмитриевич',  date(2004, 4, 3), None,
             'Акульшин',  'Дмитрий',   'Сергеевич',
             'Акульшина', 'Ольга',     'Павловна'),
            ('Тымчук',     'Максим',    'Андреевич',   date(2004,12,19), 'Тымчук.jpg',
             'Тымчук',    'Андрей',    'Николаевич',
             None, None, None),
            ('Зимов',      'Даниил',    'Михайлович',  date(2004, 8,11), None,
             'Зимов',     'Михаил',    'Сергеевич',
             'Зимова',    'Татьяна',   'Алексеевна'),
            ('Мирных',     'Андрей',    'Игоревич',    date(2004, 1,25), None,
             'Мирных',    'Игорь',     'Дмитриевич',
             None, None, None),
            ('Бунаков',    'Константин','Алексеевич',  date(2004,10, 7), None,
             'Бунаков',   'Алексей',   'Павлович',
             'Бунакова',  'Светлана',  'Николаевна'),
            ('Хуторный',   'Илья',      'Романович',   date(2004, 3,16), None,
             'Хуторный',  'Роман',     'Андреевич',
             None, None, None),
            ('Швецов',     'Алексей',   'Сергеевич',   date(2004, 7,29), None,
             'Швецов',    'Сергей',    'Михайлович',
             'Швецова',   'Людмила',   'Ивановна'),
            ('Житинев',    'Артем',     'Алексеевич',  date(2004, 5,12), None,
             'Житинев',   'Алексей',   'Николаевич',
             None, None, None),
            ('Молодчий',   'Никита',    'Игоревич',    date(2004,11,23), None,
             'Молодчий',  'Игорь',     'Дмитриевич',
             'Молодчая',  'Анна',      'Сергеевна'),
            ('Реквием',    'Константин','Олегович',    date(2004, 9, 4), None,
             'Реквием',   'Олег',      'Владимирович',
             None, None, None),
            ('Лобанов',    'Андрей',    'Николаевич',  date(2004, 2,28), None,
             'Лобанов',   'Николай',   'Иванович',
             'Лобанова',  'Елена',     'Андреевна'),
            ('Смирницкий', 'Михаил',    'Дмитриевич',  date(2004, 6,15), None,
             'Смирницкий','Дмитрий',   'Александрович',
             None, None, None),
        ]

        isip3_students = []
        for row in isip3_data:
            ln, fn, mn, bd, photo_file = row[0], row[1], row[2], row[3], row[4]
            st = Student.objects.create(institution=inst, last_name=ln, first_name=fn,
                                        middle_name=mn, birth_date=bd,
                                        faculty=f_isip, group=g_isip_3_22)
            if photo_file:
                set_photo(st, photo_file)
            isip3_students.append((st, row))

        # --- Студенты остальных групп (рандомные) ---
        random_groups = [
            (f_umd,  g_umd_1_22,  2022, 0),  (f_umd,  g_umd_2_22,  2022, 5),
            (f_umd,  g_umd_1_23,  2023, 10), (f_umd,  g_umd_2_23,  2023, 15),
            (f_at,   g_at_1_22,   2022, 2),  (f_at,   g_at_2_22,   2022, 7),
            (f_at,   g_at_1_23,   2023, 12), (f_at,   g_at_1_24,   2024, 17),
            (f_at,   g_at_2_24,   2024, 4),  (f_isip, g_isip_1_22, 2022, 9),
            (f_isip, g_isip_2_22, 2022, 14),
        ]
        rand_students = []  # (student, group_idx)
        for gi, (fac, grp, yr, off) in enumerate(random_groups):
            base_birth = yr - 17
            grp_students = []
            for i in range(5):
                ln, fn, mn = MALE[(off + i) % 20]
                st = Student.objects.create(
                    institution=inst, last_name=ln, first_name=fn, middle_name=mn,
                    birth_date=date(base_birth, (off + i) % 12 + 1, (off + i * 3) % 28 + 1),
                    faculty=fac, group=grp)
                grp_students.append(st)
            for i in range(3):
                ln, fn, mn = FEMALE[(off + i) % 20]
                st = Student.objects.create(
                    institution=inst, last_name=ln, first_name=fn, middle_name=mn,
                    birth_date=date(base_birth, (off + i + 3) % 12 + 1, (off + i * 5) % 28 + 1),
                    faculty=fac, group=grp)
                grp_students.append(st)
            rand_students.append((gi, grp_students))

        total_students = len(isip3_students) + sum(len(g[1]) for g in rand_students)
        self.stdout.write(f'  Студентов: {total_students} (ИСиП-3-22: {len(isip3_students)}, остальные: {total_students - len(isip3_students)})')

        # --- Родители ИСиП-3-22 (с правильными фамилиями/отчествами) ---
        self.stdout.write('Создание родителей...')
        parent_count = 0
        for st, row in isip3_students:
            f_ln, f_fn, f_mn = row[5], row[6], row[7]
            m_ln, m_fn, m_mn = row[8], row[9], row[10]

            if f_fn:  # есть отец
                dad = Parent.objects.create(
                    institution=inst, last_name=f_ln, first_name=f_fn, middle_name=f_mn,
                    birth_date=date(1972, (parent_count % 12) + 1, (parent_count % 28) + 1))
                StudentParent.objects.create(student=st, parent=dad, relation_type='father')
                parent_count += 1
                # Документы родителя
                add_doc('parent', dad.pk, 'Паспорт', 'passport', f'Паспорт {f_ln} {f_fn} {f_mn}')
                add_doc('parent', dad.pk, 'СНИЛС', 'snils')

            if m_fn:  # есть мать
                mom = Parent.objects.create(
                    institution=inst, last_name=m_ln, first_name=m_fn, middle_name=m_mn,
                    birth_date=date(1974, (parent_count % 12) + 1, (parent_count % 28) + 1))
                StudentParent.objects.create(student=st, parent=mom, relation_type='mother')
                parent_count += 1
                add_doc('parent', mom.pk, 'Паспорт', 'passport', f'Паспорт {m_ln} {m_fn} {m_mn}')
                add_doc('parent', mom.pk, 'СНИЛС', 'snils')

        # --- Родители рандомных студентов (каждый второй) ---
        male_f_names  = ['Александр', 'Сергей', 'Николай', 'Дмитрий', 'Андрей', 'Владимир', 'Михаил', 'Игорь']
        female_f_names = ['Татьяна', 'Елена', 'Ирина', 'Наталья', 'Светлана', 'Ольга', 'Людмила', 'Марина']
        m_patronymics = ['Александрович', 'Сергеевич', 'Николаевич', 'Дмитриевич', 'Андреевич', 'Владимирович', 'Михайлович', 'Игоревич']
        f_patronymics = ['Александровна', 'Сергеевна', 'Николаевна', 'Дмитриевна', 'Андреевна', 'Владимировна', 'Михайловна', 'Игоревна']

        for gi, grp_students in rand_students:
            for i, st in enumerate(grp_students):
                if i % 2 != 0:  # каждый второй
                    continue
                idx = (gi + i) % 8
                # Отец
                dad_fn = male_f_names[idx]
                dad_mn = m_patronymics[(idx + 1) % 8]
                # Для фамилии отца: у мужских фамилий на -ов/-ев/-ин берем как есть
                dad_ln = st.last_name
                if dad_ln.endswith('а') or dad_ln.endswith('я'):
                    dad_ln = dad_ln[:-1]  # убираем женское окончание если вдруг
                dad = Parent.objects.create(
                    institution=inst, last_name=dad_ln, first_name=dad_fn, middle_name=dad_mn,
                    birth_date=date(1973, (gi + i) % 12 + 1, (gi + i * 2) % 28 + 1))
                StudentParent.objects.create(student=st, parent=dad, relation_type='father')
                add_doc('parent', dad.pk, 'СНИЛС', 'snils')
                parent_count += 1

                if i % 4 == 0:  # каждому четвертому ещё мать
                    mom_fn = female_f_names[idx]
                    mom_mn = f_patronymics[(idx + 2) % 8]
                    mom_ln = st.last_name
                    if not (mom_ln.endswith('а') or mom_ln.endswith('я') or mom_ln.endswith('х')):
                        mom_ln = mom_ln + 'а'
                    mom = Parent.objects.create(
                        institution=inst, last_name=mom_ln, first_name=mom_fn, middle_name=mom_mn,
                        birth_date=date(1975, (gi + i + 3) % 12 + 1, (gi + i * 3) % 28 + 1))
                    StudentParent.objects.create(student=st, parent=mom, relation_type='mother')
                    add_doc('parent', mom.pk, 'Паспорт', 'passport')
                    add_doc('parent', mom.pk, 'СНИЛС', 'snils')
                    parent_count += 1

        self.stdout.write(f'  Родителей: {parent_count}')

        # --- Документы сотрудников ---
        self.stdout.write('Создание документов...')
        doc_names = {
            'passport':    'Паспорт',
            'snils':       'СНИЛС',
            'policy':      'Полис ОМС',
            'certificate': 'Диплом об образовании',
            'order':       'Приказ о назначении',
            'other':       'ИНН',
        }
        for ln, emp in emps.items():
            for dt in emp_docs.get(ln, []):
                add_doc('employee', emp.pk, doc_names[dt], dt)

        # --- Документы студентов ИСиП-3-22 (паспорт + СНИЛС + у части аттестат) ---
        for i, (st, _) in enumerate(isip3_students):
            add_doc('student', st.pk, 'Паспорт', 'passport', f'{st.last_name} {st.first_name}')
            add_doc('student', st.pk, 'СНИЛС', 'snils')
            if i % 3 == 0:
                add_doc('student', st.pk, 'Аттестат', 'certificate')
            if i % 4 == 0:
                add_doc('student', st.pk, 'Полис ОМС', 'policy')

        # --- Документы рандомных студентов (СНИЛС всем, паспорт каждому второму) ---
        all_rand_flat = [st for _, grp_sts in rand_students for st in grp_sts]
        for i, st in enumerate(all_rand_flat):
            add_doc('student', st.pk, 'СНИЛС', 'snils')
            if i % 2 == 0:
                add_doc('student', st.pk, 'Паспорт', 'passport')

        self.stdout.write(f'  Документов создано: {_doc_n[0]}')

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
