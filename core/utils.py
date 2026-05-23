import base64
import io
import json
import logging
import os
import random
import string

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


def _get_logo_base64():
    try:
        from PIL import Image
        logo_path = os.path.join(settings.BASE_DIR, 'logo.png')
        img = Image.open(logo_path).convert('RGBA')
        img.thumbnail((120, 120), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format='PNG', optimize=True)
        return base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return None


def _build_email_html(code, purpose):
    display_code = _fmt_code(code)
    logo_b64 = _get_logo_base64()
    if logo_b64:
        avatar_html = (
            f'<img src="data:image/png;base64,{logo_b64}" width="56" height="56" '
            f'style="border-radius:50%; display:block;" alt="АИСК"/>'
        )
    else:
        avatar_html = (
            '<span style="font-size:17px; font-weight:bold; color:#ffffff; font-family:Arial;">АК</span>'
        )
    return f'''<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Код подтверждения - АИСК</title>
</head>
<body style="margin:0; padding:0; background:#f0f0f0; font-family: Arial, sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f0f0; padding:32px 0;">
  <tr>
    <td align="center">
      <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px; width:100%; border-radius:12px; overflow:hidden;">

        <!-- ХЕДЕР -->
        <tr>
          <td style="background:#2b5351; padding:36px 32px 28px; text-align:center;">
            <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:14px;">
              <tr>
                <td style="width:56px; height:56px; border-radius:50%; background:rgba(255,255,255,0.2); text-align:center; vertical-align:middle;">{avatar_html}</td>
              </tr>
            </table>
            <p style="margin:0; font-size:13px; font-weight:bold; color:rgba(255,255,255,0.85); letter-spacing:4px; text-transform:uppercase; font-family:Arial;">КОД ПОДТВЕРЖДЕНИЯ</p>
          </td>
        </tr>

        <!-- ТЕЛО -->
        <tr>
          <td style="background:#ffffff; padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>

                <!-- ЛЕВЫЙ ОРНАМЕНТ -->
                <td width="32" style="width:32px; background-color:#ffffff; background-image:linear-gradient(45deg, #2b5351 25%, transparent 25%),linear-gradient(-45deg, #2b5351 25%, transparent 25%),linear-gradient(45deg, transparent 75%, #2b5351 75%),linear-gradient(-45deg, transparent 75%, #2b5351 75%); background-size:8px 8px; background-position:0 0, 0 4px, 4px -4px, -4px 0px;">&nbsp;</td>

                <!-- КОНТЕНТ -->
                <td style="background:#ffffff; padding:36px 24px;">

                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                    <tr>
                      <td style="border:2px dashed #2b5351; border-radius:10px; background:#f7faf9; padding:28px; text-align:center;">
                        <span style="font-size:34px; font-weight:bold; color:#2b5351; letter-spacing:8px; font-family:Courier New, monospace;">{display_code}</span>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0; font-size:13px; color:#888888; line-height:1.7; font-family:Arial;">
                    Код действителен <strong style="color:#444444;">10 минут</strong>. Не передавайте его никому.
                  </p>

                </td>

                <!-- ПРАВЫЙ ОРНАМЕНТ -->
                <td width="32" style="width:32px; background-color:#ffffff; background-image:linear-gradient(45deg, #2b5351 25%, transparent 25%),linear-gradient(-45deg, #2b5351 25%, transparent 25%),linear-gradient(45deg, transparent 75%, #2b5351 75%),linear-gradient(-45deg, transparent 75%, #2b5351 75%); background-size:8px 8px; background-position:0 0, 0 4px, 4px -4px, -4px 0px;">&nbsp;</td>

              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>'''


def send_verification_email(email, code, purpose='register'):
    if not settings.EMAIL_HOST_USER:
        logger.warning('send_verification_email: EMAIL_HOST_USER not set')
        if settings.DEBUG:
            print(f'\n[EMAIL-DEV] to={email} purpose={purpose} code={_fmt_code(code)}\n')
            return True
        return False

    try:
        from django.core.mail import send_mail
        send_mail(
            subject=_EMAIL_SUBJECTS.get(purpose, 'Код подтверждения - АИСК'),
            message=f'Ваш код: {_fmt_code(code)}',
            from_email=f'АИСК <{settings.EMAIL_HOST_USER}>',
            recipient_list=[email],
            html_message=_build_email_html(code, purpose),
            fail_silently=False,
        )
        return True
    except Exception as e:
        logger.error('send_verification_email (gmail) failed to=%s purpose=%s: %s', email, purpose, e)
        if settings.DEBUG:
            print(f'\n[EMAIL-DEV] SMTP failed, code for {email} ({purpose}): {_fmt_code(code)}\n')
            return True
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
