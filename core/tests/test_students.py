"""
Тесты CRUD студентов.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Student, DeleteRequest, StudentParent
from .helpers import (
    make_owner, make_institution, make_admin, make_teacher,
    make_faculty, make_group, make_student, make_parent,
)


class StudentCreateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.faculty = make_faculty(self.org)

    def test_admin_creates_student(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/students/', {
            'last_name': 'Иванов', 'first_name': 'Иван', 'faculty_id': self.faculty.pk,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Student.objects.filter(last_name='Иванов', faculty=self.faculty).exists())

    def test_new_student_status_is_pending_review(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/students/', {
            'last_name': 'Иванов', 'first_name': 'Иван', 'faculty_id': self.faculty.pk,
        }, format='json')
        self.assertEqual(resp.data['status'], 'pending_review')

    def test_teacher_cannot_create_student(self):
        teacher = make_teacher(institution=self.org)
        self.client.force_authenticate(user=teacher)
        resp = self.client.post('/api/students/', {
            'last_name': 'Иванов', 'first_name': 'Иван', 'faculty_id': self.faculty.pk,
        }, format='json')
        self.assertEqual(resp.status_code, 403)


class StudentListFilterTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.faculty = make_faculty(self.org)
        self.group = make_group(self.faculty)

    def test_filter_by_status(self):
        s1 = make_student(self.faculty, last_name='Зачислен', first_name='А')
        s1.status = 'enrolled'
        s1.save()
        make_student(self.faculty, last_name='ПодРассмотрением', first_name='Б')

        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/students/?status=enrolled')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data['results']), 1)
        self.assertEqual(resp.data['results'][0]['last_name'], 'Зачислен')

    def test_filter_by_group(self):
        s1 = make_student(self.faculty, group=self.group, last_name='ВГруппе', first_name='А')
        make_student(self.faculty, last_name='БезГруппы', first_name='Б')

        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(f'/api/students/?group_id={self.group.pk}')
        self.assertEqual(len(resp.data['results']), 1)
        self.assertEqual(resp.data['results'][0]['last_name'], 'ВГруппе')

    def test_search_by_last_name(self):
        make_student(self.faculty, last_name='Смирнов', first_name='Иван')
        make_student(self.faculty, last_name='Кузнецов', first_name='Пётр')

        self.client.force_authenticate(user=self.admin)
        resp = self.client.get('/api/students/?search=Смирнов')
        self.assertEqual(len(resp.data['results']), 1)
        self.assertEqual(resp.data['results'][0]['last_name'], 'Смирнов')


class StudentUpdateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.faculty = make_faculty(self.org)

    def test_admin_can_change_status(self):
        student = make_student(self.faculty)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(f'/api/students/{student.pk}/', {
            'status': 'enrolled',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        student.refresh_from_db()
        self.assertEqual(student.status, 'enrolled')


class StudentTransferTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.faculty = make_faculty(self.org)
        self.group1 = make_group(self.faculty)
        self.group2 = make_group(self.faculty)

    def test_transfer_student_changes_group_and_status(self):
        student = make_student(self.faculty, group=self.group1)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/students/{student.pk}/transfer/', {
            'group_id': self.group2.pk,
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        student.refresh_from_db()
        self.assertEqual(student.group_id, self.group2.pk)
        self.assertEqual(student.status, 'transferred')


class StudentParentsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.faculty = make_faculty(self.org)
        self.student = make_student(self.faculty)
        self.parent = make_parent(self.org)

    def test_add_parent_to_student(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/students/{self.student.pk}/parents/', {
            'parent_id': self.parent.pk, 'relation_type': 'mother',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(
            StudentParent.objects.filter(student=self.student, parent=self.parent).exists()
        )

    def test_remove_parent_from_student(self):
        sp = StudentParent.objects.create(
            student=self.student, parent=self.parent, relation_type='father',
        )
        self.client.force_authenticate(user=self.admin)
        resp = self.client.delete(f'/api/students/{self.student.pk}/parents/{sp.pk}/')
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(StudentParent.objects.filter(pk=sp.pk).exists())


class StudentDeleteRequestTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = make_owner()
        self.org = make_institution(self.owner)
        self.admin = make_admin(institution=self.org)
        self.faculty = make_faculty(self.org)

    def test_admin_creates_delete_request(self):
        student = make_student(self.faculty)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(f'/api/students/{student.pk}/delete-request/', {
            'reason': 'Отчислен',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        # Студент не удалён
        self.assertTrue(Student.objects.filter(pk=student.pk).exists())
        # Заявка создана
        self.assertTrue(
            DeleteRequest.objects.filter(
                object_type='Student', object_id=student.pk, status='pending',
            ).exists()
        )
