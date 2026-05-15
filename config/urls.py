from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from core.api_auth import LoginView, RegisterView, LogoutView, RecoverView
from core.api_main import MeView, DashboardView
from core.api_organizations import OrganizationsView, OrganizationDetailView, OrganizationSwitchView
from core.api_faculties import FacultiesView, FacultyDetailView, FacultyDeleteRequestView
from core.api_groups import GroupsView, GroupDetailView, GroupDeleteRequestView, GroupSubjectsView, GroupSubjectDetailView
from core.api_employees import EmployeesView
from core.api_subjects import SubjectsView

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
    path('api/faculties/', FacultiesView.as_view()),
    path('api/faculties/<int:pk>/', FacultyDetailView.as_view()),
    path('api/faculties/<int:pk>/delete-request/', FacultyDeleteRequestView.as_view()),
    path('api/groups/', GroupsView.as_view()),
    path('api/groups/<int:pk>/', GroupDetailView.as_view()),
    path('api/groups/<int:pk>/delete-request/', GroupDeleteRequestView.as_view()),
    path('api/groups/<int:pk>/subjects/', GroupSubjectsView.as_view()),
    path('api/groups/<int:pk>/subjects/<int:assignment_pk>/', GroupSubjectDetailView.as_view()),
    path('api/employees/', EmployeesView.as_view()),
    path('api/subjects/', SubjectsView.as_view()),
    path('api/', include(router.urls)),
    path('', include('core.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
