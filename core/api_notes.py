from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from .models import RecordNote
from .utils import get_current_institution


def _note_data(n):
    return {
        'id': n.pk,
        'object_type': n.object_type,
        'object_id': n.object_id,
        'question': n.question,
        'is_resolved': n.is_resolved,
        'created_by_name': n.created_by.display_name if n.created_by else '',
        'created_at': n.created_at.strftime('%d.%m.%Y %H:%M') if n.created_at else '',
        'resolved_by_name': n.resolved_by.display_name if n.resolved_by else None,
        'resolved_at': n.resolved_at.strftime('%d.%m.%Y %H:%M') if n.resolved_at else None,
    }


class NotesView(APIView):
    def get(self, request):
        institution = get_current_institution(request)
        if not institution:
            return Response([])
        qs = RecordNote.objects.select_related('created_by', 'resolved_by').filter(institution=institution)
        object_type = request.query_params.get('object_type', '')
        object_id = request.query_params.get('object_id', '')
        if object_type:
            qs = qs.filter(object_type=object_type)
        if object_id:
            qs = qs.filter(object_id=object_id)
        resolved = request.query_params.get('resolved', '')
        if resolved == 'false':
            qs = qs.filter(is_resolved=False)
        elif resolved == 'true':
            qs = qs.filter(is_resolved=True)
        return Response([_note_data(n) for n in qs])

    def post(self, request):
        if request.user.role == 'teacher':
            return Response({'error': 'Нет доступа'}, status=403)
        institution = get_current_institution(request)
        if not institution:
            return Response({'error': 'Нет активной организации'}, status=400)
        object_type = (request.data.get('object_type') or '').strip()
        object_id = request.data.get('object_id')
        question = (request.data.get('question') or '').strip()
        if not object_type or not object_id or not question:
            return Response({'error': 'Заполните все поля'}, status=400)
        if len(question) > 2000:
            return Response({'error': 'Вопрос слишком длинный (максимум 2000 символов)'}, status=400)
        if RecordNote.objects.filter(
            institution=institution,
            object_type=object_type,
            object_id=int(object_id),
            is_resolved=False
        ).exists():
            return Response({'error': 'У этой записи уже есть активный вопрос'}, status=400)
        note = RecordNote.objects.create(
            institution=institution,
            object_type=object_type,
            object_id=int(object_id),
            question=question,
            created_by=request.user,
        )
        return Response(_note_data(note), status=201)


class NoteDetailView(APIView):
    def _get_note(self, request, pk):
        institution = get_current_institution(request)
        try:
            return RecordNote.objects.select_related('created_by', 'resolved_by').get(pk=pk, institution=institution)
        except RecordNote.DoesNotExist:
            return None

    def post(self, request, pk):
        """Resolve a note — owner only"""
        if request.user.role != 'owner':
            return Response({'error': 'Только суперадминистратор может закрывать вопросы'}, status=403)
        note = self._get_note(request, pk)
        if not note:
            return Response({'error': 'Не найдено'}, status=404)
        note.is_resolved = True
        note.resolved_by = request.user
        note.resolved_at = timezone.now()
        note.save()
        return Response(_note_data(note))

    def delete(self, request, pk):
        """Delete a note — creator or owner"""
        note = self._get_note(request, pk)
        if not note:
            return Response({'error': 'Не найдено'}, status=404)
        if request.user.role != 'owner' and note.created_by_id != request.user.pk:
            return Response({'error': 'Нет доступа'}, status=403)
        note.delete()
        return Response({'ok': True})
