from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Faculty, Student, Group, DeleteRequest
from .utils import log_action


def _faculty_data(f):
    return {
        'id': f.pk,
        'full_name': f.full_name,
        'short_name': f.short_name,
        'created_at': f.created_at.strftime('%d.%m.%Y') if f.created_at else None,
        'group_count': f.groups.count(),
        'student_count': Student.objects.filter(faculty=f).count(),
        'is_flagged': f.is_flagged,
    }


def _admin_only(request):
    if request.user.role not in ('owner', 'admin'):
        return Response({'error': 'Доступ запрещён'}, status=403)
    return None


class FacultiesView(APIView):
    def get(self, request):
        inst_id = request.query_params.get('institution_id')
        if inst_id and request.user.is_owner:
            from .models import Institution as Inst
            try:
                institution = Inst.objects.get(pk=inst_id, owner=request.user)
            except Inst.DoesNotExist:
                return Response([])
        else:
            institution = request.user.institution
        if not institution:
            return Response([])
        faculties = Faculty.objects.filter(institution=institution).order_by('full_name')
        return Response([_faculty_data(f) for f in faculties])

    def post(self, request):
        err = _admin_only(request)
        if err:
            return err
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        full_name = request.data.get('full_name', '').strip()
        short_name = request.data.get('short_name', '').strip()
        created_at = request.data.get('created_at') or None
        if not full_name:
            return Response({'error': 'Введите полное название'}, status=400)
        if not short_name:
            return Response({'error': 'Введите код (аббревиатуру)'}, status=400)
        field_errors = {}
        if Faculty.objects.filter(institution=institution, full_name__iexact=full_name).exists():
            field_errors['full_name'] = 'Факультет с таким названием уже существует'
        if Faculty.objects.filter(institution=institution, short_name__iexact=short_name).exists():
            field_errors['short_name'] = 'Факультет с таким кодом уже существует'
        if field_errors:
            return Response(field_errors, status=400)
        faculty = Faculty.objects.create(
            institution=institution,
            full_name=full_name,
            short_name=short_name,
            created_at=created_at,
        )
        log_action(request.user, 'created', faculty,
                   new_data={'full_name': full_name, 'short_name': short_name},
                   institution=institution)
        return Response(_faculty_data(faculty), status=201)


class FacultyDetailView(APIView):
    def _get_faculty(self, request, pk):
        try:
            return Faculty.objects.get(pk=pk, institution=request.user.institution)
        except Faculty.DoesNotExist:
            return None

    def get(self, request, pk):
        faculty = self._get_faculty(request, pk)
        if not faculty:
            return Response({'error': 'Не найдено'}, status=404)
        groups = Group.objects.filter(faculty=faculty).order_by('group_number')
        groups_data = [
            {
                'id': g.pk,
                'name': g.name,
                'year': g.year,
                'student_count': g.students.count(),
                'headteacher_name': str(g.headteacher) if g.headteacher_id else None,
            }
            for g in groups
        ]
        data = _faculty_data(faculty)
        data['groups'] = groups_data
        return Response(data)

    def patch(self, request, pk):
        err = _admin_only(request)
        if err:
            return err
        faculty = self._get_faculty(request, pk)
        if not faculty:
            return Response({'error': 'Не найдено'}, status=404)
        old_data = {'full_name': faculty.full_name, 'short_name': faculty.short_name}
        full_name = request.data.get('full_name', '').strip()
        short_name = request.data.get('short_name', '').strip()
        if not full_name:
            return Response({'error': 'Введите полное название'}, status=400)
        if not short_name:
            return Response({'error': 'Введите код'}, status=400)
        field_errors = {}
        if Faculty.objects.filter(institution=request.user.institution, full_name__iexact=full_name).exclude(pk=pk).exists():
            field_errors['full_name'] = 'Факультет с таким названием уже существует'
        if Faculty.objects.filter(institution=request.user.institution, short_name__iexact=short_name).exclude(pk=pk).exists():
            field_errors['short_name'] = 'Факультет с таким кодом уже существует'
        if field_errors:
            return Response(field_errors, status=400)
        faculty.full_name = full_name
        faculty.short_name = short_name
        if 'created_at' in request.data:
            faculty.created_at = request.data['created_at'] or None
        faculty.save()
        log_action(request.user, 'updated', faculty,
                   old_data=old_data,
                   new_data={'full_name': faculty.full_name, 'short_name': faculty.short_name},
                   institution=request.user.institution)
        return Response(_faculty_data(faculty))

    def delete(self, request, pk):
        if request.user.role != 'owner':
            return Response({'error': 'Доступ запрещён'}, status=403)
        password = (request.data.get('password') or '').strip()
        if not password:
            return Response({'error': 'Введите пароль'}, status=400)
        if not request.user.check_password(password):
            return Response({'error': 'Неверный пароль'}, status=400)
        faculty = self._get_faculty(request, pk)
        if not faculty:
            return Response({'error': 'Не найдено'}, status=404)
        log_action(request.user, 'deleted', faculty,
                   old_data={'full_name': faculty.full_name},
                   institution=request.user.institution)
        faculty.delete()
        return Response({'ok': True})


class FacultyDeleteRequestView(APIView):
    def post(self, request, pk):
        err = _admin_only(request)
        if err:
            return err
        try:
            faculty = Faculty.objects.get(pk=pk, institution=request.user.institution)
        except Faculty.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        reason = (request.data.get('reason') or '').strip() or f'Удаление факультета: {faculty.full_name}'
        req = DeleteRequest.objects.create(
            user=request.user,
            object_type='Faculty',
            object_id=faculty.pk,
            reason=reason,
        )
        log_action(request.user, 'created', req,
                   new_data={'object_type': 'Faculty', 'object_id': faculty.pk, 'reason': reason},
                   institution=request.user.institution)
        return Response({'ok': True})


class FacultyFlagView(APIView):
    def post(self, request, pk):
        if request.user.role not in ('owner', 'admin'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        try:
            faculty = Faculty.objects.get(pk=pk, institution=request.user.institution)
        except Faculty.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        faculty.is_flagged = not faculty.is_flagged
        faculty.save(update_fields=['is_flagged'])
        return Response({'is_flagged': faculty.is_flagged})
