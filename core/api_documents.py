from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import FileResponse
from .models import Document
from .utils import log_action


class DocumentUploadView(APIView):
    parser_classes_hint = 'multipart'

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'Файл не прикреплён'}, status=400)

        owner_type = request.data.get('owner_type', '').strip()
        owner_id = request.data.get('owner_id')
        name = (request.data.get('name') or file.name).strip()
        doc_type = (request.data.get('doc_type') or '').strip()

        if owner_type not in ('student', 'employee', 'parent'):
            return Response({'error': 'Неверный тип владельца'}, status=400)
        if not owner_id:
            return Response({'error': 'Укажите ID владельца'}, status=400)

        doc = Document.objects.create(
            owner_type=owner_type,
            owner_id=int(owner_id),
            name=name,
            doc_type=doc_type,
            file=file,
        )
        log_action(request.user, 'created', doc,
                   new_data={'name': doc.name, 'owner_type': owner_type, 'owner_id': owner_id},
                   institution=request.user.institution)
        return Response({
            'id': doc.pk,
            'name': doc.name,
            'doc_type': doc.doc_type,
            'uploaded_at': str(doc.uploaded_at) if doc.uploaded_at else None,
            'file_url': request.build_absolute_uri(doc.file.url) if doc.file else None,
            'is_image': doc.is_image,
        }, status=201)


class DocumentDetailView(APIView):
    def delete(self, request, pk):
        institution = request.user.institution
        try:
            doc = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)

        log_action(request.user, 'deleted', doc,
                   old_data={'name': doc.name},
                   institution=institution)
        if doc.file:
            doc.file.delete(save=False)
        doc.delete()
        return Response({'ok': True})
