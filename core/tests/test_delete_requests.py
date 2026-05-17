"""
Тесты заявок на удаление (двухуровневый процесс).
"""
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import DeleteRequest, Faculty, Student
from .helpers import (
    make_owner, make_institution, make_admin, make_teacher,
    make_faculty, make_student,
)


class DeleteRequestCreateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)

    def test_admin_creates_pending_delete_request(self):
        faculty = make_faculty(self.org)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/faculties/{faculty.pk}/delete-request/', {
            'reason': 'Тест',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        req = DeleteRequest.objects.get(object_type='Faculty', object_id=faculty.pk)
        self.assertEqual(req.status, 'pending')

    def test_teacher_cannot_create_delete_request(self):
        faculty = make_faculty(self.org)
        teacher = make_teacher(institution=self.org)
        self.client.force_authenticate(user=teacher)
        resp = self.client.post(f'/api/faculties/{faculty.pk}/delete-request/', {
            'reason': 'Тест',
        }, format='json')
        self.assertEqual(resp.status_code, 403)


class DeleteRequestApproveTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)

    def test_owner_approves_delete_request_and_object_deleted(self):
        faculty = make_faculty(self.org)
        req = DeleteRequest.objects.create(
            user=self.admin, object_type='Faculty', object_id=faculty.pk,
            reason='Тест',
        )
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/delete-requests/{req.pk}/approve/', format='json')
        self.assertEqual(resp.status_code, 200)
        req.refresh_from_db()
        self.assertEqual(req.status, 'approved')
        self.assertFalse(Faculty.objects.filter(pk=faculty.pk).exists())

    def test_admin_cannot_approve_delete_request(self):
        faculty = make_faculty(self.org)
        req = DeleteRequest.objects.create(
            user=self.admin, object_type='Faculty', object_id=faculty.pk,
            reason='Тест',
        )
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/delete-requests/{req.pk}/approve/', format='json')
        self.assertEqual(resp.status_code, 403)

    def test_approve_already_deleted_object_marks_approved(self):
        """Одобрение заявки, где объект уже удалён - статус всё равно approved."""
        faculty = make_faculty(self.org)
        req = DeleteRequest.objects.create(
            user=self.admin, object_type='Faculty', object_id=faculty.pk,
            reason='Тест',
        )
        faculty.delete()
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/delete-requests/{req.pk}/approve/', format='json')
        self.assertEqual(resp.status_code, 200)
        req.refresh_from_db()
        self.assertEqual(req.status, 'approved')


class DeleteRequestRejectTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)

    def test_owner_rejects_delete_request(self):
        faculty = make_faculty(self.org)
        req = DeleteRequest.objects.create(
            user=self.admin, object_type='Faculty', object_id=faculty.pk,
            reason='Тест',
        )
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/delete-requests/{req.pk}/reject/', format='json')
        self.assertEqual(resp.status_code, 200)
        req.refresh_from_db()
        self.assertEqual(req.status, 'rejected')
        # Объект не удалён
        self.assertTrue(Faculty.objects.filter(pk=faculty.pk).exists())

    def test_admin_cannot_reject_delete_request(self):
        faculty = make_faculty(self.org)
        req = DeleteRequest.objects.create(
            user=self.admin, object_type='Faculty', object_id=faculty.pk,
            reason='Тест',
        )
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/delete-requests/{req.pk}/reject/', format='json')
        self.assertEqual(resp.status_code, 403)


class DeleteRequestsListTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.teacher = make_teacher(institution=self.org)

    def test_owner_can_list_delete_requests(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/delete-requests/')
        self.assertEqual(resp.status_code, 200)

    def test_admin_can_list_delete_requests(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/delete-requests/')
        self.assertEqual(resp.status_code, 200)

    def test_teacher_cannot_list_delete_requests(self):
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.get('/api/delete-requests/')
        self.assertEqual(resp.status_code, 403)
