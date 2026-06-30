import { mkdir, writeFile } from "node:fs/promises";

import { jsPDF } from "jspdf";

const request = {
  id: "CUTI-2026-009",
  employee: "Rani Kusuma",
  nip: "198904122014032001",
  type: "Cuti Tahunan",
  start: "10 Februari 2026",
  end: "12 Februari 2026",
  days: 3,
  reason: "Keperluan keluarga",
  address: "Jl. Pemuda No. 7, Yogyakarta",
  status: "Disetujui",
  reviewer: "Arif Hidayat",
  approver: "Dewi Lestari",
};

const pdf = new jsPDF();

pdf.setFont("helvetica", "bold");
pdf.setFontSize(14);
pdf.text("FORMULIR PERMINTAAN DAN PEMBERIAN CUTI", 105, 20, {
  align: "center",
});
pdf.setFontSize(10);
pdf.text("Peraturan BKN Nomor 24 Tahun 2017", 105, 27, {
  align: "center",
});
pdf.setFont("helvetica", "normal");

const rows = [
  ["Nomor", request.id],
  ["Nama", request.employee],
  ["NIP", request.nip],
  ["Jenis cuti", request.type],
  ["Tanggal", `${request.start} sampai ${request.end}`],
  ["Lama cuti", `${request.days} hari`],
  ["Alasan", request.reason],
  ["Alamat selama cuti", request.address],
  ["Status", request.status],
  ["Atasan Langsung", request.reviewer],
  ["Pejabat Berwenang", request.approver],
];

let y = 42;
for (const [label, value] of rows) {
  pdf.setFont("helvetica", "bold");
  pdf.text(label, 20, y);
  pdf.setFont("helvetica", "normal");
  const lines = pdf.splitTextToSize(String(value), 125);
  pdf.text(lines, 65, y);
  y += Math.max(9, lines.length * 6);
}

pdf.line(20, y + 12, 85, y + 12);
pdf.line(125, y + 12, 190, y + 12);
pdf.text("Atasan Langsung", 52, y + 20, { align: "center" });
pdf.text("Pejabat Berwenang", 157, y + 20, { align: "center" });

await mkdir("public", { recursive: true });
await writeFile(
  `public/${request.id}.pdf`,
  Buffer.from(pdf.output("arraybuffer")),
);

console.log(`public/${request.id}.pdf`);
