import os
import re
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

HTML_MD_PATH = os.path.join(settings.BASE_DIR, 'HTML.md')

_BLOCK_RE = re.compile(
    r'## (\d+)\. (.+?)\n\n\*\*Что сделать:\*\* (.+?)\n\n\*\*HTML:\*\*\n```html\n(.*?)\n```',
    re.DOTALL,
)


def _read_tasks():
    if not os.path.exists(HTML_MD_PATH):
        return []
    with open(HTML_MD_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    return [
        {'id': int(m.group(1)), 'title': m.group(2).strip(),
         'description': m.group(3).strip(), 'html_code': m.group(4).strip()}
        for m in _BLOCK_RE.finditer(content)
    ]


def _write_tasks(tasks):
    lines = ['# HTML.md - задачи по правке интерфейса\n\n']
    for i, t in enumerate(tasks, 1):
        lines.append(f"## {i}. {t['title']}\n\n")
        lines.append(f"**Что сделать:** {t['description']}\n\n")
        lines.append(f"**HTML:**\n```html\n{t['html_code']}\n```\n\n")
        lines.append('---\n\n')
    with open(HTML_MD_PATH, 'w', encoding='utf-8') as f:
        f.write(''.join(lines))


class HtmlTasksView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_read_tasks())

    def post(self, request):
        title = (request.data.get('title') or '').strip()
        description = (request.data.get('description') or '').strip()
        html_code = (request.data.get('html_code') or '').strip()
        if not title:
            return Response({'error': 'Укажите название задачи'}, status=400)
        tasks = _read_tasks()
        new_id = max((t['id'] for t in tasks), default=0) + 1
        task = {'id': new_id, 'title': title, 'description': description, 'html_code': html_code}
        tasks.append(task)
        _write_tasks(tasks)
        return Response(task, status=201)


class HtmlTaskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        tasks = _read_tasks()
        tasks = [t for t in tasks if t['id'] != pk]
        _write_tasks(tasks)
        return Response(status=204)
