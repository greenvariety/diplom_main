import re
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Institution, Student, Employee, SeedPhrase
from .utils import log_action, verify_seed_phrase


def _org_data(org, active_id):
    return {
        'id': org.pk,
        'code': org.code,
        'name': org.name,
        'notes': org.notes,
        'created_at': org.created_at.strftime('%d.%m.%Y'),
        'active': org.pk == active_id,
        'students': Student.objects.filter(faculty__institution=org).count(),
        'employees': Employee.objects.filter(institution=org).count(),
    }


def _owner_only(request):
    if request.user.role != 'owner':
        return Response({'error': 'Доступ запрещён'}, status=403)
    return None


class OrganizationsView(APIView):
    def get(self, request):
        err = _owner_only(request)
        if err:
            return err
        active_id = request.user.institution_id
        orgs = Institution.objects.filter(owner=request.user).order_by('name')
        return Response([_org_data(o, active_id) for o in orgs])

    def post(self, request):
        err = _owner_only(request)
        if err:
            return err
        name = request.data.get('name', '').strip()
        code = request.data.get('code', '').strip()
        if not name:
            return Response({'error': 'Введите название организации'}, status=400)
        if not code:
            base = re.sub(r'[^a-zA-Zа-яА-ЯёЁ0-9 ]', '', name)
            parts = base.split()
            code = ''.join(p[0].upper() for p in parts)[:10] if parts else ''
            if not code:
                count = Institution.objects.filter(owner=request.user).count()
                code = f'ORG{count + 1}'
        if Institution.objects.filter(owner=request.user, code=code).exists():
            n = 2
            while Institution.objects.filter(owner=request.user, code=f'{code}{n}').exists():
                n += 1
            code = f'{code}{n}'
        org = Institution.objects.create(owner=request.user, code=code, name=name)
        log_action(request.user, 'created', org, new_data={'name': name, 'code': code}, institution=org)
        return Response(_org_data(org, request.user.institution_id), status=201)


class OrganizationDetailView(APIView):
    def _get(self, request, pk):
        try:
            return Institution.objects.get(pk=pk, owner=request.user)
        except Institution.DoesNotExist:
            return None

    def patch(self, request, pk):
        err = _owner_only(request)
        if err:
            return err
        org = self._get(request, pk)
        if not org:
            return Response({'error': 'Не найдено'}, status=404)
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Введите название'}, status=400)
        old_data = {'name': org.name}
        org.name = name
        notes = request.data.get('notes', None)
        if notes is not None:
            org.notes = notes
        fields = ['name', 'notes'] if notes is not None else ['name']
        org.save(update_fields=fields)
        log_action(request.user, 'updated', org, old_data=old_data, new_data={'name': org.name}, institution=org)
        return Response(_org_data(org, request.user.institution_id))

    def delete(self, request, pk):
        err = _owner_only(request)
        if err:
            return err
        org = self._get(request, pk)
        if not org:
            return Response({'error': 'Не найдено'}, status=404)

        password = request.data.get('password', '')
        seed_words = request.data.get('seed_words', [])

        if not password:
            return Response({'error': 'Введите пароль'}, status=400)
        if not request.user.check_password(password):
            return Response({'error': 'Неверный пароль'}, status=400)
        if len(seed_words) != 12:
            return Response({'error': 'Введите все 12 слов сид-фразы'}, status=400)

        phrase = ' '.join(seed_words)
        try:
            if not verify_seed_phrase(phrase, request.user.seed_phrase.phrase_hash):
                return Response({'error': 'Неверная сид-фраза'}, status=400)
        except SeedPhrase.DoesNotExist:
            return Response({'error': 'Сид-фраза не найдена'}, status=400)

        log_action(request.user, 'deleted', org, old_data={'name': org.name, 'code': org.code}, institution=org)
        org.delete()
        return Response({'ok': True})


class OrganizationSwitchView(APIView):
    def post(self, request, pk):
        if request.user.role == 'owner':
            try:
                org = Institution.objects.get(pk=pk, owner=request.user)
            except Institution.DoesNotExist:
                return Response({'error': 'Не найдено'}, status=404)
        else:
            try:
                org = request.user.allowed_institutions.get(pk=pk)
            except Institution.DoesNotExist:
                return Response({'error': 'Не найдено'}, status=404)
        request.user.institution = org
        request.user.save(update_fields=['institution'])
        return Response({'ok': True, 'institution': {'id': org.pk, 'name': org.name}})


class AllowedOrganizationsView(APIView):
    def get(self, request):
        if request.user.role == 'owner':
            return Response({'error': 'Доступ запрещён'}, status=403)
        orgs = request.user.allowed_institutions.all().order_by('name')
        return Response([{'id': o.pk, 'name': o.name, 'code': o.code} for o in orgs])
