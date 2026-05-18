import re
from django import forms
from django.contrib.auth.forms import AuthenticationForm
from .models import (
    Faculty, Group, Student, Parent, StudentParent,
    Employee, Position, Subject, GroupSubjectEmployee,
    Document, User, DeleteRequest, Institution,
)


def validate_password_strength(value):
    """Мин. 8 символов, только A-Z a-z 0-9 _ -, обязательно ≥1 латинская буква, ≥1 цифра и ≥1 спецсимвол (_ или -)."""
    if len(value) < 8:
        raise forms.ValidationError('Пароль должен содержать не менее 8 символов.')
    if not re.fullmatch(r'[A-Za-z0-9_\-]+', value):
        raise forms.ValidationError('Пароль может содержать только латинские буквы, цифры, _ и -.')
    if not re.search(r'[A-Za-z]', value):
        raise forms.ValidationError('Пароль должен содержать хотя бы одну латинскую букву.')
    if not re.search(r'[0-9]', value):
        raise forms.ValidationError('Пароль должен содержать хотя бы одну цифру.')
    if not re.search(r'[_\-]', value):
        raise forms.ValidationError('Пароль должен содержать хотя бы один спецсимвол (_ или -).')


def validate_cyrillic(value):
    """Только кириллица, пробелы и дефисы."""
    if value and not re.fullmatch(r'[А-ЯЁа-яё\s\-]+', value):
        raise forms.ValidationError('Допускается только кириллица.')


def validate_cyrillic_code(value):
    """Только кириллица без пробелов."""
    if value:
        if re.search(r'\s', value):
            raise forms.ValidationError('Код не должен содержать пробелы.')
        if not re.fullmatch(r'[А-ЯЁа-яё]+', value):
            raise forms.ValidationError('Код должен содержать только кириллицу.')


class LoginForm(AuthenticationForm):
    username = forms.CharField(label='Логин', widget=forms.TextInput(attrs={'class': 'form-control', 'autofocus': True}))
    password = forms.CharField(label='Пароль', widget=forms.PasswordInput(attrs={'class': 'form-control'}))


# ---------------------------------------------------------------------------
# Owner registration
# ---------------------------------------------------------------------------

