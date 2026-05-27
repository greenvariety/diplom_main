# HTML.md - задачи по правке интерфейса

~~## 1. Убери везде эти флаги~~

```html
<button class="btn btn-ghost btn-icon btn-sm" title="Отметить" style="color: var(--text-muted); outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></button>
```

---

~~## 2. Убери на всех: факультеты, группы, предметы, сотрудники, студенты, опекуны вот такю сортирорвку, везде сверху будет только окно ввода для поиска!~~

```html
<select class="select" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><option value="">- Все -</option><option value="6">Админ</option></select>
```

---

~~## 3. Найсти и сбросить сделать одного размера с поисковой строкой!~~

```html
<button class="btn btn-primary btn-sm" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);">Найти</button>
```

---

~~## 4. Такие флаги тоже убери!~~

```html
<button class="btn btn-ghost btn-icon btn-sm" title="Добавить вопрос" style="color: var(--text-muted); font-weight: 700; outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);">?</button>
```

---

~~## 5. Убери эту надпись!~~

```html
<div class="banner banner-info" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg><div class="banner-body" style="">Администратор подаёт заявку на удаление, суперадмин подтверждает. До подтверждения объект остаётся в системе.</div></div>
```

---

~~## 6. Сделай все такие вещи на дашборде кликабьельными для перехода на вкладки!~~

```html
<div class="stat" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><div class="stat-label" style=""><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"></path></svg>Факультетов</div><div class="stat-value" style=""><span>1</span></div></div>
```

---

