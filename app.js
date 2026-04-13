// --- Estado base y utilidades de persistencia ---
const STORAGE_KEY = 'cosas-casa-dashboard-v3';

const cleaningItems = [
  'Ropa de cama',
  'Lavavajillas',
  'Arenero de Quemaito',
  'Cuencos de Quemaito',
  'Trapos de cocina'
];

const frequencyOptions = ['Diario', 'Cada 2 días', 'Semanal', 'Quincenal', 'Mensual'];

// Fallback local por si falla la función serverless o no encuentra datos.
const plantProfiles = {
  monstera: {
    watering: 'Semanal',
    light: 'Luz indirecta brillante',
    location: 'Interior',
    notes: 'Sustrato drenante; deja secar ligeramente la capa superior entre riegos.'
  },
  pothos: {
    watering: 'Semanal',
    light: 'Luz media a indirecta',
    location: 'Interior',
    notes: 'Tolera poca luz; evita encharcamientos y limpia hojas con paño húmedo.'
  },
  ficus: {
    watering: 'Semanal',
    light: 'Muy luminosa sin sol fuerte',
    location: 'Interior',
    notes: 'No mover constantemente de sitio; sensible a cambios bruscos.'
  },
  sansevieria: {
    watering: 'Quincenal',
    light: 'Luz media o baja',
    location: 'Interior',
    notes: 'Riego escaso; ideal para principiantes.'
  },
  aloe: {
    watering: 'Quincenal',
    light: 'Mucha luz',
    location: 'Interior o exterior soleado',
    notes: 'Sustrato para cactus y drenaje excelente.'
  }
};

const initialState = {
  tasks: [],
  shopping: [],
  cleaning: cleaningItems.map((name) => ({
    name,
    lastDate: '',
    frequency: 'Semanal'
  })),
  plants: [],
  events: {},
  holidays: defaultHolidaysForYear(2026)
};

function defaultHolidaysForYear(year) {
  if (year !== 2026) return {};

  // Festivos nacionales + Comunitat Valenciana 2026.
  return {
    '2026-01-01': 'Año Nuevo',
    '2026-01-06': 'Epifanía del Señor',
    '2026-03-19': 'San José',
    '2026-04-02': 'Jueves Santo',
    '2026-04-03': 'Viernes Santo',
    '2026-04-06': 'Lunes de Pascua',
    '2026-05-01': 'Fiesta del Trabajo',
    '2026-08-15': 'Asunción de la Virgen',
    '2026-10-09': 'Día de la Comunitat Valenciana',
    '2026-10-12': 'Fiesta Nacional de España',
    '2026-12-07': 'Festivo trasladado / puente',
    '2026-12-08': 'Inmaculada Concepción',
    '2026-12-25': 'Navidad',
    '2026-12-26': 'San Esteban'
  };
}

