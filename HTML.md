# HTML.md - задачи по правке интерфейса

~~## 1. Во всех вкладках, крч везде впринципе добавь эту галочку~~

```html
<td style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></td>
```

---

## 2. Я же сказал удалить блок студентов!

```html
<div class="card-head" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><div class="title">Студенты<span class="muted" style="font-weight: 700;">: 3</span></div></div>
```

---

## 3. Добавить плюс для добавления препода!

```html
<div class="card-head" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><div class="title">Преподаватели<span class="muted" style="font-weight: 700;">: 1</span></div></div>
```

---

## 4. Смотри добавь вкладку какие предметы ведет! То есть ты назначаешь предмет, а при переходе на него увидшь в каких группах она ведет! То есть если два препода ведут один предмет, то ей будет отображены только ее группы!

```html
<div class="card-head" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><div class="title">Ведёт предметы</div><button class="btn btn-secondary btn-sm"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button></div>
```

---

