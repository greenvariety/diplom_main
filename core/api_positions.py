from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count
from .models import Position
from .utils import log_action


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
            {'id': p.pk, 'name': p.name, 'employee_count': p.employee_count}
            for p in positions
        ])

    def post(self, request):
        if request.user.role not in ('owner', 'admin'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'error': 'Введите название должности'}, status=400)
        position = Position.objects.create(institution=institution, name=name)
        log_action(request.user, 'created', position,
                   new_data={'name': name}, institution=institution)
        return Response({'id': position.pk, 'name': position.name}, status=201)


class PositionDetailView(APIView):
    def patch(self, request, pk):
        if request.user.role not in ('owner', 'admin'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        try:
            position = Position.objects.get(pk=pk, institution=institution)
        except Position.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'error': 'Введите название'}, status=400)
        old_name = position.name
        position.name = name
        position.save()
        log_action(request.user, 'updated', position,
                   old_data={'name': old_name}, new_data={'name': name},
                   institution=institution)
        return Response({'id': position.pk, 'name': position.name})
