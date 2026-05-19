from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


# ---------------------------------------------------------------------------
# Institution (Учебное заведение)
# ---------------------------------------------------------------------------

class Institution(models.Model):
    owner = models.ForeignKey(
        'User', on_delete=models.CASCADE, null=True, blank=True,
        related_name='institutions', verbose_name='Владелец'
    )
    code = models.CharField(max_length=50, verbose_name='Код')
    name = models.CharField(max_length=1000, verbose_name='Полное название')
    description = models.TextField(max_length=5000, blank=True, verbose_name='Описание')
    photo = models.ImageField(upload_to='institutions/', null=True, blank=True, verbose_name='Фото')
    founded_date = models.DateField(null=True, blank=True, verbose_name='Дата основания')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата добавления в систему')

    class Meta:
        verbose_name = 'Учебное заведение'
        verbose_name_plural = 'Учебные заведения'
        ordering = ['name']
        unique_together = [('owner', 'code')]

    def __str__(self):
        return f'{self.code} - {self.name}'


# ---------------------------------------------------------------------------
# Faculty
# ---------------------------------------------------------------------------

class Faculty(models.Model):
    institution = models.ForeignKey(
        Institution, on_delete=models.CASCADE, null=True, blank=True,
        related_name='faculties', verbose_name='Учебное заведение'
    )
    full_name = models.CharField(max_length=255, verbose_name='Полное название')
    short_name = models.CharField(max_length=50, verbose_name='Сокращение (аббревиатура)')
    created_at = models.DateField(null=True, blank=True, verbose_name='Дата создания')

    class Meta:
        verbose_name = 'Факультет'
        verbose_name_plural = 'Факультеты'
        ordering = ['full_name']

    def __str__(self):
        return f'{self.full_name} ({self.short_name})'


# ---------------------------------------------------------------------------
# Position
# ---------------------------------------------------------------------------

class Position(models.Model):
    institution = models.ForeignKey(
        Institution, on_delete=models.CASCADE, null=True, blank=True,
        related_name='positions', verbose_name='Учебное заведение'
    )
    name = models.CharField(max_length=255, verbose_name='Название')

    class Meta:
        verbose_name = 'Должность'
        verbose_name_plural = 'Должности'
        ordering = ['name']

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Employee
# ---------------------------------------------------------------------------

class Employee(models.Model):
    institution = models.ForeignKey(
        Institution, on_delete=models.CASCADE, null=True, blank=True,
        related_name='employees', verbose_name='Учебное заведение'
    )
    last_name = models.CharField(max_length=100, verbose_name='Фамилия')
    first_name = models.CharField(max_length=100, verbose_name='Имя')
    middle_name = models.CharField(max_length=100, blank=True, verbose_name='Отчество')
    birth_date = models.DateField(null=True, blank=True, verbose_name='Дата рождения')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    email = models.EmailField(blank=True, verbose_name='Email')
    photo = models.ImageField(upload_to='employees/', null=True, blank=True, verbose_name='Фото')
    position = models.ForeignKey(
        Position, on_delete=models.PROTECT, null=True, blank=True,
        verbose_name='Должность'
    )

    class Meta:
        verbose_name = 'Сотрудник'
        verbose_name_plural = 'Сотрудники'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.last_name} {self.first_name} {self.middle_name}'.strip()

    def full_name(self):
        return f'{self.last_name} {self.first_name} {self.middle_name}'.strip()


# ---------------------------------------------------------------------------
# Group
# ---------------------------------------------------------------------------

class Group(models.Model):
    group_number = models.PositiveIntegerField(verbose_name='Номер группы', default=1)
    year = models.IntegerField(verbose_name='Год начала')
    faculty = models.ForeignKey(
        Faculty, on_delete=models.CASCADE, related_name='groups',
        verbose_name='Факультет'
    )
    headteacher = models.ForeignKey(
        Employee, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='headed_groups', verbose_name='Классный руководитель'
    )

    class Meta:
        verbose_name = 'Группа'
        verbose_name_plural = 'Группы'
        ordering = ['faculty', 'group_number']

    @property
    def name(self):
        year_short = str(self.year)[-2:]
        short = self.faculty.short_name if self.faculty_id else '?'
        return f'{short}-{self.group_number}-{year_short}'

    def save(self, *args, **kwargs):
        if not self.pk and self.faculty_id:
            count = Group.objects.filter(faculty_id=self.faculty_id).count()
            self.group_number = count + 1
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Student
# ---------------------------------------------------------------------------

