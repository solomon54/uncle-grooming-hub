// src/core/bootstrap.ts
import { runtime } from "@/core/runtime/runtime";

export async function bootstrap(db: any) {
  await runtime.init(db);
  await runtime.replayFromStart();
}
