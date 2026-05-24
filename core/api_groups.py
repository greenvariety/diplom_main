from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Exists, OuterRef
from .models import Group, Faculty, Employee, Subject, GroupSubjectEmployee, DeleteRequest, RecordNote
from .utils import log_action


def _group_data(g):
    return {
        'id': g.pk,
        'name': g.name,
        'year': g.year,
        'group_number': g.group_number,
        'faculty_id': g.faculty_id,
        'faculty_name': g.faculty.full_name if g.faculty_id else '',
        'faculty_short': g.faculty.short_name if g.faculty_id else '',
        'headteacher_id': g.headteacher_id,
        'headteacher_name': str(g.headteacher) if g.headteacher_id else None,
        'student_count': g.students.count(),
        'is_flagged': g.is_flagged,
        'warn_incomplete': g.headteacher_id is None,
        'has_pending_delreq': getattr(g, 'has_pending_delreq', False),
        'has_note': getattr(g, 'has_note', False),
    }


def _admin_only(request):
    if request.user.role not in ('owner', 'admin'):
        return Response({'error': 'Доступ запрещён'}, status=403)
    return None


class GroupsView(APIView):
    def get(self, request):
        institution = request.user.institution
        if not institution:
            return Response([])
        qs = Group.objects.filter(faculty__institution=institution).select_related('faculty', 'headteacher').annotate(
            has_pending_delreq=Exists(DeleteRequest.objects.filter(object_type='Group', object_id=OuterRef('pk'), status='pending')),
            has_note=Exists(RecordNote.objects.filter(object_type='Group', object_id=OuterRef('pk'), is_resolved=False)),
        )
        faculty_id = request.query_params.get('faculty_id')
        if faculty_id:
            qs = qs.filter(faculty_id=faculty_id)
        return Response([_group_data(g) for g in qs])

    def post(self, request):
        err = _admin_only(request)
        if err:
            return err
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        faculty_id = request.data.get('faculty_id')
        year = request.data.get('year')
        headteacher_id = request.data.get('headteacher_id') or None
        if not faculty_id:
            return Response({'error': 'Выберите факультет'}, status=400)
        if not year:
            return Response({'error': 'Укажите год начала'}, status=400)
        try:
            year_int = int(year)
        except (TypeError, ValueError):
            return Response({'error': 'Некорректный год'}, status=400)
        if institution.founded_date and year_int < institution.founded_date.year:
            return Response(
                {'error': f'Год начала не может быть раньше года основания организации ({institution.founded_date.year})'},
                status=400,
            )
        try:
            faculty = Faculty.objects.get(pk=faculty_id, institution=institution)
        except Faculty.DoesNotExist:
            return Response({'error': 'Факультет не найден'}, status=404)
        headteacher = None
        if headteacher_id:
            try:
                headteacher = Employee.objects.get(pk=headteacher_id, institution=institution)
            except Employee.DoesNotExist:
                pass
        group = Group.objects.create(faculty=faculty, year=year_int, headteacher=headteacher)
        log_action(request.user, 'created', group,
                   new_data={'name': group.name, 'year': group.year},
                   institution=institution)
        return Response(_group_data(group), status=201)


