from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Student, Employee, Faculty, AuditLog, DeleteRequest, Group, Subject, Parent, Position, User
from .utils import check_person_email_unique, check_person_phone_unique


class ValidatePersonFieldView(APIView):
    """Check email/phone uniqueness on-the-fly for person forms."""
    def post(self, request):
        field = request.data.get('field', '')
        value = (request.data.get('value') or '').strip()
        exclude_type = request.data.get('exclude_type', '')
        exclude_id = request.data.get('exclude_id')

        kwargs = {}
        if exclude_id:
            try:
                exclude_id = int(exclude_id)
            except (TypeError, ValueError):
                exclude_id = None
        if exclude_type == 'student' and exclude_id:
            kwargs['exclude_student_pk'] = exclude_id
        elif exclude_type == 'employee' and exclude_id:
            kwargs['exclude_employee_pk'] = exclude_id
        elif exclude_type == 'parent' and exclude_id:
            kwargs['exclude_parent_pk'] = exclude_id

        if field == 'email':
            error = check_person_email_unique(value, **kwargs)
        elif field == 'phone':
            error = check_person_phone_unique(value, **kwargs)
        else:
            return Response({'error': 'Неизвестное поле'}, status=400)

        return Response({'error': error})


class MeView(APIView):
    def get(self, request):
        user = request.user
        institution = user.institution
        return Response({
            'id': user.pk,
            'username': user.username,
            'display_name': user.display_name,
            'email': user.email or '',
            'role': user.role,
            'photo': request.build_absolute_uri(user.photo.url) if user.photo else None,
            'password_changed_at': user.password_changed_at.isoformat() if user.password_changed_at else None,
            'institution': {
                'id': institution.pk,
                'name': institution.name,
                'code': institution.code,
                'founded_date': institution.founded_date.strftime('%d.%m.%Y') if institution.founded_date else None,
                'description': institution.description or '',
                'photo': request.build_absolute_uri(institution.photo.url) if institution.photo else None,
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
            subjects_qs = Subject.objects.filter(institution=institution)
            parents_qs = Parent.objects.filter(institution=institution)
            positions_qs = Position.objects.filter(institution=institution)
            users_qs = User.objects.filter(institution=institution)
            audit_total = AuditLog.objects.filter(institution=institution).count()
            pending_delreq = DeleteRequest.objects.filter(
                user__institution=institution, status='pending'
            ).count()
            audit_qs = AuditLog.objects.filter(institution=institution).order_by('-created_at')[:14]
        else:
            students_qs = Student.objects.none()
            employees_qs = Employee.objects.none()
            faculties_qs = Faculty.objects.none()
            groups_qs = Group.objects.none()
            subjects_qs = Subject.objects.none()
            parents_qs = Parent.objects.none()
            positions_qs = Position.objects.none()
            users_qs = User.objects.none()
            audit_total = 0
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
                'user': u.username if u else '-',
                'userName': (u.display_name or u.username) if u else '-',
                'role': u.get_role_display() if u else '-',
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
                'subjects': subjects_qs.count(),
                'parents': parents_qs.count(),
                'positions': positions_qs.count(),
                'users': users_qs.count(),
                'audit': audit_total,
                'pending_delreq': pending_delreq,
            },
            'recent_audit': recent_audit,
        })
