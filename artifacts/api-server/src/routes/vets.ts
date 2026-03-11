import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get("/vets/nearby", async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: "lat and lng are required" });
    return;
  }

  const radiusM = Math.min(parseFloat(req.query.radius as string) || 10000, 50000);

  try {
    const query = `
[out:json][timeout:10];
(
  node["amenity"="veterinary"](around:${radiusM},${lat},${lng});
  way["amenity"="veterinary"](around:${radiusM},${lat},${lng});
  node["healthcare"="veterinary"](around:${radiusM},${lat},${lng});
  way["healthcare"="veterinary"](around:${radiusM},${lat},${lng});
);
out center body;
`;

    const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(15000),
    });

    if (!overpassRes.ok) {
      throw new Error(`Overpass API returned ${overpassRes.status}`);
    }

    const data = await overpassRes.json();
    const elements: OverpassElement[] = data.elements || [];

    const vets = elements
      .map((el) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        if (!elLat || !elLon) return null;

        const tags = el.tags || {};
        const name = tags.name || "Veterinary Clinic";
        const addressParts = [
          tags["addr:street"],
          tags["addr:housenumber"],
          tags["addr:city"],
        ].filter(Boolean);
        const address = addressParts.length > 0
          ? addressParts.join(" ")
          : `${elLat.toFixed(4)}, ${elLon.toFixed(4)}`;

        return {
          id: String(el.id),
          name,
          address,
          phone: tags.phone || tags["contact:phone"] || null,
          website: tags.website || tags["contact:website"] || null,
          lat: elLat,
          lng: elLon,
          distance: Math.round(haversineDistance(lat, lng, elLat, elLon)),
          emergency: tags.emergency === "yes" || tags.opening_hours === "24/7" || false,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.distance - b!.distance)
      .slice(0, 20);

    res.json({ vets });
  } catch (err: any) {
    console.error("Vet search error:", err.message);
    res.json({ vets: [], error: "Search temporarily unavailable" });
  }
});

export default router;
