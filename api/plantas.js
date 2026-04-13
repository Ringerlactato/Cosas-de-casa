export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const nombre = String(req.query.nombre || '').trim();
  const apiKey = process.env.PERENUAL_API_KEY;

  if (!nombre) {
    return res.status(400).json({ error: 'Falta el nombre de la planta' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar PERENUAL_API_KEY en Vercel' });
  }

  try {
    // 1) Buscar la especie
    const searchUrl =
      `https://perenual.com/api/v2/species-list?key=${encodeURIComponent(apiKey)}` +
      `&q=${encodeURIComponent(nombre)}`;

    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      return res.status(searchResponse.status).json({
        error: 'Error al consultar Perenual (búsqueda)'
      });
    }

    const searchData = await searchResponse.json();
    const firstMatch = searchData?.data?.[0];

    if (!firstMatch) {
      return res.status(404).json({
        error: 'No se ha encontrado información para esta especie'
      });
    }

    // 2) Pedir detalle por ID
    const detailUrl =
      `https://perenual.com/api/v2/species/details/${firstMatch.id}?key=${encodeURIComponent(apiKey)}`;

    const detailResponse = await fetch(detailUrl);

    if (!detailResponse.ok) {
      return res.status(detailResponse.status).json({
        error: 'Error al consultar Perenual (detalle)'
      });
    }

    const detailData = await detailResponse.json();

    // 3) Normalizar la respuesta para tu frontend
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
      detailData.description ? detailData.description : null
    ]
      .filter(Boolean)
      .join(' · ');

    return res.status(200).json({
      nombre: detailData.common_name || firstMatch.common_name || nombre,
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
      error: 'Error interno al consultar la API de plantas'
    });
  }
}
