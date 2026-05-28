# HTML.md - задачи по правке интерфейса

~~## 1. Смотри добавь вкладку какие предметы ведет! То есть ты назначаешь предмет, а при переходе на него увидшь в каких группах она ведет! То есть если два препода ведут один предмет, то ей будет отображены только ее группы!~~

```html
<div class="card-head" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><div class="title">Ведёт предметы</div><button class="btn btn-secondary btn-sm"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button></div>
```

---

~~## 2. Сделай крч на везде таких вкладках сортировку как и на основных! Во всех вкладках если что!~~

```html
<th style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);">Преподаватель</th>
```

---

~~## 3. Тут вот тоже~~

```html
<th style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);">Преподаватель</th>
```

---

~~## 4. Как здесь крч!~~

```html
<th class="sortable " style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><span style="display: inline-flex; align-items: center;">Название<span class="sort-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 10 12 5 17 10"></polyline><polyline points="7 14 12 19 17 14"></polyline></svg></span></span></th>
```

---

