export default async function handler(req, res) {
  const { nombre } = req.query;

  if (!nombre) {
    return res.status(400).json({ error: "Falta el nombre de la planta" });
  }

  const data = {
    nombre,
    riego: "Semanal",
    luz: "Luz indirecta",
    ubicacion: "Interior",
    notas: "Evitar encharcamientos"
  };

  res.status(200).json(data);
}
