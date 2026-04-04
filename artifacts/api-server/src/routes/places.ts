import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const GOOGLE_MAPS_KEY = process.env["GOOGLE_MAPS_API_KEY"];

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  importance: number;
}

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
  "cinema",
  "theatre",
  "museum",
  "library",
]);

function nominatimScore(r: NominatimResult): number {
  let score = r.importance ?? 0;
  if (POI_CLASSES.has(r.class)) score += 0.4;
  if (POI_TYPES.has(r.type)) score += 0.6;
  if (r.class === "railway") score += 0.8;
  return score;
}

async function nominatimSearch(
  query: string,
): Promise<{ placeId: string; description: string }[]> {
  const params = new URLSearchParams({
    q: query,
    countrycodes: "sg",
    format: "json",
    limit: "10",
    addressdetails: "0",
    dedupe: "1",
  });

  const upstream = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        "User-Agent": "Pawzee/1.0 (dog-walk-safety-app)",
        "Accept-Language": "en",
      },
    },
  );

  if (!upstream.ok) return [];

  const data = await upstream.json() as NominatimResult[];

  return data
    .sort((a, b) => nominatimScore(b) - nominatimScore(a))
    .slice(0, 5)
    .map((r) => {
      const parts = r.display_name.split(", ");
      const description = parts.slice(0, Math.min(3, parts.length)).join(", ");
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);
      return {
        placeId: `nominatim:${lat.toFixed(6)},${lng.toFixed(6)}`,
        description,
      };
    });
}

router.get("/places/autocomplete", async (req: Request, res: Response) => {
  const input = String(req.query.input ?? "").trim();
  const sessiontoken = String(req.query.sessiontoken ?? "");

  if (input.length < 2) {
    res.json({ predictions: [] });
    return;
  }

  if (GOOGLE_MAPS_KEY) {
    const params = new URLSearchParams({
      input,
      key: GOOGLE_MAPS_KEY,
      components: "country:sg",
      types: "establishment|geocode",
      sessiontoken,
    });

    try {
      const upstream = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`,
      );
      const data = await upstream.json() as {
        status: string;
        predictions?: Array<{ place_id: string; description: string }>;
      };

      if (data.status === "OK" || data.status === "ZERO_RESULTS") {
        const predictions = (data.predictions ?? []).slice(0, 5).map((p) => ({
          placeId: p.place_id,
          description: p.description,
        }));
        res.json({ predictions });
        return;
      }
      console.warn(
        "Google Places Autocomplete returned status:",
        data.status,
        "— falling back to Nominatim",
      );
    } catch (err) {
      console.warn("Google Places Autocomplete error, falling back to Nominatim:", err);
    }
  }

  try {
    const predictions = await nominatimSearch(input);
    res.json({ predictions });
  } catch (err) {
    console.error("Nominatim fallback error:", err);
    res.json({ predictions: [] });
  }
});

router.get("/places/details", async (req: Request, res: Response) => {
  const placeId = String(req.query.place_id ?? "").trim();
  const sessiontoken = String(req.query.sessiontoken ?? "");

  if (!placeId) {
    res.status(400).json({ error: "place_id is required" });
    return;
  }

  if (placeId.startsWith("nominatim:")) {
    const coords = placeId.slice("nominatim:".length).split(",");
    const lat = parseFloat(coords[0] ?? "");
    const lng = parseFloat(coords[1] ?? "");
    if (!isNaN(lat) && !isNaN(lng)) {
      res.json({ lat, lng, formattedAddress: req.query.description ?? "" });
      return;
    }
    res.status(400).json({ error: "Invalid nominatim place_id" });
    return;
  }

  if (!GOOGLE_MAPS_KEY) {
    res.status(500).json({ error: "Places API not configured" });
    return;
  }

  const params = new URLSearchParams({
    place_id: placeId,
    fields: "geometry,formatted_address",
    key: GOOGLE_MAPS_KEY,
    sessiontoken,
  });

  try {
    const upstream = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
    );
    const data = await upstream.json() as {
      status: string;
      result?: {
        geometry: { location: { lat: number; lng: number } };
        formatted_address: string;
      };
    };

    if (data.status !== "OK" || !data.result) {
      res.status(502).json({ error: "Places Details API error", status: data.status });
      return;
    }

    res.json({
      lat: data.result.geometry.location.lat,
      lng: data.result.geometry.location.lng,
      formattedAddress: data.result.formatted_address,
    });
  } catch (err) {
    console.error("Places details error:", err);
    res.status(502).json({ error: "Failed to reach Places Details API" });
  }
});

export default router;
