import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden
from django.db.models import Q, Count

from .models import (
    Faculty, Group, Student, Parent, StudentParent,
    Employee, Position, Subject, GroupSubjectEmployee,
    Document, User, DeleteRequest, AuditLog,
)
from .forms import (
    LoginForm, FacultyForm, PositionForm, GroupForm,
    StudentForm, StudentFilterForm, ParentForm, StudentParentForm,
    EmployeeForm, SubjectForm, GroupSubjectEmployeeForm,
    DocumentForm, UserCreateForm, UserEditForm, PasswordChangeCustomForm,
    DeleteRequestForm, DeleteConfirmForm,
)
from .utils import log_action, model_to_dict_safe, superadmin_required, admin_required


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    form = LoginForm(request, data=request.POST or None)
    if request.method == 'POST' and form.is_valid():
        login(request, form.get_user())
        return redirect('dashboard')
    return render(request, 'core/login.html', {'form': form})


@login_required
def logout_view(request):
    logout(request)
    return redirect('login')


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@login_required
def dashboard(request):
    user = request.user
    context = {}

    if user.is_superadmin:
        # Order: faculties, groups, students, pending requests
        context['total_faculties'] = Faculty.objects.count()
        context['total_groups'] = Group.objects.count()
        context['total_students'] = Student.objects.count()
        context['total_employees'] = Employee.objects.count()
        context['pending_requests'] = DeleteRequest.objects.filter(status='pending').count()
        context['recent_logs'] = AuditLog.objects.select_related('user')[:10]

    elif user.is_admin:
        context['total_faculties'] = Faculty.objects.count()
        context['total_groups'] = Group.objects.count()
        context['total_students'] = Student.objects.count()
        context['total_employees'] = Employee.objects.count()

    else:  # teacher
        if user.employee:
            my_groups = Group.objects.filter(
                Q(headteacher=user.employee) |
                Q(subject_assignments__employee=user.employee)
            ).distinct().select_related('faculty')
            context['my_groups'] = my_groups
            context['my_subjects'] = GroupSubjectEmployee.objects.filter(
                employee=user.employee
            ).select_related('group', 'group__faculty', 'subject')

    return render(request, 'core/dashboard.html', context)


# ---------------------------------------------------------------------------
# Faculty
# ---------------------------------------------------------------------------

@login_required
def faculty_list(request):
    q = request.GET.get('q', '')
    faculties = Faculty.objects.annotate(group_count=Count('groups'))
    if q:
        faculties = faculties.filter(
            Q(full_name__icontains=q) | Q(short_name__icontains=q)
        )
    return render(request, 'core/faculty_list.html', {'faculties': faculties, 'q': q})


@admin_required
def faculty_add(request):
    form = FacultyForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        faculty = form.save()
        log_action(request.user, 'created', faculty, new_data=model_to_dict_safe(faculty))
        messages.success(request, f'Факультет «{faculty.short_name}» добавлен.')
        return redirect('faculty-list')
    return render(request, 'core/faculty_form.html', {'form': form, 'title': 'Добавить факультет'})


@admin_required
def faculty_edit(request, pk):
    faculty = get_object_or_404(Faculty, pk=pk)
    old_data = model_to_dict_safe(faculty)
    form = FacultyForm(request.POST or None, instance=faculty)
    if request.method == 'POST' and form.is_valid():
        faculty = form.save()
        log_action(request.user, 'updated', faculty, old_data=old_data, new_data=model_to_dict_safe(faculty))
        messages.success(request, 'Факультет обновлён.')
        return redirect('faculty-list')
    return render(request, 'core/faculty_form.html', {
        'form': form, 'title': 'Редактировать факультет', 'object': faculty,
    })


@admin_required
def faculty_delete_request(request, pk):
    faculty = get_object_or_404(Faculty, pk=pk)
    # Superadmin deletes directly
    if request.user.is_superadmin:
        return redirect('direct-delete', object_type='Faculty', pk=pk)
    if request.method == 'POST':
        form = DeleteRequestForm(request.POST)
        if form.is_valid():
            dr = form.save(commit=False)
            dr.user = request.user
            dr.object_type = 'Faculty'
            dr.object_id = faculty.pk
            dr.save()
            messages.success(request, 'Заявка на удаление отправлена суперадминистратору.')
            return redirect('faculty-list')
    else:
        form = DeleteRequestForm()
    return render(request, 'core/delete_request_form.html', {
        'form': form, 'object': faculty, 'object_type': 'факультет',
    })


