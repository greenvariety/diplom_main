"""
Полный сид базы данных МКАГ:
  - 5 факультетов, 6 групп каждый (3 за 2022, 3 за 2023)
  - 22-27 студентов в группе (программная генерация)
  - Группа ИСиП-3-22 — 25 именных студентов + фото из сети
  - 46 сотрудников (30 уникальных классруков + административные без аккаунтов)
  - На ключевые предметы — лекции + практика (разные преподы)
  - Пользователи: 1 owner, 2 admin, ~35 teacher
"""
import os, random, urllib.request
from datetime import date, timedelta
from django.conf import settings
from django.core.management.base import BaseCommand
from core.models import (
    Institution, Faculty, Position, Employee, Group, Student,
    Parent, StudentParent, Subject, GroupSubjectEmployee, User, EmailCode,
)

# ── Пулы имён (детерминированная генерация) ──────────────────────────────────
SM = ['Иванов','Петров','Сидоров','Козлов','Новиков','Морозов','Волков',
      'Соколов','Попов','Лебедев','Смирнов','Михайлов','Фёдоров','Соловьёв',
      'Кузнецов','Орлов','Виноградов','Степанов','Тихонов','Беляев',
      'Медведев','Николаев','Павлов','Семёнов','Голубев','Васильев','Зайцев',
      'Власов','Мельников','Борисов','Тарасов','Белов','Комаров','Осипов',
      'Ильин','Захаров','Трофимов','Фомин','Чернов','Пономарёв','Громов',
      'Яковлев','Матвеев','Калинин','Крылов','Антонов','Гришин','Дорофеев',
      'Зимин','Рябов']
SF = ['Иванова','Петрова','Сидорова','Козлова','Новикова','Морозова','Волкова',
      'Соколова','Попова','Лебедева','Смирнова','Михайлова','Фёдорова','Соловьёва',
      'Кузнецова','Орлова','Виноградова','Степанова','Тихонова','Беляева',
      'Медведева','Николаева','Павлова','Семёнова','Голубева','Васильева','Зайцева',
      'Власова','Мельникова','Борисова','Тарасова','Белова','Комарова','Осипова',
      'Ильина','Захарова','Трофимова','Фомина','Чернова','Пономарёва','Громова',
      'Яковлева','Матвеева','Калинина','Крылова','Антонова','Гришина','Дорофеева',
      'Зимина','Рябова']
FM = ['Александр','Дмитрий','Михаил','Иван','Артём','Никита','Алексей','Максим',
      'Андрей','Кирилл','Сергей','Роман','Егор','Павел','Владимир','Денис',
      'Антон','Илья','Руслан','Тимур','Глеб','Борис','Вадим','Геннадий',
      'Евгений','Николай','Константин','Леонид','Юрий','Виктор']
FF = ['Анастасия','Екатерина','Дарья','Мария','Анна','Ольга','Полина','Алина',
      'Валерия','Наталья','Юлия','Елена','Ксения','Виктория','Светлана','Ирина',
      'Людмила','Татьяна','Инна','Надежда','Вера','Галина','Карина','Оксана',
      'Алёна','Инесса','Милена','Регина','Диана','Кристина']
PM = ['Александрович','Дмитриевич','Михайлович','Иванович','Артёмович',
      'Алексеевич','Максимович','Андреевич','Кириллович','Сергеевич',
      'Романович','Павлович','Владимирович','Денисович','Антонович',
      'Ильич','Русланович','Евгеньевич','Николаевич','Константинович',
      'Леонидович','Юрьевич','Викторович','Олегович','Петрович',
      'Васильевич','Борисович','Геннадьевич','Тимурович','Глебович']
PF = ['Александровна','Дмитриевна','Михайловна','Ивановна','Алексеевна',
      'Максимовна','Андреевна','Кирилловна','Сергеевна','Романовна',
      'Павловна','Владимировна','Денисовна','Антоновна','Ильинична',
      'Евгеньевна','Николаевна','Константиновна','Леонидовна','Юрьевна',
      'Викторовна','Олеговна','Петровна','Васильевна','Борисовна',
      'Геннадьевна','Тимуровна','Глебовна','Игоревна','Степановна']

