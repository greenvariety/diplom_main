# HTML.md - задачи по правке интерфейса

## ~~1. Убери на всех вкладках эту штуку пожалуйста, она мешается!~~

```html
<div class="crumbs" style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><span style="display: contents;"><a href="#" style="">Факультеты</a></span><span style="display: contents;"><span class="sep" style="">/</span><span style="">ИП</span></span></div>
```

---

## 2. Крч, если мы заходим на факультет, нам не нужно его выбирать в списке факультетов! Он доолжен автоматически подставлятся!

```html
<select class="select " style="outline: rgb(231, 76, 60) solid 2px; background-color: rgba(231, 76, 60, 0.08);"><option value="">- Выберите факультет -</option><option value="12">ИП - Инн пидорас</option><option value="13">ПИДОРАС - Информационные системы ипрограммирование</option><option value="9">ЫЛВДПАДШЫВА - Информационные технологии и программирование</option><option value="11">ТОТ - Техническое обслуживание транспорта</option><option value="10">ЭУ - Экономика и управление</option></select>
```

---

