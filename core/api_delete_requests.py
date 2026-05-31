from rest_framework.views import APIView
from rest_framework.response import Response
from .models import DeleteRequest, Faculty, Group, Student, Employee, Parent, Position, Subject
from .utils import log_action


MODELS = {
    'Faculty': Faculty,
    'Group': Group,
    'Position': Position,
    'Student': Student,
    'Employee': Employee,
    'Parent': Parent,
    'Subject': Subject,
}

TYPE_LABELS = {
    'Faculty': 'Факультет',
    'Group': 'Группа',
    'Position': 'Должность',
    'Student': 'Студент',
    'Employee': 'Сотрудник',
    'Parent': 'Опекун',
    'Subject': 'Предмет',
}


def _req_data(r):
    model_cls = MODELS.get(r.object_type)
    type_label = TYPE_LABELS.get(r.object_type, r.object_type)
    obj_repr = type_label
    if model_cls:
        try:
            obj = model_cls.objects.get(pk=r.object_id)
            obj_repr = str(obj)
        except model_cls.DoesNotExist:
            obj_repr = f'{type_label} (удалён)'
    ROLE_LABELS = {
        'owner': 'Владелец', 'admin': 'Администратор',
        'teacher': 'Преподаватель',
    }
    return {
        'id': r.pk,
        'object_type': r.object_type,
        'type_label': TYPE_LABELS.get(r.object_type, r.object_type),
        'object_id': r.object_id,
        'object_repr': obj_repr,
        'reason': r.reason,
        'author': r.user.display_name or r.user.username,
        'author_role': ROLE_LABELS.get(r.user.role, r.user.role),
        'created_at': r.created_at.strftime('%d.%m.%Y %H:%M'),
        'status': r.status,
    }


def _owner_only(request):
    if request.user.role != 'owner':
        return Response({'error': 'Доступ запрещён'}, status=403)
    return None


class DeleteRequestsView(APIView):
    def get(self, request):
        if request.user.role not in ('owner', 'admin'):
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        if not institution:
            return Response([])
        reqs = DeleteRequest.objects.filter(
            status='pending', user__institution=institution
        ).select_related('user')
        return Response([_req_data(r) for r in reqs])


class DeleteRequestApproveView(APIView):
    def post(self, request, pk):
        err = _owner_only(request)
        if err:
            return err
        password = (request.data.get('password') or '').strip()
        if not password:
            return Response({'error': 'Введите пароль'}, status=400)
        if not request.user.check_password(password):
            return Response({'error': 'Неверный пароль'}, status=400)
        institution = request.user.institution
        try:
            req = DeleteRequest.objects.select_related('user').get(
                pk=pk, status='pending', user__institution=institution
            )
        except DeleteRequest.DoesNotExist:
            return Response({'error': 'Заявка не найдена'}, status=404)

        model_cls = MODELS.get(req.object_type)
        if not model_cls:
            return Response({'error': 'Неизвестный тип объекта'}, status=400)

        try:
            obj = model_cls.objects.get(pk=req.object_id)
        except model_cls.DoesNotExist:
            req.status = 'approved'
            req.save()
            return Response({'ok': True})

        log_action(request.user, 'deleted', obj,
                   old_data={'repr': str(obj), 'reason': req.reason},
                   institution=institution)
        obj.delete()
        req.status = 'approved'
        req.save()
        return Response({'ok': True})


class DeleteRequestRejectView(APIView):
    def post(self, request, pk):
        err = _owner_only(request)
        if err:
            return err
        institution = request.user.institution
        try:
            req = DeleteRequest.objects.select_related('user').get(
                pk=pk, status='pending', user__institution=institution
            )
        except DeleteRequest.DoesNotExist:
            return Response({'error': 'Заявка не найдена'}, status=404)
        req.status = 'rejected'
        req.save()
        log_action(request.user, 'updated', req,
                   old_data={'status': 'pending'},
                   new_data={'status': 'rejected'},
                   institution=institution)
        return Response({'ok': True})


class DeleteRequestCancelView(APIView):
    def post(self, request, pk):
        if request.user.role not in ('admin',):
            return Response({'error': 'Доступ запрещён'}, status=403)
        institution = request.user.institution
        try:
            req = DeleteRequest.objects.get(
                pk=pk, user=request.user, status='pending',
                user__institution=institution
            )
        except DeleteRequest.DoesNotExist:
            return Response({'error': 'Заявка не найдена'}, status=404)
        req.status = 'cancelled'
        req.save()
        log_action(request.user, 'updated', req,
                   old_data={'status': 'pending'},
                   new_data={'status': 'cancelled'},
                   institution=institution)
        return Response({'ok': True})


class DeleteRequestsCountView(APIView):
    def get(self, request):
        if request.user.role not in ('owner', 'admin'):
            return Response({'count': 0})
        institution = request.user.institution
        if not institution:
            return Response({'count': 0})
        qs = DeleteRequest.objects.filter(status='pending', user__institution=institution)
        return Response({'count': qs.count()})
