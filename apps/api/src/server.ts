import { createApp } from "./app";
import { env } from "./config/env";

export const app = createApp();

if (process.env.NODE_ENV !== "test") {
  app.listen(env.PORT, () => {
    console.log(`Villa booking API listening on port/socket: ${env.PORT}`);
  });
}

export default app;