# ── Студенты ИСиП-3-22 (именные, с фото) ─────────────────────────────────────
# Формат: (фамилия, имя, отчество, дата_рождения, телефон, email, пол, номер_фото)
ISP3_22 = [
    ('Пушков',      'Никита',     'Михайлович',    date(2004,3,15),  '+7 916 300-00-01', 'pushkov.n@student.mkag.ru',     'men', 1),
    ('Антонов',     'Дмитрий',    'Сергеевич',     date(2004,5,21),  '+7 916 300-00-02', 'antonov.dm@student.mkag.ru',    'men', 2),
    ('Воронов',     'Илья',       'Максимович',    date(2004,8,14),  '+7 916 300-00-03', 'voronov.il@student.mkag.ru',    'men', 3),
    ('Дмитриев',    'Павел',      'Викторович',    date(2004,2,28),  '+7 916 300-00-04', 'dmitriev.pv@student.mkag.ru',   'men', 4),
    ('Жуков',       'Артём',      'Евгеньевич',    date(2004,11,3),  '+7 916 300-00-05', 'zhukov.ar@student.mkag.ru',     'men', 5),
    ('Иванченко',   'Никита',     'Романович',     date(2004,7,16),  '+7 916 300-00-06', 'ivanchenko.n@student.mkag.ru',  'men', 6),
    ('Козырев',     'Максим',     'Андреевич',     date(2004,1,22),  '+7 916 300-00-07', 'kozyrev.m@student.mkag.ru',     'men', 7),
    ('Лысенко',     'Роман',      'Петрович',      date(2004,9,9),   '+7 916 300-00-08', '',                              'men', 8),
    ('Нестеров',    'Глеб',       'Дмитриевич',    date(2004,4,30),  '+7 916 300-00-09', 'nesterov.gl@student.mkag.ru',   'men', 9),
    ('Попов',       'Кирилл',     'Андреевич',     date(2004,12,7),  '+7 916 300-00-10', 'popov.ki@student.mkag.ru',      'men', 10),
    ('Смирнов',     'Егор',       'Павлович',      date(2004,6,18),  '+7 916 300-00-11', 'smirnov.eg@student.mkag.ru',    'men', 11),
    ('Тихомиров',   'Вадим',      'Олегович',      date(2004,10,25), '+7 916 300-00-12', 'tikhomirov.v@student.mkag.ru',  'men', 12),
    ('Чернов',      'Максим',     'Игоревич',      date(2003,11,12), '+7 916 300-00-13', 'chernov.mx@student.mkag.ru',    'men', 13),
    ('Белкина',     'Анастасия',  'Олеговна',      date(2004,3,8),   '+7 916 300-00-14', 'belkina.a@student.mkag.ru',     'women', 1),
    ('Горбунова',   'Юлия',       'Андреевна',     date(2004,7,25),  '+7 916 300-00-15', 'gorbunova.yu@student.mkag.ru',  'women', 2),
    ('Ершова',      'Ксения',     'Николаевна',    date(2004,1,14),  '+7 916 300-00-16', 'ershova.ks@student.mkag.ru',    'women', 3),
    ('Зайцева',     'Валерия',    'Ивановна',      date(2004,9,3),   '+7 916 300-00-17', 'zajtseva.vl@student.mkag.ru',   'women', 4),
    ('Карпова',     'Дарья',      'Станиславовна', date(2004,5,19),  '+7 916 300-00-18', 'karpova.d@student.mkag.ru',     'women', 5),
    ('Макарова',    'Полина',     'Алексеевна',    date(2004,11,28), '+7 916 300-00-19', 'makarova.po@student.mkag.ru',   'women', 6),
    ('Орлова',      'Алина',      'Сергеевна',     date(2004,2,16),  '+7 916 300-00-20', 'orlova.al@student.mkag.ru',     'women', 7),
    ('Романова',    'Виктория',   'Леонидовна',    date(2004,8,10),  '',                  'romanova.vi@student.mkag.ru',   'women', 8),
    ('Соколова',    'Мария',      'Петровна',      date(2004,6,21),  '+7 916 300-00-22', 'sokolova.ma@student.mkag.ru',   'women', 9),
    ('Фёдорова',    'Екатерина',  'Борисовна',     date(2004,12,4),  '+7 916 300-00-23', 'fedorova.ek@student.mkag.ru',   'women', 10),
    ('Харитонова',  'Ирина',      'Юрьевна',       date(2003,10,17), '+7 916 300-00-24', 'kharitonova.i@student.mkag.ru', 'women', 11),
    ('Цветкова',    'Надежда',    'Владимировна',  date(2004,4,8),   '+7 916 300-00-25', 'tsvetkova.n@student.mkag.ru',   'women', 12),
]

_IDX = [0]  # глобальный счётчик для уникальных телефонов/email


def _next():
    _IDX[0] += 1
    return _IDX[0]


