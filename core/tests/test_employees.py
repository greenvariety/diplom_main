"""
Тесты CRUD сотрудников, включая назначение на несколько организаций.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Employee, DeleteRequest, GroupSubjectEmployee
from .helpers import (
    make_owner, make_institution, make_admin, make_teacher,
    make_faculty, make_group, make_employee, make_subject,
)


class EmployeeListTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)

    def test_admin_can_list_employees(self):
        make_employee(self.org)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/employees/')
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.data), 1)

    def test_teacher_cannot_create_employee(self):
        teacher = make_teacher(institution=self.org)
        self.client.force_authenticate(user=teacher)
        resp = self.client.post('/api/employees/', {
            'last_name': 'Петров', 'first_name': 'Пётр',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_employee_isolated_to_institution(self):
        owner2 = make_owner(username='owner2')
        org2 = make_institution(owner2, code='ORG2', name='Орг2')
        make_employee(self.org, last_name='Наш', first_name='Иван')
        make_employee(org2, last_name='Чужой', first_name='Пётр')

        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/employees/')
        last_names = [e['last_name'] for e in resp.data]
        self.assertIn('Наш', last_names)
        self.assertNotIn('Чужой', last_names)


class EmployeeCreateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)

    def test_admin_creates_employee(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/employees/', {
            'last_name': 'Новый', 'first_name': 'Сотрудник',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Employee.objects.filter(institution=self.org, last_name='Новый').exists())


class EmployeeMultiOrgTest(TestCase):
    """
    Тест 9.3/9.4: Сотрудник в нескольких организациях.
    Пользователь-аккаунт привязывается к нескольким орг через allowed_institutions.
    """

    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org1 = make_institution(self.owner, code='ORG1', name='Колледж 1')
        self.org2 = make_institution(self.owner, code='ORG2', name='Колледж 2')

    def test_employee_visible_in_own_institution(self):
        emp = make_employee(self.org1, last_name='МультиОрг', first_name='Иван')
        admin1 = make_admin(username='admin1', institution=self.org1)
        self.client.force_authenticate(user=admin1)
        resp = self.client.get('/api/employees/')
        last_names = [e['last_name'] for e in resp.data]
        self.assertIn('МультиОрг', last_names)

    def test_employee_not_visible_in_other_institution(self):
        emp = make_employee(self.org1, last_name='ТолькоОрг1', first_name='Иван')
        admin2 = make_admin(username='admin2', institution=self.org2)
        self.client.force_authenticate(user=admin2)
        resp = self.client.get('/api/employees/')
        last_names = [e['last_name'] for e in resp.data]
        self.assertNotIn('ТолькоОрг1', last_names)

    def test_owner_can_switch_and_see_employees_from_org2(self):
        """После переключения в орг2 owner видит сотрудников орг2."""
        make_employee(self.org1, last_name='ЕмпОрг1', first_name='А')
        make_employee(self.org2, last_name='ЕмпОрг2', first_name='Б')

        # Переключаемся на org2
        self.owner.institution = self.org2
        self.owner.save(update_fields=['institution'])

        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/employees/')
        last_names = [e['last_name'] for e in resp.data]
        self.assertIn('ЕмпОрг2', last_names)
        self.assertNotIn('ЕмпОрг1', last_names)


class EmployeeSubjectTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.faculty = make_faculty(self.org)
        self.group = make_group(self.faculty)
        self.employee = make_employee(self.org)
        self.subject = make_subject(self.org)

    def test_assign_subject_to_employee(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/employees/{self.employee.pk}/subjects/', {
            'subject_id': self.subject.pk,
            'group_id': self.group.pk,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(
            GroupSubjectEmployee.objects.filter(
                employee=self.employee, subject=self.subject, group=self.group,
            ).exists()
        )

    def test_remove_subject_from_employee(self):
        assignment = GroupSubjectEmployee.objects.create(
            group=self.group, subject=self.subject, employee=self.employee,
        )
        self.client.force_authenticate(user=self.admin)
        resp = self.client.delete(
            f'/api/employees/{self.employee.pk}/subjects/{assignment.pk}/',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(GroupSubjectEmployee.objects.filter(pk=assignment.pk).exists())


class EmployeeDeleteRequestTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)

    def test_admin_creates_delete_request(self):
        emp = make_employee(self.org)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/employees/{emp.pk}/delete-request/', {
            'reason': 'Уволен',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(Employee.objects.filter(pk=emp.pk).exists())
        self.assertTrue(
            DeleteRequest.objects.filter(object_type='Employee', object_id=emp.pk).exists()
        )
