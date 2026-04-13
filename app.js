// --- Estado base y utilidades de persistencia ---
const STORAGE_KEY = 'cosas-casa-dashboard-v2';
const cleaningItems = ['Ropa de cama', 'Lavavajillas', 'Arenero de Quemaito', 'Cuencos de Quemaito', 'Trapos de cocina'];
const frequencyOptions = ['Diario', 'Cada 2 días', 'Semanal', 'Quincenal', 'Mensual'];

const initialState = {
  tasks: [],
  shopping: [],
  cleaning: cleaningItems.map((name) => ({ name, lastDate: '', frequency: 'Semanal' })),
  plants: [],
  events: {},
  holidays: {
    // Estructura editable manualmente desde la UI (YYYY-MM-DD: nombre)
    '2026-01-01': 'Año Nuevo'
  }
};

function getState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(initialState);
    return {
      ...structuredClone(initialState),
      ...saved,
      cleaning: saved.cleaning?.length ? saved.cleaning : structuredClone(initialState.cleaning)
    };
  } catch {
    return structuredClone(initialState);
  }
}

let state = getState();
let currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function addChecklistItem(key, inputId) {
  const input = document.getElementById(inputId);
  const value = input.value.trim();
  if (!value) return;

  state[key].unshift({ id: uid(), text: value, done: false });
  input.value = '';
  save();
  render();
}

function renderChecklist(key, targetId) {
  const container = document.getElementById(targetId);
  container.innerHTML = '';

  state[key].forEach((item) => {
    const li = document.createElement('li');
    li.className = `check-item ${item.done ? 'done' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.done;
    checkbox.addEventListener('change', () => {
      item.done = checkbox.checked;
      save();
      renderChecklist(key, targetId);
    });

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = item.text;

    const del = document.createElement('button');
    del.className = 'delete';
    del.type = 'button';
    del.textContent = '🗑';
    del.addEventListener('click', () => {
      state[key] = state[key].filter((entry) => entry.id !== item.id);
      save();
      renderChecklist(key, targetId);
    });

    li.append(checkbox, label, del);
    container.append(li);
  });
}

function calculateNextDate(lastDate, frequency) {
  if (!lastDate) return 'Indica una fecha';
  const date = new Date(lastDate + 'T00:00:00');
  const daysMap = { Diario: 1, 'Cada 2 días': 2, Semanal: 7, Quincenal: 15, Mensual: 30 };
  date.setDate(date.getDate() + (daysMap[frequency] || 7));
  return date.toLocaleDateString('es-ES');
}

function renderCleaning() {
  const wrap = document.getElementById('cleaningList');
  wrap.innerHTML = '';

  state.cleaning.forEach((row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'cleaning-row';

    const title = document.createElement('strong');
    title.textContent = row.name;

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = row.lastDate;
    dateInput.addEventListener('change', () => {
      row.lastDate = dateInput.value;
      save();
      renderCleaning();
    });

    const select = document.createElement('select');
    frequencyOptions.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      if (row.frequency === option) opt.selected = true;
      select.append(opt);
    });
    select.addEventListener('change', () => {
      row.frequency = select.value;
      save();
      renderCleaning();
    });

    const next = document.createElement('span');
    next.className = 'next-date';
    next.textContent = `Próxima: ${calculateNextDate(row.lastDate, row.frequency)}`;

    rowEl.append(title, dateInput, select, next);
    wrap.append(rowEl);
  });
}

function renderPlants() {
  const box = document.getElementById('plantCards');
  box.innerHTML = '';

  if (!state.plants.length) {
    box.innerHTML = '<p class="next-date">No hay plantas guardadas aún.</p>';
    return;
  }

  state.plants.forEach((plant) => {
    const card = document.createElement('article');
    card.className = 'plant-card';
    card.innerHTML = `
      <strong>${plant.name}</strong>
      <p><b>Riego:</b> ${plant.watering}</p>
      <p><b>Luz:</b> ${plant.light}</p>
      <p><b>Notas:</b> ${plant.notes || 'Sin notas'}</p>
    `;

    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = 'Eliminar';
    del.addEventListener('click', () => {
      state.plants = state.plants.filter((p) => p.id !== plant.id);
      save();
      renderPlants();
    });

    card.append(del);
    box.append(card);
  });
}

function dateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const label = document.getElementById('monthLabel');
  grid.innerHTML = '';

  label.textContent = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // lunes como primer día

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = dateKey(day);

    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    if (day.getMonth() !== currentMonth.getMonth()) cell.classList.add('out-month');
    if (state.holidays[key]) cell.classList.add('holiday');

    const num = document.createElement('div');
    num.className = 'day-num';
    num.textContent = day.getDate();

    const eventsWrap = document.createElement('div');
    eventsWrap.className = 'day-events';
    const dayEvents = state.events[key] || [];

    dayEvents.slice(0, 2).forEach((ev) => {
      const line = document.createElement('div');
      line.innerHTML = `<span class="dot ${ev.type}"></span>${ev.title}`;
      eventsWrap.append(line);
    });

    if (dayEvents.length > 2) {
      const more = document.createElement('div');
      more.textContent = `+${dayEvents.length - 2} más`;
      eventsWrap.append(more);
    }

    if (state.holidays[key]) {
      const holidayName = document.createElement('div');
      holidayName.textContent = `🎉 ${state.holidays[key]}`;
      eventsWrap.append(holidayName);
    }

    cell.append(num, eventsWrap);
    grid.append(cell);
  }
}

function setupEvents() {
  document.getElementById('taskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    addChecklistItem('tasks', 'taskInput');
  });

  document.getElementById('shoppingForm').addEventListener('submit', (e) => {
    e.preventDefault();
    addChecklistItem('shopping', 'shoppingInput');
  });

  document.getElementById('plantForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('plantName').value.trim();
    const watering = document.getElementById('plantWatering').value;
    const light = document.getElementById('plantLight').value.trim();
    const notes = document.getElementById('plantNotes').value.trim();
    if (!name || !watering || !light) return;

    state.plants.unshift({ id: uid(), name, watering, light, notes });
    e.target.reset();
    save();
    renderPlants();
  });

  document.getElementById('eventForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('eventDate').value;
    const title = document.getElementById('eventTitle').value.trim();
    const type = document.getElementById('eventType').value;
    if (!date || !title) return;

    state.events[date] = state.events[date] || [];
    state.events[date].push({ id: uid(), title, type });
    e.target.reset();
    save();
    renderCalendar();
  });

  document.getElementById('holidayForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('holidayDate').value;
    const name = document.getElementById('holidayName').value.trim();
    if (!date || !name) return;

    state.holidays[date] = name;
    e.target.reset();
    save();
    renderCalendar();
  });

  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    renderCalendar();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    renderCalendar();
  });
}

function render() {
  renderChecklist('tasks', 'taskList');
  renderChecklist('shopping', 'shoppingList');
  renderCleaning();
  renderPlants();
  renderCalendar();
}

setupEvents();
render();
