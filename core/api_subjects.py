from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Subject, Employee, Student, GroupSubjectEmployee, DeleteRequest
from .utils import log_action


def _emp_incomplete(e):
    return not all([e.position_id, e.birth_date, e.phone, e.email, e.photo])


class SubjectsView(APIView):
    def get(self, request):
        institution = request.user.institution
        if not institution:
            return Response([])
        subjects = Subject.objects.filter(institution=institution).order_by('name')
        return Response([{'id': s.pk, 'name': s.name} for s in subjects])

    def post(self, request):
        if request.user.role not in ('owner', 'admin'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'error': 'Введите название предмета'}, status=400)
        subject = Subject.objects.create(institution=institution, name=name)
        log_action(request.user, 'created', subject,
                   new_data={'name': name}, institution=institution)
        return Response({'id': subject.pk, 'name': subject.name}, status=201)


class SubjectDetailView(APIView):
    def get(self, request, pk):
        institution = request.user.institution
        try:
            subject = Subject.objects.get(pk=pk, institution=institution)
        except Subject.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        assignments = subject.group_assignments.select_related('group', 'group__faculty', 'employee').order_by('group__year', 'group__group_number')
        group_ids = [a.group_id for a in assignments]
        students = Student.objects.filter(
            group_id__in=group_ids
        ).select_related('group').order_by('last_name', 'first_name', 'middle_name')
        teachers = subject.teachers.filter(institution=institution).select_related('position').order_by('last_name', 'first_name', 'middle_name')
        return Response({
            'id': subject.pk,
            'name': subject.name,
            'teachers': [
                {
                    'id': e.pk,
                    'full_name': e.full_name(),
                    'warn_incomplete': _emp_incomplete(e),
                }
                for e in teachers
            ],
            'assignments': [
                {
                    'id': a.pk,
                    'group_id': a.group_id,
                    'group_name': a.group.name,
                    'employee_id': a.employee_id,
                    'employee_name': a.employee.full_name(),
                    'employee_warn_incomplete': _emp_incomplete(a.employee),
                }
                for a in assignments
            ],
            'students': [
                {
                    'id': s.pk,
                    'last_name': s.last_name,
                    'first_name': s.first_name,
                    'middle_name': s.middle_name,
                    'group_id': s.group_id,
                    'group_name': s.group.name if s.group_id else '',
                    'status': s.status,
                }
                for s in students
            ],
        })

    def patch(self, request, pk):
        if request.user.role not in ('owner', 'admin'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        try:
            subject = Subject.objects.get(pk=pk, institution=institution)
        except Subject.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'error': 'Введите название'}, status=400)
        old_name = subject.name
        subject.name = name
        subject.save()
        log_action(request.user, 'updated', subject,
                   old_data={'name': old_name}, new_data={'name': name},
                   institution=institution)
        return Response({'id': subject.pk, 'name': subject.name})

    def delete(self, request, pk):
        if request.user.role != 'owner':
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        try:
            subject = Subject.objects.get(pk=pk, institution=institution)
        except Subject.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        if subject.group_assignments.exists():
            return Response({'error': 'Предмет назначен группам, удаление невозможно'}, status=400)
        log_action(request.user, 'deleted', subject,
                   old_data={'name': subject.name}, institution=institution)
        subject.delete()
        return Response({'ok': True})


class SubjectDeleteRequestView(APIView):
    def post(self, request, pk):
        if request.user.role not in ('owner', 'admin', 'secretary'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        try:
            subject = Subject.objects.get(pk=pk, institution=institution)
        except Subject.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        reason = (request.data.get('reason') or '').strip() or f'Удаление предмета: {subject.name}'
        req = DeleteRequest.objects.create(
            user=request.user,
            object_type='Subject',
            object_id=subject.pk,
            reason=reason,
        )
        log_action(request.user, 'created', req,
                   new_data={'object_type': 'Subject', 'object_id': subject.pk, 'reason': reason},
                   institution=institution)
        return Response({'ok': True})


class SubjectEmployeesView(APIView):
    def get(self, request, pk):
        institution = request.user.institution
        try:
            subject = Subject.objects.get(pk=pk, institution=institution)
        except Subject.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        employees = subject.teachers.filter(institution=institution).order_by('last_name', 'first_name', 'middle_name')
        return Response([{'id': e.pk, 'full_name': e.full_name()} for e in employees])

    def post(self, request, pk):
        if request.user.role not in ('owner', 'admin'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        try:
            subject = Subject.objects.get(pk=pk, institution=institution)
        except Subject.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        employee_id = request.data.get('employee_id')
        try:
            employee = Employee.objects.get(pk=employee_id, institution=institution)
        except Employee.DoesNotExist:
            return Response({'error': 'Сотрудник не найден'}, status=404)
        employee.taught_subjects.add(subject)
        log_action(request.user, 'updated', subject,
                   new_data={'teacher_added': employee.full_name()}, institution=institution)
        return Response({'id': employee.pk, 'full_name': employee.full_name()}, status=201)


class SubjectEmployeeDetailView(APIView):
    def delete(self, request, pk, employee_pk):
        if request.user.role not in ('owner', 'admin'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        try:
            subject = Subject.objects.get(pk=pk, institution=institution)
        except Subject.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        try:
            employee = Employee.objects.get(pk=employee_pk, institution=institution)
        except Employee.DoesNotExist:
            return Response({'error': 'Сотрудник не найден'}, status=404)
        GroupSubjectEmployee.objects.filter(subject=subject, employee=employee).delete()
        employee.taught_subjects.remove(subject)
        log_action(request.user, 'updated', subject,
                   old_data={'teacher_removed': employee.full_name()}, institution=institution)
        return Response({'ok': True})
