from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import Student, Employee, Faculty, AuditLog, DeleteRequest, Group, Subject, Parent, Position, User, GroupSubjectEmployee
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
            'employee_id': user.employee.id if user.employee else None,
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

        if user.role == 'teacher':
            employee = getattr(user, 'employee', None)
            if employee:
                group_ids = list(Group.objects.filter(headteacher=employee).values_list('pk', flat=True))
                groups_count = len(group_ids)
                students_count = Student.objects.filter(group_id__in=group_ids).count()
                subjects_count = employee.taught_subjects.count()
            else:
                groups_count = students_count = subjects_count = 0
            return Response({'stats': {'groups': groups_count, 'students': students_count, 'subjects': subjects_count}})

        if not institution:
            return Response({
                'stats': {k: 0 for k in ('faculties', 'groups', 'students', 'employees', 'subjects', 'parents', 'positions', 'users', 'audit', 'pending_delreq')},
                'recent_audit': [],
            })

        ACTION_CLS = {'created': 'badge-ok', 'updated': 'badge-warn', 'deleted': 'badge-bad'}
        ACTION_LABEL = {'created': 'Создал', 'updated': 'Изменил', 'deleted': 'Удалил'}

        audit_qs = AuditLog.objects.filter(institution=institution).select_related('user').order_by('-created_at')[:14]
        recent_audit = [
            {
                'id': a.pk,
                'ts': a.created_at.strftime('%d.%m.%Y %H:%M:%S'),
                'user': a.user.username if a.user else '-',
                'userName': (a.user.display_name or a.user.username) if a.user else '-',
                'role': a.user.get_role_display() if a.user else '-',
                'action': a.action,
                'label': ACTION_LABEL.get(a.action, a.action),
                'obj': f'{a.object_type} #{a.object_id}',
                'cls': ACTION_CLS.get(a.action, 'badge-neutral'),
            }
            for a in audit_qs
        ]

        return Response({
            'stats': {
                'faculties': Faculty.objects.filter(institution=institution).count(),
                'groups': Group.objects.filter(faculty__institution=institution).count(),
                'students': Student.objects.filter(faculty__institution=institution).count(),
                'employees': Employee.objects.filter(institution=institution).count(),
                'subjects': Subject.objects.filter(institution=institution).count(),
                'parents': Parent.objects.filter(institution=institution).count(),
                'positions': Position.objects.filter(institution=institution).count(),
                'users': User.objects.filter(allowed_institutions=institution).count(),
                'audit': AuditLog.objects.filter(institution=institution).count(),
                'pending_delreq': DeleteRequest.objects.filter(user__institution=institution, status='pending').count(),
            },
            'recent_audit': recent_audit,
        })


class TeacherMySubjectsView(APIView):
    def get(self, request):
        employee = getattr(request.user, 'employee', None)
        if not employee:
            return Response([])
        subjects = employee.taught_subjects.annotate(
            groups_count=Count(
                'group_assignments',
                filter=Q(group_assignments__employee=employee)
            )
        ).order_by('name')
        return Response([
            {'id': s.id, 'name': s.name, 'groups_count': s.groups_count}
            for s in subjects
        ])
