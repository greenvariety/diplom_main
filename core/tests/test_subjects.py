"""
Тесты CRUD предметов.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Subject
from .helpers import make_owner, make_institution, make_admin, make_teacher, make_subject


class SubjectAccessTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.teacher = make_teacher(institution=self.org)

    def test_admin_can_list_subjects(self):
        make_subject(self.org)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/subjects/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)

    def test_teacher_can_list_subjects(self):
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.get('/api/subjects/')
        self.assertEqual(resp.status_code, 200)

    def test_teacher_cannot_create_subject(self):
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.post('/api/subjects/', {'name': 'Физика'}, format='json')
        self.assertEqual(resp.status_code, 403)


class SubjectCrudTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)

    def test_admin_can_create_subject(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/subjects/', {'name': 'Математика'}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Subject.objects.filter(institution=self.org, name='Математика').exists())

    def test_admin_can_edit_subject(self):
        subject = make_subject(self.org, name='Старое')
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(f'/api/subjects/{subject.pk}/', {'name': 'Новое'}, format='json')
        self.assertEqual(resp.status_code, 200)
        subject.refresh_from_db()
        self.assertEqual(subject.name, 'Новое')

    def test_create_without_name_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/subjects/', {'name': ''}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_subjects_isolated_to_institution(self):
        owner2 = make_owner(username='owner2')
        org2 = make_institution(owner2, code='ORG2', name='Орг2')
        make_subject(self.org, name='Математика')
        make_subject(org2, name='Физика')

        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/subjects/')
        names = [s['name'] for s in resp.data]
        self.assertIn('Математика', names)
        self.assertNotIn('Физика', names)
