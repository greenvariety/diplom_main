import json
import re
from datetime import timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, EmailCode
from .utils import generate_email_code, mask_email, send_verification_email

_CODE_TTL = 10           # минут
_RESEND_COOLDOWN = 60    # секунд
_MAX_CODES_WINDOW = 5    # кодов за 15 минут до блокировки
_LOCKOUT_MINUTES = 15    # минут блокировки после исчерпания кодов
_MAX_ATTEMPTS = 5        # неверных попыток на один код


def _register_rate_check(email):
    """Возвращает Response с ошибкой или None если всё ок."""
    window_ago = timezone.now() - timedelta(minutes=_LOCKOUT_MINUTES)
    count = EmailCode.objects.filter(
        email=email, purpose='register', created_at__gte=window_ago
    ).count()
    if count >= _MAX_CODES_WINDOW:
        return Response({'error': 'Запросы истекли. Повторите через 15 минут'}, status=429)

    latest = EmailCode.objects.filter(
        email=email, purpose='register'
    ).order_by('-created_at').first()
    if latest:
        elapsed = (timezone.now() - latest.created_at).total_seconds()
        if elapsed < _RESEND_COOLDOWN:
            remaining = int(_RESEND_COOLDOWN - elapsed) + 1
            return Response(
                {'error': f'Подождите {remaining} сек. перед повторной отправкой', 'retry_after': remaining},
                status=429,
            )
    return None


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        if not username or not password:
            return Response({'error': 'Введите логин и пароль'}, status=400)
        user = authenticate(request, username=username, password=password)
        if not user:
            return Response({'error': 'Неверный логин или пароль'}, status=400)
        refresh = RefreshToken.for_user(user)
        institution = user.institution
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.pk,
                'username': user.username,
                'role': user.role,
                'full_name': user.display_name,
                'institution': {'id': institution.pk, 'name': institution.name} if institution else None,
            }
        })


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('login', '').strip()
        display_name = request.data.get('name', '').strip()
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('pass', '')

        if not username:
            return Response({'error': 'Введите логин'}, status=400)
        if not display_name:
            return Response({'error': 'Введите имя'}, status=400)
        if not email:
            return Response({'error': 'Введите email'}, status=400)
        if not password:
            return Response({'error': 'Введите пароль'}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Логин уже занят. Выберите другой', 'field': 'login'}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Этот email уже зарегистрирован', 'field': 'email'}, status=400)

        err = _register_rate_check(email)
        if err:
            return err

        # Помечаем старые pending-коды как использованные (чтобы не запутывать)
        EmailCode.objects.filter(login=username, purpose='register', used=False).update(used=True)
        EmailCode.objects.filter(email=email, purpose='register', used=False).update(used=True)

        code = generate_email_code()
        payload = json.dumps({
            'login': username,
            'name': display_name,
            'email': email,
            'password_hash': make_password(password),
        })
        EmailCode.objects.create(
            email=email,
            login=username,
            code=code,
            purpose='register',
            payload=payload,
            expires_at=timezone.now() + timedelta(minutes=_CODE_TTL),
        )

        sent = send_verification_email(email, code, purpose='register')
        if not sent:
            EmailCode.objects.filter(login=username, purpose='register', used=False).delete()
            return Response({'error': 'Не удалось отправить письмо. Проверьте email или попробуйте позже'}, status=500)

        return Response({'masked_email': mask_email(email)})


class ResendRegisterCodeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        login = request.data.get('login', '').strip()
        if not login:
            return Response({'error': 'Логин не передан'}, status=400)

        pending = EmailCode.objects.filter(
            login=login, purpose='register', used=False
        ).order_by('-created_at').first()
        if not pending:
            return Response({'error': 'Сессия регистрации не найдена. Начните заново'}, status=400)

        data = json.loads(pending.payload)
        email = data['email']

        err = _register_rate_check(email)
        if err:
            return err

        # Инвалидируем текущий код
        pending.used = True
        pending.save(update_fields=['used'])

        code = generate_email_code()
        EmailCode.objects.create(
            email=email,
            login=login,
            code=code,
            purpose='register',
            payload=pending.payload,
            expires_at=timezone.now() + timedelta(minutes=_CODE_TTL),
        )

        sent = send_verification_email(email, code, purpose='register')
        if not sent:
            EmailCode.objects.filter(login=login, purpose='register', used=False).delete()
            return Response({'error': 'Не удалось отправить письмо. Попробуйте позже'}, status=500)

        return Response({'masked_email': mask_email(email), 'retry_after': _RESEND_COOLDOWN})


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        login = request.data.get('login', '').strip()
        code = request.data.get('code', '').strip().upper().replace('-', '')

        if not login or not code:
            return Response({'error': 'Введите логин и код'}, status=400)

        ec = EmailCode.objects.filter(
            login=login, purpose='register', used=False
        ).order_by('-created_at').first()

        if not ec:
            return Response({'error': 'Неверный код'}, status=400)

        window_ago = timezone.now() - timedelta(minutes=_LOCKOUT_MINUTES)
        codes_in_window = EmailCode.objects.filter(
            email=ec.email, purpose='register', created_at__gte=window_ago
        ).count()
        is_last_code = codes_in_window >= _MAX_CODES_WINDOW

        # Слишком много неверных попыток — код мёртв
        if ec.attempts >= _MAX_ATTEMPTS:
            if is_last_code:
                return Response({'error': 'Запросы истекли. Повторите через 15 минут'}, status=429)
            return Response({'error': 'Превышено число попыток. Запросите новый код', 'need_resend': True}, status=400)

        if timezone.now() > ec.expires_at:
            return Response({'error': 'Код истёк. Запросите новый'}, status=400)

        if ec.code != code:
            ec.attempts += 1
            ec.save(update_fields=['attempts'])
            if is_last_code and ec.attempts >= _MAX_ATTEMPTS:
                return Response({'error': 'Запросы истекли. Повторите через 15 минут'}, status=429)
            return Response({'error': 'Неверный код'}, status=400)

        data = json.loads(ec.payload)

        if User.objects.filter(username=data['login']).exists():
            ec.used = True
            ec.save(update_fields=['used'])
            return Response({'error': 'Пользователь с таким логином уже существует'}, status=400)

        user = User(
            username=data['login'],
            display_name=data['name'],
            email=data['email'],
            role='owner',
        )
        user.password = data['password_hash']
        user.save()

        ec.used = True
        ec.save(update_fields=['used'])

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.pk,
                'username': user.username,
                'role': user.role,
                'full_name': user.display_name,
                'institution': None,
            }
        })


class CheckAvailabilityView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        field = request.data.get('field', '')
        value = request.data.get('value', '').strip()
        if field == 'login':
            taken = User.objects.filter(username=value).exists()
            error = 'Логин уже занят. Выберите другой' if taken else None
        elif field == 'email':
            taken = User.objects.filter(email=value.lower()).exists()
            error = 'Этот email уже зарегистрирован' if taken else None
        else:
            return Response({'error': 'Неизвестное поле'}, status=400)
        return Response({'taken': taken, 'error': error})


class LogoutView(APIView):
    def post(self, request):
        return Response({'ok': True})


class SendRecoverCodeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        login = request.data.get('login', '').strip()
        if not login:
            return Response({'error': 'Введите логин'}, status=400)

        try:
            user = User.objects.get(username=login, role='owner')
        except User.DoesNotExist:
            return Response({'error': 'Пользователь не найден'}, status=400)

        if not user.email:
            return Response({'error': 'К аккаунту не привязан email. Обратитесь к администратору'}, status=400)

        EmailCode.objects.filter(login=login, purpose='recover', used=False).delete()

        code = generate_email_code()
        EmailCode.objects.create(
            email=user.email,
            login=login,
            code=code,
            purpose='recover',
            expires_at=timezone.now() + timedelta(minutes=_CODE_TTL),
        )

        sent = send_verification_email(user.email, code, purpose='recover')
        if not sent:
            EmailCode.objects.filter(login=login, purpose='recover', used=False).delete()
            return Response({'error': 'Не удалось отправить письмо. Проверьте email или попробуйте позже'}, status=500)

        return Response({'masked_email': mask_email(user.email)})


class RecoverView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        login = request.data.get('login', '').strip()
        code = request.data.get('code', '').strip().upper().replace('-', '')
        new_password = request.data.get('new_password', '')

        if not login:
            return Response({'error': 'Введите логин'}, status=400)
        if not code:
            return Response({'error': 'Введите код'}, status=400)
        if not new_password:
            return Response({'error': 'Введите новый пароль'}, status=400)
        if len(new_password) < 8:
            return Response({'error': 'Пароль должен содержать минимум 8 символов'}, status=400)
        if not re.search(r'\d', new_password):
            return Response({'error': 'Пароль должен содержать хотя бы одну цифру'}, status=400)
        if not re.search(r'[A-Za-z]', new_password):
            return Response({'error': 'Пароль должен содержать хотя бы одну латинскую букву'}, status=400)
        if not re.search(r'[_\-!@#$%^&*+.,;:?]', new_password):
            return Response({'error': 'Пароль должен содержать хотя бы один спецсимвол'}, status=400)

        try:
            ec = EmailCode.objects.get(login=login, code=code, purpose='recover', used=False)
        except EmailCode.DoesNotExist:
            return Response({'error': 'Неверный код'}, status=400)

        if timezone.now() > ec.expires_at:
            ec.delete()
            return Response({'error': 'Код истёк. Запросите новый'}, status=400)

        try:
            user = User.objects.get(username=login, role='owner')
        except User.DoesNotExist:
            return Response({'error': 'Пользователь не найден'}, status=400)

        user.set_password(new_password)
        user.save()

        ec.used = True
        ec.save(update_fields=['used'])

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