class Student(models.Model):
    STATUS_CHOICES = [
        ('pending_review', 'На рассмотрении'),
        ('pending_enrollment', 'На зачисление'),
        ('enrolled', 'Зачислен'),
        ('pending_expulsion', 'На отчисление'),
        ('expelled', 'Отчислен'),
        ('transferred', 'Переведён'),
    ]

    last_name = models.CharField(max_length=100, verbose_name='Фамилия')
    first_name = models.CharField(max_length=100, verbose_name='Имя')
    middle_name = models.CharField(max_length=100, blank=True, verbose_name='Отчество')
    birth_date = models.DateField(null=True, blank=True, verbose_name='Дата рождения')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    email = models.EmailField(blank=True, verbose_name='Email')
    photo = models.ImageField(upload_to='students/', null=True, blank=True, verbose_name='Фото')
    status = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default='pending_review',
        verbose_name='Статус'
    )
    group = models.ForeignKey(
        Group, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='students', verbose_name='Группа'
    )
    faculty = models.ForeignKey(
        Faculty, on_delete=models.CASCADE, related_name='students',
        verbose_name='Факультет'
    )

    class Meta:
        verbose_name = 'Студент'
        verbose_name_plural = 'Студенты'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.last_name} {self.first_name} {self.middle_name}'.strip()

    def full_name(self):
        return f'{self.last_name} {self.first_name} {self.middle_name}'.strip()


# ---------------------------------------------------------------------------
# Parent / Guardian (Опекун)
# ---------------------------------------------------------------------------

class Parent(models.Model):
    institution = models.ForeignKey(
        Institution, on_delete=models.CASCADE, null=True, blank=True,
        related_name='parents', verbose_name='Учебное заведение'
    )
    last_name = models.CharField(max_length=100, verbose_name='Фамилия')
    first_name = models.CharField(max_length=100, verbose_name='Имя')
    middle_name = models.CharField(max_length=100, blank=True, verbose_name='Отчество')
    birth_date = models.DateField(null=True, blank=True, verbose_name='Дата рождения')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    email = models.EmailField(blank=True, verbose_name='Email')
    photo = models.ImageField(upload_to='parents/', null=True, blank=True, verbose_name='Фото')

    class Meta:
        verbose_name = 'Опекун'
        verbose_name_plural = 'Опекуны'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.last_name} {self.first_name} {self.middle_name}'.strip()

    def full_name(self):
        return f'{self.last_name} {self.first_name} {self.middle_name}'.strip()


# ---------------------------------------------------------------------------
# StudentParent
# ---------------------------------------------------------------------------

class StudentParent(models.Model):
    RELATION_CHOICES = [
        ('mother', 'Мать'),
        ('father', 'Отец'),
        ('guardian', 'Опекун'),
    ]

    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name='student_parents',
        verbose_name='Студент'
    )
    parent = models.ForeignKey(
        Parent, on_delete=models.CASCADE, related_name='student_parents',
        verbose_name='Опекун'
    )
    relation_type = models.CharField(
        max_length=20, choices=RELATION_CHOICES, verbose_name='Тип связи'
    )

    class Meta:
        verbose_name = 'Связь студент-опекун'
        verbose_name_plural = 'Связи студент-опекун'
        unique_together = [('student', 'parent')]

    def __str__(self):
        return f'{self.student} - {self.parent} ({self.get_relation_type_display()})'


# ---------------------------------------------------------------------------
# Subject
# ---------------------------------------------------------------------------

class Subject(models.Model):
    institution = models.ForeignKey(
        Institution, on_delete=models.CASCADE, null=True, blank=True,
        related_name='subjects', verbose_name='Учебное заведение'
    )
    name = models.CharField(max_length=255, verbose_name='Название')

    class Meta:
        verbose_name = 'Предмет'
        verbose_name_plural = 'Предметы'
        ordering = ['name']

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# GroupSubjectEmployee
# ---------------------------------------------------------------------------

class GroupSubjectEmployee(models.Model):
    group = models.ForeignKey(
        Group, on_delete=models.CASCADE, related_name='subject_assignments',
        verbose_name='Группа'
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name='group_assignments',
        verbose_name='Предмет'
    )
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name='subject_assignments',
        verbose_name='Преподаватель'
    )

    class Meta:
        verbose_name = 'Предмет в группе'
        verbose_name_plural = 'Предметы в группах'
        unique_together = [('group', 'subject')]

    def __str__(self):
        return f'{self.group} - {self.subject} - {self.employee}'


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------