function getState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(initialState);

    return {
      ...structuredClone(initialState),
      ...saved,
      cleaning: saved.cleaning?.length
        ? saved.cleaning
        : structuredClone(initialState.cleaning)
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

function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function findPlantProfile(species) {
  const normalized = normalizeText(species);
  if (!normalized) return null;

  const key = Object.keys(plantProfiles).find((profileKey) =>
    normalized.includes(profileKey)
  );

  return key ? plantProfiles[key] : null;
}

// --- Referencias DOM ---
const taskForm = document.getElementById('taskForm');
const shoppingForm = document.getElementById('shoppingForm');
const plantForm = document.getElementById('plantForm');
const eventForm = document.getElementById('eventForm');
const holidayForm = document.getElementById('holidayForm');

const plantNameInput = document.getElementById('plantName');
const plantWateringSelect = document.getElementById('plantWatering');
const plantLightInput = document.getElementById('plantLight');
const plantLocationInput = document.getElementById('plantLocation');
const plantNotesInput = document.getElementById('plantNotes');
const plantCards = document.getElementById('plantCards');
const searchPlantBtn = document.getElementById('searchPlantBtn');
const plantStatus = document.getElementById('plantStatus');

// --- Checklist genérico ---
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

// --- Limpieza ---
function calculateNextDate(lastDate, frequency) {
  if (!lastDate) return 'Indica una fecha';

  const date = new Date(lastDate + 'T00:00:00');
  const daysMap = {
    Diario: 1,
    'Cada 2 días': 2,
    Semanal: 7,
    Quincenal: 15,
    Mensual: 30
  };

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

// --- Jardín / Plantas ---
function setPlantStatus(message, type = '') {
  if (!plantStatus) return;

  plantStatus.textContent = message;
  plantStatus.className = 'plant-status';

  if (type) {
    plantStatus.classList.add(type);
  }
}

function ensureWateringOption(value) {
  if (!value) return;

  const exists = [...plantWateringSelect.options].some(
    (opt) => normalizeText(opt.value) === normalizeText(value)
  );

  if (!exists) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    plantWateringSelect.append(option);
  }
}

function autofillPlantFields(data) {
  if (!data) return;

  if (data.riego) {
    ensureWateringOption(data.riego);
    plantWateringSelect.value = data.riego;
  }

  if (data.luz) {
    plantLightInput.value = data.luz;
  }

  if (data.ubicacion) {
    plantLocationInput.value = data.ubicacion;
  }

  if (data.notas) {
    plantNotesInput.value = data.notas;
  }
}

async function searchPlantCare() {
  const nombre = plantNameInput.value.trim();

  if (!nombre) {
    setPlantStatus('Escribe una especie de planta antes de buscar.', 'error');
    return;
  }

  setPlantStatus('Buscando cuidados...', 'loading');

  try {
    const response = await fetch(`/api/plantas?nombre=${encodeURIComponent(nombre)}`);

    if (!response.ok) {
      throw new Error('No se pudo obtener información de la planta');
    }

    const data = await response.json();

    const mappedData = {
      riego: data.riego || data.watering || '',
      luz: data.luz || data.light || '',
      ubicacion: data.ubicacion || data.location || '',
      notas: data.notas || data.notes || ''
    };

    autofillPlantFields(mappedData);
    setPlantStatus('Cuidados cargados correctamente.', 'success');
  } catch (error) {
    console.error('Error consultando /api/plantas:', error);

    // Fallback local
    const fallback = findPlantProfile(nombre);

    if (fallback) {
      autofillPlantFields({
        riego: fallback.watering,
        luz: fallback.light,
        ubicacion: fallback.location,
        notas: fallback.notes
      });

      setPlantStatus('No se pudo consultar la API. Se han usado datos locales.', 'success');
      return;
    }

    setPlantStatus('No se ha podido obtener información de la planta.', 'error');
  }
}

function renderPlants() {
  plantCards.innerHTML = '';

  if (!state.plants.length) {
    plantCards.innerHTML = '<p class="next-date">No hay plantas guardadas aún.</p>';
    return;
  }

  state.plants.forEach((plant) => {
    const card = document.createElement('article');
    card.className = 'plant-card';

    card.innerHTML = `
      <strong>${plant.name}</strong>
      <p><b>Riego:</b> ${plant.watering || 'No disponible'}</p>
      <p><b>Luz:</b> ${plant.light || 'No disponible'}</p>
      <p><b>Ubicación:</b> ${plant.location || 'No disponible'}</p>
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
    plantCards.append(card);
  });
}

// --- Calendario ---
function dateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isToday(dateObj) {
  const today = new Date();
  return (
    dateObj.getFullYear() === today.getFullYear() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getDate() === today.getDate()
  );
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const label = document.getElementById('monthLabel');
  grid.innerHTML = '';

  label.textContent = currentMonth.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  });

  const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // lunes como primer día

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = dateKey(day);

    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    if (day.getMonth() !== currentMonth.getMonth()) {
      cell.classList.add('out-month');
    }

    if (state.holidays[key]) {
      cell.classList.add('holiday');
    }

    if (isToday(day)) {
      cell.classList.add('today');
    }

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
      holidayName.textContent = state.holidays[key];
      eventsWrap.append(holidayName);
    }

    cell.append(num, eventsWrap);
    grid.append(cell);
  }
}

// --- Eventos UI ---
function setupEvents() {
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addChecklistItem('tasks', 'taskInput');
  });

  shoppingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addChecklistItem('shopping', 'shoppingInput');
  });

  if (searchPlantBtn) {
    searchPlantBtn.addEventListener('click', searchPlantCare);
  }

  if (plantNameInput) {
    plantNameInput.addEventListener('change', (e) => {
      const profile = findPlantProfile(e.target.value);
      if (!profile) return;

      ensureWateringOption(profile.watering);
      plantWateringSelect.value = profile.watering;
      plantLightInput.value = profile.light;
      if (plantLocationInput) plantLocationInput.value = profile.location || '';
      plantNotesInput.value = profile.notes || '';
    });
  }

  plantForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = plantNameInput.value.trim();
    const watering = plantWateringSelect.value;
    const light = plantLightInput.value.trim();
    const location = plantLocationInput ? plantLocationInput.value.trim() : '';
    const notes = plantNotesInput.value.trim();

    if (!name || !watering || !light) {
      setPlantStatus('Completa al menos nombre, riego y luz antes de guardar.', 'error');
      return;
    }

    state.plants.unshift({
      id: uid(),
      name,
      watering,
      light,
      location,
      notes
    });

    e.target.reset();
    setPlantStatus('Planta guardada correctamente.', 'success');
    save();
    renderPlants();
  });

  eventForm.addEventListener('submit', (e) => {
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

  holidayForm.addEventListener('submit', (e) => {
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

// --- Render global ---
function render() {
  renderChecklist('tasks', 'taskList');
  renderChecklist('shopping', 'shoppingList');
  renderCleaning();
  renderPlants();
  renderCalendar();
}

setupEvents();
render();
