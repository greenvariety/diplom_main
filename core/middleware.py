from django.shortcuts import redirect


class InitializationMiddleware:
    """
    Редирект на /setup/ если платформа не инициализирована.
    Редирект на /institutions/ если владелец платформы не выбрал заведение.
    """

    EXEMPT_PREFIXES = ('/static/', '/media/')
    EXEMPT_PATHS = frozenset([
        '/setup/',
        '/login/', '/logout/',
    ])

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        if path.startswith(self.EXEMPT_PREFIXES):
            return self.get_response(request)

        if path in self.EXEMPT_PATHS:
            return self.get_response(request)

        try:
            from core.models import Institution
            initialized = Institution.objects.exists()
        except Exception:
            return self.get_response(request)

        if not initialized:
            return redirect('setup')

        return self.get_response(request)
