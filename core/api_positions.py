from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count
from .models import Position
from .utils import log_action


def _can_manage(request):
    return request.user.role == 'owner'


class PositionsView(APIView):
    def get(self, request):
        institution = request.user.institution
        if not institution:
            return Response([])
        positions = (
            Position.objects
            .filter(institution=institution)
            .annotate(employee_count=Count('employee'))
            .order_by('name')
        )
        return Response([
            {
                'id': p.pk,
                'name': p.name,
                'role_type': p.role_type,
                'employee_count': p.employee_count,
            }
            for p in positions
        ])

    def post(self, request):
        if not _can_manage(request):
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'error': 'Введите название должности'}, status=400)
        role_type = request.data.get('role_type', 'teacher')
        if role_type not in ('admin', 'teacher', 'none'):
            return Response({'error': 'Недопустимый тип роли'}, status=400)
        if Position.objects.filter(institution=institution, name=name).exists():
            return Response({'error': 'Должность с таким названием уже существует'}, status=400)
        position = Position.objects.create(institution=institution, name=name, role_type=role_type)
        log_action(request.user, 'created', position,
                   new_data={'name': name, 'role_type': role_type}, institution=institution)
        return Response({'id': position.pk, 'name': position.name, 'role_type': position.role_type}, status=201)


class PositionDetailView(APIView):
    def patch(self, request, pk):
        if not _can_manage(request):
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        try:
            position = Position.objects.get(pk=pk, institution=institution)
        except Position.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'error': 'Введите название'}, status=400)
        role_type = request.data.get('role_type', position.role_type)
        if role_type not in ('admin', 'teacher', 'none'):
            return Response({'error': 'Недопустимый тип роли'}, status=400)
        if role_type != position.role_type and position.employee_set.exists():
            return Response({'error': 'Сначала открепите всех сотрудников от должности, чтобы изменить тип роли'}, status=400)
        if Position.objects.filter(institution=institution, name=name).exclude(pk=pk).exists():
            return Response({'error': 'Должность с таким названием уже существует'}, status=400)
        old = {'name': position.name, 'role_type': position.role_type}
        position.name = name
        position.role_type = role_type
        position.save()
        log_action(request.user, 'updated', position,
                   old_data=old, new_data={'name': name, 'role_type': role_type},
                   institution=institution)
        return Response({'id': position.pk, 'name': position.name, 'role_type': position.role_type})

    def delete(self, request, pk):
        if request.user.role != 'owner':
            return Response({'error': 'Доступ запрещён'}, status=403)
        password = (request.data.get('password') or '').strip()
        if not password:
            return Response({'error': 'Введите пароль'}, status=400)
        if not request.user.check_password(password):
            return Response({'error': 'Неверный пароль'}, status=400)
        institution = request.user.institution
        try:
            position = Position.objects.get(pk=pk, institution=institution)
        except Position.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        if position.employee_set.exists():
            return Response({'error': 'Сначала открепите всех сотрудников от этой должности'}, status=400)
        log_action(request.user, 'deleted', position,
                   old_data={'name': position.name},
                   institution=institution)
        position.delete()
        return Response({'ok': True})


class PositionDeleteRequestView(APIView):
    def post(self, request, pk):
        if not _can_manage(request):
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        try:
            position = Position.objects.get(pk=pk, institution=institution)
        except Position.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        if position.employee_set.exists():
            return Response({'error': 'Сначала открепите всех сотрудников от этой должности'}, status=400)
        from .models import DeleteRequest
        reason = (request.data.get('reason') or '').strip() or f'Удаление должности: {position}'
        req = DeleteRequest.objects.create(
            user=request.user,
            object_type='Position',
            object_id=position.pk,
            reason=reason,
        )
        log_action(request.user, 'created', req,
                   new_data={'object_type': 'Position', 'object_id': position.pk, 'reason': reason},
                   institution=institution)
        return Response({'ok': True})
