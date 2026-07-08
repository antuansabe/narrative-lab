import { NextResponse } from "next/server";
import { getCorpora, createCorpus } from "@/lib/db/mockStore";

export async function GET() {
  try {
    const corpora = getCorpora();
    return NextResponse.json({ corpora }, { status: 200 });
  } catch (err: any) {
    console.error("[api/corpora] GET error:", err);
    return NextResponse.json({ error: "Failed to retrieve corpora." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Missing or invalid corpus name." }, { status: 400 });
    }
    const corpus = createCorpus(name);
    return NextResponse.json({ corpus }, { status: 201 });
  } catch (err: any) {
    console.error("[api/corpora] POST error:", err);
    return NextResponse.json({ error: "Failed to create corpus." }, { status: 500 });
  }
}
