"""
Тесты прав доступа по ролям.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import DeleteRequest, Faculty
from .helpers import (
    make_owner, make_institution, make_admin, make_teacher,
    make_faculty, make_group, make_student, make_employee,
)


class BasePermissionTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(username='admin', institution=self.org)
        self.teacher = make_teacher(username='teacher', institution=self.org)


class TeacherCannotCreateTest(BasePermissionTest):
    def test_teacher_cannot_create_faculty(self):
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.post('/api/faculties/', {
            'full_name': 'Тест', 'short_name': 'ТСТ',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_teacher_cannot_create_student(self):
        faculty = make_faculty(self.org)
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.post('/api/students/', {
            'last_name': 'Иванов', 'first_name': 'Иван', 'faculty_id': faculty.pk,
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_teacher_cannot_create_employee(self):
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.post('/api/employees/', {
            'last_name': 'Петров', 'first_name': 'Пётр',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_teacher_cannot_create_group(self):
        faculty = make_faculty(self.org)
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.post('/api/groups/', {
            'faculty_id': faculty.pk, 'year': 2023,
        }, format='json')
        self.assertEqual(resp.status_code, 403)


class AdminCannotAccessOwnerZonesTest(BasePermissionTest):
    def test_admin_cannot_list_users(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/users/')
        self.assertEqual(resp.status_code, 403)

    def test_admin_cannot_create_user(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/users/', {
            'username': 'newu', 'password': 'p123', 'role': 'teacher',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_admin_cannot_list_organizations(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/organizations/')
        self.assertEqual(resp.status_code, 403)


class AdminCanCreateDeleteRequestTest(BasePermissionTest):
    def test_admin_can_create_delete_request_for_faculty(self):
        faculty = make_faculty(self.org)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/faculties/{faculty.pk}/delete-request/', {
            'reason': 'Тест',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(
            DeleteRequest.objects.filter(
                object_type='Faculty', object_id=faculty.pk, status='pending',
            ).exists()
        )


class OwnerCanAccessAllSectionsTest(BasePermissionTest):
    def test_owner_can_list_users(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/users/')
        self.assertEqual(resp.status_code, 200)

    def test_owner_can_list_delete_requests(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/delete-requests/')
        self.assertEqual(resp.status_code, 200)

    def test_owner_can_list_audit_log(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/audit-log/')
        self.assertEqual(resp.status_code, 200)

    def test_owner_can_list_organizations(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/organizations/')
        self.assertEqual(resp.status_code, 200)
