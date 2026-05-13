def current_institution(request):
    if not request.user.is_authenticated:
        return {}
    try:
        from core.utils import get_institution_from_session
        from core.models import DeleteRequest
        institution = get_institution_from_session(request)
        ctx = {'institution': institution}
        if institution and request.user.is_owner:
            ctx['pending_requests_count'] = DeleteRequest.objects.filter(
                user__institution=institution, status='pending'
            ).count()
        else:
            ctx['pending_requests_count'] = 0
        return ctx
    except Exception:
        return {'pending_requests_count': 0}
