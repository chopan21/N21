import { createApp, defaultStaticDir } from "./app.ts";

const port = Number(process.env.PORT ?? 3001);
const isProduction = process.env.NODE_ENV === "production";

const app = createApp({ staticDir: isProduction ? defaultStaticDir : undefined });

app.listen(port, () => {
  const mode = isProduction ? "serving the built site and API" : "API only - run `npm run dev:client` for the site";
  console.log(`N21 Neighbourhood Explorer listening on http://localhost:${port} (${mode})`);
});
