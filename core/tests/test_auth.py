"""
Тесты авторизации через API.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from .helpers import make_owner, make_institution


class LoginTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner(username='testuser', password='testpass123')
        self.org = make_institution(self.owner)

    def test_login_success_returns_tokens(self):
        resp = self.client.post('/api/auth/login/', {
            'username': 'testuser', 'password': 'testpass123',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_login_wrong_password_returns_400(self):
        resp = self.client.post('/api/auth/login/', {
            'username': 'testuser', 'password': 'wrongpass',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.data)

    def test_login_empty_username_returns_400(self):
        resp = self.client.post('/api/auth/login/', {
            'username': '', 'password': 'testpass123',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_login_response_contains_user_info(self):
        resp = self.client.post('/api/auth/login/', {
            'username': 'testuser', 'password': 'testpass123',
        }, format='json')
        self.assertEqual(resp.data['user']['username'], 'testuser')
        self.assertEqual(resp.data['user']['role'], 'owner')


class LogoutTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner(username='testuser', password='pass123')
        self.org = make_institution(self.owner)

    def test_logout_returns_ok(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post('/api/auth/logout/', format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data.get('ok'), True)

    def test_unauthenticated_request_to_api_returns_401(self):
        resp = self.client.get('/api/me/')
        self.assertEqual(resp.status_code, 401)


class AuthProtectionTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_unauthenticated_dashboard_returns_401(self):
        resp = self.client.get('/api/dashboard/')
        self.assertEqual(resp.status_code, 401)

    def test_unauthenticated_students_returns_401(self):
        resp = self.client.get('/api/students/')
        self.assertEqual(resp.status_code, 401)

    def test_unauthenticated_faculties_returns_401(self):
        resp = self.client.get('/api/faculties/')
        self.assertEqual(resp.status_code, 401)


class RegisterTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_sends_code_and_returns_masked_email(self):
        resp = self.client.post('/api/auth/register/', {
            'login': 'newuser',
            'name': 'Новый Пользователь',
            'email': 'new@example.com',
            'pass': 'Secure123_',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('masked_email', resp.data)

    def test_register_duplicate_username_returns_400(self):
        make_owner(username='existinguser')
        resp = self.client.post('/api/auth/register/', {
            'login': 'existinguser',
            'name': 'Дубликат',
            'email': 'dup@example.com',
            'pass': 'Secure123_',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.data)

    def test_register_empty_login_returns_400(self):
        resp = self.client.post('/api/auth/register/', {
            'login': '',
            'name': 'Имя',
            'email': 'test@example.com',
            'pass': 'Secure123_',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_register_missing_email_returns_400(self):
        resp = self.client.post('/api/auth/register/', {
            'login': 'someuser',
            'name': 'Имя',
            'pass': 'Secure123_',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
