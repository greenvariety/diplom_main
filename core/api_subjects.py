from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Subject


class SubjectsView(APIView):
    def get(self, request):
        institution = request.user.institution
        if not institution:
            return Response([])
        subjects = Subject.objects.filter(institution=institution).order_by('name')
        return Response([{'id': s.pk, 'name': s.name} for s in subjects])
