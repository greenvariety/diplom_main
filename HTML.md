# HTML.md - задачи по правке интерфейса

~~## 1. Здесь просто нужно добавлять какие предметы ведет и все! Уже на группе добавляются предметы и выбирается препод!~~

```html
<div class="card-head" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><div class="title" style="">Ведёт предметы</div><button class="btn btn-secondary btn-sm"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Назначить</button></div>
```

---

~~## 2. Почему тут переход по ссылке и такое больштое поле? Вкладка должна быьтбь как везде!~~

```html
<td class="fwm" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><a href="#" style="">Алексеев Максим Игоревич</a></td>
```

---

## 3. Везде сделай просто плюс, без надписей!

```html
<button class="btn btn-secondary btn-sm" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Привязать студента</button>
```

---

## 4. ЗАчем нам это, убери это, зачем добавлять отдельно студента для предмета? Это и в преподах убери!

```html
<div class="card-head" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><div class="title">Студенты<span class="muted" style="font-weight: 700;">: 3</span></div><button class="btn btn-secondary btn-sm"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button></div>
```

---

## 5. Убери это с предметом и так понятно куда добавляем!

```html
<div style="padding: 6px 0px; font-weight: 500; outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);">Автоматика</div>
```

---

