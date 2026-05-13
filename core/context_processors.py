def current_institution(request):
    if not request.user.is_authenticated:
        return {}
    try:
        from core.utils import get_institution_from_session
        institution = get_institution_from_session(request)
        return {'institution': institution}
    except Exception:
        return {}
