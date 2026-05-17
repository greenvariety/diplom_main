from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

from .models import User, SeedPhrase
from .utils import generate_seed_phrase, hash_seed_phrase, verify_seed_phrase


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
        password = request.data.get('pass', '')

        if not username:
            return Response({'error': 'Введите логин'}, status=400)
        if not display_name:
            return Response({'error': 'Введите имя'}, status=400)
        if not password:
            return Response({'error': 'Введите пароль'}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Пользователь с таким логином уже существует'}, status=400)

        user = User.objects.create_user(
            username=username,
            password=password,
            role='owner',
            display_name=display_name,
        )

        phrase = generate_seed_phrase()
        SeedPhrase.objects.create(user=user, phrase_hash=hash_seed_phrase(phrase))

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'seed_phrase': phrase.split(),
            'user': {
                'id': user.pk,
                'username': user.username,
                'role': user.role,
                'full_name': user.display_name,
            }
        })


class LogoutView(APIView):
    def post(self, request):
        return Response({'ok': True})


class RecoverView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('login', '').strip()
        seed_words = request.data.get('seed_words', [])
        new_password = request.data.get('new_password', '')

        if not username:
            return Response({'error': 'Введите логин'}, status=400)
        if len(seed_words) != 12:
            return Response({'error': 'Введите все 12 слов сид-фразы'}, status=400)
        if not new_password:
            return Response({'error': 'Введите новый пароль'}, status=400)

        try:
            user = User.objects.get(username=username, role='owner')
        except User.DoesNotExist:
            return Response({'error': 'Пользователь не найден'}, status=400)

        phrase = ' '.join(seed_words)
        try:
            if not verify_seed_phrase(phrase, user.seed_phrase.phrase_hash):
                return Response({'error': 'Неверная сид-фраза'}, status=400)
        except SeedPhrase.DoesNotExist:
            return Response({'error': 'Сид-фраза не найдена'}, status=400)

        user.set_password(new_password)
        user.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
