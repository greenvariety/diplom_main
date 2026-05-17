"""
Тесты моделей (без HTTP-запросов).
"""
from django.test import TestCase
from django.db import IntegrityError

from core.models import (
    User, Institution, Faculty, Group, Student, Employee,
    Parent, Subject, GroupSubjectEmployee, StudentParent, Document,
)
from .helpers import make_owner, make_institution, make_faculty, make_employee, make_student, make_parent


# ---------------------------------------------------------------------------
# 1.1 Group - автогенерация group_number
# ---------------------------------------------------------------------------

class GroupNumberAutoGenerationTest(TestCase):
    def setUp(self):
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.faculty = make_faculty(self.org)

    def test_first_group_has_number_1(self):
        group = Group.objects.create(faculty=self.faculty, year=2023)
        self.assertEqual(group.group_number, 1)

    def test_second_group_has_number_2(self):
        Group.objects.create(faculty=self.faculty, year=2023)
        group2 = Group.objects.create(faculty=self.faculty, year=2023)
        self.assertEqual(group2.group_number, 2)

    def test_edit_existing_group_does_not_change_number(self):
        group = Group.objects.create(faculty=self.faculty, year=2023)
        original_number = group.group_number
        group.year = 2024
        group.save()
        group.refresh_from_db()
        self.assertEqual(group.group_number, original_number)


# ---------------------------------------------------------------------------
# 1.2 Group - свойство name
# ---------------------------------------------------------------------------

class GroupNamePropertyTest(TestCase):
    def setUp(self):
        self.owner = make_owner()
        self.org = make_institution(self.owner)

    def test_group_name_format(self):
        faculty = Faculty.objects.create(
            institution=self.org, full_name='Информационные технологии', short_name='ИТ',
        )
        group = Group.objects.create(faculty=faculty, year=2023)
        # group_number=1, year=2023 -> short: 23
        self.assertEqual(group.name, 'ИТ-1-23')


# ---------------------------------------------------------------------------
# 1.3 User - свойства ролей
# ---------------------------------------------------------------------------

class UserRolePropertiesTest(TestCase):
    def test_owner_properties(self):
        user = User.objects.create_user(username='u_owner', password='x', role='owner')
        self.assertTrue(user.is_owner)
        self.assertTrue(user.is_superadmin)
        self.assertTrue(user.is_admin)
        self.assertFalse(user.is_teacher_role)

    def test_admin_properties(self):
        user = User.objects.create_user(username='u_admin', password='x', role='admin')
        self.assertFalse(user.is_owner)
        self.assertFalse(user.is_superadmin)
        self.assertTrue(user.is_admin)
        self.assertFalse(user.is_teacher_role)

    def test_teacher_properties(self):
        user = User.objects.create_user(username='u_teacher', password='x', role='teacher')
        self.assertFalse(user.is_owner)
        self.assertFalse(user.is_admin)
        self.assertTrue(user.is_teacher_role)


# ---------------------------------------------------------------------------
# 1.4 Document - свойство is_image
# ---------------------------------------------------------------------------

class DocumentIsImageTest(TestCase):
    def _make_doc(self, filename):
        doc = Document(
            owner_type='student', owner_id=1, name='test',
        )
        doc.file.name = filename
        return doc

    def test_jpg_is_image(self):
        self.assertTrue(self._make_doc('photo.jpg').is_image)

    def test_uppercase_png_is_image(self):
        self.assertTrue(self._make_doc('photo.PNG').is_image)

    def test_pdf_is_not_image(self):
        self.assertFalse(self._make_doc('contract.pdf').is_image)

    def test_docx_is_not_image(self):
        self.assertFalse(self._make_doc('table.docx').is_image)


# ---------------------------------------------------------------------------
# 1.5 Institution - unique_together (owner, code)
# ---------------------------------------------------------------------------

class InstitutionUniqueTogetherTest(TestCase):
    def test_same_owner_same_code_raises(self):
        owner = make_owner()
        Institution.objects.create(owner=owner, code='ABC', name='Орг1')
        with self.assertRaises(IntegrityError):
            Institution.objects.create(owner=owner, code='ABC', name='Орг2')

    def test_different_owners_same_code_ok(self):
        owner1 = make_owner(username='owner1')
        owner2 = make_owner(username='owner2')
        Institution.objects.create(owner=owner1, code='ABC', name='Орг1')
        # Не должно вызвать исключение
        Institution.objects.create(owner=owner2, code='ABC', name='Орг2')


# ---------------------------------------------------------------------------
# 1.6 GroupSubjectEmployee - unique_together (group, subject)
# ---------------------------------------------------------------------------

class GroupSubjectEmployeeUniqueTest(TestCase):
    def setUp(self):
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.faculty = make_faculty(self.org)
        self.group = Group.objects.create(faculty=self.faculty, year=2023)
        self.employee = make_employee(self.org)
        self.subject = Subject.objects.create(institution=self.org, name='Математика')

    def test_duplicate_subject_in_group_raises(self):
        GroupSubjectEmployee.objects.create(
            group=self.group, subject=self.subject, employee=self.employee,
        )
        employee2 = make_employee(self.org, last_name='Козлов', first_name='Алексей')
        with self.assertRaises(IntegrityError):
            GroupSubjectEmployee.objects.create(
                group=self.group, subject=self.subject, employee=employee2,
            )


# ---------------------------------------------------------------------------
# 1.7 StudentParent - unique_together (student, parent)
# ---------------------------------------------------------------------------

class StudentParentUniqueTest(TestCase):
    def setUp(self):
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.faculty = make_faculty(self.org)
        self.student = make_student(self.faculty)
        self.parent = make_parent(self.org)

    def test_duplicate_parent_for_student_raises(self):
        from core.models import StudentParent
        StudentParent.objects.create(student=self.student, parent=self.parent, relation_type='mother')
        with self.assertRaises(IntegrityError):
            StudentParent.objects.create(student=self.student, parent=self.parent, relation_type='father')


# ---------------------------------------------------------------------------
# 1.8 Employee full_name()
# ---------------------------------------------------------------------------

class EmployeeFullNameTest(TestCase):
    def test_with_middle_name(self):
        emp = Employee(last_name='Иванов', first_name='Иван', middle_name='Иванович')
        self.assertEqual(emp.full_name(), 'Иванов Иван Иванович')

    def test_without_middle_name(self):
        emp = Employee(last_name='Иванов', first_name='Иван', middle_name='')
        self.assertEqual(emp.full_name(), 'Иванов Иван')