# ---------------------------------------------------------------------------
# Group
# ---------------------------------------------------------------------------

@login_required
def group_list(request):
    user = request.user
    q = request.GET.get('q', '')
    if user.is_admin:
        groups = Group.objects.select_related('faculty', 'headteacher').annotate(
            student_count=Count('students')
        )
    else:
        if user.employee:
            groups = Group.objects.filter(
                Q(headteacher=user.employee) |
                Q(subject_assignments__employee=user.employee)
            ).distinct().select_related('faculty', 'headteacher').annotate(
                student_count=Count('students')
            )
        else:
            groups = Group.objects.none()
    if q:
        # filter by generated name parts: faculty short_name or year
        groups = groups.filter(
            Q(faculty__short_name__icontains=q) |
            Q(faculty__full_name__icontains=q) |
            Q(year__icontains=q)
        )
    return render(request, 'core/group_list.html', {'groups': groups, 'q': q})


@admin_required
def group_add(request):
    form = GroupForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        group = form.save()
        log_action(request.user, 'created', group, new_data={
            'name': group.name, 'faculty': str(group.faculty), 'year': group.year,
        })
        messages.success(request, f'Группа «{group.name}» создана.')
        return redirect('group-list')
    return render(request, 'core/group_form.html', {'form': form, 'title': 'Создать группу'})


@admin_required
def group_edit(request, pk):
    group = get_object_or_404(Group, pk=pk)
    old_data = {'name': group.name, 'year': group.year, 'faculty': str(group.faculty)}
    form = GroupForm(request.POST or None, instance=group)
    if request.method == 'POST' and form.is_valid():
        group = form.save()
        log_action(request.user, 'updated', group, old_data=old_data, new_data={
            'name': group.name, 'year': group.year,
        })
        messages.success(request, 'Группа обновлена.')
        return redirect('group-detail', pk=pk)
    return render(request, 'core/group_form.html', {
        'form': form, 'title': 'Редактировать группу', 'object': group,
    })


@login_required
def group_detail(request, pk):
    user = request.user
    group = get_object_or_404(Group.objects.select_related('faculty', 'headteacher'), pk=pk)
    if user.is_teacher_role and user.employee:
        allowed = Group.objects.filter(
            Q(headteacher=user.employee) | Q(subject_assignments__employee=user.employee),
            pk=pk,
        ).exists()
        if not allowed:
            return HttpResponseForbidden('Доступ запрещён')
    students = group.students.all().order_by('last_name', 'first_name')
    subjects = group.subject_assignments.select_related('subject', 'employee')
    return render(request, 'core/group_detail.html', {
        'group': group, 'students': students, 'subjects': subjects,
    })


@admin_required
def group_delete_request(request, pk):
    group = get_object_or_404(Group, pk=pk)
    if request.user.is_superadmin:
        return redirect('direct-delete', object_type='Group', pk=pk)
    if request.method == 'POST':
        form = DeleteRequestForm(request.POST)
        if form.is_valid():
            dr = form.save(commit=False)
            dr.user = request.user
            dr.object_type = 'Group'
            dr.object_id = group.pk
            dr.save()
            messages.success(request, 'Заявка на удаление отправлена.')
            return redirect('group-list')
    else:
        form = DeleteRequestForm()
    return render(request, 'core/delete_request_form.html', {
        'form': form, 'object': group, 'object_type': 'группу',
    })


@admin_required
def group_subject_add(request, pk):
    group = get_object_or_404(Group, pk=pk)
    form = GroupSubjectEmployeeForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        assignment = form.save(commit=False)
        assignment.group = group
        assignment.save()
        messages.success(request, 'Предмет добавлен в группу.')
        return redirect('group-detail', pk=pk)
    return render(request, 'core/group_subject_form.html', {'form': form, 'group': group})