class OwnerRegisterForm(forms.Form):
    username = forms.CharField(
        label='Логин', max_length=150,
        widget=forms.TextInput(attrs={'class': 'field-input', 'autofocus': True}),
    )
    display_name = forms.CharField(
        label='Ваше имя', max_length=150,
        widget=forms.TextInput(attrs={'class': 'field-input'}),
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
        if re.search(r'[А-ЯЁа-яё]', username):
            raise forms.ValidationError('Логин может содержать только латинские буквы, цифры и знаки _ и -.')
        if User.objects.filter(username=username).exists():
            raise forms.ValidationError('Этот логин уже занят.')
        return username

    def clean_display_name(self):
        name = self.cleaned_data['display_name']
        validate_cyrillic(name)
        return name

    def clean(self):
        cleaned = super().clean()
        p1 = cleaned.get('password')
        p2 = cleaned.get('password2')
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError('Пароли не совпадают.')
        return cleaned


# ---------------------------------------------------------------------------
# Recover password via seed phrase
# ---------------------------------------------------------------------------

class RecoverPasswordForm(forms.Form):
    username = forms.CharField(
        label='Логин', max_length=150,
        widget=forms.TextInput(attrs={'class': 'field-input', 'autofocus': True}),
    )
    word_1 = forms.CharField(label='Слово 1', max_length=50, widget=forms.TextInput(attrs={'class': 'field-input seed-word'}))
    word_2 = forms.CharField(label='Слово 2', max_length=50, widget=forms.TextInput(attrs={'class': 'field-input seed-word'}))
    word_3 = forms.CharField(label='Слово 3', max_length=50, widget=forms.TextInput(attrs={'class': 'field-input seed-word'}))
    word_4 = forms.CharField(label='Слово 4', max_length=50, widget=forms.TextInput(attrs={'class': 'field-input seed-word'}))
    word_5 = forms.CharField(label='Слово 5', max_length=50, widget=forms.TextInput(attrs={'class': 'field-input seed-word'}))
    word_6 = forms.CharField(label='Слово 6', max_length=50, widget=forms.TextInput(attrs={'class': 'field-input seed-word'}))
    word_7 = forms.CharField(label='Слово 7', max_length=50, widget=forms.TextInput(attrs={'class': 'field-input seed-word'}))
    word_8 = forms.CharField(label='Слово 8', max_length=50, widget=forms.TextInput(attrs={'class': 'field-input seed-word'}))
    word_9 = forms.CharField(label='Слово 9', max_length=50, widget=forms.TextInput(attrs={'class': 'field-input seed-word'}))
    word_10 = forms.CharField(label='Слово 10', max_length=50, widget=forms.TextInput(attrs={'class': 'field-input seed-word'}))
    word_11 = forms.CharField(label='Слово 11', max_length=50, widget=forms.TextInput(attrs={'class': 'field-input seed-word'}))
    word_12 = forms.CharField(label='Слово 12', max_length=50, widget=forms.TextInput(attrs={'class': 'field-input seed-word'}))
    new_password = forms.CharField(
        label='Новый пароль',
        widget=forms.PasswordInput(attrs={'class': 'field-input'}),
        validators=[validate_password_strength],
    )
    confirm_password = forms.CharField(
        label='Подтвердите пароль',
        widget=forms.PasswordInput(attrs={'class': 'field-input'}),
    )

    def clean(self):
        cleaned = super().clean()
        p1 = cleaned.get('new_password')
        p2 = cleaned.get('confirm_password')
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError('Пароли не совпадают.')
        return cleaned

    def get_phrase(self):
        words = [self.cleaned_data.get(f'word_{i}', '') for i in range(1, 13)]
        return ' '.join(w.strip().lower() for w in words)


# ---------------------------------------------------------------------------
# Organization
# ---------------------------------------------------------------------------

class OrganizationForm(forms.ModelForm):
    class Meta:
        model = Institution
        fields = ['code', 'name', 'notes']
        labels = {'code': 'Код', 'name': 'Полное название', 'notes': 'Заметки'}
        widgets = {
            'code': forms.TextInput(attrs={'class': 'form-control'}),
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

    def clean_code(self):
        value = self.cleaned_data.get('code', '')
        validate_cyrillic_code(value)
        return value

    def clean_name(self):
        value = self.cleaned_data.get('name', '')
        validate_cyrillic(value)
        return value


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

    def clean_full_name(self):
        value = self.cleaned_data.get('full_name', '')
        validate_cyrillic(value)
        return value

    def clean_short_name(self):
        value = self.cleaned_data.get('short_name', '')
        validate_cyrillic_code(value)
        return value


# ---------------------------------------------------------------------------
# Position
# ---------------------------------------------------------------------------

class PositionForm(forms.ModelForm):
    class Meta:
        model = Position
        fields = ['name']
        labels = {'name': 'Название должности'}
        widgets = {'name': forms.TextInput(attrs={'class': 'form-control'})}

    def clean_name(self):
        value = self.cleaned_data.get('name', '')
        validate_cyrillic(value)
        return value


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

    def clean_last_name(self):
        value = self.cleaned_data.get('last_name', '')
        validate_cyrillic(value)
        return value

    def clean_first_name(self):
        value = self.cleaned_data.get('first_name', '')
        validate_cyrillic(value)
        return value

    def clean_middle_name(self):
        value = self.cleaned_data.get('middle_name', '')
        validate_cyrillic(value)
        return value


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

    def clean_last_name(self):
        value = self.cleaned_data.get('last_name', '')
        validate_cyrillic(value)
        return value

    def clean_first_name(self):
        value = self.cleaned_data.get('first_name', '')
        validate_cyrillic(value)
        return value

    def clean_middle_name(self):
        value = self.cleaned_data.get('middle_name', '')
        validate_cyrillic(value)
        return value


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

    def clean_last_name(self):
        value = self.cleaned_data.get('last_name', '')
        validate_cyrillic(value)
        return value

    def clean_first_name(self):
        value = self.cleaned_data.get('first_name', '')
        validate_cyrillic(value)
        return value

    def clean_middle_name(self):
        value = self.cleaned_data.get('middle_name', '')
        validate_cyrillic(value)
        return value


# ---------------------------------------------------------------------------
# Subject
# ---------------------------------------------------------------------------

class SubjectForm(forms.ModelForm):
    class Meta:
        model = Subject
        fields = ['name']
        labels = {'name': 'Название предмета'}
        widgets = {'name': forms.TextInput(attrs={'class': 'form-control'})}

    def clean_name(self):
        value = self.cleaned_data.get('name', '')
        validate_cyrillic(value)
        return value


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
        widget=forms.TextInput(attrs={'class': 'form-control'})
    )
    description = forms.CharField(
        label='Описание', required=False,
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 2})
    )
    files = forms.FileField(
        label='Файлы',
        widget=forms.ClearableFileInput(attrs={'class': 'form-control', 'multiple': True}),
    )

    def clean_name(self):
        value = self.cleaned_data.get('name', '')
        validate_cyrillic(value)
        return value


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

INSTITUTION_ROLE_CHOICES = [
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

    def clean_username(self):
        username = self.cleaned_data.get('username', '')
        if re.search(r'[А-ЯЁа-яё]', username):
            raise forms.ValidationError('Логин может содержать только латинские буквы, цифры и знаки _ и -.')
        return username

    def clean_display_name(self):
        value = self.cleaned_data.get('display_name', '')
        validate_cyrillic(value)
        return value

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

    def clean_username(self):
        username = self.cleaned_data['username']
        if re.search(r'[А-ЯЁа-яё]', username):
            raise forms.ValidationError('Логин может содержать только латинские буквы, цифры и знаки _ и -.')
        qs = User.objects.filter(username=username)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise forms.ValidationError('Этот логин уже занят.')
        return username

    def clean_display_name(self):
        value = self.cleaned_data.get('display_name', '')
        validate_cyrillic(value)
        return value


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


