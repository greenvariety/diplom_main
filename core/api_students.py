from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.paginator import Paginator
from django.db.models import Q, Count, Exists, OuterRef
from .models import Student, Group, Faculty, Document, StudentParent, Parent, DeleteRequest, AuditLog, RecordNote
from .utils import log_action, check_person_email_unique, check_person_phone_unique


# сериализация студента в словарь для ответа API
def _student_data(s):
    return {
        'id': s.pk,
        'last_name': s.last_name,
        'first_name': s.first_name,
        'middle_name': s.middle_name,
        'birth_date': (s.birth_date.isoformat() if hasattr(s.birth_date, 'isoformat') else str(s.birth_date)) if s.birth_date else None,
        'phone': s.phone,
        'email': s.email,
        'faculty_id': s.faculty_id,
        'faculty_name': s.faculty.full_name if s.faculty_id else '',
        'faculty_short': s.faculty.short_name if s.faculty_id else '',
        'group_id': s.group_id,
        'group_name': s.group.name if s.group_id else '',
        'photo': s.photo.url if s.photo else None,
        'parent_count': getattr(s, 'parent_count', None),  # аннотируется через annotate()
        'is_flagged': s.is_flagged,
        'warn_incomplete': not all([s.birth_date, s.phone, s.email]) or not s.group_id,  # предупреждение о незаполненных полях
        'has_pending_delreq': getattr(s, 'has_pending_delreq', False),
        'has_note': getattr(s, 'has_note', False),
    }


# проверка прав: только admin и owner могут изменять данные
def _admin_only(request):
    if request.user.role not in ('owner', 'admin'):
        return Response({'error': 'Доступ запрещён'}, status=403)
    return None


def _at_least_teacher(request):
    if request.user.role not in ('owner', 'admin', 'teacher'):
        return Response({'error': 'Доступ запрещён'}, status=403)
    return None


def _get_student(request, pk):
    # возвращаем студента только если он принадлежит организации текущего пользователя
    institution = request.user.institution
    if not institution:
        return None
    try:
        return Student.objects.select_related('faculty', 'group').get(
            pk=pk, institution=institution
        )
    except Student.DoesNotExist:
        return None


# Список и создание студентов
class StudentsView(APIView):
    def get(self, request):
        institution = request.user.institution
        if not institution:
            return Response({'results': [], 'count': 0, 'num_pages': 0, 'page': 1})

        # получаем всех студентов организации с подсчётом связанных данных
        qs = Student.objects.filter(institution=institution).select_related('faculty', 'group').annotate(
            parent_count=Count('student_parents'),
            has_pending_delreq=Exists(DeleteRequest.objects.filter(object_type='Student', object_id=OuterRef('pk'), status='pending')),
            has_note=Exists(RecordNote.objects.filter(object_type='Student', object_id=OuterRef('pk'), is_resolved=False)),
        )

        # преподаватель видит только студентов своих групп
        if request.user.role == 'teacher':
            employee = request.user.employee
            if not employee:
                return Response({'results': [], 'count': 0, 'num_pages': 0, 'page': 1})
            teacher_group_ids = Group.objects.filter(
                headteacher=employee
            ).values_list('pk', flat=True)
            qs = qs.filter(group_id__in=teacher_group_ids)

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(last_name__icontains=search) |
                Q(first_name__icontains=search) |
                Q(middle_name__icontains=search) |
                Q(group__faculty__short_name__icontains=search)
            )

        faculty_id = request.query_params.get('faculty_id', '')
        if faculty_id:
            qs = qs.filter(faculty_id=faculty_id)

        group_id = request.query_params.get('group_id', '')
        if group_id:
            qs = qs.filter(group_id=group_id)

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
            'results': [_student_data(s) for s in page_obj],
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

        faculty = None
        faculty_id = request.data.get('faculty_id')
        if faculty_id:
            try:
                faculty = Faculty.objects.get(pk=faculty_id, institution=institution)
            except Faculty.DoesNotExist:
                return Response({'error': 'Факультет не найден'}, status=404)

        group = None
        group_id = request.data.get('group_id')
        if group_id:
            try:
                group = Group.objects.get(pk=group_id, faculty__institution=institution)
            except Group.DoesNotExist:
                pass

        birth_date = request.data.get('birth_date') or None

        email = (request.data.get('email') or '').strip()
        email_err = check_person_email_unique(email)
        if email_err:
            return Response({'error': email_err, 'field': 'email'}, status=400)

        phone = (request.data.get('phone') or '').strip()
        phone_err = check_person_phone_unique(phone)
        if phone_err:
            return Response({'error': phone_err, 'field': 'phone'}, status=400)

        student = Student.objects.create(
            institution=institution,
            last_name=last_name,
            first_name=first_name,
            middle_name=(request.data.get('middle_name') or '').strip(),
            birth_date=birth_date,
            phone=phone,
            email=email,
            faculty=faculty,
            group=group,
        )
        # фото загружаем отдельным save, чтобы сигнал замены файла отработал корректно
        photo = request.FILES.get('photo')
        if photo:
            student.photo = photo
            student.save(update_fields=['photo'])
        log_action(request.user, 'created', student,
                   new_data={'full_name': str(student)},
                   institution=institution)
        return Response(_student_data(student), status=201)


