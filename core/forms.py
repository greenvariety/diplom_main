import re
from django import forms
from django.contrib.auth.forms import AuthenticationForm
from .models import (
    Institution, Faculty, Group, Student, Parent, StudentParent,
    Employee, Position, Subject, GroupSubjectEmployee,
    Document, User, DeleteRequest,
)


def validate_password_strength(value):
    """Мин. 8 символов, только A-Z a-z 0-9 _ -, обязательно ≥1 цифра и ≥1 спецсимвол (_ или -)."""
    if len(value) < 8:
        raise forms.ValidationError('Пароль должен содержать не менее 8 символов.')
    if not re.fullmatch(r'[A-Za-z0-9_\-]+', value):
        raise forms.ValidationError('Пароль может содержать только латинские буквы, цифры, _ и -.')
    if not re.search(r'[0-9]', value):
        raise forms.ValidationError('Пароль должен содержать хотя бы одну цифру.')
    if not re.search(r'[_\-]', value):
        raise forms.ValidationError('Пароль должен содержать хотя бы один спецсимвол (_ или -).')


class LoginForm(AuthenticationForm):
    username = forms.CharField(label='Логин', widget=forms.TextInput(attrs={'class': 'form-control', 'autofocus': True}))
    password = forms.CharField(label='Пароль', widget=forms.PasswordInput(attrs={'class': 'form-control'}))


# ---------------------------------------------------------------------------
# Platform setup
# ---------------------------------------------------------------------------

class PlatformSetupForm(forms.Form):
    display_name = forms.CharField(
        label='Ваше имя',
        max_length=150,
        widget=forms.TextInput(attrs={'class': 'field-input', 'autofocus': True, 'placeholder': 'Иванов Иван Иванович'}),
    )
    username = forms.CharField(
        label='Логин',
        max_length=150,
        widget=forms.TextInput(attrs={'class': 'field-input', 'placeholder': 'Используется для входа'}),
    )
    password = forms.CharField(
        label='Пароль',
        widget=forms.PasswordInput(attrs={'class': 'field-input'}),
        validators=[validate_password_strength],
    )
    password2 = forms.CharField(
        label='Повторите пароль',
        widget=forms.PasswordInput(attrs={'class': 'field-input'}),
    )

    def clean_username(self):
        username = self.cleaned_data['username']
        if User.objects.filter(username=username).exists():
            raise forms.ValidationError('Этот логин уже занят.')
        return username

    def clean(self):
        cleaned = super().clean()
        p1 = cleaned.get('password')
        p2 = cleaned.get('password2')
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError('Пароли не совпадают.')
        return cleaned


class ForgotPasswordForm(forms.Form):
    username = forms.CharField(
        label='Логин',
        widget=forms.TextInput(attrs={'class': 'field-input', 'autofocus': True}),
    )
    seed_phrase = forms.CharField(
        label='Сид-фраза (12 слов через пробел)',
        widget=forms.TextInput(attrs={'class': 'field-input', 'placeholder': 'слово слово слово … (12 слов)'}),
    )


class ResetPasswordForm(forms.Form):
    new_password = forms.CharField(
        label='Новый пароль',
        widget=forms.PasswordInput(attrs={'class': 'field-input'}),
        validators=[validate_password_strength],
    )
    new_password2 = forms.CharField(
        label='Повторите пароль',
        widget=forms.PasswordInput(attrs={'class': 'field-input'}),
    )

    def clean(self):
        cleaned = super().clean()
        p1 = cleaned.get('new_password')
        p2 = cleaned.get('new_password2')
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError('Пароли не совпадают.')
        return cleaned


# ---------------------------------------------------------------------------
# Institution
# ---------------------------------------------------------------------------

