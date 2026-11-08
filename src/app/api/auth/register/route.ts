import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email и пароль обязательны" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Пароль должен содержать не менее 6 символов" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Пользователь с таким email уже зарегистрирован" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user along with their default workspace in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: name?.trim() || normalizedEmail.split("@")[0],
          email: normalizedEmail,
          passwordHash,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: `Воркспейс ${newUser.name || "Команда"}`,
          ownerId: newUser.id,
          subscriptionTier: "FREE",
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: newUser.id,
          role: "OWNER",
        },
      });

      return newUser;
    });

    return NextResponse.json(
      {
        message: "Пользователь успешно зарегистрирован",
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json({ error: err.message || "Ошибка при регистрации" }, { status: 500 });
  }
}
