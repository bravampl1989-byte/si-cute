import { NextResponse } from "next/server";

import { GET as getDashboard } from "@/app/api/dashboard/route";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = await getDashboard(
    new Request("http://localhost/api/dashboard?role=admin"),
  );
  const data = (await response.json()) as {
    employees?: Array<Record<string, unknown>>;
    error?: string;
  };

  if (!response.ok || !data.employees) {
    return NextResponse.json(
      { error: data.error ?? "Data pegawai belum bisa dimuat." },
      { status: response.status || 500 },
    );
  }

  const employees = data.employees.map((employee) => ({
    ...employee,
    position: String(employee.position ?? "-"),
    approver: String(employee.approver ?? "Pejabat Berwenang"),
  }));

  return NextResponse.json({ employees, source: "turso-live" });
}
