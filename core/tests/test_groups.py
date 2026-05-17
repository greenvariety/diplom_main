"""
Тесты CRUD групп.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Group, GroupSubjectEmployee, Subject, Employee
from .helpers import (
    make_owner, make_institution, make_admin, make_teacher,
    make_faculty, make_group, make_employee, make_subject,
)


class GroupCreateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.faculty = make_faculty(self.org)

    def test_group_number_set_automatically_on_create(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/groups/', {
            'faculty_id': self.faculty.pk,
            'year': 2023,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['group_number'], 1)

    def test_second_group_gets_number_2(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post('/api/groups/', {'faculty_id': self.faculty.pk, 'year': 2023}, format='json')
        resp = self.client.post('/api/groups/', {'faculty_id': self.faculty.pk, 'year': 2023}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['group_number'], 2)

    def test_teacher_cannot_create_group(self):
        teacher = make_teacher(institution=self.org)
        self.client.force_authenticate(user=teacher)
        resp = self.client.post('/api/groups/', {
            'faculty_id': self.faculty.pk, 'year': 2023,
        }, format='json')
        self.assertEqual(resp.status_code, 403)


class GroupListTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.faculty = make_faculty(self.org)

    def test_admin_sees_all_groups(self):
        make_group(self.faculty)
        make_group(self.faculty)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/groups/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 2)

    def test_teacher_sees_groups_in_own_institution(self):
        make_group(self.faculty)
        teacher = make_teacher(institution=self.org)
        self.client.force_authenticate(user=teacher)
        resp = self.client.get('/api/groups/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)

    def test_filter_by_faculty(self):
        faculty2 = make_faculty(self.org, full_name='Факультет 2', short_name='Ф2')
        make_group(self.faculty)
        make_group(faculty2)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(f'/api/groups/?faculty_id={self.faculty.pk}')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)


class GroupSubjectsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.faculty = make_faculty(self.org)
        self.group = make_group(self.faculty)
        self.employee = make_employee(self.org)
        self.subject = make_subject(self.org)

    def test_add_subject_to_group(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/groups/{self.group.pk}/subjects/', {
            'subject_id': self.subject.pk,
            'employee_id': self.employee.pk,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(
            GroupSubjectEmployee.objects.filter(
                group=self.group, subject=self.subject,
            ).exists()
        )

    def test_add_same_subject_twice_returns_400(self):
        GroupSubjectEmployee.objects.create(
            group=self.group, subject=self.subject, employee=self.employee,
        )
        self.client.force_authenticate(user=self.admin)
        employee2 = make_employee(self.org, last_name='Козлов', first_name='Алексей')
        resp = self.client.post(f'/api/groups/{self.group.pk}/subjects/', {
            'subject_id': self.subject.pk,
            'employee_id': employee2.pk,
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_remove_subject_from_group(self):
        assignment = GroupSubjectEmployee.objects.create(
            group=self.group, subject=self.subject, employee=self.employee,
        )
        self.client.force_authenticate(user=self.admin)
        resp = self.client.delete(
            f'/api/groups/{self.group.pk}/subjects/{assignment.pk}/',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(GroupSubjectEmployee.objects.filter(pk=assignment.pk).exists())
