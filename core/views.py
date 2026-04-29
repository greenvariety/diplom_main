import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.hashers import make_password, check_password as hash_check
from django.contrib import messages
from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden, JsonResponse
from django.db.models import Q, Count

from .models import (
    Institution, Faculty, Group, Student, Parent, StudentParent,
    Employee, Position, Subject, GroupSubjectEmployee,
    Document, User, DeleteRequest, AuditLog, FeedbackComment,
)
from .forms import (
    LoginForm, PlatformSetupForm, ForgotPasswordForm, ResetPasswordForm,
    InstitutionForm,
    FacultyForm, PositionForm, GroupForm,
    StudentForm, StudentFilterForm, StudentTransferForm,
    ParentForm, StudentParentForm,
    EmployeeForm, EmployeeSubjectAssignForm, SubjectForm, GroupSubjectEmployeeForm,
    DocumentForm, UserCreateForm, UserEditForm, PasswordChangeCustomForm,
    DeleteRequestForm, DeleteConfirmForm,
)
from .utils import (
    log_action, model_to_dict_safe, superadmin_required, admin_required,
    platform_owner_required, get_current_institution, generate_seed_phrase,
)


# ---------------------------------------------------------------------------
# Platform setup (first launch)
# ---------------------------------------------------------------------------

def setup_view(request):
    if User.objects.filter(role='platform_owner').exists():
        return redirect('login')

    form = PlatformSetupForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        seed = generate_seed_phrase()
        user = User.objects.create_user(
            username=form.cleaned_data['username'],
            password=form.cleaned_data['password'],
            role='platform_owner',
            display_name=form.cleaned_data['display_name'],
            seed_phrase_hash=make_password(seed),
            is_staff=True,
            is_superuser=True,
        )
        login(request, user)
        request.session['setup_seed'] = seed
        return redirect('setup-complete')

    return render(request, 'core/setup.html', {'form': form})


def setup_complete_view(request):
    seed = request.session.pop('setup_seed', None)
    if not seed:
        return redirect('institution-list')
    return render(request, 'core/setup_complete.html', {'seed': seed})


# ---------------------------------------------------------------------------
# Forgot / reset password
# ---------------------------------------------------------------------------

def forgot_password_view(request):
    form = ForgotPasswordForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        username = form.cleaned_data['username']
        seed_phrase = form.cleaned_data['seed_phrase'].strip()
        try:
            user = User.objects.get(username=username)
            if user.seed_phrase_hash and hash_check(seed_phrase, user.seed_phrase_hash):
                request.session['reset_user_id'] = user.pk
                return redirect('reset-password')
            else:
                form.add_error(None, 'Неверная сид-фраза или логин.')
        except User.DoesNotExist:
            form.add_error(None, 'Неверная сид-фраза или логин.')
    return render(request, 'core/forgot_password.html', {'form': form})