class Command(BaseCommand):
    help = 'Заполнить базу полными реалистичными данными МКАГ'

    def handle(self, *args, **kwargs):
        rng = random.Random(42)

        # ── Очистка ──────────────────────────────────────────────────────────
        self.stdout.write('Очистка базы...')
        for m in [GroupSubjectEmployee, StudentParent, Student, Group, Faculty,
                  Employee, Position, Parent, Subject, User, Institution, EmailCode]:
            m.objects.all().delete()

        # ── Owner + организация ───────────────────────────────────────────────
        owner = User(username='direktormkag',
                     display_name='Харитонова Светлана Борисовна',
                     email='kharitonova@mkag.ru',
                     role='owner', is_staff=True, is_superuser=True, is_active=True)
        owner.set_password('admin_-1')
        owner.save()

        inst = Institution.objects.create(
            owner=owner, code='МКАГ',
            name='Московский колледж архитектуры и градостроительства')
        owner.institution = inst
        owner.save(update_fields=['institution'])
        self.stdout.write(f'  Организация: {inst.name}')

        # ── Должности ─────────────────────────────────────────────────────────
        def pos(name):
            return Position.objects.create(name=name, institution=inst)

        p_dir    = pos('Директор')
        p_zav    = pos('Заместитель директора')
        p_meth   = pos('Методист')
        p_lib    = pos('Библиотекарь')
        p_teach  = pos('Преподаватель')
        p_master = pos('Мастер производственного обучения')

        # ── Факультеты ────────────────────────────────────────────────────────
        def fac(full, short, yr):
            return Faculty.objects.create(institution=inst, full_name=full,
                                          short_name=short, created_at=date(yr, 9, 1))

        f_isp = fac('Информационные системы и программирование', 'ИСиП', 2010)
        f_at  = fac('Аддитивные технологии',                     'АТ',   2016)
        f_umd = fac('Управление многоквартирными домами',         'УМД',  2012)
        f_vks = fac('Веб-разработка и компьютерные сети',        'ВКС',  2018)
        f_ad  = fac('Архитектура и дизайн',                      'АД',   2008)
        self.stdout.write('  Факультеты: 5 (ИСиП, АТ, УМД, ВКС, АД)')

        # ── Сотрудники ────────────────────────────────────────────────────────
        def emp(ln, fn, mn, bd, ph, email, position):
            return Employee.objects.create(
                institution=inst, last_name=ln, first_name=fn, middle_name=mn,
                birth_date=bd, phone=ph, email=email, position=position)

        # Административные (без юзера, кроме owner/admin)
        e_dir   = emp('Харитонова','Светлана','Борисовна', date(1968,4,12),  '+7 495 100-00-01','kharitonova@mkag.ru',  p_dir)
        e_zav   = emp('Громов',    'Виктор',  'Павлович',  date(1972,8,25),  '+7 495 100-00-02','gromov@mkag.ru',       p_zav)
        e_meth  = emp('Белякова',  'Ирина',   'Олеговна',  date(1980,2,17),  '+7 495 100-00-03','belyakova@mkag.ru',    p_meth)
        emp('Суворова','Любовь','Максимовна', date(1975,6,8),'+7 495 100-00-04','suvorova@mkag.ru',p_lib)  # нет юзера

        # Общие преподы (нет юзера)
        e_sports = emp('Кириллов', 'Николай',   'Андреевич',   date(1978,3,20),'+7 495 100-00-05','kirillov@mkag.ru',  p_teach)
        e_rus    = emp('Соловьёва','Антонина',   'Владимировна',date(1975,9,14),'+7 495 100-00-06','solovieva@mkag.ru', p_teach)
        e_hist   = emp('Степанова','Людмила',    'Вячеславовна',date(1977,5,30),'+7 495 100-00-07','stepanova@mkag.ru', p_teach)

        # ИСиП (6 классруков + 2 дополнительных)
        e_i1 = emp('Соколов',   'Андрей',   'Игоревич',   date(1979,5,3),  '+7 495 201-00-01','sokolov@mkag.ru',    p_teach)
        e_i2 = emp('Фёдорова',  'Марина',   'Сергеевна',  date(1985,11,14),'+7 495 201-00-02','fedorova@mkag.ru',   p_teach)
        e_i3 = emp('Тарасов',   'Денис',    'Алексеевич', date(1990,3,28), '+7 495 201-00-03','tarasov@mkag.ru',    p_teach)
        e_i4 = emp('Кузнецова', 'Елена',    'Викторовна', date(1983,7,11), '+7 495 201-00-04','kuznetsova@mkag.ru', p_teach)
        e_i5 = emp('Шевцов',    'Роман',    'Олегович',   date(1988,1,25), '+7 495 201-00-05','shevtsov@mkag.ru',   p_teach)
        e_i6 = emp('Лукина',    'Полина',   'Николаевна', date(1992,9,7),  '+7 495 201-00-06','lukina@mkag.ru',     p_teach)
        e_i7 = emp('Прохоров',  'Василий',  'Григорьевич',date(1986,4,19), '+7 495 201-00-07','prokhorov@mkag.ru',  p_master)
        emp('Зверева','Ольга','Михайловна', date(1991,12,3),'+7 495 201-00-08','zvereva@mkag.ru',p_teach)  # нет юзера

        # АТ
        e_a1 = emp('Власов',    'Роман',    'Викторович', date(1983,7,9),  '+7 495 202-00-01','vlasov@mkag.ru',     p_teach)
        e_a2 = emp('Орехова',   'Наталья',  'Дмитриевна', date(1987,1,22), '+7 495 202-00-02','orekhova@mkag.ru',   p_master)
        e_a3 = emp('Рябов',     'Константин','Петрович',  date(1981,6,14), '+7 495 202-00-03','ryabov@mkag.ru',     p_teach)
        e_a4 = emp('Симонова',  'Екатерина','Борисовна',  date(1985,10,5), '+7 495 202-00-04','simonova@mkag.ru',   p_teach)
        e_a5 = emp('Тихонов',   'Антон',    'Семёнович',  date(1989,3,17), '+7 495 202-00-05','tikhonovas@mkag.ru', p_teach)
        e_a6 = emp('Мелехова',  'Виктория', 'Николаевна', date(1993,8,29), '+7 495 202-00-06','melekhova@mkag.ru',  p_teach)
        e_a7 = emp('Дорохин',   'Пётр',     'Андреевич',  date(1984,2,11), '+7 495 202-00-07','dorokhin@mkag.ru',   p_master)
        emp('Зимина','Светлана','Юрьевна', date(1990,7,23),'+7 495 202-00-08','ziminas@mkag.ru',p_teach)  # нет юзера

        # УМД
        e_u1 = emp('Крылова',   'Ольга',    'Владимировна',date(1975,9,5), '+7 495 203-00-01','krylova@mkag.ru',    p_teach)
        e_u2 = emp('Зимин',     'Сергей',   'Николаевич', date(1981,6,18), '+7 495 203-00-02','zimin@mkag.ru',      p_teach)
        e_u3 = emp('Павлова',   'Нина',     'Васильевна', date(1978,12,27),'+7 495 203-00-03','pavlova@mkag.ru',    p_teach)
        e_u4 = emp('Семёнов',   'Георгий',  'Аркадьевич', date(1982,4,3),  '+7 495 203-00-04','semyonov@mkag.ru',   p_teach)
        e_u5 = emp('Новикова',  'Ирина',    'Петровна',   date(1986,8,15), '+7 495 203-00-05','novikova@mkag.ru',   p_teach)
        e_u6 = emp('Борисов',   'Алексей',  'Леонидович', date(1980,11,22),'+7 495 203-00-06','borisov@mkag.ru',    p_teach)
        e_u7 = emp('Трофимова', 'Елена',    'Степановна', date(1984,3,9),  '+7 495 203-00-07','trofimova@mkag.ru',  p_teach)
        emp('Кирсанов','Валерий','Михайлович', date(1977,1,16),'+7 495 203-00-08','kirsanov@mkag.ru',p_teach)  # нет юзера

        # ВКС
        e_v1 = emp('Панов',     'Алексей',  'Романович',  date(1992,4,11), '+7 495 204-00-01','panov@mkag.ru',      p_teach)
        e_v2 = emp('Лукьянова', 'Екатерина','Петровна',   date(1988,12,3), '+7 495 204-00-02','lukyanova@mkag.ru',  p_teach)
        e_v3 = emp('Мороз',     'Дмитрий',  'Владимирович',date(1984,7,25),'+7 495 204-00-03','moroz@mkag.ru',      p_teach)
        e_v4 = emp('Авдеева',   'Кристина', 'Николаевна', date(1991,2,18), '+7 495 204-00-04','avdeeva@mkag.ru',    p_teach)
        e_v5 = emp('Рогов',     'Павел',    'Сергеевич',  date(1987,9,6),  '+7 495 204-00-05','rogov@mkag.ru',      p_teach)
        e_v6 = emp('Ситникова', 'Марина',   'Александровна',date(1993,5,14),'+7 495 204-00-06','sitnikova@mkag.ru',  p_teach)
        e_v7 = emp('Кудрявцев', 'Виктор',   'Олегович',   date(1986,10,30),'+7 495 204-00-07','kudryavtsev@mkag.ru',p_teach)
        emp('Волошина','Тамара','Борисовна', date(1980,3,21),'+7 495 204-00-08','voloshina@mkag.ru',p_teach)  # нет юзера

        # АД
        e_d1 = emp('Архипова',  'Людмила',  'Вячеславовна',date(1974,8,12),'+7 495 205-00-01','arkhipova@mkag.ru',  p_teach)
        e_d2 = emp('Дмитриев',  'Кирилл',   'Германович',  date(1979,3,24),'+7 495 205-00-02','dmitriev@mkag.ru',   p_teach)
        e_d3 = emp('Нестерова', 'Вера',     'Андреевна',   date(1983,11,7),'+7 495 205-00-03','nesterova@mkag.ru',  p_teach)
        e_d4 = emp('Журавлёв',  'Степан',   'Павлович',    date(1977,6,19),'+7 495 205-00-04','zhuravlyov@mkag.ru', p_teach)
        e_d5 = emp('Фокина',    'Оксана',   'Евгеньевна',  date(1988,1,31),'+7 495 205-00-05','fokina@mkag.ru',     p_teach)
        e_d6 = emp('Поляков',   'Николай',  'Владимирович',date(1981,9,4), '+7 495 205-00-06','polyakov@mkag.ru',   p_teach)
        e_d7 = emp('Веселова',  'Галина',   'Аркадьевна',  date(1976,4,16),'+7 495 205-00-07','veselova@mkag.ru',   p_teach)
        emp('Стрелков','Богдан','Дмитриевич', date(1990,12,8),'+7 495 205-00-08','strelkov@mkag.ru',p_teach)  # нет юзера

        total_emp = Employee.objects.filter(institution=inst).count()
        self.stdout.write(f'  Сотрудников: {total_emp}')

        # ── Группы (3+3 на факультет, group_number назначается автоматически) ─
        def grp(faculty, year, headteacher):
            return Group.objects.create(faculty=faculty, year=year, headteacher=headteacher)

        # ИСиП
        g_i1_22 = grp(f_isp, 2022, e_i1)   # ИСиП-1-22
        g_i2_22 = grp(f_isp, 2022, e_i2)   # ИСиП-2-22
        g_i3_22 = grp(f_isp, 2022, e_i3)   # ИСиП-3-22 ← именные студенты + фото
        g_i1_23 = grp(f_isp, 2023, e_i4)   # ИСиП-1-23
        g_i2_23 = grp(f_isp, 2023, e_i5)   # ИСиП-2-23
        g_i3_23 = grp(f_isp, 2023, e_i6)   # ИСиП-3-23

        # АТ
        g_a1_22 = grp(f_at, 2022, e_a1)
        g_a2_22 = grp(f_at, 2022, e_a2)
        g_a3_22 = grp(f_at, 2022, e_a3)
        g_a1_23 = grp(f_at, 2023, e_a4)
        g_a2_23 = grp(f_at, 2023, e_a5)
        g_a3_23 = grp(f_at, 2023, e_a6)

        # УМД
        g_u1_22 = grp(f_umd, 2022, e_u1)
        g_u2_22 = grp(f_umd, 2022, e_u2)
        g_u3_22 = grp(f_umd, 2022, e_u3)
        g_u1_23 = grp(f_umd, 2023, e_u4)
        g_u2_23 = grp(f_umd, 2023, e_u5)
        g_u3_23 = grp(f_umd, 2023, e_u6)

        # ВКС
        g_v1_22 = grp(f_vks, 2022, e_v1)
        g_v2_22 = grp(f_vks, 2022, e_v2)
        g_v3_22 = grp(f_vks, 2022, e_v3)
        g_v1_23 = grp(f_vks, 2023, e_v4)
        g_v2_23 = grp(f_vks, 2023, e_v5)
        g_v3_23 = grp(f_vks, 2023, e_v6)

        # АД
        g_d1_22 = grp(f_ad, 2022, e_d1)
        g_d2_22 = grp(f_ad, 2022, e_d2)
        g_d3_22 = grp(f_ad, 2022, e_d3)
        g_d1_23 = grp(f_ad, 2023, e_d4)
        g_d2_23 = grp(f_ad, 2023, e_d5)
        g_d3_23 = grp(f_ad, 2023, e_d6)

        all_groups = [
            g_i1_22,g_i2_22,g_i3_22,g_i1_23,g_i2_23,g_i3_23,
            g_a1_22,g_a2_22,g_a3_22,g_a1_23,g_a2_23,g_a3_23,
            g_u1_22,g_u2_22,g_u3_22,g_u1_23,g_u2_23,g_u3_23,
            g_v1_22,g_v2_22,g_v3_22,g_v1_23,g_v2_23,g_v3_23,
            g_d1_22,g_d2_22,g_d3_22,g_d1_23,g_d2_23,g_d3_23,
        ]
        self.stdout.write(f'  Групп: {len(all_groups)}')

        # ── Предметы ──────────────────────────────────────────────────────────
        def subj(name):
            return Subject.objects.create(name=name, institution=inst)

        # Общие
        s_pe   = subj('Физкультура')
        s_rus  = subj('Русский язык и культура речи')
        s_hist = subj('История')

        # ИСиП / ВКС (общие IT)
        s_py    = subj('Программирование на Python (лекции)')
        s_py_p  = subj('Программирование на Python (практика)')
        s_db    = subj('Базы данных')
        s_algo  = subj('Алгоритмы и структуры данных')
        s_os    = subj('Операционные системы')
        s_web   = subj('Веб-разработка')
        s_ib    = subj('Информационная безопасность')
        s_ks    = subj('Компьютерные сети (лекции)')
        s_ks_p  = subj('Компьютерные сети (практика)')
        s_sa    = subj('Системное администрирование')
        s_kber  = subj('Кибербезопасность')
        s_proto = subj('Протоколы передачи данных')

        # АТ
        s_3d    = subj('Основы 3D-моделирования')
        s_add   = subj('Аддитивные технологии и 3D-печать (лекции)')
        s_add_p = subj('Аддитивные технологии и 3D-печать (практика)')
        s_mat   = subj('Материаловедение')
        s_tc    = subj('Техническое черчение')
        s_mech  = subj('Прикладная механика')
        s_tm    = subj('Технология машиностроения')
        s_ig    = subj('Инженерная графика')

        # УМД
        s_zhk   = subj('Жилищное законодательство')
        s_un    = subj('Управление недвижимостью')
        s_tez   = subj('Техническая эксплуатация зданий')
        s_bu    = subj('Бухгалтерский учёт в ЖКХ')
        s_pravo = subj('Правоведение')
        s_smet  = subj('Сметное дело')

        # АД
        s_ia    = subj('История архитектуры')
        s_od    = subj('Основы дизайна')
        s_ap    = subj('Архитектурное проектирование')
        s_sk    = subj('Строительные конструкции')
        s_grad  = subj('Градостроительство')

        total_subj = Subject.objects.filter(institution=inst).count()
        self.stdout.write(f'  Предметов: {total_subj}')

        # ── Назначения предмет-группа-преподаватель ───────────────────────────
        def assign(group, subject, employee):
            GroupSubjectEmployee.objects.create(group=group, subject=subject, employee=employee)

        # Общие для ВСЕХ 30 групп
        for g in all_groups:
            assign(g, s_pe,   e_sports)
            assign(g, s_rus,  e_rus)
            assign(g, s_hist, e_hist)

        # ИСиП 2022 (8 предметов = 3 общих + 5 своих)
        for g, t_py, t_py_p, t_db, t_algo, t_os in [
            (g_i1_22, e_i1, e_i7, e_i2, e_i3, e_i4),
            (g_i2_22, e_i2, e_i7, e_i3, e_i4, e_i5),
            (g_i3_22, e_i3, e_i7, e_i1, e_i2, e_i6),
        ]:
            assign(g, s_py,   t_py)
            assign(g, s_py_p, t_py_p)
            assign(g, s_db,   t_db)
            assign(g, s_algo, t_algo)
            assign(g, s_os,   t_os)

        # ИСиП 2023
        for g, t_py, t_py_p, t_web, t_ks, t_ib in [
            (g_i1_23, e_i4, e_i7, e_i5, e_i6, e_i7),
            (g_i2_23, e_i5, e_i7, e_i6, e_i4, e_i7),
            (g_i3_23, e_i6, e_i7, e_i4, e_i5, e_i7),
        ]:
            assign(g, s_py,   t_py)
            assign(g, s_py_p, t_py_p)
            assign(g, s_web,  t_web)
            assign(g, s_ks,   t_ks)
            assign(g, s_ib,   t_ib)

        # АТ 2022
        for g, t_3d, t_add, t_add_p, t_mat, t_tc in [
            (g_a1_22, e_a1, e_a2, e_a7, e_a3, e_a4),
            (g_a2_22, e_a2, e_a3, e_a7, e_a4, e_a5),
            (g_a3_22, e_a3, e_a1, e_a7, e_a2, e_a6),
        ]:
            assign(g, s_3d,    t_3d)
            assign(g, s_add,   t_add)
            assign(g, s_add_p, t_add_p)
            assign(g, s_mat,   t_mat)
            assign(g, s_tc,    t_tc)

        # АТ 2023
        for g, t_ig, t_add, t_add_p, t_mech, t_tm in [
            (g_a1_23, e_a4, e_a5, e_a7, e_a6, e_a7),
            (g_a2_23, e_a5, e_a6, e_a7, e_a4, e_a7),
            (g_a3_23, e_a6, e_a4, e_a7, e_a5, e_a7),
        ]:
            assign(g, s_ig,    t_ig)
            assign(g, s_add,   t_add)
            assign(g, s_add_p, t_add_p)
            assign(g, s_mech,  t_mech)
            assign(g, s_tm,    t_tm)

        # УМД 2022
        for g, t_zhk, t_un, t_tez, t_bu, t_pravo in [
            (g_u1_22, e_u1, e_u2, e_u3, e_u7, e_u4),
            (g_u2_22, e_u2, e_u3, e_u4, e_u7, e_u5),
            (g_u3_22, e_u3, e_u1, e_u2, e_u7, e_u6),
        ]:
            assign(g, s_zhk,   t_zhk)
            assign(g, s_un,    t_un)
            assign(g, s_tez,   t_tez)
            assign(g, s_bu,    t_bu)
            assign(g, s_pravo, t_pravo)

        # УМД 2023
        for g, t_zhk, t_pravo, t_smet, t_tez, t_bu in [
            (g_u1_23, e_u4, e_u5, e_u6, e_u7, e_u7),
            (g_u2_23, e_u5, e_u6, e_u7, e_u4, e_u7),
            (g_u3_23, e_u6, e_u4, e_u5, e_u7, e_u7),
        ]:
            assign(g, s_zhk,   t_zhk)
            assign(g, s_pravo, t_pravo)
            assign(g, s_smet,  t_smet)
            assign(g, s_tez,   t_tez)
            assign(g, s_bu,    t_bu)

        # ВКС 2022
        for g, t_ks, t_ks_p, t_sa, t_py, t_os in [
            (g_v1_22, e_v1, e_v7, e_v2, e_v3, e_v4),
            (g_v2_22, e_v2, e_v7, e_v3, e_v4, e_v5),
            (g_v3_22, e_v3, e_v7, e_v1, e_v2, e_v6),
        ]:
            assign(g, s_ks,   t_ks)
            assign(g, s_ks_p, t_ks_p)
            assign(g, s_sa,   t_sa)
            assign(g, s_py,   t_py)
            assign(g, s_os,   t_os)

        # ВКС 2023
        for g, t_ks, t_ks_p, t_kber, t_proto, t_web in [
            (g_v1_23, e_v4, e_v7, e_v5, e_v6, e_v7),
            (g_v2_23, e_v5, e_v7, e_v6, e_v4, e_v7),
            (g_v3_23, e_v6, e_v7, e_v4, e_v5, e_v7),
        ]:
            assign(g, s_ks,    t_ks)
            assign(g, s_ks_p,  t_ks_p)
            assign(g, s_kber,  t_kber)
            assign(g, s_proto, t_proto)
            assign(g, s_web,   t_web)

        # АД 2022
        for g, t_ia, t_od, t_ap, t_sk, t_ig in [
            (g_d1_22, e_d1, e_d2, e_d3, e_d7, e_d4),
            (g_d2_22, e_d2, e_d3, e_d4, e_d7, e_d5),
            (g_d3_22, e_d3, e_d1, e_d2, e_d7, e_d6),
        ]:
            assign(g, s_ia, t_ia)
            assign(g, s_od, t_od)
            assign(g, s_ap, t_ap)
            assign(g, s_sk, t_sk)
            assign(g, s_ig, t_ig)

        # АД 2023
        for g, t_grad, t_ap, t_sk, t_ig, t_od in [
            (g_d1_23, e_d4, e_d5, e_d6, e_d7, e_d7),
            (g_d2_23, e_d5, e_d6, e_d7, e_d4, e_d7),
            (g_d3_23, e_d6, e_d4, e_d5, e_d7, e_d7),
        ]:
            assign(g, s_grad, t_grad)
            assign(g, s_ap,   t_ap)
            assign(g, s_sk,   t_sk)
            assign(g, s_ig,   t_ig)
            assign(g, s_od,   t_od)

        total_assign = GroupSubjectEmployee.objects.filter(group__faculty__institution=inst).count()
        self.stdout.write(f'  Назначений предметов: {total_assign}')

        # ── Студенты ──────────────────────────────────────────────────────────
        _c = [5000]  # счётчик для телефонов/email (начинаем с 5000 чтобы не пересекаться с ИСиП-3-22)

        def gen_phone(c):
            if c % 6 == 0:
                return ''
            return f'+7 9{c % 100 // 10}{c % 10 * 11 % 10} {c // 10 % 1000:03d}-{c % 100:02d}-{c * 7 % 100:02d}'

        def make_students(faculty, group, year, count):
            bd_base = date(year - 18, 1, 1)
            for i in range(count):
                _c[0] += 1
                c = _c[0]
                male = rng.random() > 0.4
                ln = rng.choice(SM if male else SF)
                fn = rng.choice(FM if male else FF)
                mn = rng.choice(PM if male else PF)
                bd = bd_base + timedelta(days=(c * 17) % 700)
                Student.objects.create(
                    institution=inst, last_name=ln, first_name=fn, middle_name=mn,
                    birth_date=bd, phone=gen_phone(c),
                    email=f'stu{c:05d}@mkag.ru' if c % 5 != 0 else '',
                    faculty=faculty, group=group)

        # ИСиП-3-22 — именные студенты
        isp3_22_students = []
        for ln, fn, mn, bd, ph, email, _gender, _pnum in ISP3_22:
            s = Student.objects.create(
                institution=inst, last_name=ln, first_name=fn, middle_name=mn,
                birth_date=bd, phone=ph, email=email, faculty=f_isp, group=g_i3_22)
            isp3_22_students.append((s, _gender, _pnum))

        # Все остальные группы (22-27 студентов)
        counts = {
            g_i1_22:24, g_i2_22:26, g_i3_22:0,   # ИСиП-3-22 уже заполнена
            g_i1_23:25, g_i2_23:23, g_i3_23:27,
            g_a1_22:22, g_a2_22:25, g_a3_22:24,
            g_a1_23:26, g_a2_23:23, g_a3_23:25,
            g_u1_22:24, g_u2_22:27, g_u3_22:22,
            g_u1_23:25, g_u2_23:24, g_u3_23:26,
            g_v1_22:23, g_v2_22:25, g_v3_22:26,
            g_v1_23:24, g_v2_23:27, g_v3_23:22,
            g_d1_22:25, g_d2_22:23, g_d3_22:24,
            g_d1_23:26, g_d2_23:25, g_d3_23:27,
        }

        group_faculty_year = [
            (g_i1_22,f_isp,2022),(g_i2_22,f_isp,2022),
            (g_i1_23,f_isp,2023),(g_i2_23,f_isp,2023),(g_i3_23,f_isp,2023),
            (g_a1_22,f_at,2022),(g_a2_22,f_at,2022),(g_a3_22,f_at,2022),
            (g_a1_23,f_at,2023),(g_a2_23,f_at,2023),(g_a3_23,f_at,2023),
            (g_u1_22,f_umd,2022),(g_u2_22,f_umd,2022),(g_u3_22,f_umd,2022),
            (g_u1_23,f_umd,2023),(g_u2_23,f_umd,2023),(g_u3_23,f_umd,2023),
            (g_v1_22,f_vks,2022),(g_v2_22,f_vks,2022),(g_v3_22,f_vks,2022),
            (g_v1_23,f_vks,2023),(g_v2_23,f_vks,2023),(g_v3_23,f_vks,2023),
            (g_d1_22,f_ad,2022),(g_d2_22,f_ad,2022),(g_d3_22,f_ad,2022),
            (g_d1_23,f_ad,2023),(g_d2_23,f_ad,2023),(g_d3_23,f_ad,2023),
        ]
        for g, f, yr in group_faculty_year:
            make_students(f, g, yr, counts[g])

        total_stu = Student.objects.filter(institution=inst).count()
        self.stdout.write(f'  Студентов: {total_stu}')

        # ── Фото для ИСиП-3-22 ───────────────────────────────────────────────
        media_students = os.path.join(settings.MEDIA_ROOT, 'students')
        os.makedirs(media_students, exist_ok=True)

        downloaded = 0
        for student, gender, num in isp3_22_students:
            url = f'https://randomuser.me/api/portraits/{gender}/{num}.jpg'
            fname = f'isp3_22_{gender}_{num}.jpg'
            fpath = os.path.join(media_students, fname)
            try:
                if not os.path.exists(fpath):
                    urllib.request.urlretrieve(url, fpath)
                student.photo = f'students/{fname}'
                student.save(update_fields=['photo'])
                downloaded += 1
            except Exception:
                pass  # нет интернета — пропускаем

        self.stdout.write(f'  Фото загружено: {downloaded}/{len(isp3_22_students)} (ИСиП-3-22)')

        # ── Несколько опекунов ────────────────────────────────────────────────
        def par(ln, fn, mn, bd, ph, em):
            return Parent.objects.create(institution=inst, last_name=ln, first_name=fn,
                middle_name=mn, birth_date=bd, phone=ph, email=em)

        p1 = par('Пушков',    'Михаил',  'Андреевич',  date(1975,6,18),'+7 916 900-00-01','pushkov.m@mail.ru')
        p2 = par('Антонова',  'Светлана','Петровна',    date(1978,3,22),'+7 916 900-00-02','antonova.sp@mail.ru')
        p3 = par('Белкин',    'Олег',    'Семёнович',  date(1976,9,5), '+7 916 900-00-03','belkin.os@mail.ru')
        p4 = par('Воронова',  'Людмила', 'Ивановна',   date(1980,11,14),'+7 916 900-00-04','voronova.li@mail.ru')
        p5 = par('Жукова',    'Татьяна', 'Сергеевна',  date(1979,7,28),'+7 916 900-00-05','zhukova.ts@mail.ru')

        s0, s1, s3, s6, s13 = (isp3_22_students[i][0] for i in [0, 1, 3, 6, 13])
        StudentParent.objects.create(student=s0,  parent=p1, relation_type='father')
        StudentParent.objects.create(student=s0,  parent=p2, relation_type='mother')
        StudentParent.objects.create(student=s1,  parent=p3, relation_type='father')
        StudentParent.objects.create(student=s3,  parent=p4, relation_type='mother')
        StudentParent.objects.create(student=s6,  parent=p5, relation_type='mother')
        StudentParent.objects.create(student=s13, parent=p2, relation_type='mother')
        self.stdout.write('  Опекунов: 5')

        # ── Пользователи ──────────────────────────────────────────────────────
        def user(username, display_name, email, role, employee=None):
            u = User(username=username, display_name=display_name, email=email,
                     role=role, institution=inst, is_active=True, employee=employee)
            u.set_password('admin_-1')
            u.save()

        # Admins
        user('admin_gromov',    'Громов Виктор Павлович',     'gromov@mkag.ru',    'admin')
        user('admin_belyakova', 'Белякова Ирина Олеговна',    'belyakova@mkag.ru', 'admin')

        # ИСиП
        user('sokolov_teach',   'Соколов Андрей Игоревич',    'sokolov@mkag.ru',   'teacher', e_i1)
        user('fedorova_teach',  'Фёдорова Марина Сергеевна',  'fedorova@mkag.ru',  'teacher', e_i2)
        user('tarasov_teach',   'Тарасов Денис Алексеевич',   'tarasov@mkag.ru',   'teacher', e_i3)
        user('kuznetsova_teach','Кузнецова Елена Викторовна', 'kuznetsova@mkag.ru','teacher', e_i4)
        user('shevtsov_teach',  'Шевцов Роман Олегович',      'shevtsov@mkag.ru',  'teacher', e_i5)
        user('lukina_teach',    'Лукина Полина Николаевна',   'lukina@mkag.ru',    'teacher', e_i6)
        user('prokhorov_teach', 'Прохоров Василий Григорьевич','prokhorov@mkag.ru','teacher', e_i7)

        # АТ
        user('vlasov_teach',    'Власов Роман Викторович',    'vlasov@mkag.ru',    'teacher', e_a1)
        user('orekhova_teach',  'Орехова Наталья Дмитриевна','orekhova@mkag.ru',  'teacher', e_a2)
        user('ryabov_teach',    'Рябов Константин Петрович',  'ryabov@mkag.ru',    'teacher', e_a3)
        user('simonova_teach',  'Симонова Екатерина Борисовна','simonova@mkag.ru', 'teacher', e_a4)
        user('tikhonovas_teach','Тихонов Антон Семёнович',    'tikhonovas@mkag.ru','teacher', e_a5)
        user('melekhova_teach', 'Мелехова Виктория Николаевна','melekhova@mkag.ru','teacher', e_a6)
        user('dorokhin_teach',  'Дорохин Пётр Андреевич',    'dorokhin@mkag.ru',  'teacher', e_a7)

        # УМД
        user('krylova_teach',   'Крылова Ольга Владимировна','krylova@mkag.ru',   'teacher', e_u1)
        user('zimin_teach',     'Зимин Сергей Николаевич',   'zimin@mkag.ru',     'teacher', e_u2)
        user('pavlova_teach',   'Павлова Нина Васильевна',   'pavlova@mkag.ru',   'teacher', e_u3)
        user('semyonov_teach',  'Семёнов Георгий Аркадьевич','semyonov@mkag.ru',  'teacher', e_u4)
        user('novikova_teach',  'Новикова Ирина Петровна',   'novikova@mkag.ru',  'teacher', e_u5)
        user('borisov_teach',   'Борисов Алексей Леонидович','borisov@mkag.ru',   'teacher', e_u6)
        user('trofimova_teach', 'Трофимова Елена Степановна','trofimova@mkag.ru', 'teacher', e_u7)

        # ВКС
        user('panov_teach',     'Панов Алексей Романович',   'panov@mkag.ru',     'teacher', e_v1)
        user('lukyanova_teach', 'Лукьянова Екатерина Петровна','lukyanova@mkag.ru','teacher', e_v2)
        user('moroz_teach',     'Мороз Дмитрий Владимирович','moroz@mkag.ru',     'teacher', e_v3)
        user('avdeeva_teach',   'Авдеева Кристина Николаевна','avdeeva@mkag.ru',  'teacher', e_v4)
        user('rogov_teach',     'Рогов Павел Сергеевич',     'rogov@mkag.ru',     'teacher', e_v5)
        user('sitnikova_teach', 'Ситникова Марина Александровна','sitnikova@mkag.ru','teacher',e_v6)
        user('kudryavtsev_teach','Кудрявцев Виктор Олегович','kudryavtsev@mkag.ru','teacher', e_v7)

        # АД
        user('arkhipova_teach', 'Архипова Людмила Вячеславовна','arkhipova@mkag.ru','teacher',e_d1)
        user('dmitriev_teach',  'Дмитриев Кирилл Германович','dmitriev@mkag.ru',  'teacher', e_d2)
        user('nesterova_teach', 'Нестерова Вера Андреевна',  'nesterova@mkag.ru', 'teacher', e_d3)
        user('zhuravlyov_teach','Журавлёв Степан Павлович',  'zhuravlyov@mkag.ru','teacher', e_d4)
        user('fokina_teach',    'Фокина Оксана Евгеньевна',  'fokina@mkag.ru',    'teacher', e_d5)
        user('polyakov_teach',  'Поляков Николай Владимирович','polyakov@mkag.ru', 'teacher', e_d6)
        user('veselova_teach',  'Веселова Галина Аркадьевна','veselova@mkag.ru',  'teacher', e_d7)

        total_users = User.objects.filter(institution=inst).count() + 1
        total_no_user = Employee.objects.filter(institution=inst, user_account__isnull=True).count()
        self.stdout.write(f'  Пользователей: {total_users} (owner + {total_users-1} в системе)')
        self.stdout.write(f'  Сотрудников без аккаунта: {total_no_user}')

        self.stdout.write(self.style.SUCCESS('\nБаза заполнена!'))
        self.stdout.write('-' * 50)
        self.stdout.write('  Владелец:      direktormkag / admin_-1')
        self.stdout.write('  Администратор: admin_gromov  / admin_-1')
        self.stdout.write('  Преподаватель: tarasov_teach / admin_-1  (классрук ИСиП-3-22)')
        self.stdout.write('-' * 50)
        self.stdout.write(f'  Студентов всего: {Student.objects.filter(institution=inst).count()}')
        self.stdout.write(f'  Групп: {Group.objects.filter(faculty__institution=inst).count()}  |  '
                          f'Факультетов: {Faculty.objects.filter(institution=inst).count()}')