@admin_required
def group_subject_delete(request, pk, assignment_pk):
    assignment = get_object_or_404(GroupSubjectEmployee, pk=assignment_pk, group_id=pk)
    assignment.delete()
    messages.success(request, 'Предмет удалён из группы.')
    return redirect('group-detail', pk=pk)


# ---------------------------------------------------------------------------
# Student
# ---------------------------------------------------------------------------

@login_required
def student_list(request):
    user = request.user
    form = StudentFilterForm(request.GET)
    students = Student.objects.select_related('faculty', 'group', 'group__faculty')

    if user.is_teacher_role and user.employee:
        allowed_groups = Group.objects.filter(
            Q(headteacher=user.employee) | Q(subject_assignments__employee=user.employee)
        ).distinct()
        students = students.filter(group__in=allowed_groups)

    if form.is_valid():
        q = form.cleaned_data.get('search')
        if q:
            students = students.filter(
                Q(last_name__icontains=q) | Q(first_name__icontains=q) | Q(middle_name__icontains=q)
            )
        faculty = form.cleaned_data.get('faculty')
        if faculty:
            students = students.filter(faculty=faculty)
        group = form.cleaned_data.get('group')
        if group:
            students = students.filter(group=group)
        status = form.cleaned_data.get('status')
        if status:
            students = students.filter(status=status)

    return render(request, 'core/student_list.html', {'students': students, 'form': form})


@admin_required
def student_add(request):
    form = StudentForm(request.POST or None, request.FILES or None)
    if request.method == 'POST' and form.is_valid():
        student = form.save()
        log_action(request.user, 'created', student, new_data=model_to_dict_safe(student))
        messages.success(request, 'Студент добавлен.')
        return redirect('student-detail', pk=student.pk)
    return render(request, 'core/student_form.html', {'form': form, 'title': 'Добавить студента'})


@login_required
def student_detail(request, pk):
    user = request.user
    student = get_object_or_404(Student.objects.select_related('faculty', 'group', 'group__faculty'), pk=pk)
    if user.is_teacher_role and user.employee:
        if student.group:
            allowed = Group.objects.filter(
                Q(headteacher=user.employee) | Q(subject_assignments__employee=user.employee),
                pk=student.group_id,
            ).exists()
            if not allowed:
                return HttpResponseForbidden('Доступ запрещён')
        else:
            return HttpResponseForbidden('Доступ запрещён')
    parents = StudentParent.objects.filter(student=student).select_related('parent')
    documents = Document.objects.filter(owner_type='student', owner_id=pk)
    return render(request, 'core/student_detail.html', {
        'student': student, 'parents': parents, 'documents': documents,
    })


@admin_required
def student_edit(request, pk):
    student = get_object_or_404(Student, pk=pk)
    old_data = model_to_dict_safe(student)
    form = StudentForm(request.POST or None, request.FILES or None, instance=student)
    if request.method == 'POST' and form.is_valid():
        student = form.save()
        log_action(request.user, 'updated', student, old_data=old_data, new_data=model_to_dict_safe(student))
        messages.success(request, 'Данные студента обновлены.')
        return redirect('student-detail', pk=student.pk)
    return render(request, 'core/student_form.html', {
        'form': form, 'title': 'Редактировать студента', 'object': student,
    })


@admin_required
def student_delete_request(request, pk):
    student = get_object_or_404(Student, pk=pk)
    if request.user.is_superadmin:
        return redirect('direct-delete', object_type='Student', pk=pk)
    if request.method == 'POST':
        form = DeleteRequestForm(request.POST)
        if form.is_valid():
            dr = form.save(commit=False)
            dr.user = request.user
            dr.object_type = 'Student'
            dr.object_id = student.pk
            dr.save()
            messages.success(request, 'Заявка на удаление отправлена.')
            return redirect('student-list')
    else:
        form = DeleteRequestForm()
    return render(request, 'core/delete_request_form.html', {
        'form': form, 'object': student, 'object_type': 'студента',
    })


@admin_required
def student_add_parent(request, pk):
    student = get_object_or_404(Student, pk=pk)
    form = StudentParentForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        sp = form.save(commit=False)
        sp.student = student
        sp.save()
        messages.success(request, 'Опекун привязан.')
        return redirect('student-detail', pk=pk)
    return render(request, 'core/student_parent_form.html', {'form': form, 'student': student})


