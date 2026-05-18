import json
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
            return Response({'error': 'Пользователь с таким логином уже существует'}, status=400)

        # Удаляем старые pending-коды для этого логина/email
        EmailCode.objects.filter(login=username, purpose='register', used=False).delete()
        EmailCode.objects.filter(email=email, purpose='register', used=False).delete()

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
            expires_at=timezone.now() + timedelta(minutes=15),
        )

        send_verification_email(email, code, purpose='register')

        return Response({'masked_email': mask_email(email)})


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        login = request.data.get('login', '').strip()
        code = request.data.get('code', '').strip().upper()

        if not login or not code:
            return Response({'error': 'Введите логин и код'}, status=400)

        try:
            ec = EmailCode.objects.get(login=login, code=code, purpose='register', used=False)
        except EmailCode.DoesNotExist:
            return Response({'error': 'Неверный код'}, status=400)

        if timezone.now() > ec.expires_at:
            ec.delete()
            return Response({'error': 'Код истёк. Зарегистрируйтесь заново'}, status=400)

        data = json.loads(ec.payload)

        if User.objects.filter(username=data['login']).exists():
            ec.delete()
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
            expires_at=timezone.now() + timedelta(minutes=15),
        )

        send_verification_email(user.email, code, purpose='recover')

        return Response({'masked_email': mask_email(user.email)})


class RecoverView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        login = request.data.get('login', '').strip()
        code = request.data.get('code', '').strip().upper()
        new_password = request.data.get('new_password', '')

        if not login:
            return Response({'error': 'Введите логин'}, status=400)
        if not code:
            return Response({'error': 'Введите код'}, status=400)
        if not new_password:
            return Response({'error': 'Введите новый пароль'}, status=400)

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
