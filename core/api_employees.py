from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Employee


class EmployeesView(APIView):
    def get(self, request):
        institution = request.user.institution
        if not institution:
            return Response([])
        employees = Employee.objects.filter(institution=institution).select_related('position').order_by('last_name', 'first_name')
        return Response([
            {
                'id': e.pk,
                'full_name': e.full_name(),
                'last_name': e.last_name,
                'first_name': e.first_name,
                'middle_name': e.middle_name,
                'position_name': e.position.name if e.position_id else None,
            }
            for e in employees
        ])
