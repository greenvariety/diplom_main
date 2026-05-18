"""
Тесты логики выбора и переключения организации.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Institution, EmailCode
from django.utils import timezone
from datetime import timedelta
from .helpers import make_owner, make_institution, make_admin, make_teacher


def make_delete_code(owner, org):
    """Создаёт валидный email-код для удаления организации."""
    import json
    code = 'TST123'
    EmailCode.objects.create(
        email=owner.email or 'test@test.ru',
        login=owner.username,
        code=code,
        purpose='delete_org',
        payload=json.dumps({'org_id': org.pk}),
        expires_at=timezone.now() + timedelta(minutes=15),
    )
    return code


class OwnerOrgsTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_owner_no_orgs_returns_empty_list(self):
        owner = make_owner(username='owner_no_org')
        self.client.force_authenticate(user=owner)
        resp = self.client.get('/api/organizations/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 0)

    def test_owner_with_org_returns_list(self):
        owner = make_owner(username='owner_with_org')
        org = make_institution(owner)
        self.client.force_authenticate(user=owner)
        resp = self.client.get('/api/organizations/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['id'], org.pk)

    def test_non_owner_cannot_list_orgs(self):
        owner = make_owner()
        org = make_institution(owner)
        admin = make_admin(institution=org)
        self.client.force_authenticate(user=admin)
        resp = self.client.get('/api/organizations/')
        self.assertEqual(resp.status_code, 403)


class AllowedOrgsTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_admin_no_orgs_returns_empty_list(self):
        admin = make_admin(username='admin_no_org')
        self.client.force_authenticate(user=admin)
        resp = self.client.get('/api/organizations/allowed/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 0)

    def test_admin_one_org_returns_one(self):
        owner = make_owner()
        org = make_institution(owner)
        admin = make_admin(institution=org)
        self.client.force_authenticate(user=admin)
        resp = self.client.get('/api/organizations/allowed/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)

    def test_admin_multiple_orgs_returns_all(self):
        owner = make_owner()
        org1 = make_institution(owner, code='ORG1', name='Орг1')
        org2 = make_institution(owner, code='ORG2', name='Орг2')
        admin = make_admin(institution=org1)
        admin.allowed_institutions.add(org2)
        self.client.force_authenticate(user=admin)
        resp = self.client.get('/api/organizations/allowed/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 2)

    def test_owner_cannot_use_allowed_orgs_endpoint(self):
        owner = make_owner()
        make_institution(owner)
        self.client.force_authenticate(user=owner)
        resp = self.client.get('/api/organizations/allowed/')
        self.assertEqual(resp.status_code, 403)


class CreateOrganizationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()

    def test_owner_can_create_org(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post('/api/organizations/', {
            'name': 'Новый Колледж', 'code': 'НК',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Institution.objects.filter(owner=self.owner, code='НК').exists())

    def test_non_owner_cannot_create_org(self):
        owner = make_owner(username='o2')
        org = make_institution(owner)
        admin = make_admin(institution=org)
        self.client.force_authenticate(user=admin)
        resp = self.client.post('/api/organizations/', {
            'name': 'Колледж', 'code': 'КОД',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_create_org_without_name_returns_400(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post('/api/organizations/', {
            'name': '', 'code': 'X',
        }, format='json')
        self.assertEqual(resp.status_code, 400)


class SwitchOrganizationTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_owner_can_switch_org(self):
        owner = make_owner()
        org1 = make_institution(owner, code='ORG1', name='Орг1')
        org2 = make_institution(owner, code='ORG2', name='Орг2')
        self.client.force_authenticate(user=owner)
        resp = self.client.post(f'/api/organizations/{org2.pk}/switch/', format='json')
        self.assertEqual(resp.status_code, 200)
        owner.refresh_from_db()
        self.assertEqual(owner.institution_id, org2.pk)

    def test_admin_can_switch_to_allowed_org(self):
        owner = make_owner()
        org1 = make_institution(owner, code='ORG1', name='Орг1')
        org2 = make_institution(owner, code='ORG2', name='Орг2')
        admin = make_admin(institution=org1)
        admin.allowed_institutions.add(org2)
        self.client.force_authenticate(user=admin)
        resp = self.client.post(f'/api/organizations/{org2.pk}/switch/', format='json')
        self.assertEqual(resp.status_code, 200)
        admin.refresh_from_db()
        self.assertEqual(admin.institution_id, org2.pk)

    def test_switch_to_nonexistent_org_returns_404(self):
        owner = make_owner()
        make_institution(owner)
        self.client.force_authenticate(user=owner)
        resp = self.client.post('/api/organizations/99999/switch/', format='json')
        self.assertEqual(resp.status_code, 404)


class DeleteOrganizationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner(username='del_owner', password='Secret123', email='del@test.ru')
        self.org = make_institution(self.owner)
        self.client.force_authenticate(user=self.owner)

    def _delete(self, code='TST123'):
        return self.client.delete(
            f'/api/organizations/{self.org.pk}/',
            {'code': code},
            format='json',
        )

    def test_owner_can_delete_org_with_valid_code(self):
        code = make_delete_code(self.owner, self.org)
        resp = self._delete(code=code)
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(Institution.objects.filter(pk=self.org.pk).exists())

    def test_delete_without_code_returns_400(self):
        resp = self._delete(code='')
        self.assertEqual(resp.status_code, 400)

    def test_delete_wrong_code_returns_400(self):
        make_delete_code(self.owner, self.org)
        resp = self._delete(code='WRONG1')
        self.assertEqual(resp.status_code, 400)

    def test_non_owner_cannot_delete_org(self):
        owner2 = make_owner(username='owner2', password='pass')
        org2 = make_institution(owner2, code='ORG2', name='Орг2')
        self.client.force_authenticate(user=owner2)
        resp = self.client.delete(
            f'/api/organizations/{self.org.pk}/',
            {'code': 'TST123'},
            format='json',
        )
        self.assertEqual(resp.status_code, 404)
