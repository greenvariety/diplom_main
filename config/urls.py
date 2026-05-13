from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from core.api_auth import LoginView, RegisterView, LogoutView, RecoverView
from core.api_main import MeView, DashboardView
from core.api_organizations import OrganizationsView, OrganizationDetailView, OrganizationSwitchView

router = DefaultRouter()

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', LoginView.as_view()),
    path('api/auth/register/', RegisterView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/logout/', LogoutView.as_view()),
    path('api/auth/recover/', RecoverView.as_view()),
    path('api/me/', MeView.as_view()),
    path('api/dashboard/', DashboardView.as_view()),
    path('api/organizations/', OrganizationsView.as_view()),
    path('api/organizations/<int:pk>/', OrganizationDetailView.as_view()),
    path('api/organizations/<int:pk>/switch/', OrganizationSwitchView.as_view()),
    path('api/', include(router.urls)),
    path('', include('core.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
