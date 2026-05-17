"""
Тесты CRUD факультетов.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Faculty, DeleteRequest
from .helpers import make_owner, make_institution, make_admin, make_teacher, make_faculty


class FacultyListTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.teacher = make_teacher(institution=self.org)

    def test_admin_can_list_faculties(self):
        make_faculty(self.org)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/faculties/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)

    def test_teacher_can_list_faculties(self):
        make_faculty(self.org)
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.get('/api/faculties/')
        self.assertEqual(resp.status_code, 200)

    def test_list_only_own_institution_faculties(self):
        owner2 = make_owner(username='owner2')
        org2 = make_institution(owner2, code='ORG2', name='Орг2')
        make_faculty(self.org, full_name='Факультет А', short_name='ФА')
        make_faculty(org2, full_name='Факультет Б', short_name='ФБ')
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/faculties/')
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['short_name'], 'ФА')


class FacultyCreateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)

    def test_admin_can_create_faculty(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/faculties/', {
            'full_name': 'Информационные технологии', 'short_name': 'ИТ',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Faculty.objects.filter(institution=self.org, short_name='ИТ').exists())

    def test_create_without_full_name_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/faculties/', {
            'full_name': '', 'short_name': 'ИТ',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_create_without_short_name_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/faculties/', {
            'full_name': 'Полное название', 'short_name': '',
        }, format='json')
        self.assertEqual(resp.status_code, 400)


class FacultyUpdateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)

    def test_admin_can_edit_faculty(self):
        faculty = make_faculty(self.org, full_name='Старое название', short_name='СН')
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(f'/api/faculties/{faculty.pk}/', {
            'full_name': 'Новое название', 'short_name': 'НН',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        faculty.refresh_from_db()
        self.assertEqual(faculty.full_name, 'Новое название')


class FacultyDeleteRequestTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)

    def test_admin_creates_delete_request(self):
        faculty = make_faculty(self.org)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/faculties/{faculty.pk}/delete-request/', {
            'reason': 'Не нужен',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(
            DeleteRequest.objects.filter(
                object_type='Faculty', object_id=faculty.pk,
            ).exists()
        )
        # Факультет не удалён
        self.assertTrue(Faculty.objects.filter(pk=faculty.pk).exists())