class Document(models.Model):
    OWNER_TYPE_CHOICES = [
        ('student', 'Студент'),
        ('employee', 'Сотрудник'),
        ('parent', 'Опекун'),
    ]
    DOC_TYPE_CHOICES = [
        ('passport', 'Паспорт'),
        ('snils', 'СНИЛС'),
        ('policy', 'Полис ОМС'),
        ('certificate', 'Аттестат'),
        ('order', 'Приказ'),
        ('other', 'Прочее'),
    ]

    owner_type = models.CharField(
        max_length=20, choices=OWNER_TYPE_CHOICES, verbose_name='Тип владельца'
    )
    owner_id = models.IntegerField(verbose_name='ID владельца')
    name = models.CharField(max_length=255, default='', verbose_name='Название')
    description = models.TextField(blank=True, default='', verbose_name='Описание')
    doc_type = models.CharField(
        max_length=20, choices=DOC_TYPE_CHOICES, blank=True, default='', verbose_name='Тип документа'
    )
    file = models.FileField(upload_to='documents/', verbose_name='Файл')
    uploaded_at = models.DateField(auto_now_add=True, verbose_name='Дата загрузки')

    class Meta:
        verbose_name = 'Документ'
        verbose_name_plural = 'Документы'
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.name or self.get_doc_type_display() or f'Документ #{self.pk}'

    @property
    def is_image(self):
        return self.file.name.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp'))


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class UserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('Username is required')
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('role', 'owner')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('owner', 'Владелец'),
        ('admin', 'Администратор'),
        ('teacher', 'Преподаватель'),
    ]

    username = models.CharField(max_length=150, unique=True, verbose_name='Логин')
    display_name = models.CharField(max_length=150, blank=True, verbose_name='Имя')
    email = models.EmailField(blank=True, default='', verbose_name='Email')
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default='teacher', verbose_name='Роль'
    )
    institution = models.ForeignKey(
        Institution, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='users', verbose_name='Учебное заведение'
    )
    employee = models.OneToOneField(
        Employee, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='user_account', verbose_name='Сотрудник'
    )
    allowed_institutions = models.ManyToManyField(
        Institution, blank=True,
        related_name='allowed_users',
        verbose_name='Доступные организации'
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return f'{self.username} ({self.get_role_display()})'

    @property
    def is_owner(self):
        return self.role == 'owner'

    @property
    def is_superadmin(self):
        return self.role == 'owner'

    @property
    def is_admin(self):
        return self.role in ('owner', 'admin')

    @property
    def is_teacher_role(self):
        return self.role == 'teacher'


# ---------------------------------------------------------------------------
# EmailCode
# ---------------------------------------------------------------------------

class EmailCode(models.Model):
    PURPOSE_CHOICES = [
        ('register', 'Регистрация'),
        ('recover', 'Восстановление пароля'),
        ('delete_org', 'Удаление организации'),
    ]

    email = models.EmailField(verbose_name='Email')
    login = models.CharField(max_length=150, blank=True, default='', verbose_name='Логин')
    code = models.CharField(max_length=6, verbose_name='Код')
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, verbose_name='Цель')
    payload = models.TextField(blank=True, default='', verbose_name='Данные (JSON)')
    expires_at = models.DateTimeField(verbose_name='Истекает')
    used = models.BooleanField(default=False, verbose_name='Использован')
    attempts = models.IntegerField(default=0, verbose_name='Неверных попыток')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Email-код'
        verbose_name_plural = 'Email-коды'
        ordering = ['-created_at']

    def __str__(self):
        return f'EmailCode({self.purpose}, {self.email}, {self.code})'


# ---------------------------------------------------------------------------
# DeleteRequest
# ---------------------------------------------------------------------------

class DeleteRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Ожидает'),
        ('approved', 'Одобрено'),
        ('rejected', 'Отклонено'),
    ]
    OBJECT_TYPE_CHOICES = [
        ('Faculty', 'Факультет'),
        ('Group', 'Группа'),
        ('Student', 'Студент'),
        ('Employee', 'Сотрудник'),
        ('Parent', 'Опекун'),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='delete_requests',
        verbose_name='Инициатор'
    )
    object_type = models.CharField(
        max_length=50, choices=OBJECT_TYPE_CHOICES, verbose_name='Тип объекта'
    )
    object_id = models.IntegerField(verbose_name='ID объекта')
    reason = models.TextField(verbose_name='Причина')
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending',
        verbose_name='Статус'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    class Meta:
        verbose_name = 'Заявка на удаление'
        verbose_name_plural = 'Заявки на удаление'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.object_type} #{self.object_id} - {self.get_status_display()}'


# ---------------------------------------------------------------------------
# FeedbackComment
# ---------------------------------------------------------------------------

class FeedbackComment(models.Model):
    page_url = models.CharField(max_length=500, verbose_name='Страница')
    selector = models.TextField(verbose_name='CSS-селектор')
    element_preview = models.CharField(max_length=200, blank=True, verbose_name='Превью элемента')
    comment = models.TextField(verbose_name='Комментарий')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата')

    class Meta:
        verbose_name = 'Комментарий к интерфейсу'
        verbose_name_plural = 'Комментарии к интерфейсу'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.page_url} - {self.comment[:50]}'


# ---------------------------------------------------------------------------
# AuditLog
# ---------------------------------------------------------------------------

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('created', 'Создал'),
        ('updated', 'Изменил'),
        ('deleted', 'Удалил'),
    ]

    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='audit_logs',
        verbose_name='Пользователь'
    )
    institution = models.ForeignKey(
        Institution, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='audit_logs', verbose_name='Учебное заведение'
    )
    action = models.CharField(
        max_length=20, choices=ACTION_CHOICES, verbose_name='Действие'
    )
    object_type = models.CharField(max_length=50, verbose_name='Тип объекта')
    object_id = models.IntegerField(verbose_name='ID объекта')
    old_data = models.TextField(blank=True, verbose_name='До изменения (JSON)')
    new_data = models.TextField(blank=True, verbose_name='После изменения (JSON)')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата и время')

    class Meta:
        verbose_name = 'Запись журнала'
        verbose_name_plural = 'Журнал изменений'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} {self.get_action_display()} {self.object_type} #{self.object_id}'
