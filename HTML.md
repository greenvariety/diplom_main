# HTML.md - задачи по правке интерфейса

~~## 1. Везде эта кнопка должна называется Добавить, потому что в факульетах она создать факультет! Препроверь тоже везде!~~

```html
<button class="btn btn-primary btn-sm" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Добавить</button>
```

---

~~## 2. Мне кажется тут впринципе это нужно убрать!~~

```html
<div class="sub" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);">Групп: 1</div>
```

---

## 3. Я заметил, что на всех вкладках у тебя Название . n, а должно быть Название: n, то есть не Студенты . 5, а Студенты: 5
Перепроверь это везде и исправь! Это очень важный момент!

```html
<div class="title" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);">Студенты <span class="muted" style="font-weight: 400;">· 5</span></div>
```

---

