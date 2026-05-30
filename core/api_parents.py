from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.paginator import Paginator
from django.db.models import Q
from .models import Parent, Student, StudentParent, DeleteRequest
from .utils import log_action, check_person_email_unique


def _parent_data(p):
    return {
        'id': p.pk,
        'last_name': p.last_name,
        'first_name': p.first_name,
        'middle_name': p.middle_name,
        'full_name': str(p),
        'birth_date': (p.birth_date.isoformat() if hasattr(p.birth_date, 'isoformat') else str(p.birth_date)) if p.birth_date else None,
        'phone': p.phone,
        'email': p.email,
        'photo': p.photo.url if p.photo else None,
        'is_flagged': p.is_flagged,
        'warn_incomplete': not all([p.birth_date, p.phone, p.email]),
    }


def _admin_only(request):
    if request.user.role not in ('owner', 'admin', 'secretary'):
        return Response({'error': 'Доступ запрещён'}, status=403)
    return None


def _get_parent(request, pk):
    institution = request.user.institution
    if not institution:
        return None
    try:
        return Parent.objects.get(pk=pk, institution=institution)
    except Parent.DoesNotExist:
        return None


class ParentsView(APIView):
    def get(self, request):
        institution = request.user.institution
        if not institution:
            if 'page' in request.query_params:
                return Response({'results': [], 'count': 0, 'num_pages': 0, 'page': 1})
            return Response([])

        qs = Parent.objects.filter(institution=institution)

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(last_name__icontains=search) |
                Q(first_name__icontains=search) |
                Q(middle_name__icontains=search)
            )

        if 'page' not in request.query_params:
            return Response([_parent_data(p) for p in qs])

        sort = request.query_params.get('sort', '')
        if sort == 'flagged':
            qs = qs.order_by('-is_flagged', 'last_name', 'first_name')
        else:
            qs = qs.order_by('last_name', 'first_name')

        paginator = Paginator(qs, 20)
        try:
            page = max(1, int(request.query_params.get('page', 1) or 1))
        except (ValueError, TypeError):
            page = 1
        page_obj = paginator.get_page(page)

        return Response({
            'results': [_parent_data(p) for p in page_obj],
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'page': page,
        })

    def post(self, request):
        err = _admin_only(request)
        if err:
            return err
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)

        last_name = (request.data.get('last_name') or '').strip()
        first_name = (request.data.get('first_name') or '').strip()
        if not last_name:
            return Response({'error': 'Введите фамилию'}, status=400)
        if not first_name:
            return Response({'error': 'Введите имя'}, status=400)

        email = (request.data.get('email') or '').strip()
        email_err = check_person_email_unique(email)
        if email_err:
            return Response({'error': email_err, 'field': 'email'}, status=400)

        parent = Parent.objects.create(
            institution=institution,
            last_name=last_name,
            first_name=first_name,
            middle_name=(request.data.get('middle_name') or '').strip(),
            birth_date=request.data.get('birth_date') or None,
            phone=(request.data.get('phone') or '').strip(),
            email=email,
        )
        photo = request.FILES.get('photo')
        if photo:
            parent.photo = photo
            parent.save(update_fields=['photo'])
        log_action(request.user, 'created', parent,
                   new_data={'full_name': str(parent)},
                   institution=institution)
        return Response(_parent_data(parent), status=201)


