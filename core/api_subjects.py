from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Subject
from .utils import log_action


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
        if request.user.role not in ('owner', 'admin'):
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
        return Response(status=204)
