1) Убери типы должностей
2) при выходе из профиля пишет
TemplateSyntaxError at /login/
Unknown argument for 'include' tag: 'ignore'.
Request Method:	GET
Request URL:	http://127.0.0.1:8000/login/
Django Version:	4.2
Exception Type:	TemplateSyntaxError
Exception Value:	
Unknown argument for 'include' tag: 'ignore'.
Exception Location:	C:\Диплом\Программа\venv\Lib\site-packages\django\template\loader_tags.py, line 341, in do_include
Raised during:	core.views.login_view
Python Executable:	C:\Диплом\Программа\venv\Scripts\python.exe
Python Version:	3.14.4
Python Path:	
['C:\\Диплом\\Программа',
 'C:\\Users\\pushk\\AppData\\Local\\Python\\pythoncore-3.14-64\\python314.zip',
 'C:\\Users\\pushk\\AppData\\Local\\Python\\pythoncore-3.14-64\\DLLs',
 'C:\\Users\\pushk\\AppData\\Local\\Python\\pythoncore-3.14-64\\Lib',
 'C:\\Users\\pushk\\AppData\\Local\\Python\\pythoncore-3.14-64',
 'C:\\Диплом\\Программа\\venv',
 'C:\\Диплом\\Программа\\venv\\Lib\\site-packages']
Server time:	Sat, 09 May 2026 18:35:26 +0300
Error during template rendering
In template C:\Диплом\Программа\templates\core\login.html, error at line 175

Unknown argument for 'include' tag: 'ignore'.
165	                <strong style="color:var(--text)">Демо-доступы:</strong>
166	                <div style="margin-top:6px;display:grid;gap:3px;">
167	                    <div><code>superadmin</code> / <code>admin</code> / <code>teacher1</code></div>
168	                    <div style="color:var(--text-faint)">пароль: <code>password</code></div>
169	                </div>
170	            </div>
171	        </form>
172	    </div>
173	
174	</div>
175	{% include 'includes/feedback_widget.html' ignore missing %}
176	</body>
177	</html>
178	
Traceback Switch to copy-and-paste view
C:\Диплом\Программа\venv\Lib\site-packages\django\core\handlers\exception.py, line 55, in inner
                response = get_response(request)
                               ^^^^^^^^^^^^^^^^^^^^^ …
Local vars
C:\Диплом\Программа\venv\Lib\site-packages\django\core\handlers\base.py, line 197, in _get_response
                response = wrapped_callback(request, *callback_args, **callback_kwargs)
                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ …
Local vars
C:\Диплом\Программа\core\views.py, line 72, in login_view
    return render(request, 'core/login.html', {'form': form})
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ …
Local vars
C:\Диплом\Программа\venv\Lib\site-packages\django\shortcuts.py, line 24, in render
    content = loader.render_to_string(template_name, context, request, using=using)
                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ …
Local vars
C:\Диплом\Программа\venv\Lib\site-packages\django\template\loader.py, line 61, in render_to_string
        template = get_template(template_name, using=using)
                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ …
Local vars
C:\Диплом\Программа\venv\Lib\site-packages\django\template\loader.py, line 15, in get_template
            return engine.get_template(template_name)
                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ …
Local vars
C:\Диплом\Программа\venv\Lib\site-packages\django\template\backends\django.py, line 33, in get_template
            return Template(self.engine.get_template(template_name), self)
                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ …
Local vars
C:\Диплом\Программа\venv\Lib\site-packages\django\template\engine.py, line 175, in get_template
        template, origin = self.find_template(template_name)
                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ …
Local vars
C:\Диплом\Программа\venv\Lib\site-packages\django\template\engine.py, line 157, in find_template
                template = loader.get_template(name, skip=skip)
                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ …
Local vars
C:\Диплом\Программа\venv\Lib\site-packages\django\template\loaders\cached.py, line 57, in get_template
            template = super().get_template(template_name, skip)
                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ …
Local vars
C:\Диплом\Программа\venv\Lib\site-packages\django\template\loaders\base.py, line 28, in get_template
                return Template(
                            …
Local vars
C:\Диплом\Программа\venv\Lib\site-packages\django\template\base.py, line 154, in __init__
        self.nodelist = self.compile_nodelist()
                             ^^^^^^^^^^^^^^^^^^^^^^^ …
Local vars
C:\Диплом\Программа\venv\Lib\site-packages\django\template\base.py, line 200, in compile_nodelist
            return parser.parse()
                        ^^^^^^^^^^^^^^ …
Local vars
C:\Диплом\Программа\venv\Lib\site-packages\django\template\base.py, line 513, in parse
                    raise self.error(token, e)
                         ^^^^^^^^^^^^^^^^^^^^^^^^^^ …
Local vars
C:\Диплом\Программа\venv\Lib\site-packages\django\template\base.py, line 511, in parse
                    compiled_result = compile_func(self, token)
                                           ^^^^^^^^^^^^^^^^^^^^^^^^^ …
Local vars
C:\Диплом\Программа\venv\Lib\site-packages\django\template\loader_tags.py, line 341, in do_include
            raise TemplateSyntaxError(
                 ^ …
Local vars
Request information
USER
AnonymousUser

GET
No GET data

POST
No POST data

FILES
No FILES data

COOKIES
Variable	Value
csrftoken	
'********************'
META
Variable	Value
ALLUSERSPROFILE	
'C:\\ProgramData'
APPDATA	
'C:\\Users\\pushk\\AppData\\Roaming'
CHOICE	
'1'
COMMONPROGRAMFILES	
'C:\\Program Files\\Common Files'
COMMONPROGRAMFILES(X86)	
'C:\\Program Files (x86)\\Common Files'
COMMONPROGRAMW6432	
'C:\\Program Files\\Common Files'
COMPUTERNAME	
'GREEN_PC'
COMSPEC	
'C:\\WINDOWS\\system32\\cmd.exe'
CONTENT_LENGTH	
''
CONTENT_TYPE	
'text/plain'
CSRF_COOKIE	
'7CAx0qv80dzCh6isD7FCgnpwIlJDOwHY'
DJANGO_SETTINGS_MODULE	
'config.settings'
DOKANLIBRARY2	
'C:\\Program Files\\Dokan\\Dokan Library-2.3.1\\'
DOKANLIBRARY2_LIBRARYPATH_X64	
'C:\\Program Files\\Dokan\\Dokan Library-2.3.1\\lib\\'
DOKANLIBRARY2_LIBRARYPATH_X86	
'C:\\Program Files\\Dokan\\Dokan Library-2.3.1\\x86\\lib\\'
DRIVERDATA	
'C:\\Windows\\System32\\Drivers\\DriverData'
EFC_8896_1592913036	
'1'
EFC_8896_344590478	
'1'
FPS_BROWSER_APP_PROFILE_STRING	
'Internet Explorer'
FPS_BROWSER_USER_PROFILE_STRING	
'Default'
GATEWAY_INTERFACE	
'CGI/1.1'
HOMEDRIVE	
'C:'
HOMEPATH	
'\\Users\\pushk'
HTTP_ACCEPT	
'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'
HTTP_ACCEPT_ENCODING	
'gzip, deflate, br, zstd'
HTTP_ACCEPT_LANGUAGE	
'ru,en-US;q=0.9,en;q=0.8'
HTTP_CACHE_CONTROL	
'max-age=0'
HTTP_CONNECTION	
'keep-alive'
HTTP_COOKIE	
'********************'
HTTP_DNT	
'1'
HTTP_HOST	
'127.0.0.1:8000'
HTTP_REFERER	
'http://127.0.0.1:8000/users/1/'
HTTP_SEC_CH_UA	
'"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"'
HTTP_SEC_CH_UA_MOBILE	
'?0'
HTTP_SEC_CH_UA_PLATFORM	
'"Windows"'
HTTP_SEC_FETCH_DEST	
'document'
HTTP_SEC_FETCH_MODE	
'navigate'
HTTP_SEC_FETCH_SITE	
'same-origin'
HTTP_SEC_FETCH_USER	
'?1'
HTTP_SEC_GPC	
'1'
HTTP_UPGRADE_INSECURE_REQUESTS	
'1'
HTTP_USER_AGENT	
('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like '
 'Gecko) Chrome/147.0.0.0 Safari/537.36')
LOCALAPPDATA	
'C:\\Users\\pushk\\AppData\\Local'
LOGONSERVER	
'\\\\GREEN_PC'
NUMBER_OF_PROCESSORS	
'12'
ONEDRIVE	
'C:\\Users\\pushk\\OneDrive'
ONEDRIVECONSUMER	
'C:\\Users\\pushk\\OneDrive'
OS	
'Windows_NT'
PATH	
('C:\\WINDOWS\\system32;C:\\WINDOWS;C:\\WINDOWS\\System32\\Wbem;C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\;C:\\WINDOWS\\System32\\OpenSSH\\;C:\\Program '
 'Files\\dotnet\\;C:\\Program Files\\NVIDIA Corporation\\NVIDIA '
 'App\\NvDLISR;C:\\Program Files\\Git\\cmd;C:\\Program '
 'Files\\nodejs\\;C:\\Program Files (x86)\\NVIDIA '
 'Corporation\\PhysX\\Common;C:\\Program '
 'Files\\Docker\\Docker\\resources\\bin;C:\\Users\\pushk\\AppData\\Local\\Microsoft\\WindowsApps;C:\\Users\\pushk\\AppData\\Local\\PowerToys\\DSCModules\\;C:\\Users\\pushk\\AppData\\Local\\Programs\\Microsoft '
 'VS '
 'Code\\bin;C:\\Users\\pushk\\AppData\\Roaming\\npm;C:\\Users\\pushk\\AppData\\Local\\Python\\bin;C:\\Users\\pushk\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe;')
PATHEXT	
'.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC'
PATH_INFO	
'/login/'
PROCESSOR_ARCHITECTURE	
'AMD64'
PROCESSOR_IDENTIFIER	
'AMD64 Family 25 Model 33 Stepping 2, AuthenticAMD'
PROCESSOR_LEVEL	
'25'
PROCESSOR_REVISION	
'2102'
PROGRAMDATA	
'C:\\ProgramData'
PROGRAMFILES	
'C:\\Program Files'
PROGRAMFILES(X86)	
'C:\\Program Files (x86)'
PROGRAMW6432	
'C:\\Program Files'
PROMPT	
'$P$G'
PSMODULEPATH	
('C:\\Program '
 'Files\\WindowsPowerShell\\Modules;C:\\WINDOWS\\system32\\WindowsPowerShell\\v1.0\\Modules')
PUBLIC	
'C:\\Users\\Public'
QUERY_STRING	
''
REMOTE_ADDR	
'127.0.0.1'
REMOTE_HOST	
''
REQUEST_METHOD	
'GET'
RUN_MAIN	
'true'
SCRIPT_NAME	
''
SERVER_NAME	
'kubernetes.docker.internal'
SERVER_PORT	
'8000'
SERVER_PROTOCOL	
'HTTP/1.1'
SERVER_SOFTWARE	
'WSGIServer/0.2'
SESSIONNAME	
'Console'
SYSTEMDRIVE	
'C:'
SYSTEMROOT	
'C:\\WINDOWS'
TEMP	
'C:\\Users\\pushk\\AppData\\Local\\Temp'
TMP	
'C:\\Users\\pushk\\AppData\\Local\\Temp'
USERDOMAIN	
'GREEN_PC'
USERDOMAIN_ROAMINGPROFILE	
'GREEN_PC'
USERNAME	
'pushk'
USERPROFILE	
'C:\\Users\\pushk'
WINDIR	
'C:\\WINDOWS'
wsgi.errors	
<_io.TextIOWrapper name='<stderr>' mode='w' encoding='utf-8'>
wsgi.file_wrapper	
<class 'wsgiref.util.FileWrapper'>
wsgi.input	
<django.core.handlers.wsgi.LimitedStream object at 0x0000013E6BA77A30>
wsgi.multiprocess	
False
wsgi.multithread	
True
wsgi.run_once	
False
wsgi.url_scheme	
'http'
wsgi.version	
(1, 0)
Settings
Using settings module config.settings
Setting	Value
ABSOLUTE_URL_OVERRIDES	
{}
ADMINS	
[]
ALLOWED_HOSTS	
['*']
APPEND_SLASH	
True
AUTHENTICATION_BACKENDS	
['django.contrib.auth.backends.ModelBackend']
AUTH_PASSWORD_VALIDATORS	
'********************'
AUTH_USER_MODEL	
'core.User'
BASE_DIR	
WindowsPath('C:/Диплом/Программа')
CACHES	
{'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
CACHE_MIDDLEWARE_ALIAS	
'default'
CACHE_MIDDLEWARE_KEY_PREFIX	
'********************'
CACHE_MIDDLEWARE_SECONDS	
600
CRISPY_ALLOWED_TEMPLATE_PACKS	
'bootstrap5'
CRISPY_TEMPLATE_PACK	
'bootstrap5'
CSRF_COOKIE_AGE	
31449600
CSRF_COOKIE_DOMAIN	
None
CSRF_COOKIE_HTTPONLY	
False
CSRF_COOKIE_MASKED	
False
CSRF_COOKIE_NAME	
'csrftoken'
CSRF_COOKIE_PATH	
'/'
CSRF_COOKIE_SAMESITE	
'Lax'
CSRF_COOKIE_SECURE	
False
CSRF_FAILURE_VIEW	
'django.views.csrf.csrf_failure'
CSRF_HEADER_NAME	
'HTTP_X_CSRFTOKEN'
CSRF_TRUSTED_ORIGINS	
[]
CSRF_USE_SESSIONS	
False
DATABASES	
{'default': {'ATOMIC_REQUESTS': False,
             'AUTOCOMMIT': True,
             'CONN_HEALTH_CHECKS': False,
             'CONN_MAX_AGE': 0,
             'ENGINE': 'django.db.backends.sqlite3',
             'HOST': '',
             'NAME': WindowsPath('C:/Диплом/Программа/db.sqlite3'),
             'OPTIONS': {},
             'PASSWORD': '********************',
             'PORT': '',
             'TEST': {'CHARSET': None,
                      'COLLATION': None,
                      'MIGRATE': True,
                      'MIRROR': None,
                      'NAME': None},
             'TIME_ZONE': None,
             'USER': ''}}
DATABASE_ROUTERS	
[]
DATA_UPLOAD_MAX_MEMORY_SIZE	
2621440
DATA_UPLOAD_MAX_NUMBER_FIELDS	
1000
DATA_UPLOAD_MAX_NUMBER_FILES	
100
DATETIME_FORMAT	
'N j, Y, P'
DATETIME_INPUT_FORMATS	
['%Y-%m-%d %H:%M:%S',
 '%Y-%m-%d %H:%M:%S.%f',
 '%Y-%m-%d %H:%M',
 '%m/%d/%Y %H:%M:%S',
 '%m/%d/%Y %H:%M:%S.%f',
 '%m/%d/%Y %H:%M',
 '%m/%d/%y %H:%M:%S',
 '%m/%d/%y %H:%M:%S.%f',
 '%m/%d/%y %H:%M']
DATE_FORMAT	
'N j, Y'
DATE_INPUT_FORMATS	
['%Y-%m-%d',
 '%m/%d/%Y',
 '%m/%d/%y',
 '%b %d %Y',
 '%b %d, %Y',
 '%d %b %Y',
 '%d %b, %Y',
 '%B %d %Y',
 '%B %d, %Y',
 '%d %B %Y',
 '%d %B, %Y']
DEBUG	
True
DEBUG_PROPAGATE_EXCEPTIONS	
False
DECIMAL_SEPARATOR	
'.'
DEFAULT_AUTO_FIELD	
'django.db.models.BigAutoField'
DEFAULT_CHARSET	
'utf-8'
DEFAULT_EXCEPTION_REPORTER	
'django.views.debug.ExceptionReporter'
DEFAULT_EXCEPTION_REPORTER_FILTER	
'django.views.debug.SafeExceptionReporterFilter'
DEFAULT_FILE_STORAGE	
'django.core.files.storage.FileSystemStorage'
DEFAULT_FROM_EMAIL	
'webmaster@localhost'
DEFAULT_INDEX_TABLESPACE	
''
DEFAULT_TABLESPACE	
''
DELETE_CONFIRMATION_PASSWORD	
'********************'
DISALLOWED_USER_AGENTS	
[]
EMAIL_BACKEND	
'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST	
'localhost'
EMAIL_HOST_PASSWORD	
'********************'
EMAIL_HOST_USER	
''
EMAIL_PORT	
25
EMAIL_SSL_CERTFILE	
None
EMAIL_SSL_KEYFILE	
'********************'
EMAIL_SUBJECT_PREFIX	
'[Django] '
EMAIL_TIMEOUT	
None
EMAIL_USE_LOCALTIME	
False
EMAIL_USE_SSL	
False
EMAIL_USE_TLS	
False
FILE_UPLOAD_DIRECTORY_PERMISSIONS	
None
FILE_UPLOAD_HANDLERS	
['django.core.files.uploadhandler.MemoryFileUploadHandler',
 'django.core.files.uploadhandler.TemporaryFileUploadHandler']
FILE_UPLOAD_MAX_MEMORY_SIZE	
2621440
FILE_UPLOAD_PERMISSIONS	
420
FILE_UPLOAD_TEMP_DIR	
None
FIRST_DAY_OF_WEEK	
0
FIXTURE_DIRS	
[]
FORCE_SCRIPT_NAME	
None
FORMAT_MODULE_PATH	
None
FORM_RENDERER	
'django.forms.renderers.DjangoTemplates'
IGNORABLE_404_URLS	
[]
INSTALLED_APPS	
['django.contrib.admin',
 'django.contrib.auth',
 'django.contrib.contenttypes',
 'django.contrib.sessions',
 'django.contrib.messages',
 'django.contrib.staticfiles',
 'crispy_forms',
 'crispy_bootstrap5',
 'core']
INTERNAL_IPS	
[]
LANGUAGES	
[('af', 'Afrikaans'),
 ('ar', 'Arabic'),
 ('ar-dz', 'Algerian Arabic'),
 ('ast', 'Asturian'),
 ('az', 'Azerbaijani'),
 ('bg', 'Bulgarian'),
 ('be', 'Belarusian'),
 ('bn', 'Bengali'),
 ('br', 'Breton'),
 ('bs', 'Bosnian'),
 ('ca', 'Catalan'),
 ('ckb', 'Central Kurdish (Sorani)'),
 ('cs', 'Czech'),
 ('cy', 'Welsh'),
 ('da', 'Danish'),
 ('de', 'German'),
 ('dsb', 'Lower Sorbian'),
 ('el', 'Greek'),
 ('en', 'English'),
 ('en-au', 'Australian English'),
 ('en-gb', 'British English'),
 ('eo', 'Esperanto'),
 ('es', 'Spanish'),
 ('es-ar', 'Argentinian Spanish'),
 ('es-co', 'Colombian Spanish'),
 ('es-mx', 'Mexican Spanish'),
 ('es-ni', 'Nicaraguan Spanish'),
 ('es-ve', 'Venezuelan Spanish'),
 ('et', 'Estonian'),
 ('eu', 'Basque'),
 ('fa', 'Persian'),
 ('fi', 'Finnish'),
 ('fr', 'French'),
 ('fy', 'Frisian'),
 ('ga', 'Irish'),
 ('gd', 'Scottish Gaelic'),
 ('gl', 'Galician'),
 ('he', 'Hebrew'),
 ('hi', 'Hindi'),
 ('hr', 'Croatian'),
 ('hsb', 'Upper Sorbian'),
 ('hu', 'Hungarian'),
 ('hy', 'Armenian'),
 ('ia', 'Interlingua'),
 ('id', 'Indonesian'),
 ('ig', 'Igbo'),
 ('io', 'Ido'),
 ('is', 'Icelandic'),
 ('it', 'Italian'),
 ('ja', 'Japanese'),
 ('ka', 'Georgian'),
 ('kab', 'Kabyle'),
 ('kk', 'Kazakh'),
 ('km', 'Khmer'),
 ('kn', 'Kannada'),
 ('ko', 'Korean'),
 ('ky', 'Kyrgyz'),
 ('lb', 'Luxembourgish'),
 ('lt', 'Lithuanian'),
 ('lv', 'Latvian'),
 ('mk', 'Macedonian'),
 ('ml', 'Malayalam'),
 ('mn', 'Mongolian'),
 ('mr', 'Marathi'),
 ('ms', 'Malay'),
 ('my', 'Burmese'),
 ('nb', 'Norwegian Bokmål'),
 ('ne', 'Nepali'),
 ('nl', 'Dutch'),
 ('nn', 'Norwegian Nynorsk'),
 ('os', 'Ossetic'),
 ('pa', 'Punjabi'),
 ('pl', 'Polish'),
 ('pt', 'Portuguese'),
 ('pt-br', 'Brazilian Portuguese'),
 ('ro', 'Romanian'),
 ('ru', 'Russian'),
 ('sk', 'Slovak'),
 ('sl', 'Slovenian'),
 ('sq', 'Albanian'),
 ('sr', 'Serbian'),
 ('sr-latn', 'Serbian Latin'),
 ('sv', 'Swedish'),
 ('sw', 'Swahili'),
 ('ta', 'Tamil'),
 ('te', 'Telugu'),
 ('tg', 'Tajik'),
 ('th', 'Thai'),
 ('tk', 'Turkmen'),
 ('tr', 'Turkish'),
 ('tt', 'Tatar'),
 ('udm', 'Udmurt'),
 ('uk', 'Ukrainian'),
 ('ur', 'Urdu'),
 ('uz', 'Uzbek'),
 ('vi', 'Vietnamese'),
 ('zh-hans', 'Simplified Chinese'),
 ('zh-hant', 'Traditional Chinese')]
LANGUAGES_BIDI	
['he', 'ar', 'ar-dz', 'ckb', 'fa', 'ur']
LANGUAGE_CODE	
'ru-ru'
LANGUAGE_COOKIE_AGE	
None
LANGUAGE_COOKIE_DOMAIN	
None
LANGUAGE_COOKIE_HTTPONLY	
False
LANGUAGE_COOKIE_NAME	
'django_language'
LANGUAGE_COOKIE_PATH	
'/'
LANGUAGE_COOKIE_SAMESITE	
None
LANGUAGE_COOKIE_SECURE	
False
LOCALE_PATHS	
[]
LOGGING	
{}
LOGGING_CONFIG	
'logging.config.dictConfig'
LOGIN_REDIRECT_URL	
'/dashboard/'
LOGIN_URL	
'/login/'
LOGOUT_REDIRECT_URL	
'/login/'
MANAGERS	
[]
MEDIA_ROOT	
WindowsPath('C:/Диплом/Программа/media')
MEDIA_URL	
'/media/'
MESSAGE_STORAGE	
'django.contrib.messages.storage.fallback.FallbackStorage'
MIDDLEWARE	
['django.middleware.security.SecurityMiddleware',
 'django.contrib.sessions.middleware.SessionMiddleware',
 'django.middleware.common.CommonMiddleware',
 'django.middleware.csrf.CsrfViewMiddleware',
 'django.contrib.auth.middleware.AuthenticationMiddleware',
 'django.contrib.messages.middleware.MessageMiddleware',
 'django.middleware.clickjacking.XFrameOptionsMiddleware',
 'core.middleware.InitializationMiddleware']
MIGRATION_MODULES	
{}
MONTH_DAY_FORMAT	
'F j'
NUMBER_GROUPING	
0
PASSWORD_HASHERS	
'********************'
PASSWORD_RESET_TIMEOUT	
'********************'
PREPEND_WWW	
False
ROOT_URLCONF	
'config.urls'
SECRET_KEY	
'********************'
SECRET_KEY_FALLBACKS	
'********************'
SECURE_CONTENT_TYPE_NOSNIFF	
True
SECURE_CROSS_ORIGIN_OPENER_POLICY	
'same-origin'
SECURE_HSTS_INCLUDE_SUBDOMAINS	
False
SECURE_HSTS_PRELOAD	
False
SECURE_HSTS_SECONDS	
0
SECURE_PROXY_SSL_HEADER	
None
SECURE_REDIRECT_EXEMPT	
[]
SECURE_REFERRER_POLICY	
'same-origin'
SECURE_SSL_HOST	
None
SECURE_SSL_REDIRECT	
False
SERVER_EMAIL	
'root@localhost'
SESSION_CACHE_ALIAS	
'default'
SESSION_COOKIE_AGE	
1209600
SESSION_COOKIE_DOMAIN	
None
SESSION_COOKIE_HTTPONLY	
True
SESSION_COOKIE_NAME	
'sessionid'
SESSION_COOKIE_PATH	
'/'
SESSION_COOKIE_SAMESITE	
'Lax'
SESSION_COOKIE_SECURE	
False
SESSION_ENGINE	
'django.contrib.sessions.backends.db'
SESSION_EXPIRE_AT_BROWSER_CLOSE	
False
SESSION_FILE_PATH	
None
SESSION_SAVE_EVERY_REQUEST	
False
SESSION_SERIALIZER	
'django.contrib.sessions.serializers.JSONSerializer'
SETTINGS_MODULE	
'config.settings'
SHORT_DATETIME_FORMAT	
'm/d/Y P'
SHORT_DATE_FORMAT	
'm/d/Y'
SIGNING_BACKEND	
'django.core.signing.TimestampSigner'
SILENCED_SYSTEM_CHECKS	
[]
STATICFILES_DIRS	
[WindowsPath('C:/Диплом/Программа/static')]
STATICFILES_FINDERS	
['django.contrib.staticfiles.finders.FileSystemFinder',
 'django.contrib.staticfiles.finders.AppDirectoriesFinder']
STATICFILES_STORAGE	
'django.contrib.staticfiles.storage.StaticFilesStorage'
STATIC_ROOT	
WindowsPath('C:/Диплом/Программа/staticfiles')
STATIC_URL	
'/static/'
STORAGES	
{'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
 'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}}
TEMPLATES	
[{'APP_DIRS': True,
  'BACKEND': 'django.template.backends.django.DjangoTemplates',
  'DIRS': [WindowsPath('C:/Диплом/Программа/templates')],
  'OPTIONS': {'context_processors': ['django.template.context_processors.debug',
                                     'django.template.context_processors.request',
                                     'django.contrib.auth.context_processors.auth',
                                     'django.contrib.messages.context_processors.messages']}}]
TEST_NON_SERIALIZED_APPS	
[]
TEST_RUNNER	
'django.test.runner.DiscoverRunner'
THOUSAND_SEPARATOR	
','
TIME_FORMAT	
'P'
TIME_INPUT_FORMATS	
['%H:%M:%S', '%H:%M:%S.%f', '%H:%M']
TIME_ZONE	
'Europe/Moscow'
USE_DEPRECATED_PYTZ	
False
USE_I18N	
True
USE_L10N	
True
USE_THOUSAND_SEPARATOR	
False
USE_TZ	
True
USE_X_FORWARDED_HOST	
False
USE_X_FORWARDED_PORT	
False
WSGI_APPLICATION	
'config.wsgi.application'
X_FRAME_OPTIONS	
'DENY'
YEAR_MONTH_FORMAT	
'F Y'
You’re seeing this error because you have DEBUG = True in your Django settings file. Change that to False, and Django will display a standard page generated by the han