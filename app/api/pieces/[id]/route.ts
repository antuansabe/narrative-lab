import { NextResponse } from "next/server";
import { deletePiece } from "@/lib/db/mockStore";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pieceId } = await params;
    const result = await deletePiece(pieceId);
    if (!result.deleted) {
      return NextResponse.json({ error: `No se encontró la pieza con ID ${pieceId}.` }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, title: result.title }, { status: 200 });
  } catch (err: any) {
    console.error("[api/pieces/[id]] DELETE error:", err);
    return NextResponse.json({ error: err.message || "No se pudo eliminar la pieza." }, { status: 500 });
  }
}
