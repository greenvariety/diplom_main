from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.paginator import Paginator
from django.db.models import Q, Exists, OuterRef
from .models import Employee, Position, GroupSubjectEmployee, Subject, Group, Document, DeleteRequest, RecordNote, User
from .utils import log_action, check_person_email_unique, check_person_phone_unique


def _employee_data(e):
    return {
        'id': e.pk,
        'last_name': e.last_name,
        'first_name': e.first_name,
        'middle_name': e.middle_name,
        'full_name': e.full_name(),
        'birth_date': (e.birth_date.isoformat() if hasattr(e.birth_date, 'isoformat') else str(e.birth_date)) if e.birth_date else None,
        'phone': e.phone,
        'email': e.email,
        'position_id': e.position_id,
        'position_name': e.position.name if e.position_id else None,
        'position_role_type': e.position.role_type if e.position_id else None,
        'photo': e.photo.url if e.photo else None,
        'is_flagged': e.is_flagged,
        'warn_incomplete': not all([e.position_id, e.birth_date, e.phone, e.email]),
        'has_pending_delreq': getattr(e, 'has_pending_delreq', False),
        'has_note': getattr(e, 'has_note', False),
    }


def _admin_only(request):
    if request.user.role not in ('owner', 'admin', 'secretary'):
        return Response({'error': 'Доступ запрещён'}, status=403)
    return None


def _admin_or_owner(request):
    if request.user.role not in ('owner', 'admin'):
        return Response({'error': 'Доступ запрещён'}, status=403)
    return None


def _get_employee(request, pk):
    institution = request.user.institution
    if not institution:
        return None
    try:
        return Employee.objects.select_related('position').get(pk=pk, institution=institution)
    except Employee.DoesNotExist:
        return None


class EmployeesView(APIView):
    def get(self, request):
        institution = request.user.institution
        if not institution:
            if 'page' in request.query_params:
                return Response({'results': [], 'count': 0, 'num_pages': 0, 'page': 1})
            return Response([])

        qs = Employee.objects.filter(institution=institution).select_related('position').annotate(
            has_pending_delreq=Exists(DeleteRequest.objects.filter(object_type='Employee', object_id=OuterRef('pk'), status='pending')),
            has_note=Exists(RecordNote.objects.filter(object_type='Employee', object_id=OuterRef('pk'), is_resolved=False)),
        )

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(last_name__icontains=search) |
                Q(first_name__icontains=search) |
                Q(middle_name__icontains=search) |
                Q(position__name__icontains=search)
            )

        position_id = request.query_params.get('position_id', '')
        if position_id:
            qs = qs.filter(position_id=position_id)

        # flat list for dropdowns when no page param
        if 'page' not in request.query_params:
            return Response([_employee_data(e) for e in qs])

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
            'results': [_employee_data(e) for e in page_obj],
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

        position = None
        position_id = request.data.get('position_id')
        if position_id:
            try:
                position = Position.objects.get(pk=position_id, institution=institution)
            except Position.DoesNotExist:
                return Response({'error': 'Должность не найдена'}, status=404)

        email = (request.data.get('email') or '').strip()
        email_err = check_person_email_unique(email)
        if email_err:
            return Response({'error': email_err, 'field': 'email'}, status=400)

        phone = (request.data.get('phone') or '').strip()
        phone_err = check_person_phone_unique(phone)
        if phone_err:
            return Response({'error': phone_err, 'field': 'phone'}, status=400)

        employee = Employee.objects.create(
            institution=institution,
            last_name=last_name,
            first_name=first_name,
            middle_name=(request.data.get('middle_name') or '').strip(),
            birth_date=request.data.get('birth_date') or None,
            phone=phone,
            email=email,
            position=position,
        )
        photo = request.FILES.get('photo')
        if photo:
            employee.photo = photo
            employee.save(update_fields=['photo'])
        log_action(request.user, 'created', employee,
                   new_data={'full_name': str(employee)},
                   institution=institution)
        return Response(_employee_data(employee), status=201)