class GroupDetailView(APIView):
    def _get_group(self, request, pk):
        try:
            return Group.objects.select_related('faculty', 'headteacher').get(
                pk=pk, faculty__institution=request.user.institution
            )
        except Group.DoesNotExist:
            return None

    def get(self, request, pk):
        group = self._get_group(request, pk)
        if not group:
            return Response({'error': 'Не найдено'}, status=404)
        data = _group_data(group)
        data['students'] = [
            {
                'id': s.pk,
                'last_name': s.last_name,
                'first_name': s.first_name,
                'middle_name': s.middle_name,
                'status': s.status,
            }
            for s in group.students.all()
        ]
        data['subjects'] = [
            {
                'id': a.pk,
                'subject_id': a.subject_id,
                'subject_name': a.subject.name,
                'employee_id': a.employee_id,
                'employee_name': str(a.employee),
            }
            for a in group.subject_assignments.select_related('subject', 'employee').all()
        ]
        return Response(data)

    def patch(self, request, pk):
        err = _admin_only(request)
        if err:
            return err
        group = self._get_group(request, pk)
        if not group:
            return Response({'error': 'Не найдено'}, status=404)
        old_name = group.name
        institution = request.user.institution
        if 'faculty_id' in request.data:
            try:
                faculty = Faculty.objects.get(pk=request.data['faculty_id'], institution=institution)
                group.faculty = faculty
            except Faculty.DoesNotExist:
                return Response({'error': 'Факультет не найден'}, status=404)
        if 'year' in request.data:
            try:
                new_year = int(request.data['year'])
            except (TypeError, ValueError):
                return Response({'error': 'Некорректный год'}, status=400)
            if institution.founded_date and new_year < institution.founded_date.year:
                return Response(
                    {'error': f'Год начала не может быть раньше года основания организации ({institution.founded_date.year})'},
                    status=400,
                )
            group.year = new_year
        if 'headteacher_id' in request.data:
            hid = request.data['headteacher_id']
            if hid:
                try:
                    group.headteacher = Employee.objects.get(pk=hid, institution=institution)
                except Employee.DoesNotExist:
                    group.headteacher = None
            else:
                group.headteacher = None
        group.save()
        log_action(request.user, 'updated', group,
                   old_data={'name': old_name},
                   new_data={'name': group.name, 'year': group.year},
                   institution=institution)
        return Response(_group_data(group))

    def delete(self, request, pk):
        if request.user.role != 'owner':
            return Response({'error': 'Доступ запрещён'}, status=403)
        password = (request.data.get('password') or '').strip()
        if not password:
            return Response({'error': 'Введите пароль'}, status=400)
        if not request.user.check_password(password):
            return Response({'error': 'Неверный пароль'}, status=400)
        group = self._get_group(request, pk)
        if not group:
            return Response({'error': 'Не найдено'}, status=404)
        institution = request.user.institution
        log_action(request.user, 'deleted', group,
                   old_data={'name': group.name},
                   institution=institution)
        group.delete()
        return Response({'ok': True})


class GroupDeleteRequestView(APIView):
    def post(self, request, pk):
        err = _admin_only(request)
        if err:
            return err
        try:
            group = Group.objects.get(pk=pk, faculty__institution=request.user.institution)
        except Group.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        reason = (request.data.get('reason') or '').strip() or f'Удаление группы: {group.name}'
        DeleteRequest.objects.create(
            user=request.user,
            object_type='Group',
            object_id=group.pk,
            reason=reason,
        )
        return Response({'ok': True})


class GroupSubjectsView(APIView):
    def post(self, request, pk):
        err = _admin_only(request)
        if err:
            return err
        institution = request.user.institution
        try:
            group = Group.objects.get(pk=pk, faculty__institution=institution)
        except Group.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        subject_id = request.data.get('subject_id')
        employee_id = request.data.get('employee_id')
        if not subject_id or not employee_id:
            return Response({'error': 'Укажите предмет и преподавателя'}, status=400)
        try:
            subject = Subject.objects.get(pk=subject_id, institution=institution)
        except Subject.DoesNotExist:
            return Response({'error': 'Предмет не найден'}, status=404)
        try:
            employee = Employee.objects.get(pk=employee_id, institution=institution)
        except Employee.DoesNotExist:
            return Response({'error': 'Сотрудник не найден'}, status=404)
        if GroupSubjectEmployee.objects.filter(group=group, subject=subject).exists():
            return Response({'error': 'Этот предмет уже назначен группе'}, status=400)
        assignment = GroupSubjectEmployee.objects.create(group=group, subject=subject, employee=employee)
        log_action(request.user, 'created', assignment,
                   new_data={'group': group.name, 'subject': subject.name, 'employee': str(employee)},
                   institution=institution)
        return Response({
            'id': assignment.pk,
            'subject_id': assignment.subject_id,
            'subject_name': assignment.subject.name,
            'employee_id': assignment.employee_id,
            'employee_name': str(assignment.employee),
        }, status=201)


class GroupSubjectDetailView(APIView):
    def delete(self, request, pk, assignment_pk):
        err = _admin_only(request)
        if err:
            return err
        institution = request.user.institution
        try:
            assignment = GroupSubjectEmployee.objects.select_related(
                'group__faculty', 'subject', 'employee'
            ).get(pk=assignment_pk, group_id=pk, group__faculty__institution=institution)
        except GroupSubjectEmployee.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        log_action(request.user, 'deleted', assignment,
                   old_data={'group': assignment.group.name, 'subject': assignment.subject.name},
                   institution=institution)
        assignment.delete()
        return Response({'ok': True})


class GroupFlagView(APIView):
    def post(self, request, pk):
        if request.user.role not in ('owner', 'admin'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        try:
            group = Group.objects.get(pk=pk, faculty__institution=request.user.institution)
        except Group.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        group.is_flagged = not group.is_flagged
        group.save(update_fields=['is_flagged'])
        return Response({'is_flagged': group.is_flagged})