def reset_password_view(request):
    user_id = request.session.get('reset_user_id')
    if not user_id:
        return redirect('forgot-password')
    user = get_object_or_404(User, pk=user_id)
    form = ResetPasswordForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user.set_password(form.cleaned_data['new_password'])
        user.save()
        del request.session['reset_user_id']
        messages.success(request, 'Пароль успешно изменён. Войдите с новым паролем.')
        return redirect('login')
    return render(request, 'core/reset_password.html', {'form': form, 'user_obj': user})


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def login_view(request):
    if request.user.is_authenticated:
        if request.user.is_platform_owner:
            return redirect('institution-list')
        return redirect('dashboard')

    form = LoginForm(request, data=request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user = form.get_user()
        login(request, user)
        if user.is_platform_owner:
            return redirect('institution-list')
        return redirect('dashboard')
    return render(request, 'core/login.html', {'form': form})


@login_required
def logout_view(request):
    logout(request)
    return redirect('login')


# ---------------------------------------------------------------------------
# Institution management (platform_owner only)
# ---------------------------------------------------------------------------

@platform_owner_required
def institution_list(request):
    institutions = Institution.objects.annotate(
        user_count=Count('users', distinct=True),
        faculty_count=Count('faculties', distinct=True),
    )
    current_id = request.session.get('institution_id')
    return render(request, 'core/institution_list.html', {
        'institutions': institutions,
        'current_id': current_id,
    })


@platform_owner_required
def institution_add(request):
    form = InstitutionForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        institution = form.save(commit=False)
        institution.code = institution.code.upper()
        institution.save()
        admin_user = User.objects.create_user(
            username=form.cleaned_data['admin_username'],
            password=form.cleaned_data['admin_password'],
            role='superadmin',
            display_name=form.cleaned_data['admin_display_name'],
            institution=institution,
        )
        messages.success(
            request,
            f'Заведение «{institution.name}» создано. '
            f'Суперадмин: {admin_user.username}'
        )
        return redirect('institution-list')
    return render(request, 'core/institution_add.html', {'form': form})


@platform_owner_required
def institution_enter(request, pk):
    institution = get_object_or_404(Institution, pk=pk)
    request.session['institution_id'] = institution.pk
    return redirect('dashboard')


@platform_owner_required
def institution_exit(request):
    request.session.pop('institution_id', None)
    return redirect('institution-list')


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@login_required
def dashboard(request):
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')

    user = request.user
    context = {'institution': institution}

    if user.is_superadmin:
        context['total_faculties'] = Faculty.objects.filter(institution=institution).count()
        context['total_groups'] = Group.objects.filter(faculty__institution=institution).count()
        context['total_students'] = Student.objects.filter(faculty__institution=institution).count()
        context['total_employees'] = Employee.objects.filter(institution=institution).count()
        context['pending_requests'] = DeleteRequest.objects.filter(
            user__institution=institution, status='pending'
        ).count()
        context['recent_logs'] = AuditLog.objects.filter(
            user__institution=institution
        ).select_related('user')[:10]

    elif user.is_admin:
        context['total_faculties'] = Faculty.objects.filter(institution=institution).count()
        context['total_groups'] = Group.objects.filter(faculty__institution=institution).count()
        context['total_students'] = Student.objects.filter(faculty__institution=institution).count()
        context['total_employees'] = Employee.objects.filter(institution=institution).count()

    else:  # teacher
        if user.employee:
            my_groups = Group.objects.filter(
                Q(headteacher=user.employee) |
                Q(subject_assignments__employee=user.employee),
                faculty__institution=institution,
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
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    q = request.GET.get('q', '')
    faculties = Faculty.objects.filter(institution=institution).annotate(group_count=Count('groups'))
    if q:
        faculties = faculties.filter(
            Q(full_name__icontains=q) | Q(short_name__icontains=q)
        )
    return render(request, 'core/faculty_list.html', {'faculties': faculties, 'q': q})


@admin_required
def faculty_add(request):
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    form = FacultyForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        faculty = form.save(commit=False)
        faculty.institution = institution
        faculty.save()
        log_action(request.user, 'created', faculty, new_data=model_to_dict_safe(faculty))
        messages.success(request, f'Факультет «{faculty.short_name}» добавлен.')
        return redirect('faculty-list')
    return render(request, 'core/faculty_form.html', {'form': form, 'title': 'Добавить факультет'})


@admin_required
def faculty_edit(request, pk):
    institution = get_current_institution(request)
    faculty = get_object_or_404(Faculty, pk=pk, institution=institution)
    old_data = model_to_dict_safe(faculty)
    form = FacultyForm(request.POST or None, instance=faculty)
    if request.method == 'POST' and form.is_valid():
        updated = form.save(commit=False)
        updated.created_at = faculty.created_at
        updated.institution = institution
        updated.save()
        faculty = updated
        log_action(request.user, 'updated', faculty, old_data=old_data, new_data=model_to_dict_safe(faculty))
        messages.success(request, 'Факультет обновлён.')
        return redirect('faculty-list')
    return render(request, 'core/faculty_form.html', {
        'form': form, 'title': 'Редактировать факультет', 'object': faculty,
    })


@login_required
def faculty_detail(request, pk):
    institution = get_current_institution(request)
    faculty = get_object_or_404(Faculty, pk=pk, institution=institution)
    groups = Group.objects.filter(faculty=faculty).select_related('headteacher').annotate(
        student_count=Count('students')
    )
    return render(request, 'core/faculty_detail.html', {
        'faculty': faculty, 'groups': groups,
    })


@admin_required
def faculty_delete_request(request, pk):
    institution = get_current_institution(request)
    faculty = get_object_or_404(Faculty, pk=pk, institution=institution)
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
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    user = request.user
    q = request.GET.get('q', '')
    base_qs = Group.objects.filter(faculty__institution=institution)
    if user.is_admin:
        groups = base_qs.select_related('faculty', 'headteacher').annotate(
            student_count=Count('students')
        )
    else:
        if user.employee:
            groups = base_qs.filter(
                Q(headteacher=user.employee) |
                Q(subject_assignments__employee=user.employee)
            ).distinct().select_related('faculty', 'headteacher').annotate(
                student_count=Count('students')
            )
        else:
            groups = Group.objects.none()
    if q:
        groups = groups.filter(
            Q(faculty__short_name__icontains=q) |
            Q(faculty__full_name__icontains=q) |
            Q(year__icontains=q)
        )
    return render(request, 'core/group_list.html', {'groups': groups, 'q': q})


@admin_required
def group_add(request):
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    form = GroupForm(request.POST or None, institution=institution)
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
    institution = get_current_institution(request)
    group = get_object_or_404(Group, pk=pk, faculty__institution=institution)
    old_data = {'name': group.name, 'year': group.year, 'faculty': str(group.faculty)}
    form = GroupForm(request.POST or None, instance=group, institution=institution)
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
    institution = get_current_institution(request)
    user = request.user
    group = get_object_or_404(
        Group.objects.select_related('faculty', 'headteacher'),
        pk=pk, faculty__institution=institution
    )
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
    institution = get_current_institution(request)
    group = get_object_or_404(Group, pk=pk, faculty__institution=institution)
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
    institution = get_current_institution(request)
    group = get_object_or_404(Group, pk=pk, faculty__institution=institution)
    form = GroupSubjectEmployeeForm(request.POST or None, institution=institution)
    if request.method == 'POST' and form.is_valid():
        assignment = form.save(commit=False)
        assignment.group = group
        assignment.save()
        messages.success(request, 'Предмет добавлен в группу.')
        return redirect('group-detail', pk=pk)
    return render(request, 'core/group_subject_form.html', {'form': form, 'group': group})


@admin_required
def group_subject_delete(request, pk, assignment_pk):
    institution = get_current_institution(request)
    group = get_object_or_404(Group, pk=pk, faculty__institution=institution)
    assignment = get_object_or_404(GroupSubjectEmployee, pk=assignment_pk, group=group)
    assignment.delete()
    messages.success(request, 'Предмет удалён из группы.')
    return redirect('group-detail', pk=pk)


# ---------------------------------------------------------------------------
# Student
# ---------------------------------------------------------------------------

@login_required
def student_list(request):
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    user = request.user
    form = StudentFilterForm(request.GET, institution=institution)
    students = Student.objects.filter(
        faculty__institution=institution
    ).select_related('faculty', 'group', 'group__faculty')

    if user.is_teacher_role and user.employee:
        allowed_groups = Group.objects.filter(
            Q(headteacher=user.employee) | Q(subject_assignments__employee=user.employee),
            faculty__institution=institution,
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
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    form = StudentForm(request.POST or None, request.FILES or None, institution=institution)
    if request.method == 'POST' and form.is_valid():
        student = form.save()
        log_action(request.user, 'created', student, new_data=model_to_dict_safe(student))
        messages.success(request, 'Студент добавлен.')
        return redirect('student-detail', pk=student.pk)
    return render(request, 'core/student_form.html', {'form': form, 'title': 'Добавить студента'})


@login_required
def student_detail(request, pk):
    institution = get_current_institution(request)
    user = request.user
    student = get_object_or_404(
        Student.objects.select_related('faculty', 'group', 'group__faculty'),
        pk=pk, faculty__institution=institution
    )
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
    history = AuditLog.objects.filter(object_type='Student', object_id=pk).select_related('user')
    return render(request, 'core/student_detail.html', {
        'student': student, 'parents': parents, 'documents': documents, 'history': history,
    })


@admin_required
def student_edit(request, pk):
    institution = get_current_institution(request)
    student = get_object_or_404(Student, pk=pk, faculty__institution=institution)
    old_data = model_to_dict_safe(student)
    form = StudentForm(request.POST or None, request.FILES or None, instance=student, institution=institution)
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
    institution = get_current_institution(request)
    student = get_object_or_404(Student, pk=pk, faculty__institution=institution)
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
    institution = get_current_institution(request)
    student = get_object_or_404(Student, pk=pk, faculty__institution=institution)
    form = StudentParentForm(request.POST or None, institution=institution)
    if request.method == 'POST' and form.is_valid():
        sp = form.save(commit=False)
        sp.student = student
        sp.save()
        messages.success(request, 'Опекун привязан.')
        return redirect('student-detail', pk=pk)
    return render(request, 'core/student_parent_form.html', {'form': form, 'student': student})


@admin_required
def student_remove_parent(request, pk, sp_pk):
    institution = get_current_institution(request)
    student = get_object_or_404(Student, pk=pk, faculty__institution=institution)
    sp = get_object_or_404(StudentParent, pk=sp_pk, student=student)
    sp.delete()
    messages.success(request, 'Связь удалена.')
    return redirect('student-detail', pk=pk)


@admin_required
def student_transfer(request, pk):
    institution = get_current_institution(request)
    student = get_object_or_404(Student, pk=pk, faculty__institution=institution)
    old_data = model_to_dict_safe(student)
    form = StudentTransferForm(request.POST or None, institution=institution)
    if request.method == 'POST' and form.is_valid():
        new_faculty = form.cleaned_data['new_faculty']
        new_group = form.cleaned_data.get('new_group')
        reason = form.cleaned_data['reason']
        student.faculty = new_faculty
        student.group = new_group
        student.status = 'transferred'
        student.save()
        log_action(request.user, 'updated', student,
                   old_data=old_data,
                   new_data={**model_to_dict_safe(student), 'transfer_reason': reason})
        messages.success(request, 'Студент переведён.')
        return redirect('student-detail', pk=pk)
    return render(request, 'core/student_transfer.html', {'form': form, 'student': student})


# ---------------------------------------------------------------------------
# Parent / Guardian
# ---------------------------------------------------------------------------

@admin_required
def parent_list(request):
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    q = request.GET.get('q', '')
    parents = Parent.objects.filter(institution=institution)
    if q:
        parents = parents.filter(
            Q(last_name__icontains=q) | Q(first_name__icontains=q) | Q(middle_name__icontains=q)
        )
    return render(request, 'core/parent_list.html', {'parents': parents, 'q': q})


@admin_required
def parent_add(request):
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    form = ParentForm(request.POST or None, request.FILES or None)
    if request.method == 'POST' and form.is_valid():
        parent = form.save(commit=False)
        parent.institution = institution
        parent.save()
        log_action(request.user, 'created', parent, new_data=model_to_dict_safe(parent))
        messages.success(request, 'Опекун добавлен.')
        return redirect('parent-list')
    return render(request, 'core/parent_form.html', {'form': form, 'title': 'Добавить опекуна'})


@admin_required
def parent_edit(request, pk):
    institution = get_current_institution(request)
    parent = get_object_or_404(Parent, pk=pk, institution=institution)
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
    institution = get_current_institution(request)
    parent = get_object_or_404(Parent, pk=pk, institution=institution)
    links = StudentParent.objects.filter(parent=parent).select_related('student')
    documents = Document.objects.filter(owner_type='parent', owner_id=pk)
    linked_ids = links.values_list('student_id', flat=True)
    available_students = Student.objects.filter(
        faculty__institution=institution
    ).exclude(pk__in=linked_ids)
    return render(request, 'core/parent_detail.html', {
        'parent': parent, 'links': links, 'documents': documents,
        'available_students': available_students,
    })


@admin_required
def guardian_add_student(request, pk):
    institution = get_current_institution(request)
    parent = get_object_or_404(Parent, pk=pk, institution=institution)
    if request.method == 'POST':
        student_id = request.POST.get('student')
        relation_type = request.POST.get('relation_type')
        if student_id and relation_type:
            student = get_object_or_404(Student, pk=student_id, faculty__institution=institution)
            StudentParent.objects.get_or_create(
                student=student, parent=parent,
                defaults={'relation_type': relation_type}
            )
            messages.success(request, 'Студент привязан.')
    return redirect('parent-detail', pk=pk)


@admin_required
def parent_delete_request(request, pk):
    institution = get_current_institution(request)
    parent = get_object_or_404(Parent, pk=pk, institution=institution)
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
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    q = request.GET.get('q', '')
    employees = Employee.objects.filter(institution=institution).select_related('position')
    if q:
        employees = employees.filter(
            Q(last_name__icontains=q) | Q(first_name__icontains=q) | Q(middle_name__icontains=q)
        )
    return render(request, 'core/employee_list.html', {'employees': employees, 'q': q})


@admin_required
def employee_add(request):
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    form = EmployeeForm(request.POST or None, request.FILES or None, institution=institution)
    if request.method == 'POST' and form.is_valid():
        employee = form.save(commit=False)
        employee.institution = institution
        employee.save()
        log_action(request.user, 'created', employee, new_data=model_to_dict_safe(employee))
        messages.success(request, 'Сотрудник добавлен.')
        return redirect('employee-detail', pk=employee.pk)
    no_positions = not Position.objects.filter(institution=institution).exists()
    return render(request, 'core/employee_form.html', {
        'form': form, 'title': 'Добавить сотрудника', 'no_positions': no_positions,
    })


@admin_required
def employee_detail(request, pk):
    institution = get_current_institution(request)
    employee = get_object_or_404(Employee, pk=pk, institution=institution)
    groups = employee.headed_groups.filter(faculty__institution=institution).select_related('faculty')
    subjects = employee.subject_assignments.select_related('group', 'group__faculty', 'subject')
    documents = Document.objects.filter(owner_type='employee', owner_id=pk)
    return render(request, 'core/employee_detail.html', {
        'employee': employee, 'groups': groups, 'subjects': subjects, 'documents': documents,
    })


@admin_required
def employee_edit(request, pk):
    institution = get_current_institution(request)
    employee = get_object_or_404(Employee, pk=pk, institution=institution)
    old_data = model_to_dict_safe(employee)
    form = EmployeeForm(request.POST or None, request.FILES or None, instance=employee, institution=institution)
    if request.method == 'POST' and form.is_valid():
        employee = form.save()
        log_action(request.user, 'updated', employee, old_data=old_data, new_data=model_to_dict_safe(employee))
        messages.success(request, 'Данные сотрудника обновлены.')
        return redirect('employee-detail', pk=employee.pk)
    return render(request, 'core/employee_form.html', {
        'form': form, 'title': 'Редактировать сотрудника', 'object': employee,
    })


@admin_required
def employee_subject_assign(request, pk):
    institution = get_current_institution(request)
    employee = get_object_or_404(Employee, pk=pk, institution=institution)
    form = EmployeeSubjectAssignForm(request.POST or None, institution=institution)
    if request.method == 'POST' and form.is_valid():
        group = form.cleaned_data['group']
        subject = form.cleaned_data['subject']
        assignment, created = GroupSubjectEmployee.objects.get_or_create(
            group=group, subject=subject,
            defaults={'employee': employee},
        )
        if not created:
            assignment.employee = employee
            assignment.save()
        messages.success(request, f'Предмет «{subject}» назначен в группу {group.name}.')
        return redirect('employee-detail', pk=pk)
    return render(request, 'core/employee_subject_assign.html', {'form': form, 'employee': employee})


@admin_required
def employee_delete_request(request, pk):
    institution = get_current_institution(request)
    employee = get_object_or_404(Employee, pk=pk, institution=institution)
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
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    q = request.GET.get('q', '')
    positions = Position.objects.filter(institution=institution)
    if q:
        positions = positions.filter(name__icontains=q)
    return render(request, 'core/position_list.html', {'positions': positions, 'q': q})


@superadmin_required
def position_add(request):
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    form = PositionForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        position = form.save(commit=False)
        position.institution = institution
        position.save()
        log_action(request.user, 'created', position, new_data=model_to_dict_safe(position))
        messages.success(request, 'Должность добавлена.')
        return redirect('position-list')
    return render(request, 'core/position_form.html', {'form': form, 'title': 'Добавить должность'})


@superadmin_required
def position_edit(request, pk):
    institution = get_current_institution(request)
    position = get_object_or_404(Position, pk=pk, institution=institution)
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
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    q = request.GET.get('q', '')
    subjects = Subject.objects.filter(institution=institution)
    if q:
        subjects = subjects.filter(name__icontains=q)
    total = subjects.count()
    return render(request, 'core/subject_list.html', {'subjects': subjects, 'q': q, 'total': total})


@admin_required
def subject_add(request):
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    form = SubjectForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        subject = form.save(commit=False)
        subject.institution = institution
        subject.save()
        messages.success(request, 'Предмет добавлен.')
        return redirect('subject-list')
    return render(request, 'core/subject_form.html', {'form': form, 'title': 'Добавить предмет'})


@admin_required
def subject_edit(request, pk):
    institution = get_current_institution(request)
    subject = get_object_or_404(Subject, pk=pk, institution=institution)
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
    institution = get_current_institution(request)
    subject = get_object_or_404(Subject, pk=pk, institution=institution)
    assignments = GroupSubjectEmployee.objects.filter(subject=subject).select_related(
        'group', 'group__faculty', 'employee', 'employee__position'
    )
    all_teachers = Employee.objects.filter(
        institution=institution, position__is_teacher=True
    ).select_related('position')
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
        name = form.cleaned_data['name']
        description = form.cleaned_data.get('description', '')
        uploaded = request.FILES.getlist('files')
        for f in uploaded:
            Document.objects.create(
                owner_type=owner_type,
                owner_id=owner_id,
                name=name,
                description=description,
                file=f,
            )
        messages.success(request, f'Загружено файлов: {len(uploaded)}.')
        return _redirect_to_owner(owner_type, owner_id)
    return render(request, 'core/document_form.html', {
        'form': form, 'owner_type': owner_type, 'owner_id': owner_id,
    })


@login_required
def document_detail(request, pk):
    doc = get_object_or_404(Document, pk=pk)
    return render(request, 'core/document_detail.html', {'doc': doc})


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
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    q = request.GET.get('q', '')
    users = User.objects.filter(institution=institution).select_related('employee')
    if q:
        users = users.filter(username__icontains=q)
    return render(request, 'core/user_list.html', {'users': users, 'q': q})


@superadmin_required
def user_add(request):
    institution = get_current_institution(request)
    if institution is None:
        return redirect('institution-list')
    form = UserCreateForm(request.POST or None, institution=institution)
    if request.method == 'POST' and form.is_valid():
        user = form.save(commit=False)
        user.institution = institution
        user.save()
        log_action(request.user, 'created', user, new_data={'username': user.username, 'role': user.role})
        messages.success(request, 'Учётная запись создана.')
        return redirect('user-list')
    return render(request, 'core/user_form.html', {'form': form, 'title': 'Создать учётную запись'})


@superadmin_required
def user_edit(request, pk):
    institution = get_current_institution(request)
    user_obj = get_object_or_404(User, pk=pk, institution=institution)
    form = UserEditForm(request.POST or None, instance=user_obj, institution=institution)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Учётная запись обновлена.')
        return redirect('user-list')
    return render(request, 'core/user_form.html', {
        'form': form, 'title': 'Редактировать учётную запись', 'object': user_obj,
    })


@superadmin_required
def user_detail(request, pk):
    institution = get_current_institution(request)
    user_obj = get_object_or_404(User.objects.select_related('employee'), pk=pk, institution=institution)
    return render(request, 'core/user_detail.html', {'user_obj': user_obj})


@superadmin_required
def user_set_password(request, pk):
    institution = get_current_institution(request)
    user_obj = get_object_or_404(User, pk=pk, institution=institution)
    form = PasswordChangeCustomForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user_obj.set_password(form.cleaned_data['new_password'])
        user_obj.save()
        messages.success(request, 'Пароль изменён.')
        return redirect('user-list')
    return render(request, 'core/user_password_form.html', {'form': form, 'object': user_obj})


# ---------------------------------------------------------------------------
# Direct delete (superadmin only)
# ---------------------------------------------------------------------------

@superadmin_required
def direct_delete(request, object_type, pk):
    institution = get_current_institution(request)
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
        if not request.user.check_password(entered):
            messages.error(request, 'Неверный пароль.')
        else:
            old_data = model_to_dict_safe(obj)
            log_action(request.user, 'deleted', obj, old_data=old_data)
            obj.delete()
            messages.success(request, 'Объект удалён.')
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
# Delete requests
# ---------------------------------------------------------------------------

@superadmin_required
def delete_request_list(request):
    institution = get_current_institution(request)
    requests_qs = DeleteRequest.objects.filter(
        user__institution=institution, status='pending'
    ).select_related('user')
    return render(request, 'core/delete_request_list.html', {'requests': requests_qs})


@superadmin_required
def delete_request_approve(request, pk):
    institution = get_current_institution(request)
    dr = get_object_or_404(DeleteRequest, pk=pk, user__institution=institution)
    if dr.status != 'pending':
        messages.error(request, 'Заявка уже обработана.')
        return redirect('delete-request-list')

    form = DeleteConfirmForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        entered = form.cleaned_data['confirmation_password']
        if not request.user.check_password(entered):
            messages.error(request, 'Неверный пароль.')
            return render(request, 'core/delete_request_approve.html', {'form': form, 'dr': dr})
        _perform_delete(request.user, dr)
        dr.status = 'approved'
        dr.save()
        messages.success(request, 'Объект удалён.')
        return redirect('delete-request-list')

    return render(request, 'core/delete_request_approve.html', {'form': form, 'dr': dr})


@superadmin_required
def delete_request_reject(request, pk):
    institution = get_current_institution(request)
    dr = get_object_or_404(DeleteRequest, pk=pk, user__institution=institution)
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
    institution = get_current_institution(request)
    logs = AuditLog.objects.filter(
        user__institution=institution
    ).select_related('user')[:200]
    return render(request, 'core/audit_log.html', {'logs': logs})


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

@admin_required
def export_students(request):
    import openpyxl
    from openpyxl.styles import Font

    institution = get_current_institution(request)
    group_id = request.GET.get('group')
    faculty_id = request.GET.get('faculty')

    students = Student.objects.filter(
        faculty__institution=institution
    ).select_related('faculty', 'group', 'group__faculty')
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


# ---------------------------------------------------------------------------
# Feedback (dev tool)
# ---------------------------------------------------------------------------

def feedback_save(request):
    if request.method != 'POST':
        return JsonResponse({'ok': False}, status=405)
    data = json.loads(request.body)
    FeedbackComment.objects.create(
        page_url=data.get('page_url', '')[:500],
        selector=data.get('selector', ''),
        element_preview=data.get('element_preview', '')[:200],
        comment=data.get('comment', ''),
    )
    return JsonResponse({'ok': True})


@login_required
def feedback_delete(request, pk):
    if request.method == 'POST':
        FeedbackComment.objects.filter(pk=pk).delete()
    return redirect('feedback-list')


@login_required
def feedback_list(request):
    comments = FeedbackComment.objects.all()
    return render(request, 'core/feedback_list.html', {'comments': comments})


# ---------------------------------------------------------------------------
# Dev: reset database (superadmin only)
# ---------------------------------------------------------------------------

@login_required
def dev_reset_db(request):
    if request.method != 'POST' or not request.user.is_superadmin:
        return HttpResponseForbidden()
    institution = get_current_institution(request)
    AuditLog.objects.filter(user__institution=institution).delete()
    DeleteRequest.objects.filter(user__institution=institution).delete()
    GroupSubjectEmployee.objects.filter(group__faculty__institution=institution).delete()
    StudentParent.objects.filter(student__faculty__institution=institution).delete()
    Student.objects.filter(faculty__institution=institution).delete()
    Parent.objects.filter(institution=institution).delete()
    Employee.objects.filter(institution=institution).delete()
    Group.objects.filter(faculty__institution=institution).delete()
    Faculty.objects.filter(institution=institution).delete()
    Position.objects.filter(institution=institution).delete()
    Subject.objects.filter(institution=institution).delete()
    User.objects.filter(institution=institution).exclude(pk=request.user.pk).delete()
    messages.success(request, 'База данных заведения очищена.')
    return redirect('dashboard')