@admin_required
def student_remove_parent(request, pk, sp_pk):
    sp = get_object_or_404(StudentParent, pk=sp_pk, student_id=pk)
    sp.delete()
    messages.success(request, 'Связь удалена.')
    return redirect('student-detail', pk=pk)


# ---------------------------------------------------------------------------
# Parent / Guardian
# ---------------------------------------------------------------------------

@admin_required
def parent_list(request):
    q = request.GET.get('q', '')
    parents = Parent.objects.all()
    if q:
        parents = parents.filter(
            Q(last_name__icontains=q) | Q(first_name__icontains=q) | Q(middle_name__icontains=q)
        )
    return render(request, 'core/parent_list.html', {'parents': parents, 'q': q})


@admin_required
def parent_add(request):
    form = ParentForm(request.POST or None, request.FILES or None)
    if request.method == 'POST' and form.is_valid():
        parent = form.save()
        log_action(request.user, 'created', parent, new_data=model_to_dict_safe(parent))
        messages.success(request, 'Опекун добавлен.')
        return redirect('parent-list')
    return render(request, 'core/parent_form.html', {'form': form, 'title': 'Добавить опекуна'})


@admin_required
def parent_edit(request, pk):
    parent = get_object_or_404(Parent, pk=pk)
    old_data = model_to_dict_safe(parent)
    form = ParentForm(request.POST or None, request.FILES or None, instance=parent)
    if request.method == 'POST' and form.is_valid():
        parent = form.save()
        log_action(request.user, 'updated', parent, old_data=old_data, new_data=model_to_dict_safe(parent))
        messages.success(request, 'Данные обновлены.')
        return redirect('parent-detail', pk=pk)
    return render(request, 'core/parent_form.html', {
        'form': form, 'title': 'Редактировать опекуна', 'object': parent,
    })


@admin_required
def parent_detail(request, pk):
    parent = get_object_or_404(Parent, pk=pk)
    links = StudentParent.objects.filter(parent=parent).select_related('student')
    documents = Document.objects.filter(owner_type='parent', owner_id=pk)
    return render(request, 'core/parent_detail.html', {
        'parent': parent, 'links': links, 'documents': documents,
    })


@admin_required
def parent_delete_request(request, pk):
    parent = get_object_or_404(Parent, pk=pk)
    if request.user.is_superadmin:
        return redirect('direct-delete', object_type='Parent', pk=pk)
    if request.method == 'POST':
        form = DeleteRequestForm(request.POST)
        if form.is_valid():
            dr = form.save(commit=False)
            dr.user = request.user
            dr.object_type = 'Parent'
            dr.object_id = parent.pk
            dr.save()
            messages.success(request, 'Заявка на удаление отправлена.')
            return redirect('parent-list')
    else:
        form = DeleteRequestForm()
    return render(request, 'core/delete_request_form.html', {
        'form': form, 'object': parent, 'object_type': 'опекуна',
    })


# ---------------------------------------------------------------------------
# Employee
# ---------------------------------------------------------------------------

@admin_required
def employee_list(request):
    q = request.GET.get('q', '')
    employees = Employee.objects.select_related('position')
    if q:
        employees = employees.filter(
            Q(last_name__icontains=q) | Q(first_name__icontains=q) | Q(middle_name__icontains=q)
        )
    return render(request, 'core/employee_list.html', {'employees': employees, 'q': q})


@admin_required
def employee_add(request):
    form = EmployeeForm(request.POST or None, request.FILES or None)
    if request.method == 'POST' and form.is_valid():
        employee = form.save()
        log_action(request.user, 'created', employee, new_data=model_to_dict_safe(employee))
        messages.success(request, 'Сотрудник добавлен.')
        return redirect('employee-detail', pk=employee.pk)
    return render(request, 'core/employee_form.html', {'form': form, 'title': 'Добавить сотрудника'})


