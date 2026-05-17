"""
Тесты CRUD должностей.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Position
from .helpers import make_owner, make_institution, make_admin, make_teacher, make_position


class PositionAccessTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.teacher = make_teacher(institution=self.org)

    def test_owner_can_list_positions(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/positions/')
        self.assertEqual(resp.status_code, 200)

    def test_admin_can_list_positions(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/positions/')
        self.assertEqual(resp.status_code, 200)

    def test_teacher_can_list_positions(self):
        # Чтение доступно всем (нужно для выпадающих списков)
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.get('/api/positions/')
        self.assertEqual(resp.status_code, 200)


class PositionCrudTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)

    def test_admin_can_create_position(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/positions/', {'name': 'Завуч'}, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Position.objects.filter(institution=self.org, name='Завуч').exists())

    def test_teacher_cannot_create_position(self):
        teacher = make_teacher(institution=self.org)
        self.client.force_authenticate(user=teacher)
        resp = self.client.post('/api/positions/', {'name': 'Завуч'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_admin_can_edit_position(self):
        position = make_position(self.org, name='Старое')
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(f'/api/positions/{position.pk}/', {'name': 'Новое'}, format='json')
        self.assertEqual(resp.status_code, 200)
        position.refresh_from_db()
        self.assertEqual(position.name, 'Новое')

    def test_create_without_name_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/positions/', {'name': ''}, format='json')
        self.assertEqual(resp.status_code, 400)
