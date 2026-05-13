from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Student, Employee, Faculty, AuditLog, DeleteRequest, Group


class MeView(APIView):
    def get(self, request):
        user = request.user
        institution = user.institution
        return Response({
            'id': user.pk,
            'username': user.username,
            'display_name': user.display_name,
            'role': user.role,
            'institution': {
                'id': institution.pk,
                'name': institution.name,
            } if institution else None,
        })


class DashboardView(APIView):
    def get(self, request):
        user = request.user
        institution = user.institution

        if institution:
            students_qs = Student.objects.filter(faculty__institution=institution)
            employees_qs = Employee.objects.filter(institution=institution)
            faculties_qs = Faculty.objects.filter(institution=institution)
            groups_qs = Group.objects.filter(faculty__institution=institution)
            pending_delreq = DeleteRequest.objects.filter(
                user__institution=institution, status='pending'
            ).count()
            audit_qs = AuditLog.objects.filter(institution=institution).order_by('-created_at')[:14]
        else:
            students_qs = Student.objects.none()
            employees_qs = Employee.objects.none()
            faculties_qs = Faculty.objects.none()
            groups_qs = Group.objects.none()
            pending_delreq = 0
            audit_qs = AuditLog.objects.none()

        ACTION_CLS = {'created': 'badge-ok', 'updated': 'badge-warn', 'deleted': 'badge-bad'}
        ACTION_LABEL = {'created': 'Создал', 'updated': 'Изменил', 'deleted': 'Удалил'}

        recent_audit = []
        for a in audit_qs:
            u = a.user
            recent_audit.append({
                'id': a.pk,
                'ts': a.created_at.strftime('%d.%m.%Y %H:%M:%S'),
                'user': u.username if u else '—',
                'userName': (u.display_name or u.username) if u else '—',
                'role': u.get_role_display() if u else '—',
                'action': a.action,
                'label': ACTION_LABEL.get(a.action, a.action),
                'obj': f'{a.object_type} #{a.object_id}',
                'cls': ACTION_CLS.get(a.action, 'badge-neutral'),
            })

        return Response({
            'stats': {
                'faculties': faculties_qs.count(),
                'groups': groups_qs.count(),
                'students': students_qs.count(),
                'employees': employees_qs.count(),
                'pending_delreq': pending_delreq,
            },
            'recent_audit': recent_audit,
        })
