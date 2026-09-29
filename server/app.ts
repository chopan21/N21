import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AreaProfile } from "../shared/types.ts";
import { UpstreamError } from "./lib/http.ts";
import { lookupPostcode, nearbyPostcodes, search } from "./sources/postcodes.ts";
import { crimeReport } from "./sources/police.ts";
import { priceReport } from "./sources/landRegistry.ts";
import { floodReport } from "./sources/flood.ts";
import { amenityReport } from "./sources/amenities.ts";
import { airQualityReport } from "./sources/airQuality.ts";

type Handler = (req: Request, res: Response) => Promise<unknown>;

const route =
  (handler: Handler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res)
      .then((body) => {
        if (!res.headersSent) res.json(body);
      })
      .catch(next);
  };

const areaRoute = (load: (area: AreaProfile) => Promise<unknown>) =>
  route(async (req) => load(await lookupPostcode(String(req.params.postcode))));

export interface AppOptions {
  staticDir?: string;
  rateLimitPerMinute?: number;
}

export function createApp(opts: AppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  const api = express.Router();
  api.use(
    rateLimit({
      windowMs: 60_000,
      limit: opts.rateLimitPerMinute ?? 240,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many requests - please slow down and try again shortly." },
    }),
  );

  api.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  api.get(
    "/search",
    route(async (req) => ({ results: await search(String(req.query.q ?? "")) })),
  );

  api.get("/areas/:postcode", areaRoute(async (area) => area));
  api.get("/areas/:postcode/crime", areaRoute((a) => crimeReport(a.latitude, a.longitude)));
  api.get(
    "/areas/:postcode/prices",
    areaRoute(async (a) => {
      const nearby = await nearbyPostcodes(a.latitude, a.longitude);
      const postcodes = [a.postcode, ...nearby.filter((pc) => pc !== a.postcode)];
      return priceReport(postcodes);
    }),
  );
  api.get("/areas/:postcode/flood", areaRoute((a) => floodReport(a.latitude, a.longitude, a.country)));
  api.get("/areas/:postcode/amenities", areaRoute((a) => amenityReport(a.latitude, a.longitude)));
  api.get("/areas/:postcode/air", areaRoute((a) => airQualityReport(a.latitude, a.longitude)));

  api.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use("/api", api);

  if (opts.staticDir && fs.existsSync(opts.staticDir)) {
    const staticDir = opts.staticDir;
    app.use(express.static(staticDir, { index: false, maxAge: "1h" }));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof UpstreamError) {
      const status = err.status === 400 || err.status === 404 ? err.status : 502;
      res.status(status).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong on our side." });
  });

  return app;
}

export const defaultStaticDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