class StudentDetailView(APIView):
    def get(self, request, pk):
        student = _get_student(request, pk)
        if not student:
            return Response({'error': 'Не найдено'}, status=404)

        data = _student_data(student)

        docs = Document.objects.filter(owner_type='student', owner_id=student.pk)
        data['documents'] = [
            {
                'id': d.pk,
                'name': d.name,
                'doc_type': d.doc_type,
                'uploaded_at': str(d.uploaded_at) if d.uploaded_at else None,
                'file_url': request.build_absolute_uri(d.file.url) if d.file else None,
                'is_image': d.is_image,
            }
            for d in docs
        ]

        sp_qs = StudentParent.objects.filter(student=student).select_related('parent')
        data['parents'] = [
            {
                'id': sp.pk,
                'parent_id': sp.parent_id,
                'parent_name': str(sp.parent),
                'phone': sp.parent.phone,
                'relation_type': sp.relation_type,
                'relation_display': sp.get_relation_type_display(),
                'parent_photo': sp.parent.photo.url if sp.parent.photo else None,
                'parent_warn_incomplete': not all([sp.parent.birth_date, sp.parent.phone, sp.parent.email]),
            }
            for sp in sp_qs
        ]

        logs = AuditLog.objects.filter(
            object_type='Student', object_id=student.pk
        ).order_by('-created_at')[:10]
        data['audit_log'] = [
            {
                'user': (log.user.display_name or log.user.username) if log.user else '-',
                'action': log.get_action_display(),
                'created_at': log.created_at.strftime('%d.%m.%Y %H:%M'),
            }
            for log in logs
        ]

        return Response(data)

    def patch(self, request, pk):
        err = _admin_only(request)
        if err:
            return err
        student = _get_student(request, pk)
        if not student:
            return Response({'error': 'Не найдено'}, status=404)

        institution = request.user.institution
        old_data = {
            'last_name': student.last_name, 'first_name': student.first_name,
            'middle_name': student.middle_name, 'phone': student.phone,
            'email': student.email,
            'birth_date': str(student.birth_date) if student.birth_date else None,
        }

        for field in ('last_name', 'first_name', 'middle_name', 'phone', 'email'):
            if field in request.data:
                setattr(student, field, (request.data[field] or '').strip())

        if 'email' in request.data and student.email:
            email_err = check_person_email_unique(student.email, exclude_student_pk=student.pk)
            if email_err:
                return Response({'error': email_err, 'field': 'email'}, status=400)

        if 'phone' in request.data and student.phone:
            phone_err = check_person_phone_unique(student.phone, exclude_student_pk=student.pk)
            if phone_err:
                return Response({'error': phone_err, 'field': 'phone'}, status=400)

        if 'birth_date' in request.data:
            student.birth_date = request.data['birth_date'] or None

        if 'faculty_id' in request.data:
            fid = request.data['faculty_id']
            if fid:
                try:
                    faculty = Faculty.objects.get(pk=fid, institution=institution)
                    student.faculty = faculty
                except Faculty.DoesNotExist:
                    return Response({'error': 'Факультет не найден'}, status=404)

        if 'group_id' in request.data:
            gid = request.data['group_id']
            if gid:
                try:
                    group = Group.objects.get(pk=gid, faculty__institution=institution)
                    student.group = group
                except Group.DoesNotExist:
                    student.group = None
            else:
                student.group = None

        photo = request.FILES.get('photo')
        if photo:
            student.photo = photo

        student.save()
        log_action(request.user, 'updated', student,
                   old_data=old_data,
                   new_data={
                       'last_name': student.last_name, 'first_name': student.first_name,
                       'middle_name': student.middle_name, 'phone': student.phone,
                       'email': student.email,
                       'birth_date': str(student.birth_date) if student.birth_date else None,
                   },
                   institution=institution)
        return Response(_student_data(student))

    def delete(self, request, pk):
        # удаление требует подтверждения паролем - защита от случайного нажатия
        if request.user.role not in ('owner', 'admin'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        student = _get_student(request, pk)
        if not student:
            return Response({'error': 'Не найдено'}, status=404)
        password = (request.data.get('password') or '').strip()
        if not password:
            return Response({'error': 'Введите пароль'}, status=400)
        if not request.user.check_password(password):
            return Response({'error': 'Неверный пароль'}, status=400)
        institution = request.user.institution
        log_action(request.user, 'deleted', student,
                   old_data={'full_name': str(student)},
                   institution=institution)
        student.delete()
        return Response({'ok': True})


class StudentDeleteRequestView(APIView):
    def post(self, request, pk):
        err = _admin_only(request)
        if err:
            return err
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        try:
            student = Student.objects.get(pk=pk, institution=institution)
        except Student.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        reason = (request.data.get('reason') or '').strip() or f'Удаление студента: {student}'
        req = DeleteRequest.objects.create(
            user=request.user,
            object_type='Student',
            object_id=student.pk,
            reason=reason,
        )
        log_action(request.user, 'created', req,
                   new_data={'object_type': 'Student', 'object_id': student.pk, 'reason': reason},
                   institution=institution)
        return Response({'ok': True})


class StudentParentsView(APIView):
    def post(self, request, pk):
        err = _admin_only(request)
        if err:
            return err
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        try:
            student = Student.objects.get(pk=pk, institution=institution)
        except Student.DoesNotExist:
            return Response({'error': 'Студент не найден'}, status=404)

        relation_type = request.data.get('relation_type', 'guardian')

        parent_id = request.data.get('parent_id')
        if parent_id:
            try:
                parent = Parent.objects.get(pk=parent_id, institution=institution)
            except Parent.DoesNotExist:
                return Response({'error': 'Опекун не найден'}, status=404)
        else:
            last_name = (request.data.get('last_name') or '').strip()
            first_name = (request.data.get('first_name') or '').strip()
            if not last_name or not first_name:
                return Response({'error': 'Введите фамилию и имя опекуна'}, status=400)
            parent_email = (request.data.get('email') or '').strip()
            parent_email_err = check_person_email_unique(parent_email)
            if parent_email_err:
                return Response({'error': parent_email_err, 'field': 'email'}, status=400)
            parent_phone = (request.data.get('phone') or '').strip()
            parent_phone_err = check_person_phone_unique(parent_phone)
            if parent_phone_err:
                return Response({'error': parent_phone_err, 'field': 'phone'}, status=400)
            parent = Parent.objects.create(
                institution=institution,
                last_name=last_name,
                first_name=first_name,
                middle_name=(request.data.get('middle_name') or '').strip(),
                phone=parent_phone,
                email=parent_email,
            )
            photo = request.FILES.get('photo')
            if photo:
                parent.photo = photo
                parent.save(update_fields=['photo'])
            log_action(request.user, 'created', parent,
                       new_data={'full_name': str(parent)},
                       institution=institution)

        if StudentParent.objects.filter(student=student, parent=parent).exists():
            return Response({'error': 'Этот опекун уже связан со студентом'}, status=400)

        sp = StudentParent.objects.create(student=student, parent=parent, relation_type=relation_type)
        log_action(request.user, 'created', sp,
                   new_data={'student': str(student), 'parent': str(parent)},
                   institution=institution)
        return Response({
            'id': sp.pk,
            'parent_id': parent.pk,
            'parent_name': str(parent),
            'phone': parent.phone,
            'relation_type': sp.relation_type,
            'relation_display': sp.get_relation_type_display(),
        }, status=201)


class StudentParentDetailView(APIView):
    def delete(self, request, pk, sp_pk):
        err = _admin_only(request)
        if err:
            return err
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        try:
            sp = StudentParent.objects.select_related(
                'student', 'parent'
            ).get(pk=sp_pk, student_id=pk, student__institution=institution)
        except StudentParent.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)

        log_action(request.user, 'deleted', sp,
                   old_data={'student': str(sp.student), 'parent': str(sp.parent)},
                   institution=institution)
        sp.delete()
        return Response({'ok': True})


class StudentFlagView(APIView):
    def post(self, request, pk):
        err = _admin_only(request)
        if err:
            return err
        student = _get_student(request, pk)
        if not student:
            return Response({'error': 'Не найдено'}, status=404)
        # переключаем флаг (toggle)
        student.is_flagged = not student.is_flagged
        student.save(update_fields=['is_flagged'])
        return Response({'is_flagged': student.is_flagged})