@admin_required
def employee_detail(request, pk):
    employee = get_object_or_404(Employee, pk=pk)
    groups = employee.headed_groups.select_related('faculty')
    subjects = employee.subject_assignments.select_related('group', 'group__faculty', 'subject')
    documents = Document.objects.filter(owner_type='employee', owner_id=pk)
    return render(request, 'core/employee_detail.html', {
        'employee': employee, 'groups': groups, 'subjects': subjects, 'documents': documents,
    })


@admin_required
def employee_edit(request, pk):
    employee = get_object_or_404(Employee, pk=pk)
    old_data = model_to_dict_safe(employee)
    form = EmployeeForm(request.POST or None, request.FILES or None, instance=employee)
    if request.method == 'POST' and form.is_valid():
        employee = form.save()
        log_action(request.user, 'updated', employee, old_data=old_data, new_data=model_to_dict_safe(employee))
        messages.success(request, 'Данные сотрудника обновлены.')
        return redirect('employee-detail', pk=employee.pk)
    return render(request, 'core/employee_form.html', {
        'form': form, 'title': 'Редактировать сотрудника', 'object': employee,
    })


@admin_required
def employee_delete_request(request, pk):
    employee = get_object_or_404(Employee, pk=pk)
    if request.user.is_superadmin:
        return redirect('direct-delete', object_type='Employee', pk=pk)
    if request.method == 'POST':
        form = DeleteRequestForm(request.POST)
        if form.is_valid():
            dr = form.save(commit=False)
            dr.user = request.user
            dr.object_type = 'Employee'
            dr.object_id = employee.pk
            dr.save()
            messages.success(request, 'Заявка на удаление отправлена.')
            return redirect('employee-list')
    else:
        form = DeleteRequestForm()
    return render(request, 'core/delete_request_form.html', {
        'form': form, 'object': employee, 'object_type': 'сотрудника',
    })


# ---------------------------------------------------------------------------
# Position
# ---------------------------------------------------------------------------

@superadmin_required
def position_list(request):
    q = request.GET.get('q', '')
    positions = Position.objects.all()
    if q:
        positions = positions.filter(name__icontains=q)
    return render(request, 'core/position_list.html', {'positions': positions, 'q': q})


@superadmin_required
def position_add(request):
    form = PositionForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        position = form.save()
        log_action(request.user, 'created', position, new_data=model_to_dict_safe(position))
        messages.success(request, 'Должность добавлена.')
        return redirect('position-list')
    return render(request, 'core/position_form.html', {'form': form, 'title': 'Добавить должность'})


@superadmin_required
def position_edit(request, pk):
    position = get_object_or_404(Position, pk=pk)
    old_data = model_to_dict_safe(position)
    form = PositionForm(request.POST or None, instance=position)
    if request.method == 'POST' and form.is_valid():
        position = form.save()
        log_action(request.user, 'updated', position, old_data=old_data, new_data=model_to_dict_safe(position))
        messages.success(request, 'Должность обновлена.')
        return redirect('position-list')
    return render(request, 'core/position_form.html', {
        'form': form, 'title': 'Редактировать должность', 'object': position,
    })


# ---------------------------------------------------------------------------
# Subject
# ---------------------------------------------------------------------------

@admin_required
def subject_list(request):
    q = request.GET.get('q', '')
    subjects = Subject.objects.all()
    if q:
        subjects = subjects.filter(name__icontains=q)
    total = Subject.objects.count()
    return render(request, 'core/subject_list.html', {'subjects': subjects, 'q': q, 'total': total})


@admin_required
def subject_add(request):
    form = SubjectForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        subject = form.save()
        messages.success(request, 'Предмет добавлен.')
        return redirect('subject-list')
    return render(request, 'core/subject_form.html', {'form': form, 'title': 'Добавить предмет'})


@admin_required
def subject_edit(request, pk):
    subject = get_object_or_404(Subject, pk=pk)
    form = SubjectForm(request.POST or None, instance=subject)
    if request.method == 'POST' and form.is_valid():
        subject = form.save()
        messages.success(request, 'Предмет обновлён.')
        return redirect('subject-detail', pk=pk)
    return render(request, 'core/subject_form.html', {
        'form': form, 'title': 'Редактировать предмет', 'object': subject,
    })


