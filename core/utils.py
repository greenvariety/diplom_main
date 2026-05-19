import json
import logging
import random
import string

import resend as resend_client
from functools import wraps
from django.conf import settings
from django.http import HttpResponseForbidden
from django.shortcuts import get_object_or_404, redirect

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Email code helpers
# ---------------------------------------------------------------------------

def generate_email_code():
    chars = string.ascii_uppercase + string.digits
    part1 = ''.join(random.choices(chars, k=3))
    part2 = ''.join(random.choices(chars, k=3))
    return part1 + part2  # хранится без дефиса: ABCDEF


def _fmt_code(code):
    """ABC-DEF для отображения в письме."""
    return f'{code[:3]}-{code[3:]}' if len(code) == 6 else code


def mask_email(email):
    at = email.find('@')
    if at <= 0:
        return email
    visible = min(3, max(1, at // 3))
    return email[:visible] + '***' + email[at:]


_EMAIL_SUBJECTS = {
    'register': 'Код подтверждения регистрации - АИСК',
    'recover': 'Код восстановления пароля - АИСК',
    'delete_org': 'Код подтверждения удаления организации - АИСК',
}
_EMAIL_ACTIONS = {
    'register': 'подтверждения регистрации',
    'recover': 'восстановления пароля',
    'delete_org': 'подтверждения удаления организации',
}


def _build_email_html(code, purpose):
    display_code = _fmt_code(code)
    action = _EMAIL_ACTIONS.get(purpose, 'подтверждения')
    return f'''<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">

        <!-- шапка с аватаром -->
        <tr><td style="background:#2563eb;padding:28px 32px;text-align:center">
          <div style="display:inline-flex;align-items:center;gap:12px">
            <div style="width:44px;height:44px;background:#ffffff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;color:#2563eb;line-height:44px;text-align:center">АК</div>
            <span style="color:#ffffff;font-size:20px;font-weight:700;vertical-align:middle">АИСК</span>
          </div>
          <div style="color:#bfdbfe;font-size:12px;margin-top:4px">АИС колледжа - v2.0</div>
        </td></tr>

        <!-- тело -->
        <tr><td style="padding:36px 32px">
          <p style="margin:0 0 8px;font-size:15px;color:#374151">Ваш код {action}:</p>
          <div style="background:#f0f4ff;border:2px dashed #93c5fd;border-radius:10px;padding:20px;text-align:center;margin:16px 0">
            <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#1d4ed8;font-family:'Courier New',monospace">{display_code}</span>
          </div>
          <p style="margin:0;font-size:13px;color:#6b7280">Код действителен <strong>10 минут</strong>. Не передавайте его никому.</p>
        </td></tr>

        <!-- подвал -->
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center">
          <p style="margin:0;font-size:11px;color:#9ca3af">ГБПОУ МКАГ - Дипломная работа - Пушков Н. М. - 2026</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>'''


def send_verification_email(email, code, purpose='register'):
    api_key = getattr(settings, 'RESEND_API_KEY', '')
    if not api_key:
        logger.error('send_verification_email: RESEND_API_KEY not set, printing to console')
        print(f'[EMAIL] to={email} purpose={purpose} code={_fmt_code(code)}')
        return False

    try:
        resend_client.api_key = api_key
        resend_client.Emails.send({
            'from': 'АИСК <onboarding@resend.dev>',
            'to': [email],
            'subject': _EMAIL_SUBJECTS.get(purpose, 'Код подтверждения - АИСК'),
            'html': _build_email_html(code, purpose),
        })
        return True
    except Exception as e:
        logger.error('send_verification_email (resend) failed to=%s purpose=%s: %s', email, purpose, e)
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
