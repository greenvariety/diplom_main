from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from core.views import serve_frontend
from rest_framework_simplejwt.views import TokenRefreshView
from core.api_auth import LoginView, RegisterView, LogoutView, RecoverView, VerifyEmailView, SendRecoverCodeView, ResendRegisterCodeView, CheckAvailabilityView
from core.api_main import MeView, DashboardView
from core.api_organizations import OrganizationsView, OrganizationDetailView, OrganizationSwitchView, AllowedOrganizationsView, SendOrgDeleteCodeView
from core.api_faculties import FacultiesView, FacultyDetailView, FacultyDeleteRequestView, FacultyFlagView
from core.api_groups import GroupsView, GroupDetailView, GroupDeleteRequestView, GroupSubjectsView, GroupSubjectDetailView, GroupFlagView
from core.api_employees import (
    EmployeesView, EmployeeDetailView, EmployeeDeleteRequestView,
    EmployeeSubjectsView, EmployeeSubjectDetailView, EmployeeFlagView, EmployeeAccountView,
)
from core.api_subjects import SubjectsView, SubjectDetailView
from core.api_students import (
    StudentsView, StudentDetailView, StudentDeleteRequestView,
    StudentTransferView, StudentTransferInstitutionView, StudentParentsView, StudentParentDetailView, StudentFlagView,
)
from core.api_documents import DocumentUploadView, DocumentDetailView
from core.api_positions import PositionsView, PositionDetailView
from core.api_parents import (
    ParentsView, ParentDetailView, ParentDeleteRequestView,
    ParentStudentsView, ParentStudentDetailView, ParentFlagView,
)
from core.api_users import UsersView, UserDetailView, UserSetPasswordView
from core.api_delete_requests import DeleteRequestsView, DeleteRequestApproveView, DeleteRequestRejectView, DeleteRequestsCountView
from core.api_audit import AuditLogView, AuditLogUsersView
from core.api_notes import NotesView, NoteDetailView

router = DefaultRouter()

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', LoginView.as_view()),
    path('api/auth/register/', RegisterView.as_view()),
    path('api/auth/verify-email/', VerifyEmailView.as_view()),
    path('api/auth/resend-register-code/', ResendRegisterCodeView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/logout/', LogoutView.as_view()),
    path('api/auth/recover/send-code/', SendRecoverCodeView.as_view()),
    path('api/auth/recover/', RecoverView.as_view()),
    path('api/auth/check-availability/', CheckAvailabilityView.as_view()),
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
    path('api/faculties/<int:pk>/flag/', FacultyFlagView.as_view()),
    path('api/groups/', GroupsView.as_view()),
    path('api/groups/<int:pk>/', GroupDetailView.as_view()),
    path('api/groups/<int:pk>/delete-request/', GroupDeleteRequestView.as_view()),
    path('api/groups/<int:pk>/flag/', GroupFlagView.as_view()),
    path('api/groups/<int:pk>/subjects/', GroupSubjectsView.as_view()),
    path('api/groups/<int:pk>/subjects/<int:assignment_pk>/', GroupSubjectDetailView.as_view()),
    path('api/employees/', EmployeesView.as_view()),
    path('api/employees/<int:pk>/', EmployeeDetailView.as_view()),
    path('api/employees/<int:pk>/delete-request/', EmployeeDeleteRequestView.as_view()),
    path('api/employees/<int:pk>/flag/', EmployeeFlagView.as_view()),
    path('api/employees/<int:pk>/account/', EmployeeAccountView.as_view()),
    path('api/employees/<int:pk>/subjects/', EmployeeSubjectsView.as_view()),
    path('api/employees/<int:pk>/subjects/<int:assignment_pk>/', EmployeeSubjectDetailView.as_view()),
    path('api/subjects/', SubjectsView.as_view()),
    path('api/subjects/<int:pk>/', SubjectDetailView.as_view()),
    path('api/students/', StudentsView.as_view()),
    path('api/students/<int:pk>/', StudentDetailView.as_view()),
    path('api/students/<int:pk>/delete-request/', StudentDeleteRequestView.as_view()),
    path('api/students/<int:pk>/flag/', StudentFlagView.as_view()),
    path('api/students/<int:pk>/transfer/', StudentTransferView.as_view()),
    path('api/students/<int:pk>/transfer-institution/', StudentTransferInstitutionView.as_view()),
    path('api/students/<int:pk>/parents/', StudentParentsView.as_view()),
    path('api/students/<int:pk>/parents/<int:sp_pk>/', StudentParentDetailView.as_view()),
    path('api/positions/', PositionsView.as_view()),
    path('api/positions/<int:pk>/', PositionDetailView.as_view()),
    path('api/parents/', ParentsView.as_view()),
    path('api/parents/<int:pk>/', ParentDetailView.as_view()),
    path('api/parents/<int:pk>/delete-request/', ParentDeleteRequestView.as_view()),
    path('api/parents/<int:pk>/flag/', ParentFlagView.as_view()),
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
    path('api/notes/', NotesView.as_view()),
    path('api/notes/<int:pk>/resolve/', NoteDetailView.as_view()),
    path('api/notes/<int:pk>/', NoteDetailView.as_view()),
    path('api/', include(router.urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + [
    re_path(r'^(?P<path>.*)$', serve_frontend),
]
