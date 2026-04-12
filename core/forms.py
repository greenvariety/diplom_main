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
        fields = ['full_name', 'short_name', 'created_at']
        labels = {
            'full_name': 'Полное название',
            'short_name': 'Сокращение (аббревиатура)',
            'created_at': 'Дата создания',
        }
        widgets = {
            'full_name': forms.TextInput(attrs={'class': 'form-control'}),
            'short_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'ИСИП'}),
            'created_at': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        }


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
# Group  (name is auto-generated, user only sets faculty + year + headteacher)
# ---------------------------------------------------------------------------

class GroupForm(forms.ModelForm):
    class Meta:
        model = Group
        fields = ['faculty', 'year', 'headteacher']
        labels = {
            'faculty': 'Факультет',
            'year': 'Год начала (напр. 2024)',
            'headteacher': 'Классный руководитель',
        }
        widgets = {
            'faculty': forms.Select(attrs={'class': 'form-select select2'}),
            'year': forms.NumberInput(attrs={'class': 'form-control', 'min': 2000, 'max': 2100}),
            'headteacher': forms.Select(attrs={'class': 'form-select select2'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['headteacher'].queryset = Employee.objects.select_related('position')
        self.fields['headteacher'].empty_label = '— Не назначен —'


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
            'last_name': 'Фамилия', 'first_name': 'Имя', 'middle_name': 'Отчество',
            'birth_date': 'Дата рождения', 'phone': 'Телефон', 'email': 'Email',
            'photo': 'Фото', 'status': 'Статус', 'faculty': 'Факультет', 'group': 'Группа',
        }
        widgets = {
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'middle_name': forms.TextInput(attrs={'class': 'form-control'}),
            'birth_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
            'faculty': forms.Select(attrs={'class': 'form-select select2'}),
            'group': forms.Select(attrs={'class': 'form-select select2'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['group'].queryset = Group.objects.select_related('faculty')
        self.fields['group'].empty_label = '— Без группы (абитуриент) —'


class StudentFilterForm(forms.Form):
    search = forms.CharField(
        required=False, label='Поиск по ФИО',
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Поиск по ФИО...'}),
    )
    faculty = forms.ModelChoiceField(
        queryset=Faculty.objects.all(), required=False, label='Факультет',
        empty_label='Все факультеты',
        widget=forms.Select(attrs={'class': 'form-select select2'}),
    )
    group = forms.ModelChoiceField(
        queryset=Group.objects.select_related('faculty'), required=False, label='Группа',
        empty_label='Все группы',
        widget=forms.Select(attrs={'class': 'form-select select2'}),
    )
    status = forms.ChoiceField(
        choices=[('', 'Все статусы')] + Student.STATUS_CHOICES,
        required=False, label='Статус',
        widget=forms.Select(attrs={'class': 'form-select'}),
    )


# ---------------------------------------------------------------------------
# Parent / Guardian
# ---------------------------------------------------------------------------

class ParentForm(forms.ModelForm):
    class Meta:
        model = Parent
        fields = ['last_name', 'first_name', 'middle_name', 'birth_date', 'phone', 'email', 'photo']
        labels = {
            'last_name': 'Фамилия', 'first_name': 'Имя', 'middle_name': 'Отчество',
            'birth_date': 'Дата рождения', 'phone': 'Телефон', 'email': 'Email', 'photo': 'Фото',
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
        labels = {'parent': 'Опекун / Родитель', 'relation_type': 'Тип связи'}
        widgets = {
            'parent': forms.Select(attrs={'class': 'form-select select2'}),
            'relation_type': forms.Select(attrs={'class': 'form-select'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['parent'].queryset = Parent.objects.all()


# ---------------------------------------------------------------------------
# Employee
# ---------------------------------------------------------------------------

class EmployeeForm(forms.ModelForm):
    class Meta:
        model = Employee
        fields = ['last_name', 'first_name', 'middle_name', 'birth_date', 'phone', 'email', 'photo', 'position']
        labels = {
            'last_name': 'Фамилия', 'first_name': 'Имя', 'middle_name': 'Отчество',
            'birth_date': 'Дата рождения', 'phone': 'Телефон', 'email': 'Email',
            'photo': 'Фото', 'position': 'Должность',
        }
        widgets = {
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'middle_name': forms.TextInput(attrs={'class': 'form-control'}),
            'birth_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'position': forms.Select(attrs={'class': 'form-select select2'}),
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
            'subject': forms.Select(attrs={'class': 'form-select select2'}),
            'employee': forms.Select(attrs={'class': 'form-select select2'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['employee'].queryset = Employee.objects.select_related('position')


# ---------------------------------------------------------------------------
# Subject teacher assignment (checkboxes on subject detail)
# ---------------------------------------------------------------------------

class SubjectTeacherForm(forms.Form):
    """Assign which employees teach this subject (across groups)."""
    employees = forms.ModelMultipleChoiceField(
        queryset=Employee.objects.none(),
        widget=forms.CheckboxSelectMultiple(),
        required=False,
        label='Преподаватели',
    )

    def __init__(self, *args, subject=None, group=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['employees'].queryset = Employee.objects.select_related('position').filter(
            position__is_teacher=True
        )


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------

class DocumentForm(forms.ModelForm):
    class Meta:
        model = Document
        fields = ['doc_type', 'file']
        labels = {'doc_type': 'Тип документа', 'file': 'Файл'}
        widgets = {'doc_type': forms.Select(attrs={'class': 'form-select'})}


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
            'employee': forms.Select(attrs={'class': 'form-select select2'}),
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
            'employee': forms.Select(attrs={'class': 'form-select select2'}),
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
