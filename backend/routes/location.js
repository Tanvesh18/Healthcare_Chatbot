import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/nearby-doctors", async (req, res) => {
  const { lat, lng } = req.body;

  const query = `
  [out:json];
  node["amenity"="hospital"](around:3000,${lat},${lng});
  node["amenity"="clinic"](around:3000,${lat},${lng});
  out;
  `;

  const url = "https://overpass-api.de/api/interpreter";

  const result = await fetch(url, {
    method: "POST",
    body: query
  });

  const data = await result.json();

  const doctors = data.elements.map(p => ({
    name: p.tags.name || "Medical Center",
    lat: p.lat,
    lng: p.lon,
    speciality: p.tags.healthcare
  }));

  res.json(doctors);
});

export default router;