class InstitutionForm(forms.ModelForm):
    admin_display_name = forms.CharField(
        label='Имя суперадмина заведения',
        max_length=150,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Иванов Иван Иванович'}),
    )
    admin_username = forms.CharField(
        label='Логин суперадмина',
        max_length=150,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'director'}),
    )
    admin_password = forms.CharField(
        label='Пароль суперадмина',
        widget=forms.PasswordInput(attrs={'class': 'form-control'}),
        validators=[validate_password_strength],
    )

    class Meta:
        model = Institution
        fields = ['code', 'name', 'notes']
        labels = {
            'code': 'Код заведения',
            'name': 'Полное название',
            'notes': 'Заметки',
        }
        widgets = {
            'code': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'МКАГ'}),
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Московский колледж...'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

    def clean_admin_username(self):
        username = self.cleaned_data['admin_username']
        if User.objects.filter(username=username).exists():
            raise forms.ValidationError('Этот логин уже занят.')
        return username

    def clean_code(self):
        code = self.cleaned_data['code'].upper()
        qs = Institution.objects.filter(code=code)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise forms.ValidationError('Заведение с таким кодом уже существует.')
        return code


# ---------------------------------------------------------------------------
# Faculty
# ---------------------------------------------------------------------------

class FacultyForm(forms.ModelForm):
    class Meta:
        model = Faculty
        fields = ['full_name', 'short_name', 'created_at']
        labels = {
            'full_name': 'Полное название',
            'short_name': 'Код факультета',
            'created_at': 'Дата создания',
        }
        widgets = {
            'full_name': forms.TextInput(attrs={'class': 'form-control'}),
            'short_name': forms.TextInput(attrs={'class': 'form-control'}),
            'created_at': forms.DateInput(attrs={'class': 'form-control', 'type': 'date', 'required': False}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['created_at'].required = False


# ---------------------------------------------------------------------------
# Position
# ---------------------------------------------------------------------------

class PositionForm(forms.ModelForm):
    class Meta:
        model = Position
        fields = ['name']
        labels = {'name': 'Название должности'}
        widgets = {'name': forms.TextInput(attrs={'class': 'form-control'})}


# ---------------------------------------------------------------------------
# Group
# ---------------------------------------------------------------------------

class GroupForm(forms.ModelForm):
    class Meta:
        model = Group
        fields = ['faculty', 'year', 'headteacher']
        labels = {
            'faculty': 'Факультет',
            'year': 'Год начала',
            'headteacher': 'Классный руководитель',
        }
        widgets = {
            'faculty': forms.Select(attrs={'class': 'form-select select2'}),
            'year': forms.NumberInput(attrs={'class': 'form-control', 'min': 2000, 'max': 2100}),
            'headteacher': forms.Select(attrs={'class': 'form-select select2'}),
        }

    def __init__(self, *args, institution=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['faculty'].empty_label = 'Выберите факультет'
        self.fields['headteacher'].empty_label = 'Не назначен'
        if institution:
            self.fields['faculty'].queryset = Faculty.objects.filter(institution=institution)
            self.fields['headteacher'].queryset = Employee.objects.filter(institution=institution).select_related('position')
        else:
            self.fields['headteacher'].queryset = Employee.objects.select_related('position')

    def clean(self):
        cleaned = super().clean()
        faculty = cleaned.get('faculty')
        year = cleaned.get('year')
        if faculty and year and faculty.created_at:
            if year < faculty.created_at.year:
                raise forms.ValidationError(
                    f'Год начала группы ({year}) не может быть раньше года создания факультета '
                    f'({faculty.created_at.year}).'
                )
        return cleaned


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
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'tabindex': '1'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'tabindex': '2'}),
            'middle_name': forms.TextInput(attrs={'class': 'form-control', 'tabindex': '3'}),
            'birth_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date', 'tabindex': '4'}),
            'phone': forms.TextInput(attrs={'class': 'form-control', 'tabindex': '5'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'tabindex': '6'}),
            'status': forms.Select(attrs={'class': 'form-select', 'tabindex': '7'}),
            'faculty': forms.Select(attrs={'class': 'form-select select2', 'tabindex': '8'}),
            'group': forms.Select(attrs={'class': 'form-select select2', 'tabindex': '9'}),
        }

    def __init__(self, *args, institution=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['faculty'].empty_label = 'Выберите факультет'
        self.fields['group'].empty_label = 'Без группы (абитуриент)'
        if institution:
            self.fields['faculty'].queryset = Faculty.objects.filter(institution=institution)
            self.fields['group'].queryset = Group.objects.filter(
                faculty__institution=institution
            ).select_related('faculty')
        else:
            self.fields['group'].queryset = Group.objects.select_related('faculty')


class StudentFilterForm(forms.Form):
    search = forms.CharField(
        required=False, label='Поиск по ФИО',
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Поиск по ФИО...'}),
    )
    faculty = forms.ModelChoiceField(
        queryset=Faculty.objects.none(), required=False, label='Факультет',
        empty_label='Все факультеты',
        widget=forms.Select(attrs={'class': 'form-select select2'}),
    )
    group = forms.ModelChoiceField(
        queryset=Group.objects.none(), required=False, label='Группа',
        empty_label='Все группы',
        widget=forms.Select(attrs={'class': 'form-select select2'}),
    )
    status = forms.ChoiceField(
        choices=[('', 'Все статусы')] + Student.STATUS_CHOICES,
        required=False, label='Статус',
        widget=forms.Select(attrs={'class': 'form-select'}),
    )

    def __init__(self, *args, institution=None, **kwargs):
        super().__init__(*args, **kwargs)
        if institution:
            self.fields['faculty'].queryset = Faculty.objects.filter(institution=institution)
            self.fields['group'].queryset = Group.objects.filter(
                faculty__institution=institution
            ).select_related('faculty')
        else:
            self.fields['faculty'].queryset = Faculty.objects.all()
            self.fields['group'].queryset = Group.objects.select_related('faculty')


class StudentTransferForm(forms.Form):
    new_faculty = forms.ModelChoiceField(
        queryset=Faculty.objects.none(), label='Новый факультет',
        empty_label='Выберите факультет',
        widget=forms.Select(attrs={'class': 'form-select select2'}),
    )
    new_group = forms.ModelChoiceField(
        queryset=Group.objects.none(), required=False,
        label='Новая группа',
        empty_label='Без группы',
        widget=forms.Select(attrs={'class': 'form-select select2'}),
    )
    reason = forms.CharField(
        label='Причина перевода',
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
    )

    def __init__(self, *args, institution=None, **kwargs):
        super().__init__(*args, **kwargs)
        if institution:
            self.fields['new_faculty'].queryset = Faculty.objects.filter(institution=institution)
            self.fields['new_group'].queryset = Group.objects.filter(
                faculty__institution=institution
            ).select_related('faculty')
        else:
            self.fields['new_faculty'].queryset = Faculty.objects.all()
            self.fields['new_group'].queryset = Group.objects.select_related('faculty')


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

    def __init__(self, *args, institution=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['parent'].empty_label = 'Выберите опекуна'
        if institution:
            self.fields['parent'].queryset = Parent.objects.filter(institution=institution)
        else:
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

    def __init__(self, *args, institution=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['position'].empty_label = 'Выберите должность'
        if institution:
            self.fields['position'].queryset = Position.objects.filter(institution=institution)
        else:
            self.fields['position'].queryset = Position.objects.all()


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

    def __init__(self, *args, institution=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['subject'].empty_label = 'Выберите предмет'
        self.fields['employee'].empty_label = 'Выберите преподавателя'
        if institution:
            self.fields['subject'].queryset = Subject.objects.filter(institution=institution)
            self.fields['employee'].queryset = Employee.objects.filter(institution=institution).select_related('position')
        else:
            self.fields['employee'].queryset = Employee.objects.select_related('position')


# ---------------------------------------------------------------------------
# Employee subject assignment
# ---------------------------------------------------------------------------

class EmployeeSubjectAssignForm(forms.ModelForm):
    class Meta:
        model = GroupSubjectEmployee
        fields = ['group', 'subject']
        labels = {'group': 'Группа', 'subject': 'Предмет'}
        widgets = {
            'group': forms.Select(attrs={'class': 'form-select select2'}),
            'subject': forms.Select(attrs={'class': 'form-select select2'}),
        }

    def __init__(self, *args, institution=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['group'].empty_label = 'Выберите группу'
        self.fields['subject'].empty_label = 'Выберите предмет'
        if institution:
            self.fields['group'].queryset = Group.objects.filter(
                faculty__institution=institution
            ).select_related('faculty')
            self.fields['subject'].queryset = Subject.objects.filter(institution=institution)
        else:
            self.fields['group'].queryset = Group.objects.select_related('faculty')
            self.fields['subject'].queryset = Subject.objects.all()


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------

class DocumentForm(forms.Form):
    name = forms.CharField(
        label='Название документа',
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Например: Паспорт, Справка об обучении...'})
    )
    description = forms.CharField(
        label='Описание', required=False,
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 2, 'placeholder': 'Необязательно'})
    )
    files = forms.FileField(
        label='Файлы',
        widget=forms.ClearableFileInput(attrs={'class': 'form-control', 'multiple': True}),
    )


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

INSTITUTION_ROLE_CHOICES = [
    ('superadmin', 'Суперадминистратор'),
    ('admin', 'Администратор'),
    ('teacher', 'Преподаватель'),
]


class UserCreateForm(forms.ModelForm):
    password = forms.CharField(
        label='Пароль',
        widget=forms.PasswordInput(attrs={'class': 'form-control'}),
        validators=[validate_password_strength],
    )
    password_confirm = forms.CharField(
        label='Подтверждение пароля',
        widget=forms.PasswordInput(attrs={'class': 'form-control'}),
    )

    class Meta:
        model = User
        fields = ['username', 'display_name', 'role', 'employee']
        labels = {'username': 'Логин', 'display_name': 'Имя', 'role': 'Роль', 'employee': 'Сотрудник'}
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
            'display_name': forms.TextInput(attrs={'class': 'form-control'}),
            'role': forms.Select(attrs={'class': 'form-select'}),
            'employee': forms.Select(attrs={'class': 'form-select select2'}),
        }

    def __init__(self, *args, institution=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['role'].choices = INSTITUTION_ROLE_CHOICES
        self.fields['employee'].empty_label = 'Не привязан'
        if institution:
            self.fields['employee'].queryset = Employee.objects.filter(institution=institution)
        else:
            self.fields['employee'].queryset = Employee.objects.all()

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
        fields = ['username', 'display_name', 'role', 'employee']
        labels = {'username': 'Логин', 'display_name': 'Имя', 'role': 'Роль', 'employee': 'Сотрудник'}
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
            'display_name': forms.TextInput(attrs={'class': 'form-control'}),
            'role': forms.Select(attrs={'class': 'form-select'}),
            'employee': forms.Select(attrs={'class': 'form-select select2'}),
        }

    def __init__(self, *args, institution=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['role'].choices = INSTITUTION_ROLE_CHOICES
        self.fields['employee'].empty_label = 'Не привязан'
        if institution:
            self.fields['employee'].queryset = Employee.objects.filter(institution=institution)
        else:
            self.fields['employee'].queryset = Employee.objects.all()


class PasswordChangeCustomForm(forms.Form):
    new_password = forms.CharField(
        label='Новый пароль',
        widget=forms.PasswordInput(attrs={'class': 'form-control'}),
        validators=[validate_password_strength],
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
        label='Введите ваш пароль для подтверждения',
        widget=forms.PasswordInput(attrs={'class': 'form-control'}),
    )
