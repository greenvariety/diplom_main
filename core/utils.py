import json
import logging
import random
import string

from functools import wraps
from django.conf import settings
from django.core.mail import send_mail
from django.http import HttpResponseForbidden
from django.shortcuts import get_object_or_404, redirect

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Email code helpers
# ---------------------------------------------------------------------------

def generate_email_code():
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=6))


def mask_email(email):
    at = email.find('@')
    if at <= 0:
        return email
    visible = min(3, max(1, at // 3))
    return email[:visible] + '***' + email[at:]


def send_verification_email(email, code, purpose='register'):
    subjects = {
        'register': 'Код подтверждения регистрации - АИСК',
        'recover': 'Код восстановления пароля - АИСК',
        'delete_org': 'Код подтверждения удаления организации - АИСК',
    }
    bodies = {
        'register': f'Ваш код подтверждения регистрации: {code}\n\nКод действителен 15 минут.',
        'recover': f'Ваш код восстановления пароля: {code}\n\nКод действителен 15 минут.',
        'delete_org': f'Код подтверждения удаления организации: {code}\n\nКод действителен 15 минут.',
    }
    try:
        send_mail(
            subject=subjects.get(purpose, 'Код подтверждения - АИСК'),
            message=bodies.get(purpose, f'Ваш код: {code}\n\nКод действителен 15 минут.'),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@aisc.ru'),
            recipient_list=[email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        logger.error('send_verification_email failed to=%s purpose=%s: %s', email, purpose, e)
        return False


# ---------------------------------------------------------------------------
# Institution context
# ---------------------------------------------------------------------------

def get_current_institution(request):
    return get_institution_from_session(request)


def get_institution_from_session(request):
    from core.models import Institution
    if request.user.is_owner:
        institution_id = request.session.get('institution_id')
        if not institution_id:
            return None
        return get_object_or_404(Institution, pk=institution_id, owner=request.user)
    return request.user.institution


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

def log_action(user, action, obj, old_data=None, new_data=None, institution=None):
    from core.models import AuditLog
    if institution is None and user and user.is_authenticated:
        institution = get_institution_from_session_safe(user)
    AuditLog.objects.create(
        user=user,
        institution=institution,
        action=action,
        object_type=obj.__class__.__name__,
        object_id=obj.pk,
        old_data=json.dumps(old_data, ensure_ascii=False, default=str) if old_data else '',
        new_data=json.dumps(new_data, ensure_ascii=False, default=str) if new_data else '',
    )


def get_institution_from_session_safe(user):
    try:
        if user.is_owner:
            return None
        return user.institution
    except Exception:
        return None


def model_to_dict_safe(instance):
    data = {}
    for field in instance._meta.fields:
        value = getattr(instance, field.name)
        data[field.name] = str(value) if value is not None else None
    return data


# ---------------------------------------------------------------------------
# Role decorators
# ---------------------------------------------------------------------------

def owner_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        if not request.user.is_owner:
            return HttpResponseForbidden('Доступ запрещён')
        return view_func(request, *args, **kwargs)
    return wrapper


def superadmin_required(view_func):
    return owner_required(view_func)


def admin_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        if not request.user.is_admin:
            return HttpResponseForbidden('Доступ запрещён')
        return view_func(request, *args, **kwargs)
    return wrapper
