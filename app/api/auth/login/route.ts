import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db/client";
import { userRoles, users } from "@/lib/db/schema";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    nip?: string;
    password?: string;
  };

  if (!body.nip || !body.password) {
    return NextResponse.json(
      { error: "NIP dan kata sandi wajib diisi." },
      { status: 400 },
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.nip, body.nip),
  });

  if (
    !user ||
    !user.aktif ||
    !(await bcrypt.compare(body.password, user.passwordHash))
  ) {
    return NextResponse.json(
      { error: "NIP atau kata sandi tidak sesuai." },
      { status: 401 },
    );
  }

  const roles = await db.query.userRoles.findMany({
    where: eq(userRoles.nip, user.nip),
  });

  return NextResponse.json({
    ok: true,
    user: {
      nip: user.nip,
      nama: user.nama,
      peran: user.peran,
      peranTambahan: roles.length
        ? roles.map((role) => role.peran)
        : [user.peran],
    },
  });
}
