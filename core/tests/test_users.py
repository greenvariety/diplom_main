"""
Тесты управления пользователями.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import authenticate

from core.models import User
from .helpers import make_owner, make_institution, make_admin, make_teacher, make_employee


class UsersAccessTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.teacher = make_teacher(institution=self.org)

    def test_owner_can_list_users(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get('/api/users/')
        self.assertEqual(resp.status_code, 200)

    def test_admin_cannot_list_users(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/users/')
        self.assertEqual(resp.status_code, 403)

    def test_teacher_cannot_list_users(self):
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.get('/api/users/')
        self.assertEqual(resp.status_code, 403)


class UserCreateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)

    def test_owner_can_create_user(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post('/api/users/', {
            'username': 'newteacher',
            'password': 'pass123',
            'role': 'teacher',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(User.objects.filter(username='newteacher').exists())

    def test_create_user_with_invalid_role_returns_400(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post('/api/users/', {
            'username': 'hackuser',
            'password': 'pass123',
            'role': 'owner',  # Нельзя создать owner через этот API
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_create_duplicate_username_returns_400(self):
        make_admin(username='existing_user', institution=self.org)
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post('/api/users/', {
            'username': 'existing_user',
            'password': 'pass123',
            'role': 'teacher',
        }, format='json')
        self.assertEqual(resp.status_code, 400)


class UserSetPasswordTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)

    def test_owner_can_set_password(self):
        user = make_admin(username='targetuser', password='oldpass', institution=self.org)
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/users/{user.pk}/set-password/', {
            'new_password': 'newpass456',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        # Проверяем что новый пароль работает
        user.refresh_from_db()
        result = authenticate(username='targetuser', password='newpass456')
        self.assertIsNotNone(result)

    def test_set_password_empty_returns_400(self):
        user = make_admin(username='targetuser2', institution=self.org)
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(f'/api/users/{user.pk}/set-password/', {
            'new_password': '',
        }, format='json')
        self.assertEqual(resp.status_code, 400)


class UserEmployeeLinkTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)

    def test_owner_can_link_employee(self):
        user = make_teacher(username='teacher1', institution=self.org)
        employee = make_employee(self.org, last_name='Иванов', first_name='Иван')
        self.client.force_authenticate(user=self.owner)
        resp = self.client.patch(f'/api/users/{user.pk}/', {
            'employee_id': employee.pk,
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.employee_id, employee.pk)
