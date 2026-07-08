import { NextResponse } from "next/server";
import { MODEL_VERSION, SCHEMA_VERSION, APP_NAME } from "@/lib/version";

/**
 * Health check — Phase 0 parity with CAS.
 * Reports env readiness WITHOUT exposing secrets.
 */
export async function GET() {
  return NextResponse.json({
    app: APP_NAME,
    status: "ok",
    modelVersion: MODEL_VERSION,
    schemaVersion: SCHEMA_VERSION,
    env: {
      anthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
      supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
    timestamp: new Date().toISOString(),
  });
}
