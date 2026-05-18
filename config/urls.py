from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from core.views import serve_frontend
from rest_framework_simplejwt.views import TokenRefreshView
from core.api_auth import LoginView, RegisterView, LogoutView, RecoverView, VerifyEmailView, SendRecoverCodeView
from core.api_main import MeView, DashboardView
from core.api_organizations import OrganizationsView, OrganizationDetailView, OrganizationSwitchView, AllowedOrganizationsView, SendOrgDeleteCodeView
from core.api_faculties import FacultiesView, FacultyDetailView, FacultyDeleteRequestView
from core.api_groups import GroupsView, GroupDetailView, GroupDeleteRequestView, GroupSubjectsView, GroupSubjectDetailView
from core.api_employees import (
    EmployeesView, EmployeeDetailView, EmployeeDeleteRequestView,
    EmployeeSubjectsView, EmployeeSubjectDetailView,
)
from core.api_subjects import SubjectsView, SubjectDetailView
from core.api_students import (
    StudentsView, StudentDetailView, StudentDeleteRequestView,
    StudentTransferView, StudentParentsView, StudentParentDetailView,
)
from core.api_documents import DocumentUploadView, DocumentDetailView
from core.api_positions import PositionsView, PositionDetailView
from core.api_parents import (
    ParentsView, ParentDetailView, ParentDeleteRequestView,
    ParentStudentsView, ParentStudentDetailView,
)
from core.api_users import UsersView, UserDetailView, UserSetPasswordView
from core.api_delete_requests import DeleteRequestsView, DeleteRequestApproveView, DeleteRequestRejectView, DeleteRequestsCountView
from core.api_audit import AuditLogView, AuditLogUsersView

router = DefaultRouter()

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', LoginView.as_view()),
    path('api/auth/register/', RegisterView.as_view()),
    path('api/auth/verify-email/', VerifyEmailView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/logout/', LogoutView.as_view()),
    path('api/auth/recover/send-code/', SendRecoverCodeView.as_view()),
    path('api/auth/recover/', RecoverView.as_view()),
    path('api/me/', MeView.as_view()),
    path('api/dashboard/', DashboardView.as_view()),
    path('api/organizations/', OrganizationsView.as_view()),
    path('api/organizations/allowed/', AllowedOrganizationsView.as_view()),
    path('api/organizations/<int:pk>/', OrganizationDetailView.as_view()),
    path('api/organizations/<int:pk>/switch/', OrganizationSwitchView.as_view()),
    path('api/organizations/<int:pk>/send-delete-code/', SendOrgDeleteCodeView.as_view()),
    path('api/faculties/', FacultiesView.as_view()),
    path('api/faculties/<int:pk>/', FacultyDetailView.as_view()),
    path('api/faculties/<int:pk>/delete-request/', FacultyDeleteRequestView.as_view()),
    path('api/groups/', GroupsView.as_view()),
    path('api/groups/<int:pk>/', GroupDetailView.as_view()),
    path('api/groups/<int:pk>/delete-request/', GroupDeleteRequestView.as_view()),
    path('api/groups/<int:pk>/subjects/', GroupSubjectsView.as_view()),
    path('api/groups/<int:pk>/subjects/<int:assignment_pk>/', GroupSubjectDetailView.as_view()),
    path('api/employees/', EmployeesView.as_view()),
    path('api/employees/<int:pk>/', EmployeeDetailView.as_view()),
    path('api/employees/<int:pk>/delete-request/', EmployeeDeleteRequestView.as_view()),
    path('api/employees/<int:pk>/subjects/', EmployeeSubjectsView.as_view()),
    path('api/employees/<int:pk>/subjects/<int:assignment_pk>/', EmployeeSubjectDetailView.as_view()),
    path('api/subjects/', SubjectsView.as_view()),
    path('api/subjects/<int:pk>/', SubjectDetailView.as_view()),
    path('api/students/', StudentsView.as_view()),
    path('api/students/<int:pk>/', StudentDetailView.as_view()),
    path('api/students/<int:pk>/delete-request/', StudentDeleteRequestView.as_view()),
    path('api/students/<int:pk>/transfer/', StudentTransferView.as_view()),
    path('api/students/<int:pk>/parents/', StudentParentsView.as_view()),
    path('api/students/<int:pk>/parents/<int:sp_pk>/', StudentParentDetailView.as_view()),
    path('api/positions/', PositionsView.as_view()),
    path('api/positions/<int:pk>/', PositionDetailView.as_view()),
    path('api/parents/', ParentsView.as_view()),
    path('api/parents/<int:pk>/', ParentDetailView.as_view()),
    path('api/parents/<int:pk>/delete-request/', ParentDeleteRequestView.as_view()),
    path('api/parents/<int:pk>/students/', ParentStudentsView.as_view()),
    path('api/parents/<int:pk>/students/<int:sp_pk>/', ParentStudentDetailView.as_view()),
    path('api/documents/upload/', DocumentUploadView.as_view()),
    path('api/documents/<int:pk>/', DocumentDetailView.as_view()),
    path('api/users/', UsersView.as_view()),
    path('api/users/<int:pk>/', UserDetailView.as_view()),
    path('api/users/<int:pk>/set-password/', UserSetPasswordView.as_view()),
    path('api/delete-requests/', DeleteRequestsView.as_view()),
    path('api/delete-requests/count/', DeleteRequestsCountView.as_view()),
    path('api/delete-requests/<int:pk>/approve/', DeleteRequestApproveView.as_view()),
    path('api/delete-requests/<int:pk>/reject/', DeleteRequestRejectView.as_view()),
    path('api/audit-log/', AuditLogView.as_view()),
    path('api/audit-log/users/', AuditLogUsersView.as_view()),
    path('api/', include(router.urls)),
    re_path(r'^(?P<path>.*)$', serve_frontend),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
