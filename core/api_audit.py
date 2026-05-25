import json
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import AuditLog, User

PAGE_SIZE = 50

FIELD_LABELS = {
    'last_name': 'Фамилия', 'first_name': 'Имя', 'middle_name': 'Отчество',
    'phone': 'Телефон', 'email': 'Email', 'date_of_birth': 'Дата рождения',
    'address': 'Адрес', 'status': 'Статус', 'group': 'Группа', 'group_id': 'Группа',
    'name': 'Название', 'position': 'Должность', 'position_id': 'Должность',
    'faculty': 'Факультет', 'faculty_id': 'Факультет', 'curator': 'Куратор', 'curator_id': 'Куратор',
    'role': 'Роль', 'is_active': 'Активен', 'repr': 'Объект', 'reason': 'Причина',
    'institution': 'Организация', 'institution_id': 'Организация',
}

ACTION_MAP = {
    'created': ('create', 'Создал', 'badge-ok'),
    'updated': ('update', 'Изменил', 'badge-warn'),
    'deleted': ('delete', 'Удалил', 'badge-bad'),
}

ROLE_LABELS = {
    'owner': 'Суперадмин',
    'admin': 'Администратор',
    'teacher': 'Преподаватель',
}

OBJ_TYPE_LABELS = {
    'Student': 'Студент', 'Employee': 'Сотрудник', 'Group': 'Группа',
    'Faculty': 'Факультет', 'Parent': 'Опекун', 'User': 'Пользователь',
    'StudentParent': 'Связь опекун-студент', 'GroupSubjectEmployee': 'Назначение предмета',
}


def _extract_name(new_data_str, old_data_str):
    for data_str in (new_data_str, old_data_str):
        if not data_str:
            continue
        try:
            d = json.loads(data_str)
            for key in ('full_name', 'name', 'username'):
                if d.get(key):
                    return d[key]
        except Exception:
            pass
    return None


def _compute_changes(old_data_str, new_data_str):
    try:
        old = json.loads(old_data_str) if old_data_str else {}
    except Exception:
        old = {}
    try:
        new = json.loads(new_data_str) if new_data_str else {}
    except Exception:
        new = {}
    changes = []
    for key in set(list(old.keys()) + list(new.keys())):
        old_val = old.get(key)
        new_val = new.get(key)
        if old_val != new_val:
            changes.append({
                'key': key,
                'label': FIELD_LABELS.get(key, key),
                'from': old_val if old_val is not None else '-',
                'to': new_val if new_val is not None else '-',
            })
    return changes


def _serialize(log):
    action_key, action_label, action_cls = ACTION_MAP.get(log.action, ('update', log.action, 'badge-warn'))
    u = log.user
    user_login = (u.username if u else None) or '-'
    user_role = ROLE_LABELS.get(u.role, u.role or '-') if u else '-'
    user_position = None
    if u and u.employee_id:
        try:
            pos = u.employee.position
            user_position = pos.name if pos else None
        except Exception:
            pass

    obj_name = _extract_name(log.new_data, log.old_data) or ''
    obj_type = OBJ_TYPE_LABELS.get(log.object_type, log.object_type)

    return {
        'id': log.pk,
        'ts': log.created_at.strftime('%d.%m.%Y %H:%M:%S'),
        'user': user_login,
        'userName': (u.display_name or u.username if u else None) or '-',
        'role': user_role,
        'userPosition': user_position,
        'action': action_key,
        'label': action_label,
        'cls': action_cls,
        'obj': obj_name or obj_type,
        'obj_name': obj_name,
        'obj_type': obj_type,
        'object_id': log.object_id,
        'object_type_raw': log.object_type,
        'changes': _compute_changes(log.old_data, log.new_data),
    }


class AuditLogView(APIView):
    def get(self, request):
        if request.user.role not in ('owner', 'admin'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        if not institution:
            return Response({'results': [], 'count': 0, 'num_pages': 1})

        qs = AuditLog.objects.filter(institution=institution).select_related('user', 'user__employee', 'user__employee__position')

        search = request.GET.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(object_type__icontains=search) |
                Q(user__username__icontains=search) |
                Q(user__display_name__icontains=search)
            )

        action = request.GET.get('action', '')
        if action:
            db_action = {'create': 'created', 'update': 'updated', 'delete': 'deleted'}.get(action)
            if db_action:
                qs = qs.filter(action=db_action)

        period = request.GET.get('period', 'all')
        now = timezone.now()
        if period == 'day':
            qs = qs.filter(created_at__gte=now - timedelta(hours=24))
        elif period == 'week':
            qs = qs.filter(created_at__gte=now - timedelta(days=7))
        elif period == 'month':
            qs = qs.filter(created_at__gte=now - timedelta(days=30))

        user_id = request.GET.get('user_id', '')
        if user_id:
            try:
                qs = qs.filter(user_id=int(user_id))
            except (ValueError, TypeError):
                pass

        count = qs.count()
        try:
            page = max(1, int(request.GET.get('page', 1)))
        except (ValueError, TypeError):
            page = 1
        num_pages = max(1, (count + PAGE_SIZE - 1) // PAGE_SIZE)
        page = min(page, num_pages)
        offset = (page - 1) * PAGE_SIZE

        logs = qs.order_by('-created_at')[offset:offset + PAGE_SIZE]
        return Response({
            'results': [_serialize(log) for log in logs],
            'count': count,
            'num_pages': num_pages,
        })


class AuditLogUsersView(APIView):
    def get(self, request):
        if request.user.role not in ('owner', 'admin'):
            return Response([])
        institution = request.user.institution
        if not institution:
            return Response([])
        user_ids = (
            AuditLog.objects.filter(institution=institution, user__isnull=False)
            .values_list('user_id', flat=True).distinct()
        )
        users = User.objects.filter(pk__in=user_ids)
        return Response([
            {
                'value': u.pk,
                'label': u.username,
                'sub': ROLE_LABELS.get(u.role, u.role or ''),
            }
            for u in users
        ])
