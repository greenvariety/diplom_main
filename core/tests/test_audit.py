"""
Тесты аудит-лога.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import AuditLog, Faculty
from core.utils import log_action
from .helpers import make_owner, make_institution, make_admin, make_teacher, make_faculty


class AuditLogCreatedOnActionTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)

    def test_audit_log_created_on_faculty_create(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/faculties/', {
            'full_name': 'Информатика', 'short_name': 'ИНФ',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(
            AuditLog.objects.filter(
                action='created', object_type='Faculty',
            ).exists()
        )

    def test_audit_log_created_on_faculty_update(self):
        faculty = make_faculty(self.org, full_name='Старое', short_name='СТ')
        self.client.force_authenticate(user=self.admin)
        self.client.patch(f'/api/faculties/{faculty.pk}/', {
            'full_name': 'Новое', 'short_name': 'НВ',
        }, format='json')
        self.assertTrue(
            AuditLog.objects.filter(
                action='updated', object_type='Faculty', object_id=faculty.pk,
            ).exists()
        )

    def test_audit_log_has_old_and_new_data_on_update(self):
        faculty = make_faculty(self.org, full_name='Старое', short_name='СТ')
        self.client.force_authenticate(user=self.admin)
        self.client.patch(f'/api/faculties/{faculty.pk}/', {
            'full_name': 'Новое', 'short_name': 'НВ',
        }, format='json')
        log = AuditLog.objects.filter(
            action='updated', object_type='Faculty', object_id=faculty.pk,
        ).first()
        self.assertIsNotNone(log)
        self.assertIn('Старое', log.old_data)
        self.assertIn('Новое', log.new_data)

    def test_audit_log_created_on_delete(self):
        faculty = make_faculty(self.org)
        req = __import__('core.models', fromlist=['DeleteRequest']).DeleteRequest.objects.create(
            user=self.admin, object_type='Faculty', object_id=faculty.pk, reason='Тест',
        )
        self.client.force_authenticate(user=self.owner)
        self.client.post(f'/api/delete-requests/{req.pk}/approve/', format='json')
        self.assertTrue(
            AuditLog.objects.filter(
                action='deleted', object_type='Faculty',
            ).exists()
        )


class AuditLogAccessTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.teacher = make_teacher(institution=self.org)

    def test_owner_can_access_audit_log(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/audit-log/')
        self.assertEqual(resp.status_code, 200)

    def test_admin_can_access_audit_log(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/audit-log/')
        self.assertEqual(resp.status_code, 200)

    def test_teacher_cannot_access_audit_log(self):
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.get('/api/audit-log/')
        self.assertEqual(resp.status_code, 403)

    def test_audit_log_returns_paginated_result(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/audit-log/')
        self.assertIn('results', resp.data)
        self.assertIn('count', resp.data)
