from django import forms
from django.contrib.auth.forms import AuthenticationForm
from .models import (
    Faculty, Group, Student, Parent, StudentParent,
    Employee, Position, Subject, GroupSubjectEmployee,
    Document, User, DeleteRequest,
)


class LoginForm(AuthenticationForm):
    username = forms.CharField(label='Логин', widget=forms.TextInput(attrs={'class': 'form-control', 'autofocus': True}))
    password = forms.CharField(label='Пароль', widget=forms.PasswordInput(attrs={'class': 'form-control'}))


# ---------------------------------------------------------------------------
# Faculty
# ---------------------------------------------------------------------------

class FacultyForm(forms.ModelForm):
    class Meta:
        model = Faculty
        fields = ['name']
        labels = {'name': 'Название факультета'}
        widgets = {'name': forms.TextInput(attrs={'class': 'form-control'})}


# ---------------------------------------------------------------------------
# Position
# ---------------------------------------------------------------------------

class PositionForm(forms.ModelForm):
    class Meta:
        model = Position
        fields = ['name', 'is_teacher']
        labels = {'name': 'Название должности', 'is_teacher': 'Преподавательская'}
        widgets = {'name': forms.TextInput(attrs={'class': 'form-control'})}


# ---------------------------------------------------------------------------
# Group
# ---------------------------------------------------------------------------

class GroupForm(forms.ModelForm):
    class Meta:
        model = Group
        fields = ['name', 'year', 'faculty', 'headteacher']
        labels = {
            'name': 'Название группы',
            'year': 'Год набора',
            'faculty': 'Факультет',
            'headteacher': 'Классный руководитель',
        }
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'year': forms.NumberInput(attrs={'class': 'form-control'}),
            'faculty': forms.Select(attrs={'class': 'form-select'}),
            'headteacher': forms.Select(attrs={'class': 'form-select'}),
        }


# ---------------------------------------------------------------------------
# Student
# ---------------------------------------------------------------------------

class StudentForm(forms.ModelForm):
    class Meta:
        model = Student
        fields = [
            'last_name', 'first_name', 'middle_name',
            'birth_date', 'phone', 'email', 'photo',
            'status', 'faculty', 'group',
        ]
        labels = {
            'last_name': 'Фамилия',
            'first_name': 'Имя',
            'middle_name': 'Отчество',
            'birth_date': 'Дата рождения',
            'phone': 'Телефон',
            'email': 'Email',
            'photo': 'Фото',
            'status': 'Статус',
            'faculty': 'Факультет',
            'group': 'Группа',
        }
        widgets = {
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'middle_name': forms.TextInput(attrs={'class': 'form-control'}),
            'birth_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
            'faculty': forms.Select(attrs={'class': 'form-select'}),
            'group': forms.Select(attrs={'class': 'form-select'}),
        }


class StudentFilterForm(forms.Form):
    search = forms.CharField(
        required=False, label='Поиск по ФИО',
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Поиск по ФИО...'}),
    )
    faculty = forms.ModelChoiceField(
        queryset=Faculty.objects.all(), required=False, label='Факультет',
        empty_label='Все факультеты',
        widget=forms.Select(attrs={'class': 'form-select'}),
    )
    group = forms.ModelChoiceField(
        queryset=Group.objects.all(), required=False, label='Группа',
        empty_label='Все группы',
        widget=forms.Select(attrs={'class': 'form-select'}),
    )
    status = forms.ChoiceField(
        choices=[('', 'Все статусы')] + Student.STATUS_CHOICES,
        required=False, label='Статус',
        widget=forms.Select(attrs={'class': 'form-select'}),
    )


# ---------------------------------------------------------------------------
# Parent
# ---------------------------------------------------------------------------

class ParentForm(forms.ModelForm):
    class Meta:
        model = Parent
        fields = [
            'last_name', 'first_name', 'middle_name',
            'birth_date', 'phone', 'email', 'photo',
        ]
        labels = {
            'last_name': 'Фамилия',
            'first_name': 'Имя',
            'middle_name': 'Отчество',
            'birth_date': 'Дата рождения',
            'phone': 'Телефон',
            'email': 'Email',
            'photo': 'Фото',
        }
        widgets = {
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'middle_name': forms.TextInput(attrs={'class': 'form-control'}),
            'birth_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
        }


