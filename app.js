let productDatabase = {};
let tabs = [{ name: "Лист 1", scans: [] }];
let activeTabIndex = 0;
// Функция для коррекции высоты на мобильных (фикс адресной строки)
function setAppHeight() {
    const doc = document.documentElement;
    doc.style.setProperty('--app-height', `${window.innerHeight}px`);
}
window.addEventListener('resize', setAppHeight);
setAppHeight();

// === ИНИЦИАЛИЗАЦИЯ ===
window.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js'); }

    // Загрузка БД
    const savedDb = localStorage.getItem('productDatabase');
    if (savedDb) {
        productDatabase = JSON.parse(savedDb);
        updateStatusText();
    }

    // Загрузка Сканов
    const savedTabs = localStorage.getItem('multiSheetScans');
    if (savedTabs) {
        tabs = JSON.parse(savedTabs);
    }

    renderTabs();
    renderTable();
});

// === НАВИГАЦИЯ (ИСПРАВЛЕНО) ===
function switchModule(moduleName) {
    const modules = ['inventoryModule', 'viewDbModule', 'settingsModule'];
    
    modules.forEach(id => {
        const el = document.getElementById(id);
        if (id.startsWith(moduleName)) {
            el.style.display = 'flex'; // Показываем нужный
        } else {
            el.style.display = 'none'; // Скрываем остальные
        }
    });

    // Подсветка кнопок в боковом меню
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(moduleName));
    });

    toggleSidebar();

    // Специфическая логика для модулей
    if (moduleName === 'viewDb') {
        renderDbView();
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
}