@admin_required
def subject_detail(request, pk):
    subject = get_object_or_404(Subject, pk=pk)
    # All current assignments for this subject
    assignments = GroupSubjectEmployee.objects.filter(subject=subject).select_related(
        'group', 'group__faculty', 'employee', 'employee__position'
    )
    # All teachers (employees with is_teacher position)
    all_teachers = Employee.objects.filter(
        position__is_teacher=True
    ).select_related('position')

    # IDs of employees currently teaching this subject (any group)
    assigned_employee_ids = set(assignments.values_list('employee_id', flat=True))

    return render(request, 'core/subject_detail.html', {
        'subject': subject,
        'assignments': assignments,
        'all_teachers': all_teachers,
        'assigned_employee_ids': assigned_employee_ids,
    })


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------

@admin_required
def document_upload(request, owner_type, owner_id):
    form = DocumentForm(request.POST or None, request.FILES or None)
    if request.method == 'POST' and form.is_valid():
        doc = form.save(commit=False)
        doc.owner_type = owner_type
        doc.owner_id = owner_id
        doc.save()
        messages.success(request, 'Документ загружен.')
        return _redirect_to_owner(owner_type, owner_id)
    return render(request, 'core/document_form.html', {
        'form': form, 'owner_type': owner_type, 'owner_id': owner_id,
    })


@admin_required
def document_delete(request, pk):
    doc = get_object_or_404(Document, pk=pk)
    owner_type = doc.owner_type
    owner_id = doc.owner_id
    doc.file.delete(save=False)
    doc.delete()
    messages.success(request, 'Документ удалён.')
    return _redirect_to_owner(owner_type, owner_id)


def _redirect_to_owner(owner_type, owner_id):
    if owner_type == 'student':
        return redirect('student-detail', pk=owner_id)
    elif owner_type == 'employee':
        return redirect('employee-detail', pk=owner_id)
    elif owner_type == 'parent':
        return redirect('parent-detail', pk=owner_id)
    return redirect('dashboard')


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

@superadmin_required
def user_list(request):
    q = request.GET.get('q', '')
    users = User.objects.select_related('employee').all()
    if q:
        users = users.filter(username__icontains=q)
    return render(request, 'core/user_list.html', {'users': users, 'q': q})


@superadmin_required
def user_add(request):
    form = UserCreateForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user = form.save()
        log_action(request.user, 'created', user, new_data={'username': user.username, 'role': user.role})
        messages.success(request, 'Учётная запись создана.')
        return redirect('user-list')
    return render(request, 'core/user_form.html', {'form': form, 'title': 'Создать учётную запись'})


@superadmin_required
def user_edit(request, pk):
    user_obj = get_object_or_404(User, pk=pk)
    form = UserEditForm(request.POST or None, instance=user_obj)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Учётная запись обновлена.')
        return redirect('user-list')
    return render(request, 'core/user_form.html', {
        'form': form, 'title': 'Редактировать учётную запись', 'object': user_obj,
    })


@superadmin_required
def user_set_password(request, pk):
    user_obj = get_object_or_404(User, pk=pk)
    form = PasswordChangeCustomForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user_obj.set_password(form.cleaned_data['new_password'])
        user_obj.save()
        messages.success(request, 'Пароль изменён.')
        return redirect('user-list')
    return render(request, 'core/user_password_form.html', {'form': form, 'object': user_obj})


# ---------------------------------------------------------------------------
# Direct delete (superadmin only — no DeleteRequest needed)
# ---------------------------------------------------------------------------

@superadmin_required
def direct_delete(request, object_type, pk):
    model_map = {
        'Faculty': Faculty,
        'Group': Group,
        'Student': Student,
        'Employee': Employee,
        'Parent': Parent,
    }
    model_cls = model_map.get(object_type)
    if not model_cls:
        messages.error(request, 'Неизвестный тип объекта.')
        return redirect('dashboard')

    obj = get_object_or_404(model_cls, pk=pk)
    form = DeleteConfirmForm(request.POST or None)

    if request.method == 'POST' and form.is_valid():
        entered = form.cleaned_data['confirmation_password']
        if entered != settings.DELETE_CONFIRMATION_PASSWORD:
            messages.error(request, 'Неверный пароль подтверждения.')
        else:
            old_data = model_to_dict_safe(obj)
            log_action(request.user, 'deleted', obj, old_data=old_data)
            obj.delete()
            messages.success(request, f'Объект удалён.')
            return _redirect_after_delete(object_type)

    return render(request, 'core/direct_delete_confirm.html', {
        'form': form,
        'obj': obj,
        'object_type': object_type,
        'object_type_display': dict(DeleteRequest.OBJECT_TYPE_CHOICES).get(object_type, object_type),
    })