class StudentParentForm(forms.ModelForm):
    class Meta:
        model = StudentParent
        fields = ['parent', 'relation_type']
        labels = {'parent': 'Родитель / Опекун', 'relation_type': 'Тип связи'}
        widgets = {
            'parent': forms.Select(attrs={'class': 'form-select'}),
            'relation_type': forms.Select(attrs={'class': 'form-select'}),
        }


# ---------------------------------------------------------------------------
# Employee
# ---------------------------------------------------------------------------

class EmployeeForm(forms.ModelForm):
    class Meta:
        model = Employee
        fields = [
            'last_name', 'first_name', 'middle_name',
            'birth_date', 'phone', 'email', 'photo', 'position',
        ]
        labels = {
            'last_name': 'Фамилия',
            'first_name': 'Имя',
            'middle_name': 'Отчество',
            'birth_date': 'Дата рождения',
            'phone': 'Телефон',
            'email': 'Email',
            'photo': 'Фото',
            'position': 'Должность',
        }
        widgets = {
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'middle_name': forms.TextInput(attrs={'class': 'form-control'}),
            'birth_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'position': forms.Select(attrs={'class': 'form-select'}),
        }


# ---------------------------------------------------------------------------
# Subject
# ---------------------------------------------------------------------------

class SubjectForm(forms.ModelForm):
    class Meta:
        model = Subject
        fields = ['name']
        labels = {'name': 'Название предмета'}
        widgets = {'name': forms.TextInput(attrs={'class': 'form-control'})}


# ---------------------------------------------------------------------------
# GroupSubjectEmployee
# ---------------------------------------------------------------------------

class GroupSubjectEmployeeForm(forms.ModelForm):
    class Meta:
        model = GroupSubjectEmployee
        fields = ['subject', 'employee']
        labels = {'subject': 'Предмет', 'employee': 'Преподаватель'}
        widgets = {
            'subject': forms.Select(attrs={'class': 'form-select'}),
            'employee': forms.Select(attrs={'class': 'form-select'}),
        }


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------

class DocumentForm(forms.ModelForm):
    class Meta:
        model = Document
        fields = ['doc_type', 'file']
        labels = {'doc_type': 'Тип документа', 'file': 'Файл'}
        widgets = {
            'doc_type': forms.Select(attrs={'class': 'form-select'}),
        }


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

class UserCreateForm(forms.ModelForm):
    password = forms.CharField(
        label='Пароль', widget=forms.PasswordInput(attrs={'class': 'form-control'})
    )
    password_confirm = forms.CharField(
        label='Подтверждение пароля',
        widget=forms.PasswordInput(attrs={'class': 'form-control'}),
    )

    class Meta:
        model = User
        fields = ['username', 'role', 'employee']
        labels = {'username': 'Логин', 'role': 'Роль', 'employee': 'Сотрудник'}
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
            'role': forms.Select(attrs={'class': 'form-select'}),
            'employee': forms.Select(attrs={'class': 'form-select'}),
        }

    def clean(self):
        cleaned = super().clean()
        p1 = cleaned.get('password')
        p2 = cleaned.get('password_confirm')
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError('Пароли не совпадают')
        return cleaned

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password'])
        if commit:
            user.save()
        return user


class UserEditForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['username', 'role', 'employee']
        labels = {'username': 'Логин', 'role': 'Роль', 'employee': 'Сотрудник'}
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
            'role': forms.Select(attrs={'class': 'form-select'}),
            'employee': forms.Select(attrs={'class': 'form-select'}),
        }


class PasswordChangeCustomForm(forms.Form):
    new_password = forms.CharField(
        label='Новый пароль', widget=forms.PasswordInput(attrs={'class': 'form-control'})
    )
    confirm_password = forms.CharField(
        label='Подтверждение пароля', widget=forms.PasswordInput(attrs={'class': 'form-control'})
    )

    def clean(self):
        cleaned = super().clean()
        p1 = cleaned.get('new_password')
        p2 = cleaned.get('confirm_password')
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError('Пароли не совпадают')
        return cleaned


# ---------------------------------------------------------------------------
# DeleteRequest
# ---------------------------------------------------------------------------

class DeleteRequestForm(forms.ModelForm):
    class Meta:
        model = DeleteRequest
        fields = ['reason']
        labels = {'reason': 'Причина удаления'}
        widgets = {'reason': forms.Textarea(attrs={'class': 'form-control', 'rows': 3})}


class DeleteConfirmForm(forms.Form):
    confirmation_password = forms.CharField(
        label='Пароль подтверждения',
        widget=forms.PasswordInput(attrs={'class': 'form-control'}),
    )