class ParentDetailView(APIView):
    def get(self, request, pk):
        parent = _get_parent(request, pk)
        if not parent:
            return Response({'error': 'Не найдено'}, status=404)

        data = _parent_data(parent)
        sp_qs = StudentParent.objects.filter(parent=parent).select_related(
            'student', 'student__group', 'student__faculty'
        )
        data['students'] = [
            {
                'sp_id': sp.pk,
                'student_id': sp.student_id,
                'student_name': str(sp.student),
                'relation_type': sp.relation_type,
                'relation_display': sp.get_relation_type_display(),
                'group_name': sp.student.group.name if sp.student.group_id else '',
                'status': sp.student.status,
            }
            for sp in sp_qs
        ]
        return Response(data)

    def patch(self, request, pk):
        err = _admin_only(request)
        if err:
            return err
        parent = _get_parent(request, pk)
        if not parent:
            return Response({'error': 'Не найдено'}, status=404)

        old_data = {
            'last_name': parent.last_name, 'first_name': parent.first_name,
            'middle_name': parent.middle_name, 'phone': parent.phone,
            'email': parent.email,
            'birth_date': str(parent.birth_date) if parent.birth_date else None,
        }
        for field in ('last_name', 'first_name', 'middle_name', 'phone', 'email'):
            if field in request.data:
                setattr(parent, field, (request.data[field] or '').strip())

        if 'email' in request.data and parent.email:
            email_err = check_person_email_unique(parent.email, exclude_parent_pk=parent.pk)
            if email_err:
                return Response({'error': email_err, 'field': 'email'}, status=400)

        if 'birth_date' in request.data:
            parent.birth_date = request.data['birth_date'] or None

        photo = request.FILES.get('photo')
        if photo:
            parent.photo = photo

        parent.save()
        log_action(request.user, 'updated', parent,
                   old_data=old_data,
                   new_data={
                       'last_name': parent.last_name, 'first_name': parent.first_name,
                       'middle_name': parent.middle_name, 'phone': parent.phone,
                       'email': parent.email,
                       'birth_date': str(parent.birth_date) if parent.birth_date else None,
                   },
                   institution=request.user.institution)
        return Response(_parent_data(parent))

    def delete(self, request, pk):
        # Owner, admin, and secretary can delete parents directly
        if request.user.role not in ('owner', 'admin', 'secretary'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        password = (request.data.get('password') or '').strip()
        if not password:
            return Response({'error': 'Введите пароль'}, status=400)
        if not request.user.check_password(password):
            return Response({'error': 'Неверный пароль'}, status=400)
        parent = _get_parent(request, pk)
        if not parent:
            return Response({'error': 'Не найдено'}, status=404)
        log_action(request.user, 'deleted', parent,
                   old_data={'full_name': str(parent)},
                   institution=request.user.institution)
        parent.delete()
        return Response({'ok': True})


class ParentDeleteRequestView(APIView):
    def post(self, request, pk):
        err = _admin_only(request)
        if err:
            return err
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        try:
            parent = Parent.objects.get(pk=pk, institution=institution)
        except Parent.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        reason = (request.data.get('reason') or '').strip() or f'Удаление опекуна: {parent}'
        req = DeleteRequest.objects.create(
            user=request.user,
            object_type='Parent',
            object_id=parent.pk,
            reason=reason,
        )
        log_action(request.user, 'created', req,
                   new_data={'object_type': 'Parent', 'object_id': parent.pk, 'reason': reason},
                   institution=institution)
        return Response({'ok': True})


class ParentStudentsView(APIView):
    def post(self, request, pk):
        err = _admin_only(request)
        if err:
            return err
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        parent = _get_parent(request, pk)
        if not parent:
            return Response({'error': 'Опекун не найден'}, status=404)

        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'error': 'Выберите студента'}, status=400)
        try:
            student = Student.objects.get(pk=student_id, faculty__institution=institution)
        except Student.DoesNotExist:
            return Response({'error': 'Студент не найден'}, status=404)

        relation_type = request.data.get('relation_type', 'guardian')

        if StudentParent.objects.filter(student=student, parent=parent).exists():
            return Response({'error': 'Этот опекун уже связан со студентом'}, status=400)

        sp = StudentParent.objects.create(student=student, parent=parent, relation_type=relation_type)
        log_action(request.user, 'created', sp,
                   new_data={'parent': str(parent), 'student': str(student)},
                   institution=institution)
        return Response({
            'sp_id': sp.pk,
            'student_id': student.pk,
            'student_name': str(student),
            'relation_type': sp.relation_type,
            'relation_display': sp.get_relation_type_display(),
            'group_name': student.group.name if student.group_id else '',
            'status': student.status,
        }, status=201)


class ParentStudentDetailView(APIView):
    def delete(self, request, pk, sp_pk):
        err = _admin_only(request)
        if err:
            return err
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        try:
            sp = StudentParent.objects.select_related('student', 'parent').get(
                pk=sp_pk, parent_id=pk, parent__institution=institution
            )
        except StudentParent.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)

        log_action(request.user, 'deleted', sp,
                   old_data={'parent': str(sp.parent), 'student': str(sp.student)},
                   institution=institution)
        sp.delete()
        return Response({'ok': True})


class ParentFlagView(APIView):
    def post(self, request, pk):
        if request.user.role not in ('owner', 'admin', 'secretary'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        parent = _get_parent(request, pk)
        if not parent:
            return Response({'error': 'Не найдено'}, status=404)
        parent.is_flagged = not parent.is_flagged
        parent.save(update_fields=['is_flagged'])
        return Response({'is_flagged': parent.is_flagged})
