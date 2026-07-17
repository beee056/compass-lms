import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/actions";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const question = await prisma.questionBank.findFirst({
      where: {
        id: params.id,
        OR: [
          { tenantId: null },
          { tenantId: user.tenantId }
        ]
      },
      select: {
        id: true,
        prompt: true,
        modelAnswer: true
      }
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error("Failed to get question bank detail:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
