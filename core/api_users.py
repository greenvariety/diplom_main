from rest_framework.views import APIView
from rest_framework.response import Response
from .models import User, Employee
from .utils import log_action


def _owner_only(request):
    if request.user.role != 'owner':
        return Response({'error': 'Доступ запрещён'}, status=403)
    return None


def _user_data(u):
    return {
        'id': u.pk,
        'username': u.username,
        'display_name': u.display_name,
        'role': u.role,
        'role_display': u.get_role_display(),
        'is_active': u.is_active,
        'last_login': u.last_login.strftime('%d.%m.%Y %H:%M') if u.last_login else None,
        'employee_id': u.employee_id,
        'employee_name': str(u.employee) if u.employee_id else None,
        'institution_ids': list(u.allowed_institutions.values_list('id', flat=True)),
        'institution_codes': [o.code for o in u.allowed_institutions.all()],
    }


class UsersView(APIView):
    def get(self, request):
        err = _owner_only(request)
        if err:
            return err
        institution = request.user.institution
        if not institution:
            return Response([])
        users = (
            User.objects
            .filter(allowed_institutions=institution)
            .select_related('employee')
            .prefetch_related('allowed_institutions')
            .distinct()
            .order_by('username')
        )
        return Response([_user_data(u) for u in users])

    def post(self, request):
        err = _owner_only(request)
        if err:
            return err
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)

        username = (request.data.get('username') or '').strip()
        if not username:
            return Response({'error': 'Введите логин'}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Пользователь с таким логином уже существует'}, status=400)

        role = request.data.get('role', 'teacher')
        if role not in ('admin', 'teacher'):
            return Response({'error': 'Недопустимая роль'}, status=400)

        password = request.data.get('password', '')
        if not password:
            return Response({'error': 'Введите пароль'}, status=400)

        employee = None
        employee_id = request.data.get('employee_id')
        if employee_id:
            try:
                employee = Employee.objects.get(pk=employee_id, institution=institution)
            except Employee.DoesNotExist:
                return Response({'error': 'Сотрудник не найден'}, status=404)

        user = User.objects.create_user(
            username=username,
            password=password,
            role=role,
            display_name=(request.data.get('display_name') or '').strip(),
            institution=institution,
            employee=employee,
        )
        # По умолчанию добавляем текущую организацию в разрешённые
        user.allowed_institutions.add(institution)
        # Если переданы дополнительные организации - учтём
        extra_ids = request.data.get('institution_ids', [])
        if extra_ids:
            from .models import Institution as Inst
            allowed = Inst.objects.filter(pk__in=extra_ids, owner=request.user)
            user.allowed_institutions.set(list(allowed))
        log_action(request.user, 'created', user,
                   new_data={'username': username, 'role': role},
                   institution=institution)
        return Response(_user_data(user), status=201)


class UserDetailView(APIView):
    def _get_user(self, request, pk):
        institution = request.user.institution
        if not institution:
            return None
        try:
            return User.objects.select_related('employee').prefetch_related('allowed_institutions').get(pk=pk, institution=institution)
        except User.DoesNotExist:
            return None

    def patch(self, request, pk):
        err = _owner_only(request)
        if err:
            return err
        user = self._get_user(request, pk)
        if not user:
            return Response({'error': 'Не найдено'}, status=404)

        institution = request.user.institution
        old_data = {'username': user.username, 'role': user.role}

        if 'display_name' in request.data:
            user.display_name = (request.data['display_name'] or '').strip()

        if 'role' in request.data:
            role = request.data['role']
            if role not in ('admin', 'teacher'):
                return Response({'error': 'Недопустимая роль'}, status=400)
            user.role = role

        if 'is_active' in request.data:
            user.is_active = bool(request.data['is_active'])

        if 'employee_id' in request.data:
            eid = request.data['employee_id']
            if eid:
                try:
                    user.employee = Employee.objects.get(pk=eid, institution=institution)
                except Employee.DoesNotExist:
                    return Response({'error': 'Сотрудник не найден'}, status=404)
            else:
                user.employee = None

        if 'institution_ids' in request.data:
            from .models import Institution as Inst
            ids = request.data['institution_ids'] or []
            allowed = list(Inst.objects.filter(pk__in=ids, owner=request.user))
            user.allowed_institutions.set(allowed)
            # Если текущая активная организация больше не в разрешённых - сбросить
            if user.institution_id and user.institution_id not in [o.pk for o in allowed]:
                user.institution = allowed[0] if len(allowed) == 1 else None

        user.save()
        log_action(request.user, 'updated', user,
                   old_data=old_data,
                   new_data={'username': user.username, 'role': user.role},
                   institution=institution)
        return Response(_user_data(user))

    def delete(self, request, pk):
        err = _owner_only(request)
        if err:
            return err
        if request.user.pk == int(pk):
            return Response({'error': 'Нельзя удалить свою учётную запись'}, status=400)
        user = self._get_user(request, pk)
        if not user:
            return Response({'error': 'Не найдено'}, status=404)
        institution = request.user.institution
        log_action(request.user, 'deleted', user,
                   old_data={'username': user.username, 'role': user.role},
                   institution=institution)
        user.delete()
        return Response({'ok': True})


class UserSetPasswordView(APIView):
    def post(self, request, pk):
        err = _owner_only(request)
        if err:
            return err
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        try:
            user = User.objects.get(pk=pk, institution=institution)
        except User.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)

        new_password = request.data.get('new_password', '')
        if not new_password:
            return Response({'error': 'Введите новый пароль'}, status=400)

        user.set_password(new_password)
        user.save()
        log_action(request.user, 'updated', user,
                   new_data={'action': 'password_changed'},
                   institution=institution)
        return Response({'ok': True})
