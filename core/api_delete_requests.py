from rest_framework.views import APIView
from rest_framework.response import Response
from .models import DeleteRequest, Faculty, Group, Student, Employee, Parent
from .utils import log_action


MODELS = {
    'Faculty': Faculty,
    'Group': Group,
    'Student': Student,
    'Employee': Employee,
    'Parent': Parent,
}

TYPE_LABELS = {
    'Faculty': 'Факультет',
    'Group': 'Группа',
    'Student': 'Студент',
    'Employee': 'Сотрудник',
    'Parent': 'Опекун',
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
    return {
        'id': r.pk,
        'object_type': r.object_type,
        'type_label': TYPE_LABELS.get(r.object_type, r.object_type),
        'object_id': r.object_id,
        'object_repr': obj_repr,
        'reason': r.reason,
        'author': r.user.display_name or r.user.username,
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
        reqs = (
            DeleteRequest.objects
            .filter(status='pending', user__institution=institution)
            .select_related('user')
        )
        return Response([_req_data(r) for r in reqs])


class DeleteRequestApproveView(APIView):
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


class DeleteRequestsCountView(APIView):
    def get(self, request):
        if request.user.role not in ('owner', 'admin'):
            return Response({'count': 0})
        institution = request.user.institution
        if not institution:
            return Response({'count': 0})
        count = DeleteRequest.objects.filter(
            status='pending', user__institution=institution
        ).count()
        return Response({'count': count})
