import subprocess, sys, secrets
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENV = ROOT / 'venv'
PY_V = VENV / 'Scripts' / 'python.exe'
MGR  = ROOT / 'launch' / 'manage.py'
ENV  = ROOT / 'env' / '.env'


def run(cmd, **kw):
    r = subprocess.run(cmd, cwd=str(ROOT), **kw)
    if r.returncode != 0:
        print('\n[ERROR] Command failed.')
        sys.exit(1)


def section(title):
    print(f'\n{"="*50}\n  {title}\n{"="*50}')


def main():
    print('\n' + '='*50)
    print('  AISC - Setup')
    print(f'  Python {sys.version.split()[0]}')
    print(f'  Project: {ROOT}')
    print('='*50)

    section('Step 1 - Virtual environment')
    if PY_V.exists():
        print('  venv already exists - skipping')
    else:
        if VENV.exists():
            print('  venv found but broken - recreating...')
            import shutil
            shutil.rmtree(str(VENV))
        else:
            print('  Creating venv...')
        run([sys.executable, '-m', 'venv', str(VENV)])
        print('  venv created')

    print('  Bootstrapping pip...')
    run([str(PY_V), '-m', 'ensurepip', '--upgrade'])

    section('Step 2 - Installing packages')
    print('  (this may take a few minutes)\n')
    run([str(PY_V), '-m', 'pip', 'install', '--progress-bar', 'on',
         '-r', str(ROOT / 'env' / 'requirements.txt')])

    section('Step 3 - Config')
    if ENV.exists():
        print('  .env already exists - skipping')
    else:
        secret = 'django-insecure-' + secrets.token_hex(32)
        ENV.write_text(
            f'SECRET_KEY={secret}\nDEBUG=True\nEMAIL_HOST_USER=\nEMAIL_HOST_PASSWORD=\n',
            encoding='utf-8',
        )
        print('  .env created')

    section('Step 4 - Database migrations')
    run([str(PY_V), str(MGR), 'migrate'])

    section('Step 5 - Create admin account')
    subprocess.run([str(PY_V), str(MGR), 'create_superadmin'], cwd=str(ROOT))

    print('\n' + '='*50)
    print('  Setup complete!')
    print('  Now run "Zapustit proekt.bat"')
    print('='*50 + '\n')


if __name__ == '__main__':
    main()
