from django.http import FileResponse
from django.conf import settings


def serve_frontend(request, path=''):
    # раздаём статические файлы или index.html для React-роутинга
    dist_dir = settings.BASE_DIR / 'frontend' / 'dist'
    file_path = dist_dir / path
    if path and file_path.exists() and file_path.is_file():
        # конкретный файл (js, css, картинка) - отдаём как есть
        return FileResponse(open(file_path, 'rb'))
    # для всех остальных маршрутов отдаём index.html - SPA обработает роутинг
    resp = FileResponse(open(dist_dir / 'index.html', 'rb'), content_type='text/html')
    resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    resp['Pragma'] = 'no-cache'
    return resp