def _redirect_after_delete(object_type):
    redirects = {
        'Faculty': 'faculty-list',
        'Group': 'group-list',
        'Student': 'student-list',
        'Employee': 'employee-list',
        'Parent': 'parent-list',
    }
    return redirect(redirects.get(object_type, 'dashboard'))


# ---------------------------------------------------------------------------
# Delete requests (admin → superadmin approval flow)
# ---------------------------------------------------------------------------

@superadmin_required
def delete_request_list(request):
    requests_qs = DeleteRequest.objects.select_related('user').filter(status='pending')
    return render(request, 'core/delete_request_list.html', {'requests': requests_qs})


@superadmin_required
def delete_request_approve(request, pk):
    dr = get_object_or_404(DeleteRequest, pk=pk)
    if dr.status != 'pending':
        messages.error(request, 'Заявка уже обработана.')
        return redirect('delete-request-list')

    form = DeleteConfirmForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        entered = form.cleaned_data['confirmation_password']
        if entered != settings.DELETE_CONFIRMATION_PASSWORD:
            messages.error(request, 'Неверный пароль подтверждения.')
            return render(request, 'core/delete_request_approve.html', {'form': form, 'dr': dr})
        _perform_delete(request.user, dr)
        dr.status = 'approved'
        dr.save()
        messages.success(request, 'Объект удалён.')
        return redirect('delete-request-list')

    return render(request, 'core/delete_request_approve.html', {'form': form, 'dr': dr})


@superadmin_required
def delete_request_reject(request, pk):
    dr = get_object_or_404(DeleteRequest, pk=pk)
    dr.status = 'rejected'
    dr.save()
    messages.success(request, 'Заявка отклонена.')
    return redirect('delete-request-list')


def _perform_delete(user, dr):
    model_map = {
        'Faculty': Faculty, 'Group': Group, 'Student': Student,
        'Employee': Employee, 'Parent': Parent,
    }
    model_cls = model_map.get(dr.object_type)
    if not model_cls:
        return
    try:
        obj = model_cls.objects.get(pk=dr.object_id)
        old_data = model_to_dict_safe(obj)
        log_action(user, 'deleted', obj, old_data=old_data)
        obj.delete()
    except model_cls.DoesNotExist:
        pass


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

@superadmin_required
def audit_log(request):
    logs = AuditLog.objects.select_related('user').all()[:200]
    return render(request, 'core/audit_log.html', {'logs': logs})


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

@admin_required
def export_students(request):
    import openpyxl
    from openpyxl.styles import Font

    group_id = request.GET.get('group')
    faculty_id = request.GET.get('faculty')

    students = Student.objects.select_related('faculty', 'group', 'group__faculty')
    title = 'Все студенты'

    if group_id:
        students = students.filter(group_id=group_id)
        try:
            g = Group.objects.select_related('faculty').get(pk=group_id)
            title = f'Группа {g.name}'
        except Group.DoesNotExist:
            pass
    elif faculty_id:
        students = students.filter(faculty_id=faculty_id)
        try:
            title = f'Факультет {Faculty.objects.get(pk=faculty_id).short_name}'
        except Faculty.DoesNotExist:
            pass

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Студенты'

    headers = ['№', 'Фамилия', 'Имя', 'Отчество', 'Дата рождения', 'Телефон', 'Email', 'Статус', 'Факультет', 'Группа']
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for i, student in enumerate(students, start=1):
        ws.append([
            i,
            student.last_name,
            student.first_name,
            student.middle_name,
            str(student.birth_date) if student.birth_date else '',
            student.phone,
            student.email,
            student.get_status_display(),
            student.faculty.short_name,
            student.group.name if student.group else '',
        ])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="students.xlsx"'
    wb.save(response)
    return response
