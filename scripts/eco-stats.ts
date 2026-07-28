import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
import { getSupabase } from "../lib/db/client";

async function main() {
  const s = getSupabase();
  const { data, error } = await s.from("analyses").select("enactment_score, d1, d2, d3, d4, d5");
  if (error) throw error;
  const rows = data as any[];
  const n = rows.length;
  const mean = (k: string) => rows.reduce((a, r) => a + r[k], 0) / n;
  console.log("analyses:", n);
  console.log("ecosystem mean score:", Math.round(mean("enactment_score")));
  console.log("dims:", ["d1", "d2", "d3", "d4", "d5"].map((k) => k.toUpperCase() + ":" + mean(k).toFixed(1)).join("  "));
}
main().catch((e) => { console.error(e); process.exit(1); });
