import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse, HttpResponseForbidden, JsonResponse
from django.db.models import Q, Count

from .models import (
    Institution, Faculty, Group, Student, Parent, StudentParent,
    Employee, Position, Subject, GroupSubjectEmployee,
    Document, User, DeleteRequest, AuditLog, FeedbackComment, SeedPhrase,
)
from .forms import (
    LoginForm, OwnerRegisterForm, RecoverPasswordForm, OrganizationForm,
    FacultyForm, PositionForm, GroupForm,
    StudentForm, StudentFilterForm, StudentTransferForm,
    ParentForm, StudentParentForm,
    EmployeeForm, EmployeeSubjectAssignForm, SubjectForm, GroupSubjectEmployeeForm,
    DocumentForm, UserCreateForm, UserEditForm, PasswordChangeCustomForm,
    DeleteRequestForm,
)
from .utils import (
    log_action, model_to_dict_safe, owner_required, admin_required,
    superadmin_required, get_institution_from_session,
    generate_seed_phrase, hash_seed_phrase, verify_seed_phrase,
)


def _get_institution_or_redirect(request):
    """Returns institution, or a redirect response if owner has no org selected."""
    institution = get_institution_from_session(request)
    if institution is None and request.user.is_owner:
        return None
    return institution


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def login_view(request):
    if request.user.is_authenticated:
        if request.user.is_owner:
            return redirect('organization-list')
        return redirect('dashboard')

    form = LoginForm(request, data=request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user = form.get_user()
        login(request, user)
        if user.is_owner:
            orgs = Institution.objects.filter(owner=user)
            if orgs.count() == 1:
                request.session['institution_id'] = orgs.first().pk
                return redirect('dashboard')
            return redirect('organization-list')
        return redirect('dashboard')
    return render(request, 'core/login.html', {'form': form})


@login_required
def logout_view(request):
    request.session.flush()
    logout(request)
    return redirect('login')


def register_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')

    form = OwnerRegisterForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user = User.objects.create_user(
            username=form.cleaned_data['username'],
            password=form.cleaned_data['password'],
            role='owner',
            display_name=form.cleaned_data['display_name'],
        )
        phrase = generate_seed_phrase()
        SeedPhrase.objects.create(user=user, phrase_hash=hash_seed_phrase(phrase))
        request.session['pending_phrase'] = phrase
        request.session['pending_user_id'] = user.pk
        return redirect('seed-phrase-show')

    return render(request, 'core/register.html', {'form': form})


def seed_phrase_show(request):
    phrase = request.session.get('pending_phrase')
    user_id = request.session.get('pending_user_id')
    if not phrase or not user_id:
        return redirect('login')

    if request.method == 'POST':
        del request.session['pending_phrase']
        del request.session['pending_user_id']
        user = get_object_or_404(User, pk=user_id)
        login(request, user)
        return redirect('organization-list')

    words = phrase.split()
    return render(request, 'core/seed_phrase_show.html', {'phrase': phrase, 'words': words})


def recover_password_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')

    form = RecoverPasswordForm(request.POST or None)
    error = None
    if request.method == 'POST' and form.is_valid():
        username = form.cleaned_data['username']
        try:
            user = User.objects.get(username=username, role='owner')
            phrase = form.get_phrase()
            if verify_seed_phrase(phrase, user.seed_phrase.phrase_hash):
                user.set_password(form.cleaned_data['new_password'])
                user.save()
                messages.success(request, 'Пароль успешно изменён. Войдите с новым паролем.')
                return redirect('login')
            else:
                error = 'Сид-фраза не совпадает.'
        except User.DoesNotExist:
            error = 'Пользователь с таким логином не найден.'
        except SeedPhrase.DoesNotExist:
            error = 'У этого пользователя нет сид-фразы.'

    return render(request, 'core/recover_password.html', {'form': form, 'error': error})


# ---------------------------------------------------------------------------
# Organization management (owner only)
# ---------------------------------------------------------------------------

@owner_required
def organization_list(request):
    orgs = Institution.objects.filter(owner=request.user)
    current_id = request.session.get('institution_id')
    return render(request, 'core/organization_list.html', {
        'orgs': orgs, 'current_id': current_id,
    })


@owner_required
def organization_add(request):
    form = OrganizationForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        org = form.save(commit=False)
        org.owner = request.user
        try:
            org.save()
            messages.success(request, f'Организация «{org.name}» создана.')
            return redirect('organization-list')
        except Exception:
            form.add_error('code', 'Организация с таким кодом уже существует.')
    return render(request, 'core/organization_form.html', {'form': form, 'title': 'Добавить организацию'})


@owner_required
def organization_switch(request, pk):
    org = get_object_or_404(Institution, pk=pk, owner=request.user)
    request.session['institution_id'] = org.pk
    return redirect('dashboard')


@owner_required
def organization_edit(request, pk):
    org = get_object_or_404(Institution, pk=pk, owner=request.user)
    form = OrganizationForm(request.POST or None, instance=org)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Организация обновлена.')
        return redirect('organization-list')
    return render(request, 'core/organization_form.html', {'form': form, 'title': 'Редактировать организацию', 'object': org})


@owner_required
def organization_delete(request, pk):
    org = get_object_or_404(Institution, pk=pk, owner=request.user)
    if request.method == 'POST':
        if request.session.get('institution_id') == org.pk:
            del request.session['institution_id']
        org.delete()
        messages.success(request, 'Организация удалена.')
        return redirect('organization-list')
    return render(request, 'core/organization_delete_confirm.html', {'org': org})


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@login_required
def dashboard(request):
    user = request.user

    if user.is_owner:
        institution = get_institution_from_session(request)
        if institution is None:
            return redirect('organization-list')
    else:
        institution = user.institution
        if institution is None:
            return HttpResponseForbidden('Организация не назначена')

    context = {'institution': institution}

    if user.is_owner or user.role == 'admin':
        context['total_faculties'] = Faculty.objects.filter(institution=institution).count()
        context['total_groups'] = Group.objects.filter(faculty__institution=institution).count()
        context['total_students'] = Student.objects.filter(faculty__institution=institution).count()
        context['total_employees'] = Employee.objects.filter(institution=institution).count()
        if user.is_owner:
            context['pending_requests'] = DeleteRequest.objects.filter(
                user__institution=institution, status='pending'
            ).count()
            context['recent_logs'] = AuditLog.objects.filter(
                Q(institution=institution) | Q(user__institution=institution)
            ).select_related('user').distinct()[:10]
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


def _institution_required(request):
    """Returns (institution, redirect_response). If redirect needed, institution is None."""
    if request.user.is_owner:
        institution = get_institution_from_session(request)
        if institution is None:
            return None, redirect('organization-list')
        return institution, None
    institution = request.user.institution
    if institution is None:
        return None, HttpResponseForbidden('Организация не назначена')
    return institution, None


# ---------------------------------------------------------------------------
# Faculty
# ---------------------------------------------------------------------------

@login_required
def faculty_list(request):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    q = request.GET.get('q', '')
    faculties = Faculty.objects.filter(institution=institution).annotate(group_count=Count('groups'))
    if q:
        faculties = faculties.filter(
            Q(full_name__icontains=q) | Q(short_name__icontains=q)
        )
    return render(request, 'core/faculty_list.html', {'faculties': faculties, 'q': q})


@admin_required
def faculty_add(request):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    form = FacultyForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        faculty = form.save(commit=False)
        faculty.institution = institution
        faculty.save()
        log_action(request.user, 'created', faculty, new_data=model_to_dict_safe(faculty), institution=institution)
        messages.success(request, f'Факультет «{faculty.short_name}» добавлен.')
        return redirect('faculty-list')
    return render(request, 'core/faculty_form.html', {'form': form, 'title': 'Добавить факультет'})


@admin_required
def faculty_edit(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    faculty = get_object_or_404(Faculty, pk=pk, institution=institution)
    old_data = model_to_dict_safe(faculty)
    form = FacultyForm(request.POST or None, instance=faculty)
    if request.method == 'POST' and form.is_valid():
        updated = form.save(commit=False)
        updated.created_at = faculty.created_at
        updated.institution = institution
        updated.save()
        faculty = updated
        log_action(request.user, 'updated', faculty, old_data=old_data, new_data=model_to_dict_safe(faculty), institution=institution)
        messages.success(request, 'Факультет обновлён.')
        return redirect('faculty-list')
    return render(request, 'core/faculty_form.html', {
        'form': form, 'title': 'Редактировать факультет', 'object': faculty,
    })


@login_required
def faculty_detail(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    faculty = get_object_or_404(Faculty, pk=pk, institution=institution)
    groups = Group.objects.filter(faculty=faculty).select_related('headteacher').annotate(
        student_count=Count('students')
    )
    return render(request, 'core/faculty_detail.html', {
        'faculty': faculty, 'groups': groups,
    })


@admin_required
def faculty_delete_request(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    faculty = get_object_or_404(Faculty, pk=pk, institution=institution)
    if request.user.is_owner:
        return redirect('direct-delete', object_type='Faculty', pk=pk)
    if request.method == 'POST':
        form = DeleteRequestForm(request.POST)
        if form.is_valid():
            dr = form.save(commit=False)
            dr.user = request.user
            dr.object_type = 'Faculty'
            dr.object_id = faculty.pk
            dr.save()
            messages.success(request, 'Заявка на удаление отправлена владельцу.')
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
    form = GroupForm(request.POST or None, institution=institution)
    if request.method == 'POST' and form.is_valid():
        group = form.save()
        log_action(request.user, 'created', group, new_data={
            'name': group.name, 'faculty': str(group.faculty), 'year': group.year,
        }, institution=institution)
        messages.success(request, f'Группа «{group.name}» создана.')
        return redirect('group-list')
    return render(request, 'core/group_form.html', {'form': form, 'title': 'Создать группу'})


@admin_required
def group_edit(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    group = get_object_or_404(Group, pk=pk, faculty__institution=institution)
    old_data = {'name': group.name, 'year': group.year, 'faculty': str(group.faculty)}
    form = GroupForm(request.POST or None, instance=group, institution=institution)
    if request.method == 'POST' and form.is_valid():
        group = form.save()
        log_action(request.user, 'updated', group, old_data=old_data, new_data={
            'name': group.name, 'year': group.year,
        }, institution=institution)
        messages.success(request, 'Группа обновлена.')
        return redirect('group-detail', pk=pk)
    return render(request, 'core/group_form.html', {
        'form': form, 'title': 'Редактировать группу', 'object': group,
    })


@login_required
def group_detail(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
    group = get_object_or_404(Group, pk=pk, faculty__institution=institution)
    if request.user.is_owner:
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
    form = StudentForm(request.POST or None, request.FILES or None, institution=institution)
    if request.method == 'POST' and form.is_valid():
        student = form.save()
        log_action(request.user, 'created', student, new_data=model_to_dict_safe(student), institution=institution)
        messages.success(request, 'Студент добавлен.')
        return redirect('student-detail', pk=student.pk)
    return render(request, 'core/student_form.html', {'form': form, 'title': 'Добавить студента'})


@login_required
def student_detail(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
    student = get_object_or_404(Student, pk=pk, faculty__institution=institution)
    old_data = model_to_dict_safe(student)
    form = StudentForm(request.POST or None, request.FILES or None, instance=student, institution=institution)
    if request.method == 'POST' and form.is_valid():
        student = form.save()
        log_action(request.user, 'updated', student, old_data=old_data, new_data=model_to_dict_safe(student), institution=institution)
        messages.success(request, 'Данные студента обновлены.')
        return redirect('student-detail', pk=student.pk)
    return render(request, 'core/student_form.html', {
        'form': form, 'title': 'Редактировать студента', 'object': student,
    })


@admin_required
def student_delete_request(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    student = get_object_or_404(Student, pk=pk, faculty__institution=institution)
    if request.user.is_owner:
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
    student = get_object_or_404(Student, pk=pk, faculty__institution=institution)
    sp = get_object_or_404(StudentParent, pk=sp_pk, student=student)
    sp.delete()
    messages.success(request, 'Связь удалена.')
    return redirect('student-detail', pk=pk)


@admin_required
def student_transfer(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
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
                   new_data={**model_to_dict_safe(student), 'transfer_reason': reason},
                   institution=institution)
        messages.success(request, 'Студент переведён.')
        return redirect('student-detail', pk=pk)
    return render(request, 'core/student_transfer.html', {'form': form, 'student': student})


# ---------------------------------------------------------------------------
# Parent / Guardian
# ---------------------------------------------------------------------------

@admin_required
def parent_list(request):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    q = request.GET.get('q', '')
    parents = Parent.objects.filter(institution=institution)
    if q:
        parents = parents.filter(
            Q(last_name__icontains=q) | Q(first_name__icontains=q) | Q(middle_name__icontains=q)
        )
    return render(request, 'core/parent_list.html', {'parents': parents, 'q': q})


@admin_required
def parent_add(request):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    form = ParentForm(request.POST or None, request.FILES or None)
    if request.method == 'POST' and form.is_valid():
        parent = form.save(commit=False)
        parent.institution = institution
        parent.save()
        log_action(request.user, 'created', parent, new_data=model_to_dict_safe(parent), institution=institution)
        messages.success(request, 'Опекун добавлен.')
        return redirect('parent-list')
    return render(request, 'core/parent_form.html', {'form': form, 'title': 'Добавить опекуна'})


@admin_required
def parent_edit(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    parent = get_object_or_404(Parent, pk=pk, institution=institution)
    old_data = model_to_dict_safe(parent)
    form = ParentForm(request.POST or None, request.FILES or None, instance=parent)
    if request.method == 'POST' and form.is_valid():
        parent = form.save()
        log_action(request.user, 'updated', parent, old_data=old_data, new_data=model_to_dict_safe(parent), institution=institution)
        messages.success(request, 'Данные обновлены.')
        return redirect('parent-detail', pk=pk)
    return render(request, 'core/parent_form.html', {
        'form': form, 'title': 'Редактировать опекуна', 'object': parent,
    })


@admin_required
def parent_detail(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
    parent = get_object_or_404(Parent, pk=pk, institution=institution)
    if request.user.is_owner:
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
    q = request.GET.get('q', '')
    employees = Employee.objects.filter(institution=institution).select_related('position')
    if q:
        employees = employees.filter(
            Q(last_name__icontains=q) | Q(first_name__icontains=q) | Q(middle_name__icontains=q)
        )
    return render(request, 'core/employee_list.html', {'employees': employees, 'q': q})


@admin_required
def employee_add(request):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    form = EmployeeForm(request.POST or None, request.FILES or None, institution=institution)
    if request.method == 'POST' and form.is_valid():
        employee = form.save(commit=False)
        employee.institution = institution
        employee.save()
        log_action(request.user, 'created', employee, new_data=model_to_dict_safe(employee), institution=institution)
        messages.success(request, 'Сотрудник добавлен.')
        return redirect('employee-detail', pk=employee.pk)
    no_positions = not Position.objects.filter(institution=institution).exists()
    return render(request, 'core/employee_form.html', {
        'form': form, 'title': 'Добавить сотрудника', 'no_positions': no_positions,
    })


@admin_required
def employee_detail(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    employee = get_object_or_404(Employee, pk=pk, institution=institution)
    groups = employee.headed_groups.filter(faculty__institution=institution).select_related('faculty')
    subjects = employee.subject_assignments.select_related('group', 'group__faculty', 'subject')
    documents = Document.objects.filter(owner_type='employee', owner_id=pk)
    return render(request, 'core/employee_detail.html', {
        'employee': employee, 'groups': groups, 'subjects': subjects, 'documents': documents,
    })


@admin_required
def employee_edit(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    employee = get_object_or_404(Employee, pk=pk, institution=institution)
    old_data = model_to_dict_safe(employee)
    form = EmployeeForm(request.POST or None, request.FILES or None, instance=employee, institution=institution)
    if request.method == 'POST' and form.is_valid():
        employee = form.save()
        log_action(request.user, 'updated', employee, old_data=old_data, new_data=model_to_dict_safe(employee), institution=institution)
        messages.success(request, 'Данные сотрудника обновлены.')
        return redirect('employee-detail', pk=employee.pk)
    return render(request, 'core/employee_form.html', {
        'form': form, 'title': 'Редактировать сотрудника', 'object': employee,
    })


@admin_required
def employee_subject_assign(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
    employee = get_object_or_404(Employee, pk=pk, institution=institution)
    if request.user.is_owner:
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

@owner_required
def position_list(request):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    q = request.GET.get('q', '')
    positions = Position.objects.filter(institution=institution)
    if q:
        positions = positions.filter(name__icontains=q)
    return render(request, 'core/position_list.html', {'positions': positions, 'q': q})


@owner_required
def position_add(request):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    form = PositionForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        position = form.save(commit=False)
        position.institution = institution
        position.save()
        log_action(request.user, 'created', position, new_data=model_to_dict_safe(position), institution=institution)
        messages.success(request, 'Должность добавлена.')
        return redirect('position-list')
    return render(request, 'core/position_form.html', {'form': form, 'title': 'Добавить должность'})


@owner_required
def position_edit(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    position = get_object_or_404(Position, pk=pk, institution=institution)
    old_data = model_to_dict_safe(position)
    form = PositionForm(request.POST or None, instance=position)
    if request.method == 'POST' and form.is_valid():
        position = form.save()
        log_action(request.user, 'updated', position, old_data=old_data, new_data=model_to_dict_safe(position), institution=institution)
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
    institution, redir = _institution_required(request)
    if redir:
        return redir
    q = request.GET.get('q', '')
    subjects = Subject.objects.filter(institution=institution)
    if q:
        subjects = subjects.filter(name__icontains=q)
    total = subjects.count()
    return render(request, 'core/subject_list.html', {'subjects': subjects, 'q': q, 'total': total})


@admin_required
def subject_add(request):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    form = SubjectForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        subject = form.save(commit=False)
        subject.institution = institution
        subject.save()
        log_action(request.user, 'created', subject, new_data=model_to_dict_safe(subject), institution=institution)
        messages.success(request, 'Предмет добавлен.')
        return redirect('subject-list')
    return render(request, 'core/subject_form.html', {'form': form, 'title': 'Добавить предмет'})


@admin_required
def subject_edit(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    subject = get_object_or_404(Subject, pk=pk, institution=institution)
    old_data = model_to_dict_safe(subject)
    form = SubjectForm(request.POST or None, instance=subject)
    if request.method == 'POST' and form.is_valid():
        subject = form.save()
        log_action(request.user, 'updated', subject, old_data=old_data, new_data=model_to_dict_safe(subject), institution=institution)
        messages.success(request, 'Предмет обновлён.')
        return redirect('subject-detail', pk=pk)
    return render(request, 'core/subject_form.html', {
        'form': form, 'title': 'Редактировать предмет', 'object': subject,
    })


@admin_required
def subject_detail(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    subject = get_object_or_404(Subject, pk=pk, institution=institution)
    assignments = GroupSubjectEmployee.objects.filter(subject=subject).select_related(
        'group', 'group__faculty', 'employee', 'employee__position'
    )
    all_teachers = Employee.objects.filter(institution=institution).select_related('position')
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

@owner_required
def user_list(request):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    q = request.GET.get('q', '')
    users = User.objects.filter(institution=institution).select_related('employee')
    if q:
        users = users.filter(username__icontains=q)
    return render(request, 'core/user_list.html', {'users': users, 'q': q})


@owner_required
def user_add(request):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    form = UserCreateForm(request.POST or None, institution=institution)
    if request.method == 'POST' and form.is_valid():
        user = form.save(commit=False)
        user.institution = institution
        user.save()
        log_action(request.user, 'created', user, new_data={'username': user.username, 'role': user.role}, institution=institution)
        messages.success(request, 'Учётная запись создана.')
        return redirect('user-list')
    return render(request, 'core/user_form.html', {'form': form, 'title': 'Создать учётную запись'})


@owner_required
def user_edit(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    user_obj = get_object_or_404(User, pk=pk, institution=institution)
    form = UserEditForm(request.POST or None, instance=user_obj, institution=institution)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Учётная запись обновлена.')
        return redirect('user-list')
    return render(request, 'core/user_form.html', {
        'form': form, 'title': 'Редактировать учётную запись', 'object': user_obj,
    })


@owner_required
def user_detail(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    user_obj = get_object_or_404(User.objects.select_related('employee'), pk=pk, institution=institution)
    return render(request, 'core/user_detail.html', {'user_obj': user_obj})


@owner_required
def user_set_password(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    user_obj = get_object_or_404(User, pk=pk, institution=institution)
    form = PasswordChangeCustomForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user_obj.set_password(form.cleaned_data['new_password'])
        user_obj.save()
        messages.success(request, 'Пароль изменён.')
        return redirect('user-list')
    return render(request, 'core/user_password_form.html', {'form': form, 'object': user_obj})


# ---------------------------------------------------------------------------
# Direct delete (owner only)
# ---------------------------------------------------------------------------

@owner_required
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

    if request.method == 'POST':
        old_data = model_to_dict_safe(obj)
        institution, _ = _institution_required(request)
        Document.objects.filter(owner_type=object_type.lower(), owner_id=obj.pk).delete()
        log_action(request.user, 'deleted', obj, old_data=old_data, institution=institution)
        obj.delete()
        messages.success(request, 'Объект удалён.')
        return _redirect_after_delete(object_type)

    return render(request, 'core/direct_delete_confirm.html', {
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

@owner_required
def delete_request_list(request):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    requests_qs = DeleteRequest.objects.filter(
        user__institution=institution, status='pending'
    ).select_related('user')
    return render(request, 'core/delete_request_list.html', {'requests': requests_qs})


@owner_required
def delete_request_approve(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    dr = get_object_or_404(DeleteRequest, pk=pk, user__institution=institution)
    if dr.status != 'pending':
        messages.error(request, 'Заявка уже обработана.')
        return redirect('delete-request-list')

    if request.method == 'POST':
        _perform_delete(request.user, dr, institution)
        dr.status = 'approved'
        dr.save()
        messages.success(request, 'Объект удалён.')
        return redirect('delete-request-list')

    return render(request, 'core/delete_request_approve.html', {'dr': dr})


@owner_required
def delete_request_reject(request, pk):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    dr = get_object_or_404(DeleteRequest, pk=pk, user__institution=institution)
    dr.status = 'rejected'
    dr.save()
    messages.success(request, 'Заявка отклонена.')
    return redirect('delete-request-list')


def _perform_delete(user, dr, institution=None):
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
        Document.objects.filter(owner_type=dr.object_type.lower(), owner_id=obj.pk).delete()
        log_action(user, 'deleted', obj, old_data=old_data, institution=institution)
        obj.delete()
    except model_cls.DoesNotExist:
        pass


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

@owner_required
def audit_log(request):
    institution, redir = _institution_required(request)
    if redir:
        return redir
    logs = AuditLog.objects.filter(
        Q(institution=institution) | Q(user__institution=institution)
    ).select_related('user').distinct()[:200]
    return render(request, 'core/audit_log.html', {'logs': logs})


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

@admin_required
def export_students(request):
    import openpyxl
    from openpyxl.styles import Font

    institution, redir = _institution_required(request)
    if redir:
        return redir
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
# Dev: reset database (owner only)
# ---------------------------------------------------------------------------

@login_required
def dev_reset_db(request):
    if request.method != 'POST' or not request.user.is_owner:
        return HttpResponseForbidden()
    institution, redir = _institution_required(request)
    if redir:
        return redir
    AuditLog.objects.filter(Q(institution=institution) | Q(user__institution=institution)).delete()
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
    User.objects.filter(institution=institution).delete()
    messages.success(request, 'База данных заведения очищена.')
    return redirect('dashboard')
