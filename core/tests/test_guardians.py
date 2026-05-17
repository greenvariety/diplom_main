"""
Тесты CRUD опекунов (Parents / Guardians).
"""
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Parent, DeleteRequest, StudentParent
from .helpers import (
    make_owner, make_institution, make_admin, make_teacher,
    make_faculty, make_student, make_parent,
)


class GuardianListTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.teacher = make_teacher(institution=self.org)
        self.admin = make_admin(username='admin1', institution=self.org)

    def test_admin_can_list_guardians(self):
        make_parent(self.org)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/parents/')
        self.assertEqual(resp.status_code, 200)

    def test_teacher_can_list_guardians(self):
        # Teachers also have read access
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.get('/api/parents/')
        self.assertEqual(resp.status_code, 200)


class GuardianCreateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)

    def test_admin_can_create_guardian(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/parents/', {
            'last_name': 'Сидоров', 'first_name': 'Сидор',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Parent.objects.filter(institution=self.org, last_name='Сидоров').exists())

    def test_teacher_cannot_create_guardian(self):
        teacher = make_teacher(institution=self.org)
        self.client.force_authenticate(user=teacher)
        resp = self.client.post('/api/parents/', {
            'last_name': 'Сидоров', 'first_name': 'Сидор',
        }, format='json')
        self.assertEqual(resp.status_code, 403)


class GuardianStudentLinkTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.faculty = make_faculty(self.org)
        self.student = make_student(self.faculty)
        self.parent = make_parent(self.org)

    def test_add_student_to_guardian(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/parents/{self.parent.pk}/students/', {
            'student_id': self.student.pk, 'relation_type': 'mother',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(
            StudentParent.objects.filter(student=self.student, parent=self.parent).exists()
        )

    def test_remove_student_from_guardian(self):
        sp = StudentParent.objects.create(
            student=self.student, parent=self.parent, relation_type='father',
        )
        self.client.force_authenticate(user=self.admin)
        resp = self.client.delete(f'/api/parents/{self.parent.pk}/students/{sp.pk}/')
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(StudentParent.objects.filter(pk=sp.pk).exists())


class GuardianDeleteRequestTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)

    def test_admin_creates_delete_request(self):
        parent = make_parent(self.org)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/parents/{parent.pk}/delete-request/', {
            'reason': 'Не нужен',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(
            DeleteRequest.objects.filter(object_type='Parent', object_id=parent.pk).exists()
        )
        # Опекун не удалён
        self.assertTrue(Parent.objects.filter(pk=parent.pk).exists())

    def test_owner_can_approve_delete_request_and_parent_deleted(self):
        """Владелец одобряет заявку → опекун удаляется из БД."""
        parent = make_parent(self.org)
        req = DeleteRequest.objects.create(
            user=self.admin, object_type='Parent', object_id=parent.pk, reason='Тест',
        )
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/delete-requests/{req.pk}/approve/', format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(Parent.objects.filter(pk=parent.pk).exists())
