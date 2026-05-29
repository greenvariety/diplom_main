import json
import re
from datetime import timedelta

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import EmailCode, User
from .utils import generate_email_code, mask_email, send_verification_email

_CODE_TTL = 10
_RESEND_COOLDOWN = 60


class ProfileUpdateView(APIView):
    def patch(self, request):
        user = request.user
        display_name = (request.data.get('display_name') or '').strip()
        username = (request.data.get('username') or '').strip()
        update_fields = []

        if display_name and display_name != user.display_name:
            if not re.match(r'^[А-ЯЁа-яё\s\-]+$', display_name):
                return Response({'error': 'ФИО должно содержать только кириллицу', 'field': 'display_name'}, status=400)
            if len(display_name.split()) != 3:
                return Response({'error': 'Введите фамилию, имя и отчество (3 слова)', 'field': 'display_name'}, status=400)
            user.display_name = display_name
            update_fields.append('display_name')

        if username and username != user.username:
            if not re.match(r'^[A-Za-z0-9_.\-]+$', username):
                return Response({'error': 'Только латиница, цифры и символы _ . -', 'field': 'username'}, status=400)
            if len(username) < 3:
                return Response({'error': 'Минимум 3 символа', 'field': 'username'}, status=400)
            if User.objects.filter(username=username).exclude(pk=user.pk).exists():
                return Response({'error': 'Логин уже занят', 'field': 'username'}, status=400)
            user.username = username
            update_fields.append('username')

        if not update_fields:
            return Response({'error': 'Нет изменений для сохранения'}, status=400)

        user.save(update_fields=update_fields)
        return Response({'ok': True, 'display_name': user.display_name, 'username': user.username})


class ProfileChangePasswordView(APIView):
    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')

        if not current_password:
            return Response({'error': 'Введите текущий пароль', 'field': 'current_password'}, status=400)
        if not new_password:
            return Response({'error': 'Введите новый пароль', 'field': 'new_password'}, status=400)

        if not user.check_password(current_password):
            return Response({'error': 'Неверный текущий пароль', 'field': 'current_password'}, status=400)

        if len(new_password) < 8:
            return Response({'error': 'Минимум 8 символов', 'field': 'new_password'}, status=400)
        if not re.search(r'\d', new_password):
            return Response({'error': 'Нужна хотя бы одна цифра', 'field': 'new_password'}, status=400)
        if not re.search(r'[A-Za-z]', new_password):
            return Response({'error': 'Нужна хотя бы одна латинская буква', 'field': 'new_password'}, status=400)
        if not re.search(r'[_\-!@#$%^&*+.,;:?]', new_password):
            return Response({'error': 'Нужен хотя бы один спецсимвол', 'field': 'new_password'}, status=400)
        if user.check_password(new_password):
            return Response({'error': 'Новый пароль совпадает со старым', 'field': 'new_password'}, status=400)

        user.set_password(new_password)
        user.password_changed_at = timezone.now()
        user.save()

        refresh = RefreshToken.for_user(user)
        return Response({'ok': True, 'access': str(refresh.access_token), 'refresh': str(refresh)})


class ProfileChangeEmailView(APIView):
    def post(self, request):
        user = request.user
        new_email = (request.data.get('new_email') or '').strip().lower()

        if not new_email:
            return Response({'error': 'Введите новый email'}, status=400)
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', new_email):
            return Response({'error': 'Некорректный email'}, status=400)
        if new_email == (user.email or '').lower():
            return Response({'error': 'Новый email совпадает с текущим'}, status=400)
        if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
            return Response({'error': 'Этот email уже зарегистрирован'}, status=400)

        window_ago = timezone.now() - timedelta(minutes=15)
        count = EmailCode.objects.filter(
            login=user.username, purpose='change_email', created_at__gte=window_ago
        ).count()
        if count >= 3:
            return Response({'error': 'Слишком много запросов. Попробуйте через 15 минут'}, status=429)

        latest = EmailCode.objects.filter(
            login=user.username, purpose='change_email'
        ).order_by('-created_at').first()
        if latest:
            elapsed = (timezone.now() - latest.created_at).total_seconds()
            if elapsed < _RESEND_COOLDOWN:
                remaining = int(_RESEND_COOLDOWN - elapsed) + 1
                return Response({'error': f'Подождите {remaining} сек.', 'retry_after': remaining}, status=429)

        EmailCode.objects.filter(login=user.username, purpose='change_email', used=False).update(used=True)

        code = generate_email_code()
        EmailCode.objects.create(
            email=new_email,
            login=user.username,
            code=code,
            purpose='change_email',
            payload=json.dumps({'new_email': new_email}),
            expires_at=timezone.now() + timedelta(minutes=_CODE_TTL),
        )

        sent = send_verification_email(new_email, code, purpose='change_email')
        if not sent:
            EmailCode.objects.filter(login=user.username, purpose='change_email', used=False).delete()
            return Response({'error': 'Не удалось отправить письмо. Проверьте email или попробуйте позже'}, status=500)

        return Response({'masked_email': mask_email(new_email)})


class ProfileConfirmEmailView(APIView):
    def post(self, request):
        user = request.user
        code = (request.data.get('code') or '').strip().upper().replace('-', '')

        if len(code) != 6:
            return Response({'error': 'Введите все 6 символов кода'}, status=400)

        ec = EmailCode.objects.filter(
            login=user.username, purpose='change_email', used=False
        ).order_by('-created_at').first()

        if not ec:
            return Response({'error': 'Сессия подтверждения не найдена. Запросите код снова'}, status=400)

        if ec.attempts >= 5:
            return Response({'error': 'Превышено число попыток. Запросите новый код', 'need_resend': True}, status=400)

        if timezone.now() > ec.expires_at:
            return Response({'error': 'Код истёк. Запросите новый'}, status=400)

        if ec.code != code:
            ec.attempts += 1
            ec.save(update_fields=['attempts'])
            return Response({'error': 'Неверный код'}, status=400)

        payload = json.loads(ec.payload)
        new_email = payload['new_email']

        if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
            ec.used = True
            ec.save(update_fields=['used'])
            return Response({'error': 'Этот email уже зарегистрирован другим пользователем'}, status=400)

        user.email = new_email
        user.save(update_fields=['email'])

        ec.used = True
        ec.save(update_fields=['used'])

        return Response({'ok': True, 'email': new_email})
