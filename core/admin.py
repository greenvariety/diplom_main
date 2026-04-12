from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    Faculty, Group, Student, Parent, StudentParent,
    Employee, Position, Subject, GroupSubjectEmployee,
    Document, User, DeleteRequest, AuditLog,
)

admin.site.register(Faculty)
admin.site.register(Group)
admin.site.register(Student)
admin.site.register(Parent)
admin.site.register(StudentParent)
admin.site.register(Employee)
admin.site.register(Position)
admin.site.register(Subject)
admin.site.register(GroupSubjectEmployee)
admin.site.register(Document)
admin.site.register(DeleteRequest)
admin.site.register(AuditLog)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'role', 'employee', 'is_active')
    list_filter = ('role', 'is_active')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Роль и сотрудник', {'fields': ('role', 'employee')}),
        ('Права', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'role', 'employee'),
        }),
    )
    search_fields = ('username',)
    ordering = ('username',)
