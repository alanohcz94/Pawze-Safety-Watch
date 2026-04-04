import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

interface NominatimResult {
  place_id: number;
  osm_id: number;
  osm_type: string;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  importance: number;
  address?: {
    amenity?: string;
    road?: string;
    suburb?: string;
    city?: string;
    country?: string;
  };
}

const POI_TYPES = new Set([
  "station",
  "stop_position",
  "halt",
  "tram_stop",
  "bus_stop",
  "ferry_terminal",
  "hospital",
  "clinic",
  "pharmacy",
  "veterinary",
  "school",
  "university",
  "college",
  "mall",
  "supermarket",
  "marketplace",
  "park",
  "nature_reserve",
  "theme_park",
  "stadium",
  "sports_centre",
  "hotel",
  "hostel",
  "cinema",
  "theatre",
  "museum",
  "gallery",
  "library",
  "place_of_worship",
  "community_centre",
  "government",
]);

const POI_CLASSES = new Set([
  "railway",
  "amenity",
  "leisure",
  "tourism",
  "healthcare",
  "shop",
  "building",
  "natural",
]);

function scoreResult(result: NominatimResult): number {
  let score = result.importance ?? 0;
  if (POI_CLASSES.has(result.class)) score += 0.4;
  if (POI_TYPES.has(result.type)) score += 0.6;
  if (result.class === "railway") score += 0.8;
  return score;
}

router.get("/places/search", async (req: Request, res: Response) => {
  const query = String(req.query.q ?? "").trim();

  if (query.length < 2) {
    res.json({ results: [] });
    return;
  }

  const params = new URLSearchParams({
    q: query,
    countrycodes: "sg",
    format: "json",
    limit: "10",
    addressdetails: "1",
    dedupe: "1",
  });

  try {
    const upstream = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "User-Agent": "Pawzee/1.0 (dog-walk-safety-app)",
          "Accept-Language": "en",
        },
      },
    );

    if (!upstream.ok) {
      res.status(502).json({ error: "Search service unavailable" });
      return;
    }

    const data = await upstream.json() as NominatimResult[];

    const results = data
      .sort((a, b) => scoreResult(b) - scoreResult(a))
      .slice(0, 5)
      .map((r) => {
        const displayParts = r.display_name.split(", ");
        const label = displayParts.slice(0, Math.min(3, displayParts.length)).join(", ");
        return {
          id: String(r.place_id),
          label,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        };
      });

    res.json({ results });
  } catch (err) {
    console.error("Places search error:", err);
    res.status(502).json({ error: "Search service unavailable" });
  }
});

export default router;
