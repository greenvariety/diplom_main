import json
import random
from django.http import HttpResponseForbidden
from django.shortcuts import redirect
from functools import wraps


# ---------------------------------------------------------------------------
# Seed phrase
# ---------------------------------------------------------------------------

_SEED_WORDS = [
    'яблоко', 'гора', 'река', 'лист', 'звезда', 'книга', 'дерево', 'море',
    'солнце', 'луна', 'ветер', 'огонь', 'вода', 'земля', 'небо', 'камень',
    'цветок', 'птица', 'рыба', 'снег', 'лес', 'поле', 'город', 'дом',
    'кот', 'пёс', 'конь', 'заяц', 'медведь', 'волк', 'орёл', 'лиса',
    'мост', 'путь', 'свет', 'тень', 'корень', 'ветка', 'плод', 'зерно',
    'осень', 'весна', 'лето', 'зима', 'утро', 'вечер', 'ночь', 'день',
    'слово', 'мысль', 'сон', 'голос', 'след', 'шаг', 'дверь', 'окно',
    'стол', 'стул', 'нож', 'хлеб', 'соль', 'чай', 'мёд', 'сад',
    'облако', 'гром', 'молния', 'туман', 'роса', 'мороз', 'дождь', 'снег',
    'корабль', 'волна', 'берег', 'якорь', 'парус', 'маяк', 'остров', 'залив',
    'гвоздь', 'ключ', 'замок', 'цепь', 'кольцо', 'монета', 'свеча', 'лампа',
    'нить', 'ткань', 'узор', 'краска', 'линия', 'точка', 'круг', 'угол',
]


def generate_seed_phrase():
    return ' '.join(random.sample(_SEED_WORDS, 12))


# ---------------------------------------------------------------------------
# Institution context
# ---------------------------------------------------------------------------

def get_current_institution(request):
    """Возвращает текущее учебное заведение для запроса."""
    from core.models import Institution
    if not request.user.is_authenticated:
        return None
    if request.user.role == 'platform_owner':
        institution_id = request.session.get('institution_id')
        if institution_id:
            return Institution.objects.filter(pk=institution_id).first()
        return None
    return request.user.institution


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

def log_action(user, action, obj, old_data=None, new_data=None):
    from core.models import AuditLog
    AuditLog.objects.create(
        user=user,
        action=action,
        object_type=obj.__class__.__name__,
        object_id=obj.pk,
        old_data=json.dumps(old_data, ensure_ascii=False, default=str) if old_data else '',
        new_data=json.dumps(new_data, ensure_ascii=False, default=str) if new_data else '',
    )


def model_to_dict_safe(instance):
    data = {}
    for field in instance._meta.fields:
        value = getattr(instance, field.name)
        data[field.name] = str(value) if value is not None else None
    return data


# ---------------------------------------------------------------------------
# Role decorators
# ---------------------------------------------------------------------------

def superadmin_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        if not request.user.is_superadmin:
            return HttpResponseForbidden('Доступ запрещён')
        return view_func(request, *args, **kwargs)
    return wrapper


def admin_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        if not request.user.is_admin:
            return HttpResponseForbidden('Доступ запрещён')
        return view_func(request, *args, **kwargs)
    return wrapper


def platform_owner_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        if not request.user.is_platform_owner:
            return HttpResponseForbidden('Доступ запрещён')
        return view_func(request, *args, **kwargs)
    return wrapper