class EmployeeDetailView(APIView):
    def get(self, request, pk):
        employee = _get_employee(request, pk)
        if not employee:
            return Response({'error': 'Не найдено'}, status=404)

        data = _employee_data(employee)

        assignments = GroupSubjectEmployee.objects.filter(
            employee=employee
        ).select_related('subject', 'group', 'group__faculty')
        data['subjects'] = [
            {
                'assignment_id': a.pk,
                'subject_id': a.subject_id,
                'subject_name': a.subject.name,
                'group_id': a.group_id,
                'group_name': a.group.name,
                'faculty_short': a.group.faculty.short_name if a.group.faculty_id else '',
            }
            for a in assignments
        ]

        headed_groups = employee.headed_groups.select_related('faculty').all()
        data['headed_groups'] = [
            {
                'id': g.pk,
                'name': g.name,
                'faculty_short': g.faculty.short_name if g.faculty_id else '',
                'student_count': g.students.count(),
            }
            for g in headed_groups
        ]

        docs = Document.objects.filter(owner_type='employee', owner_id=employee.pk)
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

        return Response(data)

    def patch(self, request, pk):
        err = _admin_only(request)  # owner + admin + secretary
        if err:
            return err
        employee = _get_employee(request, pk)
        if not employee:
            return Response({'error': 'Не найдено'}, status=404)

        institution = request.user.institution
        old_data = {
            'last_name': employee.last_name, 'first_name': employee.first_name,
            'middle_name': employee.middle_name, 'phone': employee.phone,
            'email': employee.email,
            'birth_date': str(employee.birth_date) if employee.birth_date else None,
        }

        for field in ('last_name', 'first_name', 'middle_name', 'phone', 'email'):
            if field in request.data:
                setattr(employee, field, (request.data[field] or '').strip())

        if 'email' in request.data and employee.email:
            email_err = check_person_email_unique(employee.email, exclude_employee_pk=employee.pk)
            if email_err:
                return Response({'error': email_err, 'field': 'email'}, status=400)

        if 'phone' in request.data and employee.phone:
            phone_err = check_person_phone_unique(employee.phone, exclude_employee_pk=employee.pk)
            if phone_err:
                return Response({'error': phone_err, 'field': 'phone'}, status=400)

        if 'birth_date' in request.data:
            employee.birth_date = request.data['birth_date'] or None

        if 'position_id' in request.data:
            pid = request.data['position_id']
            if pid:
                try:
                    employee.position = Position.objects.get(pk=pid, institution=institution)
                except Position.DoesNotExist:
                    return Response({'error': 'Должность не найдена'}, status=404)
            else:
                employee.position = None

        photo = request.FILES.get('photo')
        if photo:
            employee.photo = photo

        employee.save()
        log_action(request.user, 'updated', employee,
                   old_data=old_data,
                   new_data={
                       'last_name': employee.last_name, 'first_name': employee.first_name,
                       'middle_name': employee.middle_name, 'phone': employee.phone,
                       'email': employee.email,
                       'birth_date': str(employee.birth_date) if employee.birth_date else None,
                   },
                   institution=institution)
        return Response(_employee_data(employee))

    def delete(self, request, pk):
        # Owner and admin can delete employees directly; secretary must submit a request
        if request.user.role not in ('owner', 'admin'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        password = (request.data.get('password') or '').strip()
        if not password:
            return Response({'error': 'Введите пароль'}, status=400)
        if not request.user.check_password(password):
            return Response({'error': 'Неверный пароль'}, status=400)
        employee = _get_employee(request, pk)
        if not employee:
            return Response({'error': 'Не найдено'}, status=404)
        institution = request.user.institution
        log_action(request.user, 'deleted', employee,
                   old_data={'full_name': str(employee)},
                   institution=institution)
        employee.delete()
        return Response({'ok': True})


class EmployeeDeleteRequestView(APIView):
    def post(self, request, pk):
        err = _admin_only(request)  # owner + admin + secretary
        if err:
            return err
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        try:
            employee = Employee.objects.get(pk=pk, institution=institution)
        except Employee.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        reason = (request.data.get('reason') or '').strip() or f'Удаление сотрудника: {employee}'
        req = DeleteRequest.objects.create(
            user=request.user,
            object_type='Employee',
            object_id=employee.pk,
            reason=reason,
        )
        log_action(request.user, 'created', req,
                   new_data={'object_type': 'Employee', 'object_id': employee.pk, 'reason': reason},
                   institution=institution)
        return Response({'ok': True})


class EmployeeSubjectsView(APIView):
    def post(self, request, pk):
        err = _admin_only(request)
        if err:
            return err
        institution = request.user.institution
        employee = _get_employee(request, pk)
        if not employee:
            return Response({'error': 'Сотрудник не найден'}, status=404)

        subject_id = request.data.get('subject_id')
        group_id = request.data.get('group_id')
        if not subject_id:
            return Response({'error': 'Выберите предмет'}, status=400)
        if not group_id:
            return Response({'error': 'Выберите группу'}, status=400)

        try:
            subject = Subject.objects.get(pk=subject_id, institution=institution)
        except Subject.DoesNotExist:
            return Response({'error': 'Предмет не найден'}, status=404)
        try:
            group = Group.objects.get(pk=group_id, faculty__institution=institution)
        except Group.DoesNotExist:
            return Response({'error': 'Группа не найдена'}, status=404)

        if GroupSubjectEmployee.objects.filter(group=group, subject=subject).exists():
            return Response({'error': 'Предмет уже назначен в этой группе'}, status=400)

        assignment = GroupSubjectEmployee.objects.create(
            group=group, subject=subject, employee=employee
        )
        log_action(request.user, 'created', assignment,
                   new_data={'employee': str(employee), 'subject': subject.name, 'group': group.name},
                   institution=institution)
        return Response({
            'assignment_id': assignment.pk,
            'subject_id': subject.pk,
            'subject_name': subject.name,
            'group_id': group.pk,
            'group_name': group.name,
            'faculty_short': group.faculty.short_name if group.faculty_id else '',
        }, status=201)


class EmployeeSubjectDetailView(APIView):
    def delete(self, request, pk, assignment_pk):
        err = _admin_only(request)
        if err:
            return err
        employee = _get_employee(request, pk)
        if not employee:
            return Response({'error': 'Сотрудник не найден'}, status=404)
        try:
            assignment = GroupSubjectEmployee.objects.select_related(
                'subject', 'group'
            ).get(pk=assignment_pk, employee=employee)
        except GroupSubjectEmployee.DoesNotExist:
            return Response({'error': 'Назначение не найдено'}, status=404)
        institution = request.user.institution
        log_action(request.user, 'deleted', assignment,
                   old_data={'subject': assignment.subject.name, 'group': assignment.group.name},
                   institution=institution)
        assignment.delete()
        return Response({'ok': True})


class EmployeeFlagView(APIView):
    def post(self, request, pk):
        err = _admin_only(request)
        if err:
            return err
        employee = _get_employee(request, pk)
        if not employee:
            return Response({'error': 'Не найдено'}, status=404)
        employee.is_flagged = not employee.is_flagged
        employee.save(update_fields=['is_flagged'])
        return Response({'is_flagged': employee.is_flagged})


class EmployeeAccountView(APIView):
    def get(self, request, pk):
        if request.user.role != 'owner':
            return Response({'error': 'Доступ запрещён'}, status=403)
        employee = _get_employee(request, pk)
        if not employee:
            return Response({'error': 'Не найдено'}, status=404)
        try:
            user = User.objects.get(employee=employee)
            return Response({'exists': True, 'id': user.pk, 'username': user.username, 'role': user.role, 'is_active': user.is_active})
        except User.DoesNotExist:
            return Response({'exists': False})

    def post(self, request, pk):
        if request.user.role != 'owner':
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        employee = _get_employee(request, pk)
        if not employee:
            return Response({'error': 'Не найдено'}, status=404)
        if User.objects.filter(employee=employee).exists():
            return Response({'error': 'У сотрудника уже есть аккаунт'}, status=400)
        username = (request.data.get('username') or '').strip()
        if not username:
            return Response({'error': 'Введите логин'}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Логин уже занят'}, status=400)
        role = request.data.get('role', 'teacher')
        if role not in ('admin', 'secretary', 'teacher'):
            return Response({'error': 'Недопустимая роль'}, status=400)
        password = (request.data.get('password') or '').strip()
        if not password:
            return Response({'error': 'Введите пароль'}, status=400)
        user = User.objects.create_user(
            username=username,
            password=password,
            role=role,
            display_name=employee.full_name(),
            institution=institution,
            employee=employee,
        )
        user.allowed_institutions.add(institution)
        log_action(request.user, 'created', user,
                   new_data={'username': username, 'role': role},
                   institution=institution)
        return Response({'exists': True, 'id': user.pk, 'username': user.username, 'role': user.role, 'is_active': user.is_active}, status=201)

    def patch(self, request, pk):
        if request.user.role != 'owner':
            return Response({'error': 'Доступ запрещён'}, status=403)
        employee = _get_employee(request, pk)
        if not employee:
            return Response({'error': 'Не найдено'}, status=404)
        try:
            user = User.objects.get(employee=employee)
        except User.DoesNotExist:
            return Response({'error': 'Аккаунт не найден'}, status=404)
        institution = request.user.institution
        old_data = {'username': user.username, 'role': user.role}
        if 'username' in request.data:
            new_username = (request.data['username'] or '').strip()
            if not new_username:
                return Response({'error': 'Введите логин'}, status=400)
            if new_username != user.username and User.objects.filter(username=new_username).exists():
                return Response({'error': 'Логин уже занят'}, status=400)
            user.username = new_username
        if 'role' in request.data:
            role = request.data['role']
            if role not in ('admin', 'secretary', 'teacher'):
                return Response({'error': 'Недопустимая роль'}, status=400)
            user.role = role
        new_password = (request.data.get('password') or '').strip()
        if new_password:
            user.set_password(new_password)
        user.save()
        log_action(request.user, 'updated', user,
                   old_data=old_data,
                   new_data={'username': user.username, 'role': user.role},
                   institution=institution)
        return Response({'exists': True, 'id': user.pk, 'username': user.username, 'role': user.role, 'is_active': user.is_active})
