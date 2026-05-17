"""
Вспомогательные функции для создания тестовых данных.
"""
from core.models import (
    User, Institution, Faculty, Group, Student, Employee,
    Parent, Subject, GroupSubjectEmployee, StudentParent, Position,
)


def make_owner(username='owner', password='pass123'):
    user = User.objects.create_user(username=username, password=password, role='owner')
    return user


def make_institution(owner, code='TST', name='Тестовый колледж'):
    org = Institution.objects.create(owner=owner, code=code, name=name)
    if not owner.institution_id:
        owner.institution = org
        owner.save(update_fields=['institution'])
    return org


def make_admin(username='admin', password='pass123', institution=None):
    user = User.objects.create_user(
        username=username, password=password, role='admin', institution=institution,
    )
    if institution:
        user.allowed_institutions.add(institution)
    return user


def make_teacher(username='teacher', password='pass123', institution=None):
    user = User.objects.create_user(
        username=username, password=password, role='teacher', institution=institution,
    )
    if institution:
        user.allowed_institutions.add(institution)
    return user


def make_faculty(institution, full_name='Факультет ИТ', short_name='ИТ'):
    return Faculty.objects.create(institution=institution, full_name=full_name, short_name=short_name)


def make_group(faculty, year=2023):
    return Group.objects.create(faculty=faculty, year=year)


def make_student(faculty, group=None, last_name='Иванов', first_name='Иван'):
    return Student.objects.create(
        faculty=faculty, group=group,
        last_name=last_name, first_name=first_name,
    )


def make_employee(institution, last_name='Петров', first_name='Пётр'):
    return Employee.objects.create(
        institution=institution, last_name=last_name, first_name=first_name,
    )


def make_parent(institution, last_name='Сидоров', first_name='Сидор'):
    return Parent.objects.create(
        institution=institution, last_name=last_name, first_name=first_name,
    )


def make_subject(institution, name='Математика'):
    return Subject.objects.create(institution=institution, name=name)


def make_position(institution, name='Преподаватель'):
    return Position.objects.create(institution=institution, name=name)
