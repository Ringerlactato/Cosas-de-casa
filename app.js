const STORAGE_KEY = 'cosas-de-casa-v1';

const defaultState = {
  pendingTasks: ['Sacar la basura', 'Pasar aspiradora por el salón', 'Organizar despensa'],
  shoppingList: ['Leche', 'Huevos', 'Papel de cocina'],
  cleaning: {
    'Salón': 'Semanal',
    Cocina: 'Cada 2 días',
    'Baño 1': 'Semanal',
    'Baño 2': 'Semanal',
    'Terraza 1': 'Quincenal',
    'Terraza 2': 'Quincenal',
    'Dormitorio 1': 'Semanal',
    'Dormitorio 2': 'Semanal'
  },
  bedding: {
    Sábanas: 'Semanal',
    Edredón: 'Mensual',
    Fundas: 'Semanal',
    Mantas: 'Mensual'
  },
  plants: []
};

const frequencyOptions = ['Diaria', 'Cada 2 días', 'Semanal', 'Quincenal', 'Mensual'];

function readState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);

  try {
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultState);
  }
}

let state = readState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createChecklistItem(text, listName) {
  const li = document.createElement('li');
  li.className = 'check-item';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';

  const span = document.createElement('span');
  span.textContent = text;

  checkbox.addEventListener('change', () => {
    li.classList.toggle('done', checkbox.checked);
  });

  li.append(checkbox, span);

  li.addEventListener('dblclick', () => {
    state[listName] = state[listName].filter((item) => item !== text);
    saveState();
    renderChecklists();
  });

  return li;
}

function renderChecklists() {
  ['pendingTasks', 'shoppingList'].forEach((listName) => {
    const listEl = document.getElementById(listName);
    listEl.innerHTML = '';
    state[listName].forEach((item) => listEl.append(createChecklistItem(item, listName)));
  });
}

function addChecklistItem(listName) {
  const label = listName === 'pendingTasks' ? 'tarea pendiente' : 'producto para comprar';
  const value = window.prompt(`Nueva ${label}:`);
  if (!value || !value.trim()) return;
  state[listName].push(value.trim());
  saveState();
  renderChecklists();
}

function createFrequencyCard(key, value, group) {
  const card = document.createElement('article');
  card.className = 'freq-card';

  const title = document.createElement('p');
  title.textContent = key;

  const select = document.createElement('select');
  frequencyOptions.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    opt.selected = value === option;
    select.append(opt);
  });

  select.addEventListener('change', () => {
    state[group][key] = select.value;
    saveState();
  });

  card.append(title, select);
  return card;
}

function renderFrequencyBlocks() {
  const cleaning = document.getElementById('cleaningGrid');
  cleaning.innerHTML = '';
  Object.entries(state.cleaning).forEach(([room, freq]) => {
    cleaning.append(createFrequencyCard(room, freq, 'cleaning'));
  });

  const bedding = document.getElementById('beddingGrid');
  bedding.innerHTML = '';
  Object.entries(state.bedding).forEach(([item, freq]) => {
    bedding.append(createFrequencyCard(item, freq, 'bedding'));
  });
}

function renderPlants() {
  const list = document.getElementById('plantList');
  list.innerHTML = '';

  if (!state.plants.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Aún no hay plantas registradas.';
    list.append(empty);
    return;
  }

  state.plants.forEach((plant, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${plant.species}</strong>
      <span><b>Riego:</b> ${plant.frequency}</span>
      <p>${plant.care || 'Sin recomendaciones específicas.'}</p>
    `;

    li.addEventListener('dblclick', () => {
      state.plants.splice(index, 1);
      saveState();
      renderPlants();
    });

    list.append(li);
  });
}

function setupEvents() {
  document.querySelectorAll('[data-add-item]').forEach((button) => {
    button.addEventListener('click', () => addChecklistItem(button.dataset.addItem));
  });

  const plantForm = document.getElementById('plantForm');
  plantForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const species = document.getElementById('plantSpecies').value.trim();
    const frequency = document.getElementById('plantFrequency').value.trim();
    const care = document.getElementById('plantCare').value.trim();

    if (!species || !frequency) return;

    state.plants.unshift({ species, frequency, care });
    saveState();
    plantForm.reset();
    renderPlants();
  });
}

renderChecklists();
renderFrequencyBlocks();
renderPlants();
setupEvents();