// === ПРОСМОТР БАЗЫ ДАННЫХ ===
function renderDbView() {
    const tbody = document.getElementById('dbTableBody');
    if (!tbody) return;

    tbody.innerHTML = "";
    const codes = Object.keys(productDatabase);

    if (codes.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5' style='padding:20px; color:gray;'>База данных пуста. Загрузите CSV файл в модуле инвентаризации.</td></tr>";
        return;
    }

    const fragment = document.createDocumentFragment();
    codes.forEach(code => {
        const item = productDatabase[code];
        const tr = document.createElement('tr');
        
        // Подготовка строки для поиска
        const searchStr = `${code} ${item.name} ${item.extra} ${item.cell}`.toLowerCase();
        tr.setAttribute('data-search', searchStr);

        tr.innerHTML = `
            <td>${code}</td>
            <td style="text-align:left">${item.name}</td>
            <td>${item.extra || '-'}</td>
            <td>${item.cell || '-'}</td>
            <td>${item.stock || '-'}</td>
        `;
        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
}

function searchDb(query) {
    const filter = query.toLowerCase();
    const rows = document.querySelectorAll('#dbTableBody tr');
    
    rows.forEach(row => {
        const text = row.getAttribute('data-search') || "";
        row.style.display = text.includes(filter) ? "" : "none";
    });
}

// === ЛОГИКА ИНВЕНТАРИЗАЦИИ (ОСНОВНАЯ) ===
function renderTabs() {
    const container = document.getElementById('tabBarContainer');
    const addBtn = document.getElementById('addTabBtn');
    if (!container) return;

    container.querySelectorAll('.tab').forEach(t => t.remove());
    tabs.forEach((tab, index) => {
        const div = document.createElement('div');
        div.className = `tab ${index === activeTabIndex ? 'active' : ''}`;
        div.innerText = tab.name;
        div.onclick = () => { activeTabIndex = index; saveState(); renderTabs(); renderTable(); };
        container.insertBefore(div, addBtn);
    });
}

// Функция добавления новой вкладки
window.addTab = function() {
    const newIndex = tabs.length + 1;
    const name = prompt("Введите название нового листа:", "Лист " + newIndex);
    if (name) {
        tabs.push({ name: name, scans: [] });
        activeTabIndex = tabs.length - 1; // Переключаемся на новую
        saveState();
        renderTabs();
        renderTable();
    }
};

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    tbody.innerHTML = "";
    tabs[activeTabIndex].scans.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.code}</td>
            <td style="text-align:left">${item.name}</td>
            <td>${item.extra}</td>
            <td>${item.cell}</td>
            <td>${item.stock}</td>
            <td contenteditable="true" class="qty-cell" data-index="${index}">${item.qty}</td>
            <td style="color:${item.status==='OK'?'green':'red'}">${item.status}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Сохранение количества при ручном вводе в таблицу
document.getElementById('tableBody').addEventListener('input', (e) => {
    if (e.target.classList.contains('qty-cell')) {
        const idx = e.target.dataset.index;
        tabs[activeTabIndex].scans[idx].qty = e.target.innerText;
        saveState();
    }
});

function saveState() {
    localStorage.setItem('multiSheetScans', JSON.stringify(tabs));
}

function updateStatusText() {
    const statusEl = document.getElementById('dbStatusStrip');
    const count = Object.keys(productDatabase).length;
    if (count > 0) {
        statusEl.innerHTML = `✅ База данных загружена: ${count} поз.`;
        statusEl.classList.add('loaded');
    } else {
        statusEl.innerHTML = `❌ База данных не подгружена`;
        statusEl.classList.remove('loaded');
    }
}

// === ОБРАБОТКА СКАНА ===
window.processAndAdd = function(rawData) {
    let code = ""; // Объявляем переменную code

    if (rawData.includes("--")) {
        const parts = rawData.split("--");
        code = parts[0].trim();
    } else {
        code = rawData.trim();
    }

    // Удаляем ведущие нули
    const cleanCode = code.replace(/^0+/, '') || "0";

    if (!productDatabase) {
        alert("База данных не загружена!");
        return;
    }

    const info = productDatabase[cleanCode];

    const newItem = {
        code: cleanCode,
        name: info ? info.name : "Неизвестный код",
        extra: info ? info.extra : "-",
        cell: info ? info.cell : "-",
        stock: info ? info.stock : "-",
        qty: "1",
        status: info ? "OK" : "НЕ НАЙДЕН!"
    };

    tabs[activeTabIndex].scans.push(newItem);
    saveState();
    renderTable();

    const wrapper = document.querySelector('.table-wrapper');
    if (wrapper) wrapper.scrollTop = wrapper.scrollHeight;
};

// Функции кнопок
function removeLast() { if (tabs[activeTabIndex].scans.length > 0) { tabs[activeTabIndex].scans.pop(); saveState(); renderTable(); } }

function handleDeleteAction() {
    if (tabs.length > 1) {
        if (confirm(`Удалить лист "${tabs[activeTabIndex].name}"?`)) {
            tabs.splice(activeTabIndex, 1);
            activeTabIndex = 0;
            saveState(); renderTabs(); renderTable();
        }
    } else {
        if (confirm("Очистить текущий лист?")) { tabs[activeTabIndex].scans = []; saveState(); renderTable(); }
    }
}

function manualInput() {
    const val = prompt("Введите QR код или формат 'Код--Доп':");
    if (val && val.trim()) {
        window.processAndAdd(val.trim());
    }
}

// Привязываем ручной ввод к кнопке
document.getElementById('manualBtn').onclick = manualInput;

// Загрузка базы из CSV
document.getElementById('csvFile').onchange = function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(ev) {
        const lines = ev.target.result.split(/\r?\n/);
        const newDb = {};
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';');
            if (cols.length >= 2) {
                const code = cols[1].trim().replace(/^0+/, '');
                newDb[code] = {
                    name: cols[0].trim(),
                    stock: cols[2] ? cols[2].trim() : "-",
                    cell: cols[3] ? cols[3].trim() : "-",
                    extra: cols[4] ? cols[4].trim() : "-"
                };
            }
        }
        productDatabase = newDb;
        localStorage.setItem('productDatabase', JSON.stringify(newDb));
        updateStatusText();
        alert("База успешно обновлена!");
    };
    reader.readAsText(file, 'UTF-8');
};

function exportCSV() {
    const current = tabs[activeTabIndex];
    if (!current.scans.length) return alert("Лист пуст");
    let csv = "\uFEFF№;Код;Наименование;Доп;Ячейка;Остаток;Кол;Статус\n";
    current.scans.forEach((it, i) => {
        csv += `${i+1};${it.code};${it.name};${it.extra};${it.cell};${it.stock};${it.qty};${it.status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${current.name}.csv`;
    link.click();
}





