import json
import re
from datetime import timedelta

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import EmailCode, Institution, Student, Employee
from .utils import generate_email_code, log_action, mask_email, send_verification_email


# сериализация данных организации со счётчиками
def _org_data(org, active_id):
    return {
        'id': org.pk,
        'code': org.code,
        'name': org.name,
        'description': org.description,
        'photo': org.photo.url if org.photo else None,
        'founded_date': org.founded_date.strftime('%d.%m.%Y') if org.founded_date else None,
        'created_at': org.created_at.strftime('%d.%m.%Y'),
        'active': org.pk == active_id,  # текущая выбранная организация
        'students': Student.objects.filter(faculty__institution=org).count(),
        'employees': Employee.objects.filter(institution=org).count(),
    }


def _parse_date(raw):
    # поддерживаем оба формата даты: ДД.ММ.ГГГГ и ГГГГ-ММ-ДД
    if not raw:
        return None
    from datetime import datetime
    for fmt in ('%d.%m.%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            pass
    return None


def _has_latin(value):
    # проверяем наличие латинских букв - названия должны быть на кириллице
    return bool(re.search(r'[A-Za-z]', value))


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
        if Institution.objects.filter(owner=request.user).exists():
            return Response({'error': 'У вас уже есть организация'}, status=400)
        name = request.data.get('name', '').strip()
        code = request.data.get('code', '').strip()
        if not name:
            return Response({'error': 'Введите название организации'}, status=400)
        if not code:
            return Response({'error': 'Введите аббревиатуру организации'}, status=400)
        if _has_latin(name):
            return Response({'error': 'Название должно быть на кириллице'}, status=400)
        if _has_latin(code):
            return Response({'error': 'Аббревиатура должна быть на кириллице'}, status=400)
        founded_date_raw = (request.data.get('founded_date', '') or '').strip()
        if not founded_date_raw:
            return Response({'error': 'Укажите дату основания'}, status=400)
        if Institution.objects.filter(owner=request.user, code=code).exists():
            return Response({'error': 'Организация с такой аббревиатурой уже существует'}, status=400)
        description = (request.data.get('description', '') or '').strip()
        founded_date = _parse_date(founded_date_raw)
        photo = request.FILES.get('photo')
        org = Institution.objects.create(
            owner=request.user, code=code, name=name,
            description=description, founded_date=founded_date,
        )
        if photo:
            org.photo = photo
            org.save(update_fields=['photo'])
        request.user.institution = org
        request.user.save(update_fields=['institution'])
        log_action(request.user, 'created', org, new_data={'name': name, 'code': code}, institution=org)
        return Response(_org_data(org, org.pk), status=201)


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
        if _has_latin(name):
            return Response({'error': 'Название должно быть на кириллице'}, status=400)
        old_data = {'name': org.name, 'code': org.code}
        org.name = name
        update_fields = ['name']
        new_code = request.data.get('code', '').strip()
        if new_code:
            if _has_latin(new_code):
                return Response({'error': 'Аббревиатура должна быть на кириллице'}, status=400)
            org.code = new_code
            update_fields.append('code')
        description = request.data.get('description', None)
        if description is not None:
            org.description = description.strip() if isinstance(description, str) else description
            update_fields.append('description')
        founded_date_raw = request.data.get('founded_date', None)
        if founded_date_raw is not None:
            org.founded_date = _parse_date(str(founded_date_raw)) if founded_date_raw else None
            update_fields.append('founded_date')
        photo = request.FILES.get('photo')
        if photo:
            org.photo = photo
            update_fields.append('photo')
        org.save(update_fields=update_fields)
        log_action(request.user, 'updated', org, old_data=old_data, new_data={'name': org.name, 'code': org.code}, institution=org)
        return Response(_org_data(org, request.user.institution_id))

    def delete(self, request, pk):
        err = _owner_only(request)
        if err:
            return err
        org = self._get(request, pk)
        if not org:
            return Response({'error': 'Не найдено'}, status=404)

        code = (request.data.get('code') or '').strip().upper()
        if not code:
            return Response({'error': 'Введите код подтверждения'}, status=400)

        try:
            ec = EmailCode.objects.get(
                login=request.user.username,
                code=code,
                purpose='delete_org',
                used=False,
            )
        except EmailCode.DoesNotExist:
            return Response({'error': 'Неверный код'}, status=400)

        if timezone.now() > ec.expires_at:
            ec.delete()
            return Response({'error': 'Код истёк. Запросите новый'}, status=400)

        payload = json.loads(ec.payload) if ec.payload else {}
        if payload.get('org_id') != org.pk:
            return Response({'error': 'Неверный код'}, status=400)

        ec.used = True
        ec.save(update_fields=['used'])

        log_action(request.user, 'deleted', org, old_data={'name': org.name, 'code': org.code}, institution=org)
        org.delete()
        return Response({'ok': True})


class SendOrgDeleteCodeView(APIView):
    def post(self, request, pk):
        err = _owner_only(request)
        if err:
            return err
        try:
            org = Institution.objects.get(pk=pk, owner=request.user)
        except Institution.DoesNotExist:
            return Response({'error': 'Не найдено'}, status=404)

        if not request.user.email:
            return Response({'error': 'К аккаунту не привязан email'}, status=400)

        EmailCode.objects.filter(
            login=request.user.username,
            purpose='delete_org',
            used=False,
        ).delete()

        code = generate_email_code()
        EmailCode.objects.create(
            email=request.user.email,
            login=request.user.username,
            code=code,
            purpose='delete_org',
            payload=json.dumps({'org_id': org.pk}),
            expires_at=timezone.now() + timedelta(minutes=15),
        )

        sent = send_verification_email(request.user.email, code, purpose='delete_org')
        if not sent:
            EmailCode.objects.filter(login=request.user.username, purpose='delete_org', used=False).delete()
            return Response({'error': 'Не удалось отправить письмо. Проверьте email или попробуйте позже'}, status=500)

        return Response({'masked_email': mask_email(request.user.email)})


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
