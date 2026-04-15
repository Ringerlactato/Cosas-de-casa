export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const nombreOriginal = String(req.query.nombre || '').trim();
  const apiKey = process.env.PERENUAL_API_KEY;

  if (!nombreOriginal) {
    return res.status(400).json({ error: 'Falta el nombre de la planta' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar PERENUAL_API_KEY en Vercel' });
  }

  const aliasMap = {
    'plumbago capensis': 'plumbago auriculata',
    'cinta': 'chlorophytum comosum',
    'potus': 'pothos',
    'lengua de suegra': 'sansevieria',
    'aloe vera': 'aloe'
  };

  function normalizeText(text) {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  async function searchSpecies(query) {
    const searchUrl =
      `https://perenual.com/api/v2/species-list?key=${encodeURIComponent(apiKey)}` +
      `&q=${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl);

    if (!response.ok) {
      throw new Error(`Error en búsqueda: ${response.status}`);
    }

    const data = await response.json();
    return data?.data || [];
  }

  async function fetchSpeciesDetail(id) {
    const detailUrl =
      `https://perenual.com/api/v2/species/details/${id}?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(detailUrl);

    if (!response.ok) {
      throw new Error(`Error en detalle: ${response.status}`);
    }

    return response.json();
  }

  try {
    const normalizedOriginal = normalizeText(nombreOriginal);

    const queriesToTry = [
      nombreOriginal,
      aliasMap[normalizedOriginal],
      ...nombreOriginal.split(' ').filter(Boolean)
    ].filter(Boolean);

    let matches = [];
    let usedQuery = '';

    for (const query of queriesToTry) {
      matches = await searchSpecies(query);
      if (matches.length) {
        usedQuery = query;
        break;
      }
    }

    if (!matches.length) {
      return res.status(404).json({
        error: 'No se ha encontrado información para esta especie',
        searched: queriesToTry
      });
    }

    const firstMatch = matches[0];
    const detailData = await fetchSpeciesDetail(firstMatch.id);

    const sunlight = Array.isArray(detailData.sunlight)
      ? detailData.sunlight.join(', ')
      : detailData.sunlight || 'No disponible';

    const indoorOutdoor =
      detailData.indoor === true
        ? 'Interior'
        : detailData.indoor === false
        ? 'Exterior'
        : 'No disponible';

    const notes = [
      detailData.care_level ? `Nivel de cuidado: ${detailData.care_level}` : null,
      detailData.description || null
    ]
      .filter(Boolean)
      .join(' · ');

    return res.status(200).json({
      nombreBuscado: nombreOriginal,
      consultaUsada: usedQuery,
      nombre: detailData.common_name || firstMatch.common_name || nombreOriginal,
      cientifico:
        Array.isArray(detailData.scientific_name) && detailData.scientific_name.length
          ? detailData.scientific_name[0]
          : detailData.scientific_name || 'No disponible',
      riego: detailData.watering || firstMatch.watering || 'No disponible',
      luz: sunlight,
      ubicacion: indoorOutdoor,
      notas: notes || 'No disponible',
      imagen:
        detailData.default_image?.regular_url ||
        detailData.default_image?.original_url ||
        firstMatch.default_image?.regular_url ||
        null
    });
  } catch (error) {
    console.error('Error en /api/plantas:', error);
    return res.status(500).json({
      error: 'Error interno al consultar la API de plantas',
      details: error.message
    });
  }
}