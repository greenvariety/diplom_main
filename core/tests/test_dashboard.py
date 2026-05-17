"""
Тесты дашборда.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from .helpers import (
    make_owner, make_institution, make_admin, make_teacher,
    make_faculty, make_group, make_student, make_employee,
)


class DashboardTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.faculty = make_faculty(self.org)

    def test_owner_can_access_dashboard(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/dashboard/')
        self.assertEqual(resp.status_code, 200)

    def test_admin_can_access_dashboard(self):
        admin = make_admin(institution=self.org)
        self.client.force_authenticate(user=admin)
        resp = self.client.get('/api/dashboard/')
        self.assertEqual(resp.status_code, 200)

    def test_teacher_can_access_dashboard(self):
        teacher = make_teacher(institution=self.org)
        self.client.force_authenticate(user=teacher)
        resp = self.client.get('/api/dashboard/')
        self.assertEqual(resp.status_code, 200)

    def test_unauthenticated_cannot_access_dashboard(self):
        resp = self.client.get('/api/dashboard/')
        self.assertEqual(resp.status_code, 401)

    def test_dashboard_contains_stats(self):
        make_student(self.faculty)
        make_employee(self.org)
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/dashboard/')
        self.assertIn('stats', resp.data)
        stats = resp.data['stats']
        self.assertIn('students', stats)
        self.assertIn('employees', stats)
        self.assertIn('faculties', stats)
        self.assertIn('groups', stats)

    def test_dashboard_stats_count_correctly(self):
        make_student(self.faculty)
        make_student(self.faculty, last_name='Петров', first_name='Пётр')
        make_employee(self.org)
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/dashboard/')
        stats = resp.data['stats']
        self.assertEqual(stats['students'], 2)
        self.assertEqual(stats['employees'], 1)
        self.assertEqual(stats['faculties'], 1)

    def test_dashboard_contains_recent_audit(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/dashboard/')
        self.assertIn('recent_audit', resp.data)
        self.assertIsInstance(resp.data['recent_audit'], list)

    def test_dashboard_stats_only_own_institution(self):
        """Статистика дашборда считает только данные своей организации."""
        owner2 = make_owner(username='owner2')
        org2 = make_institution(owner2, code='ORG2', name='Орг2')
        faculty2 = make_faculty(org2, full_name='Другой факультет', short_name='ДФ')
        make_student(faculty2, last_name='Чужой', first_name='Студент')

        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/dashboard/')
        # В нашей орг студентов нет
        self.assertEqual(resp.data['stats']['students'], 0)
