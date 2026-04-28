from django.urls import path
from . import views

urlpatterns = [
    # Platform setup (first launch)
    path('setup/', views.setup_view, name='setup'),
    path('setup/complete/', views.setup_complete_view, name='setup-complete'),
    path('forgot-password/', views.forgot_password_view, name='forgot-password'),
    path('reset-password/', views.reset_password_view, name='reset-password'),

    # Auth
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),

    # Institution management (platform_owner)
    path('institutions/', views.institution_list, name='institution-list'),
    path('institutions/add/', views.institution_add, name='institution-add'),
    path('institutions/<int:pk>/enter/', views.institution_enter, name='institution-enter'),
    path('institutions/exit/', views.institution_exit, name='institution-exit'),

    # Dashboard
    path('dashboard/', views.dashboard, name='dashboard'),
    path('', views.dashboard, name='home'),

    # Faculty
    path('faculties/', views.faculty_list, name='faculty-list'),
    path('faculties/add/', views.faculty_add, name='faculty-add'),
    path('faculties/<int:pk>/', views.faculty_detail, name='faculty-detail'),
    path('faculties/<int:pk>/edit/', views.faculty_edit, name='faculty-edit'),
    path('faculties/<int:pk>/delete/', views.faculty_delete_request, name='faculty-delete-request'),

    # Group
    path('groups/', views.group_list, name='group-list'),
    path('groups/add/', views.group_add, name='group-add'),
    path('groups/<int:pk>/', views.group_detail, name='group-detail'),
    path('groups/<int:pk>/edit/', views.group_edit, name='group-edit'),
    path('groups/<int:pk>/delete/', views.group_delete_request, name='group-delete-request'),
    path('groups/<int:pk>/subjects/add/', views.group_subject_add, name='group-subject-add'),
    path('groups/<int:pk>/subjects/<int:assignment_pk>/delete/', views.group_subject_delete, name='group-subject-delete'),

    # Student
    path('students/', views.student_list, name='student-list'),
    path('students/add/', views.student_add, name='student-add'),
    path('students/<int:pk>/', views.student_detail, name='student-detail'),
    path('students/<int:pk>/edit/', views.student_edit, name='student-edit'),
    path('students/<int:pk>/delete/', views.student_delete_request, name='student-delete-request'),
    path('students/<int:pk>/parents/add/', views.student_add_parent, name='student-add-parent'),
    path('students/<int:pk>/parents/<int:sp_pk>/remove/', views.student_remove_parent, name='student-remove-parent'),
    path('students/<int:pk>/transfer/', views.student_transfer, name='student-transfer'),

    # Parent / Guardian
    path('guardians/', views.parent_list, name='parent-list'),
    path('guardians/add/', views.parent_add, name='parent-add'),
    path('guardians/<int:pk>/', views.parent_detail, name='parent-detail'),
    path('guardians/<int:pk>/edit/', views.parent_edit, name='parent-edit'),
    path('guardians/<int:pk>/delete/', views.parent_delete_request, name='parent-delete-request'),
    path('guardians/<int:pk>/add-student/', views.guardian_add_student, name='guardian-add-student'),

    # Employee
    path('employees/', views.employee_list, name='employee-list'),
    path('employees/add/', views.employee_add, name='employee-add'),
    path('employees/<int:pk>/', views.employee_detail, name='employee-detail'),
    path('employees/<int:pk>/edit/', views.employee_edit, name='employee-edit'),
    path('employees/<int:pk>/delete/', views.employee_delete_request, name='employee-delete-request'),
    path('employees/<int:pk>/assign-subject/', views.employee_subject_assign, name='employee-subject-assign'),

    # Position
    path('positions/', views.position_list, name='position-list'),
    path('positions/add/', views.position_add, name='position-add'),
    path('positions/<int:pk>/edit/', views.position_edit, name='position-edit'),

    # Subject
    path('subjects/', views.subject_list, name='subject-list'),
    path('subjects/add/', views.subject_add, name='subject-add'),
    path('subjects/<int:pk>/', views.subject_detail, name='subject-detail'),
    path('subjects/<int:pk>/edit/', views.subject_edit, name='subject-edit'),

    # Document
    path('documents/upload/<str:owner_type>/<int:owner_id>/', views.document_upload, name='document-upload'),
    path('documents/<int:pk>/', views.document_detail, name='document-detail'),
    path('documents/<int:pk>/delete/', views.document_delete, name='document-delete'),

    # Users
    path('users/', views.user_list, name='user-list'),
    path('users/add/', views.user_add, name='user-add'),
    path('users/<int:pk>/', views.user_detail, name='user-detail'),
    path('users/<int:pk>/edit/', views.user_edit, name='user-edit'),
    path('users/<int:pk>/password/', views.user_set_password, name='user-set-password'),

    # Direct delete (superadmin only)
    path('delete/<str:object_type>/<int:pk>/', views.direct_delete, name='direct-delete'),

    # Delete requests
    path('delete-requests/', views.delete_request_list, name='delete-request-list'),
    path('delete-requests/<int:pk>/approve/', views.delete_request_approve, name='delete-request-approve'),
    path('delete-requests/<int:pk>/reject/', views.delete_request_reject, name='delete-request-reject'),

    # Audit log
    path('audit-log/', views.audit_log, name='audit-log'),

    # Export
    path('export/students/', views.export_students, name='export-students'),

    # Feedback (dev tool)
    path('feedback/', views.feedback_list, name='feedback-list'),
    path('feedback/save/', views.feedback_save, name='feedback-save'),
    path('feedback/<int:pk>/delete/', views.feedback_delete, name='feedback-delete'),

    # Dev tools
    path('dev/reset-db/', views.dev_reset_db, name='dev-reset-db'),
]
