"use client";

import {
  Suspense,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Copy,
  Clock3,
  Trash2,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  HelpCircle,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Send,
  ShieldCheck,
  UsersRound,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PaSampangLogo } from "@/components/pa-sampang-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type RequestStatus =
  | "Pending Atasan"
  | "Pending Pejabat"
  | "Disetujui"
  | "Ditolak"
  | "Perbaikan";

type ViewRole = "pegawai" | "pppk" | "atasan" | "pyb" | "admin";

type LeaveRequest = {
  id: string;
  employee: string;
  nip: string;
  type: string;
  start: string;
  end: string;
  submittedAt: string;
  serviceYearsAtSubmission: number;
  serviceMonthsAtSubmission: number;
  days: number;
  reason: string;
  address: string;
  status: RequestStatus;
  reviewer: string;
  approver: string;
  note: string;
};

const leaveTypes = [
  "Cuti Tahunan",
  "Cuti Besar",
  "Cuti Sakit",
  "Cuti Melahirkan",
  "Cuti Alasan Penting",
  "Cuti Di Luar Tanggungan Negara",
];

const pppkLeaveTypes = ["Cuti Tahunan", "Cuti Sakit", "Cuti Melahirkan"];

const monthOptions = [
  "Semua Bulan",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
function getJakartaFiscalYear(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(date),
  );
}

function getJakartaYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Asia/Jakarta",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

const activeFiscalYear = getJakartaFiscalYear();
const employeeGrade = "PENATA MUDA (III/a)";
const gradeOptions = [
  "JURU MUDA (I/a)",
  "JURU MUDA TINGKAT I (I/b)",
  "JURU (I/c)",
  "JURU TINGKAT I (I/d)",
  "PENGATUR MUDA (II/a)",
  "PENGATUR MUDA TINGKAT I (II/b)",
  "PENGATUR (II/c)",
  "PENGATUR TINGKAT I (II/d)",
  "PENATA MUDA (III/a)",
  "PENATA MUDA TINGKAT I (III/b)",
  "PENATA (III/c)",
  "PENATA TINGKAT I (III/d)",
  "PEMBINA (IV/a)",
  "PEMBINA TINGKAT I (IV/b)",
  "PEMBINA UTAMA MUDA (IV/c)",
  "PEMBINA UTAMA MADYA (IV/d)",
  "PEMBINA UTAMA (IV/e)",
];

const initialRequests: LeaveRequest[] = [
  {
    id: "CUTI-2026-018",
    employee: "Rani Kusuma",
    nip: "198904122014032001",
    type: "Cuti Tahunan",
    start: "18 Mei 2026",
    end: "22 Mei 2026",
    submittedAt: "11 Mei 2026",
    serviceYearsAtSubmission: 12,
    serviceMonthsAtSubmission: 1,
    days: 5,
    reason: "Keperluan keluarga di luar kota",
    address: "Jl. Merdeka No. 18, Bandung",
    status: "Pending Atasan",
    reviewer: "Arif Hidayat",
    approver: "Dewi Lestari",
    note: "Menunggu telaah atasan langsung",
  },
  {
    id: "CUTI-2026-017",
    employee: "Bagas Pratama",
    nip: "199102022015041003",
    type: "Cuti Sakit",
    start: "13 Mei 2026",
    end: "15 Mei 2026",
    submittedAt: "12 Mei 2026",
    serviceYearsAtSubmission: 11,
    serviceMonthsAtSubmission: 2,
    days: 3,
    reason: "Pemulihan pasca tindakan medis",
    address: "Jl. Kenanga No. 2, Sleman",
    status: "Pending Pejabat",
    reviewer: "Arif Hidayat",
    approver: "Dewi Lestari",
    note: "Surat dokter terlampir",
  },
  {
    id: "CUTI-2026-016",
    employee: "Nadia Putri",
    nip: "198811232012122002",
    type: "Cuti Sakit",
    start: "4 Mei 2026",
    end: "6 Mei 2026",
    submittedAt: "30 April 2026",
    serviceYearsAtSubmission: 13,
    serviceMonthsAtSubmission: 4,
    days: 3,
    reason: "Pemulihan kesehatan",
    address: "Jl. Ahmad Yani No. 45, Solo",
    status: "Disetujui",
    reviewer: "Arif Hidayat",
    approver: "Dewi Lestari",
    note: "Formulir final tersedia",
  },
  {
    id: "CUTI-2026-009",
    employee: "Rani Kusuma",
    nip: "198904122014032001",
    type: "Cuti Tahunan",
    start: "10 Februari 2026",
    end: "12 Februari 2026",
    submittedAt: "3 Februari 2026",
    serviceYearsAtSubmission: 11,
    serviceMonthsAtSubmission: 10,
    days: 3,
    reason: "Keperluan keluarga",
    address: "Jl. Pemuda No. 7, Yogyakarta",
    status: "Disetujui",
    reviewer: "Arif Hidayat",
    approver: "Dewi Lestari",
    note: "Disetujui final dan kuota telah diperbarui",
  },
  {
    id: "CUTI-2025-041",
    employee: "Rani Kusuma",
    nip: "198904122014032001",
    type: "Cuti Sakit",
    start: "18 November 2025",
    end: "19 November 2025",
    submittedAt: "17 November 2025",
    serviceYearsAtSubmission: 11,
    serviceMonthsAtSubmission: 7,
    days: 2,
    reason: "Istirahat berdasarkan surat keterangan dokter",
    address: "Jl. Pemuda No. 7, Yogyakarta",
    status: "Disetujui",
    reviewer: "Arif Hidayat",
    approver: "Dewi Lestari",
    note: "Surat dokter telah diverifikasi",
  },
  {
    id: "CUTI-2026-005",
    employee: "Arif Hidayat",
    nip: "198503172008011002",
    type: "Cuti Tahunan",
    start: "20 Januari 2026",
    end: "21 Januari 2026",
    submittedAt: "13 Januari 2026",
    serviceYearsAtSubmission: 18,
    serviceMonthsAtSubmission: 0,
    days: 2,
    reason: "Keperluan keluarga",
    address: "Jl. Veteran No. 12, Marabahan",
    status: "Disetujui",
    reviewer: "Dewi Lestari",
    approver: "Sekretaris Daerah",
    note: "Disetujui final dan kuota telah diperbarui",
  },
];

type AdminEmployee = {
  name: string;
  nip: string;
  role: string;
  roles?: string[];
  grade: string;
  serviceYears: number;
  serviceMonths: number;
  serviceAsOf: string;
  supervisor: string;
  quotas: { year: number; remaining: number; used: number }[];
  bknMode: string;
  whatsapp: string;
  whatsappNumber: string;
};

function getEmployeeRoles(employee?: Pick<AdminEmployee, "role" | "roles">) {
  if (!employee) return [];
  return employee.roles?.length ? employee.roles : [employee.role];
}

function hasEmployeeRole(
  employee: Pick<AdminEmployee, "role" | "roles"> | undefined,
  role: string,
) {
  return getEmployeeRoles(employee).includes(role);
}

function formatEmployeeRoles(employee: Pick<AdminEmployee, "role" | "roles">) {
  return getEmployeeRoles(employee).join(", ");
}

const employeeRoleToViewRole: Record<string, ViewRole> = {
  Pegawai: "pegawai",
  PPPK: "pppk",
  "Atasan Langsung": "atasan",
  "Pejabat Berwenang": "pyb",
  "Admin Pembuat Daftar Cuti": "admin",
};

const viewRoleToQuery: Record<ViewRole, string> = {
  pegawai: "pegawai",
  pppk: "pppk",
  atasan: "atasan",
  pyb: "pyb",
  admin: "admin",
};

const viewRoleLabels: Record<ViewRole, string> = {
  pegawai: "Pegawai",
  pppk: "PPPK",
  atasan: "Atasan Langsung",
  pyb: "Pejabat Berwenang",
  admin: "Admin Pembuat Daftar Cuti",
};

const defaultAccountNipByRole: Record<ViewRole, string> = {
  pegawai: "198904122014032001",
  pppk: "198811232012122002",
  atasan: "198503172008011002",
  pyb: "197705182001122001",
  admin: "-",
};

function getEmployeeViewRoles(employee?: Pick<AdminEmployee, "role" | "roles">) {
  return getEmployeeRoles(employee)
    .map((role) => employeeRoleToViewRole[role])
    .filter((role): role is ViewRole => Boolean(role))
    .filter((role, index, roles) => roles.indexOf(role) === index);
}

function ensureAnnualQuotaYear(
  employees: AdminEmployee[],
  year: number,
) {
  return employees.map((employee) => {
    const retainedQuotas = employee.quotas
      .filter((quota) => quota.year >= year - 2)
      .map((quota) => {
        if (quota.year >= year) return quota;

        const remaining = Math.min(quota.remaining, 6);
        return {
          ...quota,
          remaining,
          used: Math.max(0, 12 - remaining),
        };
      });
    const hasCurrentYear = retainedQuotas.some((quota) => quota.year === year);

    return {
      ...employee,
      quotas: [
        ...(hasCurrentYear ? [] : [{ year, remaining: 12, used: 0 }]),
        ...retainedQuotas,
      ].sort((a, b) => b.year - a.year),
    };
  });
}

function advanceServicePeriods(
  employees: AdminEmployee[],
  targetYearMonth: string,
) {
  const [targetYear, targetMonth] = targetYearMonth.split("-").map(Number);
  let changed = false;

  const updated = employees.map((employee) => {
    const [sourceYear, sourceMonth] = employee.serviceAsOf.split("-").map(Number);
    const elapsedMonths =
      (targetYear - sourceYear) * 12 + (targetMonth - sourceMonth);

    if (!Number.isFinite(elapsedMonths) || elapsedMonths <= 0) {
      return employee;
    }

    changed = true;
    const totalMonths =
      employee.serviceYears * 12 + employee.serviceMonths + elapsedMonths;

    return {
      ...employee,
      serviceYears: Math.floor(totalMonths / 12),
      serviceMonths: totalMonths % 12,
      serviceAsOf: targetYearMonth,
    };
  });

  return changed ? updated : employees;
}

const initialAdminEmployees: AdminEmployee[] = [
  {
    name: "Arif Hidayat",
    nip: "198503172008011002",
    role: "Atasan Langsung",
    roles: ["Pegawai", "Atasan Langsung"],
    grade: "PENATA TINGKAT I (III/d)",
    serviceYears: 18,
    serviceMonths: 5,
    serviceAsOf: "2026-06",
    supervisor: "Dewi Lestari",
    quotas: [
      { year: 2026, remaining: 10, used: 2 },
      { year: 2025, remaining: 3, used: 9 },
      { year: 2024, remaining: 0, used: 12 },
    ],
    bknMode: "Normal",
    whatsapp: "Aktif",
    whatsappNumber: "6281555512345",
  },
  {
    name: "Rani Kusuma",
    nip: "198904122014032001",
    role: "Pegawai",
    roles: ["Pegawai"],
    grade: employeeGrade,
    serviceYears: 12,
    serviceMonths: 2,
    serviceAsOf: "2026-06",
    supervisor: "Arif Hidayat",
    quotas: [
      { year: 2026, remaining: 9, used: 3 },
      { year: 2025, remaining: 4, used: 8 },
      { year: 2024, remaining: 2, used: 10 },
    ],
    bknMode: "Normal",
    whatsapp: "Aktif",
    whatsappNumber: "6281234567890",
  },
  {
    name: "Bagas Pratama",
    nip: "199102022015041003",
    role: "Atasan Langsung",
    roles: ["Pegawai", "Atasan Langsung"],
    grade: "PENATA MUDA TINGKAT I (III/b)",
    serviceYears: 11,
    serviceMonths: 3,
    serviceAsOf: "2026-06",
    supervisor: "Dewi Lestari",
    quotas: [
      { year: 2026, remaining: 8, used: 4 },
      { year: 2025, remaining: 1, used: 11 },
      { year: 2024, remaining: 0, used: 12 },
    ],
    bknMode: "Normal",
    whatsapp: "Aktif",
    whatsappNumber: "6281298765432",
  },
  {
    name: "Nadia Putri",
    nip: "198811232012122002",
    role: "PPPK",
    roles: ["PPPK"],
    grade: "",
    serviceYears: 13,
    serviceMonths: 6,
    serviceAsOf: "2026-06",
    supervisor: "Arif Hidayat",
    quotas: [
      { year: 2026, remaining: 10, used: 2 },
      { year: 2025, remaining: 6, used: 6 },
      { year: 2024, remaining: 3, used: 9 },
    ],
    bknMode: "Batas 18 hari",
    whatsapp: "Perlu cek",
    whatsappNumber: "6281387654321",
  },
  {
    name: "Dewi Lestari",
    nip: "197705182001122001",
    role: "Pejabat Berwenang",
    roles: ["Pegawai", "Pejabat Berwenang"],
    grade: "PEMBINA (IV/a)",
    serviceYears: 24,
    serviceMonths: 6,
    serviceAsOf: "2026-06",
    supervisor: "-",
    quotas: [
      { year: 2026, remaining: 12, used: 0 },
      { year: 2025, remaining: 6, used: 0 },
      { year: 2024, remaining: 6, used: 0 },
    ],
    bknMode: "Tidak digunakan 2 tahun",
    whatsapp: "Aktif",
    whatsappNumber: "6281122233344",
  },
];

const statusStyles: Record<RequestStatus, string> = {
  "Pending Atasan": "info",
  "Pending Pejabat": "warning",
  Disetujui: "success",
  Ditolak: "destructive",
  Perbaikan: "outline",
};

function formatRequestServicePeriod(request: LeaveRequest) {
  return `${request.serviceYearsAtSubmission} Tahun ${request.serviceMonthsAtSubmission} Bulan`;
}

function getBknEffectiveQuota(employee: AdminEmployee) {
  const totalRaw = employee.quotas.reduce(
    (sum, quota) => sum + quota.remaining,
    0,
  );
  return Math.min(
    employee.bknMode === "Tidak digunakan 2 tahun" ? 24 : 18,
    totalRaw,
  );
}

function deductAnnualLeaveOldestFirst(employee: AdminEmployee, days: number) {
  let remainingDays = days;
  const deductions: { year: number; days: number }[] = [];
  const quotaUpdates = new Map<number, number>();

  [...employee.quotas]
    .sort((a, b) => a.year - b.year)
    .forEach((quota) => {
      if (remainingDays <= 0) {
        quotaUpdates.set(quota.year, 0);
        return;
      }

      const usedFromYear = Math.min(quota.remaining, remainingDays);
      remainingDays -= usedFromYear;
      quotaUpdates.set(quota.year, usedFromYear);

      if (usedFromYear > 0) {
        deductions.push({ year: quota.year, days: usedFromYear });
      }
    });

  const quotas = employee.quotas.map((quota) => {
    const usedFromYear = quotaUpdates.get(quota.year) ?? 0;

    return {
      ...quota,
      remaining: quota.remaining - usedFromYear,
      used: quota.used + usedFromYear,
    };
  });

  return {
    employee: { ...employee, quotas },
    deductions,
    remainingDays,
  };
}

function getAnnualQuotaStatementRows(
  employee: AdminEmployee | undefined,
  request: LeaveRequest,
) {
  const quotas =
    employee?.quotas
      .filter((quota) => quota.year >= activeFiscalYear - 2)
      .sort((a, b) => a.year - b.year) ?? [];
  const shouldProjectDeduction =
    request.type === "Cuti Tahunan" &&
    request.status !== "Disetujui" &&
    request.status !== "Ditolak";
  let daysToDeduct = shouldProjectDeduction ? request.days : 0;

  return quotas.map((quota) => {
    const deducted = Math.min(quota.remaining, daysToDeduct);
    daysToDeduct -= deducted;
    const remaining = quota.remaining - deducted;

    return {
      year: quota.year,
      remaining: quota.remaining,
      note: String(remaining),
    };
  });
}

const fmtDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

function getLeaveDocumentNumber(request: LeaveRequest) {
  const [, month, year] = request.submittedAt.split(" ");
  const romanMonths: Record<string, string> = {
    Januari: "I",
    Februari: "II",
    Maret: "III",
    April: "IV",
    Mei: "V",
    Juni: "VI",
    Juli: "VII",
    Agustus: "VIII",
    September: "IX",
    Oktober: "X",
    November: "XI",
    Desember: "XII",
  };

  return `............/KPA.W13-A31/KP5.3/${romanMonths[month] ?? "-"}/${year ?? activeFiscalYear}`;
}

function matchesHistoryPeriod(request: LeaveRequest, month: string, year: string) {
  const dateText = `${request.start} ${request.end}`;
  const matchesMonth = month === "Semua Bulan" || dateText.includes(month);
  const matchesYear = dateText.includes(year);

  return matchesMonth && matchesYear;
}

function diffDays(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
  return Number.isFinite(diff) && diff > 0 ? diff : 1;
}

function buildVerificationPayload(
  request: LeaveRequest,
  signerName: string,
  signerNip: string,
) {
  return [
    `Telah ditandatangani oleh ${signerName}`,
    `NIP ${signerNip}`,
    `Dokumen ${request.id}`,
    `${request.type} ${request.start} s/d ${request.end}`,
    `Status ${request.status}`,
    "Diverifikasi melalui SI CUTE",
  ].join("\n");
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUserNip = "198904122014032001";
  const currentSupervisorName = "Arif Hidayat";
  const currentPybName = "Dewi Lestari";
  const currentPybNip = "197705182001122001";
  const [viewRole, setViewRole] = useState<ViewRole>("pegawai");
  const [activeAccountNip, setActiveAccountNip] = useState(currentUserNip);
  const [adminEmployees, setAdminEmployees] = useState(() =>
    advanceServicePeriods(
      ensureAnnualQuotaYear(initialAdminEmployees, activeFiscalYear),
      getJakartaYearMonth(),
    ),
  );
  const [requests, setRequests] = useState(initialRequests);
  const [leaveType, setLeaveType] = useState("Cuti Tahunan");
  const [startDate, setStartDate] = useState("2026-05-25");
  const [endDate, setEndDate] = useState("2026-05-27");
  const [reason, setReason] = useState("Keperluan keluarga");
  const [address, setAddress] = useState("Jl. Pemuda No. 7, Yogyakarta");
  const [supportingDocument, setSupportingDocument] = useState<File | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState(initialRequests[0].id);
  const [activeTab, setActiveTab] = useState("approval");
  const [historyMonth, setHistoryMonth] = useState("Semua Bulan");
  const [historyYear, setHistoryYear] = useState(String(activeFiscalYear));
  const [historyScope, setHistoryScope] = useState<"bawahan" | "pribadi">(
    "bawahan",
  );
  const [headerPanel, setHeaderPanel] = useState<
    "help" | "notifications" | "profile" | null
  >(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    mode?: "add" | "edit" | "delete";
    employee?: AdminEmployee;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [fonnteToken, setFonnteToken] = useState("");
  const [fonnteTokenStatus, setFonnteTokenStatus] = useState(
    "Belum dicek",
  );
  const [testWaNumber, setTestWaNumber] = useState("6281234567890");
  const [isSavingFonnte, setIsSavingFonnte] = useState(false);
  const [isTestingFonnte, setIsTestingFonnte] = useState(false);

  useEffect(() => {
    const role = searchParams.get("role");
    const accountNipParam = searchParams.get("nip");

    if (role === "admin") {
      setViewRole("admin");
      setActiveAccountNip(accountNipParam ?? defaultAccountNipByRole.admin);
      setActiveTab("admin");
    } else if (role === "atasan") {
      setViewRole("atasan");
      setActiveAccountNip(accountNipParam ?? defaultAccountNipByRole.atasan);
      setActiveTab("approval");
    } else if (role === "pyb") {
      setViewRole("pyb");
      setActiveAccountNip(accountNipParam ?? defaultAccountNipByRole.pyb);
      setActiveTab("approval");
    } else if (role === "pppk") {
      setViewRole("pppk");
      setActiveAccountNip(accountNipParam ?? defaultAccountNipByRole.pppk);
      setActiveTab("approval");
    } else {
      setViewRole("pegawai");
      setActiveAccountNip(accountNipParam ?? defaultAccountNipByRole.pegawai);
      setActiveTab("approval");
    }
  }, [searchParams]);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("cutipns:fonnte-token") ?? "";
    setFonnteToken(savedToken);

    fetch("/api/admin/whatsapp-settings")
      .then((response) => response.json())
      .then(
        (data: {
          hasRuntimeToken?: boolean;
          hasEnvToken?: boolean;
          maskedEnvToken?: string;
        }) => {
          if (data.hasRuntimeToken) {
            setFonnteTokenStatus("Token dashboard aktif");
            return;
          }

          if (data.hasEnvToken) {
            setFonnteTokenStatus(
              `Token env aktif ${data.maskedEnvToken ? `(${data.maskedEnvToken})` : ""}`,
            );
            return;
          }

          setFonnteTokenStatus("Token belum disetel");
        },
      )
      .catch(() => setFonnteTokenStatus("Status token belum bisa dicek"));
  }, []);

  useEffect(() => {
    if (!currentTime) return;

    if (getJakartaFiscalYear(currentTime) > activeFiscalYear) {
      window.location.reload();
      return;
    }

    setAdminEmployees((current) =>
      advanceServicePeriods(current, getJakartaYearMonth(currentTime)),
    );
  }, [currentTime]);

  const availableLeaveTypes =
    viewRole === "pppk" ? pppkLeaveTypes : leaveTypes;

  useEffect(() => {
    if (!availableLeaveTypes.includes(leaveType)) {
      setLeaveType(availableLeaveTypes[0]);
    }
  }, [availableLeaveTypes, leaveType]);

  const accountEmployee = adminEmployees.find(
    (employee) => employee.nip === activeAccountNip,
  );
  const accountName =
    accountEmployee?.name ??
    (viewRole === "admin" ? "Admin Pembuat Daftar Cuti" : "Pengguna");
  const accountNip = accountEmployee?.nip ?? activeAccountNip;
  const accountSupervisor = accountEmployee?.supervisor ?? "-";
  const employeeRequests = requests.filter(
    (request) => request.nip === accountNip,
  );
  const pppkRequests = requests.filter(
    (request) => request.nip === accountNip,
  );
  const supervisorRequests = requests.filter(
    (request) => request.reviewer === accountName,
  );
  const supervisorPersonalRequests = requests.filter(
    (request) => request.nip === accountNip,
  );
  const pybRequests = requests.filter(
    (request) => request.approver === accountName,
  );
  const dashboardRequests =
    viewRole === "pegawai"
      ? employeeRequests
      : viewRole === "pppk"
        ? pppkRequests
        : viewRole === "atasan"
          ? supervisorRequests
          : viewRole === "pyb"
            ? pybRequests
            : requests;
  const visibleApprovals = dashboardRequests.filter(
    (request) =>
      viewRole === "atasan"
        ? request.status === "Pending Atasan" || request.status === "Perbaikan"
        : viewRole === "pyb"
          ? request.status === "Pending Pejabat"
          : request.status === "Pending Atasan" ||
            request.status === "Pending Pejabat" ||
            request.status === "Perbaikan",
  );
  const selectedPool =
    activeTab === "approval"
      ? visibleApprovals
      : viewRole === "atasan" && historyScope === "pribadi"
        ? supervisorPersonalRequests
        : dashboardRequests;
  const selected =
    selectedPool.find((request) => request.id === selectedId) ??
    selectedPool[0] ??
    dashboardRequests[0];
  const currentEmployee = accountEmployee;
  const annualQuotaRows =
    currentEmployee?.quotas
      .filter((quota) => quota.year >= activeFiscalYear - 2)
      .sort((a, b) => b.year - a.year) ?? [];
  const annualCurrentLeft =
    annualQuotaRows.find((quota) => quota.year === activeFiscalYear)?.remaining ??
    0;
  const annualCarryOverLeft = annualQuotaRows
    .filter((quota) => quota.year < activeFiscalYear)
    .reduce((total, quota) => total + quota.remaining, 0);
  const annualEffectiveLeft = annualCurrentLeft + annualCarryOverLeft;
  const sickDaysUsed = dashboardRequests
    .filter(
      (request) =>
        request.status === "Disetujui" && request.type === "Cuti Sakit",
    )
    .reduce((total, request) => total + request.days, 0);
  const quotaTotal = 12;
  const pendingLeader = dashboardRequests.filter(
    (request) => request.status === "Pending Atasan",
  ).length;
  const pendingPyb = dashboardRequests.filter(
    (request) => request.status === "Pending Pejabat",
  ).length;
  const roleLabel = viewRoleLabels[viewRole];
  const accountSwitchRoles = getEmployeeViewRoles(accountEmployee);
  const dashboardTitle =
    viewRole === "atasan"
      ? "Dashboard Atasan Langsung"
      : viewRole === "pyb"
        ? "Dashboard Pejabat Berwenang"
        : viewRole === "admin"
          ? "Dashboard Admin"
          : "Dashboard Cuti";
  const dashboardDescription =
    viewRole === "atasan"
      ? "Telaah pengajuan bawahan, beri keputusan tingkat 1, dan teruskan ke Pejabat Berwenang."
      : viewRole === "pyb"
        ? "Validasi keputusan atasan, berikan persetujuan final, dan terbitkan dokumen cuti."
        : viewRole === "admin"
          ? "Kelola pegawai, role, kuota cuti, token WhatsApp, dan rekap dokumen dari satu dashboard."
          : "Pantau hak cuti, proses persetujuan berjenjang, dan dokumen resmi dalam satu ruang kerja yang ringkas.";
  const roleNotificationRequest =
    viewRole === "pegawai" || viewRole === "pppk"
      ? dashboardRequests.find((request) =>
          ["Pending Atasan", "Pending Pejabat", "Perbaikan"].includes(
            request.status,
          ),
        )
      : viewRole === "atasan"
        ? supervisorRequests.find(
            (request) => request.status === "Pending Atasan",
          )
        : viewRole === "pyb"
          ? pybRequests.find(
              (request) => request.status === "Pending Pejabat",
            )
          : requests.find((request) =>
              ["Pending Atasan", "Pending Pejabat", "Perbaikan"].includes(
                request.status,
              ),
            );
  const notificationDescription = roleNotificationRequest
    ? viewRole === "pegawai" || viewRole === "pppk"
      ? `Pengajuan ${roleNotificationRequest.id} berstatus ${roleNotificationRequest.status}.`
      : viewRole === "atasan"
        ? `Pengajuan ${roleNotificationRequest.id} dari ${roleNotificationRequest.employee} menunggu telaah Anda.`
        : viewRole === "pyb"
          ? `Pengajuan ${roleNotificationRequest.id} dari ${roleNotificationRequest.employee} menunggu keputusan final Anda.`
          : `Pengajuan ${roleNotificationRequest.id} memerlukan tindak lanjut pengelola.`
    : "Tidak ada notifikasi baru untuk akun ini.";
  const historySourceRequests =
    viewRole === "atasan"
      ? historyScope === "pribadi"
        ? supervisorPersonalRequests
        : supervisorRequests
      : dashboardRequests;
  const historyYears = Array.from(
    new Set(
      historySourceRequests.flatMap((request) =>
        [request.start, request.end]
          .join(" ")
          .match(/\b20\d{2}\b/g) ?? [],
      ),
    ),
  ).sort((a, b) => Number(b) - Number(a));
  const visibleHistory = historySourceRequests.filter((request) =>
    matchesHistoryPeriod(request, historyMonth, historyYear),
  );
  const adminCarryOverTotal = adminEmployees.reduce(
    (total, employee) =>
      total +
      Math.min(
        employee.bknMode === "Tidak digunakan 2 tahun" ? 12 : 6,
        employee.quotas
          .filter((quota) => quota.year < activeFiscalYear)
          .reduce((sum, quota) => sum + quota.remaining, 0),
      ),
    0,
  );
  const adminAvailableTotal = adminEmployees.reduce(
    (total, employee) =>
      total +
      Math.min(
        employee.bknMode === "Tidak digunakan 2 tahun" ? 24 : 18,
        employee.quotas.reduce((sum, quota) => sum + quota.remaining, 0),
      ),
    0,
  );

  const newRequestDays = useMemo(
    () => diffDays(startDate, endDate),
    [endDate, startDate],
  );
  const requiresSupportingDocument = leaveType !== "Cuti Tahunan";
  const currentDateText = currentTime
    ? currentTime.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      })
    : "Memuat tanggal";
  const currentClockText = currentTime
    ? currentTime.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      })
    : "--.--.--";
  const waTemplateRequest = selected ?? requests[0];
  const waLeaveRequestTemplate = `Yth. ${waTemplateRequest.reviewer},

Ada pengajuan cuti baru yang perlu ditelaah:

Nomor: ${waTemplateRequest.id}
Pegawai: ${waTemplateRequest.employee}
NIP: ${waTemplateRequest.nip}
Jenis Cuti: ${waTemplateRequest.type}
Tanggal: ${waTemplateRequest.start} s.d. ${waTemplateRequest.end}
Lama Cuti: ${waTemplateRequest.days} hari kerja
Alasan: ${waTemplateRequest.reason}

Silakan buka aplikasi SI CUTE untuk memberikan keputusan: Setujui, Tunda, atau Tolak.

Pesan ini dikirim otomatis oleh SI CUTE.`;

  function submitRequest() {
    if (requiresSupportingDocument && !supportingDocument) {
      showToast(`Dokumen pendukung wajib untuk ${leaveType}.`);
      return;
    }

    const applicantName = accountEmployee?.name ?? accountName;
    const applicantNip = accountEmployee?.nip ?? accountNip;
    const applicantEmployee = adminEmployees.find(
      (employee) => employee.nip === applicantNip,
    );
    const applicantSupervisor =
      applicantEmployee?.supervisor && applicantEmployee.supervisor !== "-"
        ? applicantEmployee.supervisor
        : currentSupervisorName;
    const id = `CUTI-${activeFiscalYear}-${String(requests.length + 19).padStart(3, "0")}`;
    const nextRequest: LeaveRequest = {
      id,
      employee: applicantName,
      nip: applicantNip,
      type: leaveType,
      start: fmtDate(startDate),
      end: fmtDate(endDate),
      submittedAt: fmtDate(new Date().toISOString()),
      serviceYearsAtSubmission: applicantEmployee?.serviceYears ?? 0,
      serviceMonthsAtSubmission: applicantEmployee?.serviceMonths ?? 0,
      days: newRequestDays,
      reason,
      address,
      status: "Pending Atasan",
      reviewer: applicantSupervisor,
      approver:
        applicantSupervisor === currentPybName
          ? "Sekretaris Daerah"
          : currentPybName,
      note: "Notifikasi WA terkirim ke atasan langsung",
    };
    setRequests((current) => [nextRequest, ...current]);
    setSelectedId(id);
    setActiveTab("approval");
    showToast(`${id} berhasil dikirim ke atasan langsung.`);
  }

  function moveRequest(id: string, status: RequestStatus, note: string) {
    const targetRequest = requests.find((request) => request.id === id);
    let finalNote = note;

    if (
      targetRequest &&
      status === "Disetujui" &&
      targetRequest.status !== "Disetujui" &&
      targetRequest.type === "Cuti Tahunan"
    ) {
      const targetEmployee = adminEmployees.find(
        (employee) => employee.nip === targetRequest.nip,
      );

      if (!targetEmployee) {
        showToast("Data pegawai tidak ditemukan untuk pemotongan kuota.");
        return;
      }

      const deductionResult = deductAnnualLeaveOldestFirst(
        targetEmployee,
        targetRequest.days,
      );

      if (deductionResult.remainingDays > 0) {
        showToast("Sisa cuti tahunan tidak cukup untuk pengajuan ini.");
        return;
      }

      setAdminEmployees((current) =>
        current.map((employee) =>
          employee.nip === targetEmployee.nip
            ? deductionResult.employee
            : employee,
        ),
      );

      const deductionText = deductionResult.deductions
        .map((deduction) => `${deduction.year}: ${deduction.days} hari`)
        .join(", ");
      finalNote = `${note}. Kuota dipotong dari saldo terlama (${deductionText})`;
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === id ? { ...request, status, note: finalNote } : request,
      ),
    );
    showToast(finalNote);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  function openAction(
    title: string,
    description: string,
    confirmLabel = "Simpan",
    options?: {
      mode?: "add" | "edit" | "delete";
      employee?: AdminEmployee;
    },
  ) {
    setDialog({ title, description, confirmLabel, ...options });
  }

  async function saveFonnteToken() {
    if (fonnteToken.trim().length < 8) {
      showToast("Token Fonnte minimal 8 karakter.");
      return;
    }

    setIsSavingFonnte(true);
    try {
      const response = await fetch("/api/admin/whatsapp-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", token: fonnteToken }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        maskedToken?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Token gagal disimpan.");
      }

      window.localStorage.setItem("cutipns:fonnte-token", fonnteToken);
      setFonnteTokenStatus(
        `Token dashboard aktif${result.maskedToken ? ` (${result.maskedToken})` : ""}`,
      );
      showToast("Token API Fonnte berhasil disimpan.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Token gagal disimpan.");
    } finally {
      setIsSavingFonnte(false);
    }
  }

  async function clearFonnteToken() {
    setIsSavingFonnte(true);
    try {
      const response = await fetch("/api/admin/whatsapp-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        hasEnvToken?: boolean;
        maskedEnvToken?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error("Token dashboard gagal dihapus.");
      }

      setFonnteToken("");
      window.localStorage.removeItem("cutipns:fonnte-token");
      setFonnteTokenStatus(
        result.hasEnvToken
          ? `Token env aktif ${result.maskedEnvToken ? `(${result.maskedEnvToken})` : ""}`
          : "Token belum disetel",
      );
      showToast("Token dashboard berhasil dihapus.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Token gagal dihapus.");
    } finally {
      setIsSavingFonnte(false);
    }
  }

  async function testFonnteToken() {
    const normalizedNumber = testWaNumber.replace(/[^\d]/g, "");

    if (!normalizedNumber.startsWith("62")) {
      showToast("Nomor tes WA gunakan format 62, contoh 6281234567890.");
      return;
    }

    setIsTestingFonnte(true);
    try {
      const response = await fetch("/api/admin/whatsapp-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          to: normalizedNumber,
          message: waLeaveRequestTemplate,
        }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Tes WA belum berhasil dikirim.");
      }

      showToast("Tes WhatsApp berhasil dikirim melalui Fonnte.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Tes WA gagal dikirim.");
    } finally {
      setIsTestingFonnte(false);
    }
  }

  async function copyWaTemplate() {
    try {
      await navigator.clipboard.writeText(waLeaveRequestTemplate);
      showToast("Template pesan WA berhasil disalin.");
    } catch {
      showToast("Template belum bisa disalin otomatis.");
    }
  }

  function confirmAction(updatedEmployee?: AdminEmployee) {
    if (!dialog) return;

    if (dialog.mode === "delete" && dialog.employee) {
      setAdminEmployees((current) =>
        current.filter((employee) => employee.nip !== dialog.employee?.nip),
      );
    }

    if (dialog.mode === "edit" && updatedEmployee) {
      setAdminEmployees((current) =>
        current.map((employee) =>
          employee.nip === dialog.employee?.nip ? updatedEmployee : employee,
        ),
      );
    }

    if (dialog.mode === "add" && updatedEmployee) {
      setAdminEmployees((current) => [updatedEmployee, ...current]);
    }

    if (dialog.title.startsWith("Reset")) {
      setAdminEmployees((current) =>
        ensureAnnualQuotaYear(current, activeFiscalYear),
      );
    }

    showToast(`${dialog.title} berhasil diproses.`);
    setDialog(null);
  }

  async function downloadPdf(request: LeaveRequest) {
    const { jsPDF } = await import("jspdf");
    const QRCode = await import("qrcode");
    const pdf = new jsPDF();
    const requestEmployee = adminEmployees.find(
      (employee) => employee.nip === request.nip,
    );
    const annualStatementRows = getAnnualQuotaStatementRows(
      requestEmployee,
      request,
    );
    const hasReviewerSignature = request.status !== "Pending Atasan";
    const hasApproverSignature =
      request.status === "Disetujui" || request.status === "Ditolak";
    const employeeQr = await QRCode.toDataURL(
      buildVerificationPayload(request, request.employee.toUpperCase(), request.nip),
      { errorCorrectionLevel: "M", margin: 1, width: 160 },
    );
    const reviewerQr = hasReviewerSignature
      ? await QRCode.toDataURL(
          buildVerificationPayload(
            request,
            request.reviewer.toUpperCase(),
            "198503172008011002",
          ),
          { errorCorrectionLevel: "M", margin: 1, width: 160 },
        )
      : "";
    const approverQr = hasApproverSignature
      ? await QRCode.toDataURL(
          buildVerificationPayload(
            request,
            request.approver.toUpperCase(),
            request.approver === currentPybName ? currentPybNip : "-",
          ),
          { errorCorrectionLevel: "M", margin: 1, width: 160 },
        )
      : "";
    const selectedLeaveType = request.type.replace("Cuti ", "");
    const leaveRows = [
      ["1. Cuti Tahunan", "2. Cuti Besar"],
      ["3. Cuti Sakit", "4. Cuti Melahirkan"],
      ["5. Cuti Karena Alasan Penting", "6. Cuti di Luar Tanggungan Negara"],
    ];
    const submissionDate = request.submittedAt;
    const ymd = (dateText: string) => {
      const [day, month, year] = dateText.split(" ");
      const monthMap: Record<string, string> = {
        Januari: "01",
        Februari: "02",
        Maret: "03",
        April: "04",
        Mei: "05",
        Juni: "06",
        Juli: "07",
        Agustus: "08",
        September: "09",
        Oktober: "10",
        November: "11",
        Desember: "12",
      };
      return `${year}-${monthMap[month] ?? "01"}-${day.padStart(2, "0")}`;
    };
    const mark = (label: string) =>
      label.toLowerCase().includes(selectedLeaveType.toLowerCase()) ? "✓" : "";
    const isSelectedLeave = (label: string) =>
      label.toLowerCase().includes(selectedLeaveType.toLowerCase());
    const drawCell = (
      text: string,
      x: number,
      y: number,
      w: number,
      h: number,
      options?: { bold?: boolean; align?: "left" | "center"; fontSize?: number },
    ) => {
      pdf.rect(x, y, w, h);
      pdf.setFont("helvetica", options?.bold ? "bold" : "normal");
      pdf.setFontSize(options?.fontSize ?? 7);
      const lines = pdf.splitTextToSize(text, w - 3);
      const tx = options?.align === "center" ? x + w / 2 : x + 1.5;
      pdf.text(lines, tx, y + Math.min(h - 1.5, 4.2), {
        align: options?.align ?? "left",
      });
    };
    const sectionTitle = (title: string, y: number) => {
      pdf.setFillColor(235, 235, 235);
      drawCell(title, 15, y, 180, 5, { bold: true, fontSize: 6.5 });
    };

    if (hasEmployeeRole(requestEmployee, "PPPK")) {
      pdf.setLineWidth(0.25);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.text(
        [
          "LAMPIRAN II",
          "KEPUTUSAN SEKRETARIS MAHKAMAH AGUNG",
          "REPUBLIK INDONESIA",
          "NOMOR : 212/SEK/SK.KP5.3/II/2024",
          "TANGGAL : 23 Februari 2024",
        ],
        130,
        8,
      );
      pdf.setFontSize(7);
      pdf.text("Sampang, " + submissionDate, 130, 32);
      pdf.text(["Yth. Ketua Pengadilan Agama Sampang", "Di", "Sampang"], 122, 41);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("FORMULIR PERMINTAAN DAN PEMBERIAN CUTI", 105, 58, {
        align: "center",
      });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text(`Nomor : ${getLeaveDocumentNumber(request)}`, 105, 63, {
        align: "center",
      });

      sectionTitle("I. DATA PEGAWAI", 68);
      drawCell("NAMA", 15, 73, 25, 6, { bold: true });
      drawCell(request.employee.toUpperCase(), 40, 73, 55, 6);
      drawCell("NIP", 95, 73, 25, 6, { bold: true });
      drawCell(request.nip, 120, 73, 75, 6);
      drawCell("JABATAN", 15, 79, 25, 6, { bold: true });
      drawCell("OPERATOR LAYANAN OPERASIONAL", 40, 79, 55, 6, { fontSize: 5.8 });
      drawCell("MASA KERJA", 95, 79, 25, 6, { bold: true });
      drawCell(formatRequestServicePeriod(request).toUpperCase(), 120, 79, 75, 6);
      drawCell("UNIT KERJA", 15, 85, 25, 6, { bold: true });
      drawCell("PENGADILAN AGAMA SAMPANG", 40, 85, 155, 6);

      sectionTitle("II. JENIS CUTI YANG DIAMBIL", 96);
      drawCell("1. CUTI TAHUNAN", 15, 101, 160, 6);
      drawCell(isSelectedLeave("Tahunan") ? "✓" : "", 175, 101, 20, 6, { align: "center", bold: true, fontSize: 9 });
      drawCell("2. CUTI SAKIT", 15, 107, 160, 6);
      drawCell(isSelectedLeave("Sakit") ? "✓" : "", 175, 107, 20, 6, { align: "center", bold: true, fontSize: 9 });
      drawCell("3. CUTI MELAHIRKAN", 15, 113, 160, 6);
      drawCell(isSelectedLeave("Melahirkan") ? "✓" : "", 175, 113, 20, 6, { align: "center", bold: true, fontSize: 9 });

      sectionTitle("IV. LAMANYA CUTI", 124);
      drawCell("Selama", 15, 129, 25, 7, { bold: true });
      drawCell(`${request.days} hari`, 40, 129, 45, 7);
      drawCell("Mulai tanggal", 85, 129, 32, 7, { bold: true });
      drawCell(ymd(request.start), 117, 129, 33, 7, { align: "center" });
      drawCell("s.d.", 150, 129, 12, 7, { align: "center" });
      drawCell(ymd(request.end), 162, 129, 33, 7, { align: "center" });

      sectionTitle("V. CATATAN CUTI", 142);
      drawCell("1. CUTI TAHUNAN", 15, 147, 35, 24, { bold: true, fontSize: 6.2 });
      drawCell("TAHUN", 50, 147, 25, 6, { bold: true, align: "center" });
      drawCell("SISA", 75, 147, 20, 6, { bold: true, align: "center" });
      drawCell("KETERANGAN", 95, 147, 35, 6, { bold: true, align: "center" });
      drawCell("PARAF PETUGAS CUTI", 130, 147, 65, 6, { bold: true, align: "center", fontSize: 6.2 });
      drawCell("", 130, 153, 65, 30);
      annualStatementRows.forEach((quota, index) => {
        const y = 153 + index * 6;
        drawCell(String(quota.year), 50, y, 25, 6, { align: "center" });
        drawCell(String(quota.remaining), 75, y, 20, 6, { align: "center" });
        drawCell(quota.note, 95, y, 35, 6, { fontSize: 5.8 });
      });
      drawCell("2. CUTI SAKIT", 15, 171, 115, 6, { bold: true });
      drawCell("3. CUTI MELAHIRKAN", 15, 177, 115, 6, { bold: true });

      sectionTitle("VI. ALAMAT SELAMA MENJALANKAN CUTI", 190);
      drawCell(request.address.toUpperCase(), 15, 195, 95, 38);
      drawCell("TELP", 110, 195, 20, 7, { bold: true, align: "center" });
      drawCell("085234566541", 130, 195, 65, 7, { align: "center" });
      drawCell("", 110, 202, 85, 31);
      pdf.setFontSize(5.6);
      pdf.text("Hormat saya,", 152.5, 207, { align: "center" });
      pdf.addImage(employeeQr, "PNG", 147.5, 209, 10, 10);
      pdf.text("Telah ditandatangani oleh", 152.5, 221, { align: "center" });
      pdf.setFont("helvetica", "bold");
      pdf.text(request.employee.toUpperCase(), 152.5, 224, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.text(`NIP. ${request.nip}`, 152.5, 227, { align: "center" });

      sectionTitle("VII. PERTIMBANGAN ATASAN LANGSUNG", 238);
      drawCell("DISETUJUI", 15, 243, 60, 6, { bold: true, align: "center" });
      drawCell("PERUBAHAN", 75, 243, 60, 6, { bold: true, align: "center" });
      drawCell("DITANGGUHKAN", 135, 243, 60, 6, { bold: true, align: "center" });
      drawCell(["Pending Pejabat", "Disetujui"].includes(request.status) ? "✓" : "", 15, 249, 60, 6, { align: "center", bold: true, fontSize: 8 });
      drawCell(request.status === "Perbaikan" ? "✓" : "", 75, 249, 60, 6, { align: "center", bold: true, fontSize: 8 });
      drawCell("", 135, 249, 60, 6);
      drawCell("", 15, 255, 80, 21);
      drawCell("", 95, 255, 100, 21);
      pdf.setFontSize(5.4);
      pdf.text("Pejabat yang memberi pertimbangan,", 145, 259, { align: "center" });
      if (hasReviewerSignature) {
        pdf.addImage(reviewerQr, "PNG", 140, 260, 10, 10);
        pdf.text("Telah ditandatangani oleh", 145, 272, { align: "center" });
        pdf.setFont("helvetica", "bold");
        pdf.text(request.reviewer.toUpperCase(), 145, 274, { align: "center" });
      } else {
        pdf.setFont("helvetica", "bold");
        pdf.text("DRAFT", 145, 267, { align: "center" });
      }

      sectionTitle("VIII. KEPUTUSAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI", 280);
      drawCell("DISETUJUI", 15, 285, 60, 5, { bold: true, align: "center", fontSize: 5.8 });
      drawCell("PERUBAHAN", 75, 285, 60, 5, { bold: true, align: "center", fontSize: 5.8 });
      drawCell("DITANGGUHKAN", 135, 285, 60, 5, { bold: true, align: "center", fontSize: 5.8 });
      drawCell(request.status === "Disetujui" ? "✓" : "", 15, 290, 60, 5, { align: "center", bold: true, fontSize: 8 });
      drawCell("", 75, 290, 60, 5);
      drawCell("", 135, 290, 60, 5);

      pdf.save(`${request.id}.pdf`);
      showToast(`PDF ${request.id} berhasil diunduh.`);
      return;
    }

    pdf.setLineWidth(0.25);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.text(
      [
        "LAMPIRAN II:",
        "SURAT EDARAN SEKRETARIS MAHKAMAH AGUNG",
        "REPUBLIK INDONESIA",
        "NOMOR 13 TAHUN 2019",
      ],
      130,
      8,
    );
    pdf.setFontSize(7);
    pdf.text("Sampang, " + submissionDate, 130, 25);
    pdf.text(["Yth. Ketua Pengadilan Agama Sampang", "di", "Sampang"], 122, 34);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("FORMULIR PERMINTAAN DAN PEMBERIAN CUTI", 105, 43, {
      align: "center",
    });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(`Nomor: ${getLeaveDocumentNumber(request)}`, 105, 48, {
      align: "center",
    });

    sectionTitle("I. DATA PEGAWAI", 51);
    drawCell("Nama", 15, 56, 25, 6, { bold: true });
    drawCell(request.employee.toUpperCase(), 40, 56, 55, 6);
    drawCell("NIP", 95, 56, 25, 6, { bold: true });
    drawCell(request.nip, 120, 56, 75, 6);
    drawCell("Jabatan", 15, 62, 25, 6, { bold: true });
    drawCell("Pelaksana", 40, 62, 55, 6);
    drawCell("GOL. RUANG", 95, 62, 25, 6, { bold: true });
    drawCell(requestEmployee?.grade ?? employeeGrade, 120, 62, 75, 6);
    drawCell("Unit Kerja", 15, 68, 25, 6, { bold: true });
    drawCell("PENGADILAN AGAMA SAMPANG", 40, 68, 55, 6);
    drawCell("MASA KERJA", 95, 68, 25, 6, { bold: true });
    drawCell(formatRequestServicePeriod(request), 120, 68, 75, 6);

    sectionTitle("II. JENIS CUTI YANG DIAMBIL", 76);
    leaveRows.forEach((row, index) => {
      const y = 81 + index * 6;
      drawCell(row[0], 15, y, 75, 6);
      drawCell(mark(row[0]), 90, y, 15, 6, { align: "center", bold: true });
      drawCell(row[1], 105, y, 75, 6);
      drawCell(mark(row[1]), 180, y, 15, 6, { align: "center", bold: true });
    });

    sectionTitle("III. ALASAN CUTI", 102);
    drawCell(request.reason, 15, 107, 180, 7);

    sectionTitle("IV. LAMANYA CUTI", 117);
    drawCell("Selama", 15, 122, 25, 7, { bold: true });
    drawCell(`${request.days} hari kerja`, 40, 122, 45, 7);
    drawCell("Mulai tanggal", 85, 122, 32, 7, { bold: true });
    drawCell(ymd(request.start), 117, 122, 33, 7, { align: "center" });
    drawCell("s/d", 150, 122, 12, 7, { align: "center" });
    drawCell(ymd(request.end), 162, 122, 33, 7, { align: "center" });

    sectionTitle("V. CATATAN CUTI", 132);
    drawCell("1. CUTI TAHUNAN", 15, 137, 70, 6, { bold: true });
    drawCell("PARAF PETUGAS CUTI", 85, 137, 25, 6, { bold: true, align: "center", fontSize: 5.8 });
    drawCell("2. CUTI BESAR", 110, 137, 85, 6, { bold: true });
    drawCell("Tahun", 15, 143, 22, 6, { bold: true });
    drawCell("Sisa", 37, 143, 20, 6, { bold: true });
    drawCell("Keterangan", 57, 143, 28, 6, { bold: true });
    drawCell("", 85, 143, 25, 24);
    drawCell("3. CUTI SAKIT", 110, 143, 85, 6, { bold: true });
    drawCell(String(annualStatementRows[0]?.year ?? activeFiscalYear - 2), 15, 149, 22, 6);
    drawCell(String(annualStatementRows[0]?.remaining ?? 0), 37, 149, 20, 6);
    drawCell(annualStatementRows[0]?.note ?? "Tidak tersedia", 57, 149, 28, 6, { fontSize: 5.7 });
    drawCell("4. CUTI MELAHIRKAN", 110, 149, 85, 6, { bold: true });
    drawCell(String(annualStatementRows[1]?.year ?? activeFiscalYear - 1), 15, 155, 22, 6);
    drawCell(String(annualStatementRows[1]?.remaining ?? 0), 37, 155, 20, 6);
    drawCell(annualStatementRows[1]?.note ?? "Tidak tersedia", 57, 155, 28, 6, { fontSize: 5.7 });
    drawCell("5. CUTI KARENA ALASAN PENTING", 110, 155, 85, 6, { bold: true, fontSize: 6.2 });
    drawCell(String(annualStatementRows[2]?.year ?? activeFiscalYear), 15, 161, 22, 6);
    drawCell(String(annualStatementRows[2]?.remaining ?? 0), 37, 161, 20, 6);
    drawCell(annualStatementRows[2]?.note ?? "Tidak tersedia", 57, 161, 28, 6, { fontSize: 5.7 });
    drawCell("6. CUTI DI LUAR TANGGUNGAN NEGARA", 110, 161, 85, 6, { bold: true, fontSize: 6.2 });

    sectionTitle("VI. ALAMAT SELAMA MENJALANKAN CUTI", 170);
    drawCell(request.address.toUpperCase(), 15, 175, 95, 40);
    drawCell("Telp.", 110, 175, 20, 7, { bold: true, align: "center", fontSize: 6.2 });
    drawCell("085234566541", 130, 175, 65, 7, { align: "center" });
    drawCell("", 110, 182, 85, 33);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.2);
    pdf.text("Hormat saya,", 152.5, 187, { align: "center" });
    pdf.addImage(employeeQr, "PNG", 145.5, 189, 14, 14);
    pdf.text(
      [
        "Telah ditandatangani oleh",
        request.employee.toUpperCase(),
        "NIP. " + request.nip,
      ],
      152.5,
      206,
      {
        align: "center",
      },
    );

    sectionTitle("VII. PERTIMBANGAN ATASAN LANGSUNG", 218);
    drawCell("DISETUJUI", 15, 223, 45, 6, { bold: true, align: "center" });
    drawCell("PERUBAHAN", 60, 223, 45, 6, { bold: true, align: "center" });
    drawCell("DITANGGUHKAN", 105, 223, 45, 6, { bold: true, align: "center" });
    drawCell("TIDAK DISETUJUI", 150, 223, 45, 6, { bold: true, align: "center" });
    drawCell(
      ["Pending Pejabat", "Disetujui"].includes(request.status) ? "✓" : "",
      15,
      229,
      45,
      6,
      { align: "center", bold: true, fontSize: 9 },
    );
    drawCell(request.status === "Perbaikan" ? "✓" : "", 60, 229, 45, 6, { align: "center", bold: true, fontSize: 9 });
    drawCell("", 105, 229, 45, 6, { align: "center" });
    drawCell(request.status === "Ditolak" ? "✓" : "", 150, 229, 45, 6, { align: "center", bold: true, fontSize: 9 });
    drawCell("", 15, 235, 95, 24);
    drawCell("", 110, 235, 85, 24);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.6);
    pdf.text("Pejabat yang memberi pertimbangan,", 152.5, 239, { align: "center" });
    if (hasReviewerSignature) {
      pdf.addImage(reviewerQr, "PNG", 147, 241, 11, 11);
      pdf.text("Telah ditandatangani oleh", 152.5, 254, { align: "center" });
      pdf.setFont("helvetica", "bold");
      pdf.text(request.reviewer.toUpperCase(), 152.5, 256.5, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.text("NIP. 198503172008011002", 152.5, 258.5, { align: "center" });
    } else {
      pdf.setFont("helvetica", "bold");
      pdf.text("DRAFT", 152.5, 247, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.text("Menunggu tanda tangan atasan langsung", 152.5, 251, {
        align: "center",
      });
    }

    sectionTitle(
      "VIII. KEPUTUSAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI",
      262,
    );
    drawCell("DISETUJUI", 15, 267, 45, 5, { bold: true, align: "center", fontSize: 5.8 });
    drawCell("PERUBAHAN", 60, 267, 45, 5, { bold: true, align: "center", fontSize: 5.8 });
    drawCell("DITANGGUHKAN", 105, 267, 45, 5, { bold: true, align: "center", fontSize: 5.8 });
    drawCell("TIDAK DISETUJUI", 150, 267, 45, 5, { bold: true, align: "center", fontSize: 5.8 });
    drawCell(request.status === "Disetujui" ? "✓" : "", 15, 272, 45, 5, { align: "center", bold: true, fontSize: 8 });
    drawCell("", 60, 272, 45, 5, { align: "center" });
    drawCell("", 105, 272, 45, 5, { align: "center" });
    drawCell(request.status === "Ditolak" ? "✓" : "", 150, 272, 45, 5, { align: "center", bold: true, fontSize: 8 });
    drawCell("", 15, 277, 95, 19);
    drawCell("", 110, 277, 85, 19);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5.3);
    pdf.text("Pejabat yang berwenang memberikan cuti,", 152.5, 280, {
      align: "center",
    });
    if (hasApproverSignature) {
      pdf.addImage(approverQr, "PNG", 147.5, 280.5, 10, 10);
      pdf.text("Telah ditandatangani oleh", 152.5, 291, { align: "center" });
      pdf.setFont("helvetica", "bold");
      pdf.text(request.approver.toUpperCase(), 152.5, 293, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `NIP. ${request.approver === currentPybName ? currentPybNip : "-"}`,
        152.5,
        295,
        { align: "center" },
      );
    } else {
      pdf.setFont("helvetica", "bold");
      pdf.text("DRAFT", 152.5, 286, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.text("Menunggu keputusan pejabat berwenang", 152.5, 290, {
        align: "center",
      });
    }

    pdf.save(`${request.id}.pdf`);
    showToast(`PDF ${request.id} berhasil diunduh.`);
  }

  async function downloadHistoryPdf() {
    if (visibleHistory.length === 0) {
      showToast("Tidak ada riwayat pada periode yang dipilih.");
      return;
    }

    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    const period =
      historyMonth === "Semua Bulan"
        ? `Tahun ${historyYear}`
        : `${historyMonth} ${historyYear}`;
    const scope =
      viewRole === "pegawai"
        ? `${accountName} - NIP ${accountNip}`
        : viewRole === "atasan"
          ? historyScope === "pribadi"
            ? `${accountName} - NIP ${accountNip}`
            : `Bawahan ${accountName}`
          : "Seluruh Pegawai";

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("DAFTAR RIWAYAT CUTI", 105, 18, { align: "center" });
    pdf.setFontSize(10);
    pdf.text(`Periode: ${period}`, 20, 30);
    pdf.text(`Lingkup: ${scope}`, 20, 36);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Tanggal cetak: ${fmtDate(new Date().toISOString())}`, 20, 42);

    const headers = ["Nomor", "Pegawai", "Jenis", "Tanggal", "Hari", "Status"];
    const widths = [31, 38, 35, 45, 13, 28];
    let y = 55;

    const drawHeader = () => {
      let x = 10;
      pdf.setFillColor(232, 240, 238);
      pdf.rect(10, y - 6, 190, 9, "F");
      pdf.setFont("helvetica", "bold");
      headers.forEach((header, index) => {
        pdf.text(header, x + 2, y);
        x += widths[index];
      });
      pdf.setFont("helvetica", "normal");
      y += 8;
    };

    drawHeader();

    visibleHistory.forEach((request) => {
      if (y > 276) {
        pdf.addPage();
        y = 20;
        drawHeader();
      }

      const values = [
        request.id,
        request.employee,
        request.type.replace("Cuti ", ""),
        `${request.start} - ${request.end}`,
        `${request.days}`,
        request.status,
      ];
      const rowHeight = Math.max(
        8,
        ...values.map(
          (value, index) =>
            pdf.splitTextToSize(value, widths[index] - 3).length * 5,
        ),
      );
      let x = 10;

      values.forEach((value, index) => {
        const lines = pdf.splitTextToSize(value, widths[index] - 3);
        pdf.text(lines, x + 2, y);
        x += widths[index];
      });

      y += rowHeight;
      pdf.setDrawColor(225, 225, 225);
      pdf.line(10, y - 3, 200, y - 3);
    });

    pdf.setFont("helvetica", "bold");
    pdf.text(`Total: ${visibleHistory.length} pengajuan`, 10, Math.min(y + 8, 286));

    const monthSlug =
      historyMonth === "Semua Bulan"
        ? "SEMUA-BULAN"
        : historyMonth.toUpperCase();
    pdf.save(`RIWAYAT-CUTI-${historyYear}-${monthSlug}.pdf`);
    showToast(`PDF riwayat ${period} berhasil dibuat.`);
  }

  function downloadRecap() {
    const lines = [
      ["Nomor", "Pegawai", "Jenis", "Durasi", "Status"].join(","),
      ...requests.map((request) =>
        [
          request.id,
          request.employee,
          request.type,
          `${request.days} hari`,
          request.status,
        ]
          .map((value) => `"${value}"`)
          .join(","),
      ),
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rekap-cuti-${activeFiscalYear}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Rekap dokumen berhasil diunduh.");
  }

  function logout() {
    window.localStorage.removeItem("cutipns-user");
    router.push("/login");
  }

  function switchDashboardRole(nextRole: ViewRole) {
    const nextAccountNip = accountEmployee?.nip ?? activeAccountNip;
    setViewRole(nextRole);
    setActiveAccountNip(nextAccountNip);
    setActiveTab(nextRole === "admin" ? "admin" : "approval");
    setHeaderPanel(null);
    setProfileOpen(false);
    router.push(`/?role=${viewRoleToQuery[nextRole]}&nip=${nextAccountNip}`, {
      scroll: false,
    });
  }

  return (
    <main className="sofia-theme min-h-screen text-foreground">
      <header className="sticky top-0 z-40 border-b bg-white/92 shadow-[0_1px_18px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <PaSampangLogo className="h-10 w-10 rounded-md shadow-sm ring-1 ring-border" />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-normal">SI CUTE</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Sistem Cuti Elektronik Pengadilan Agama Sampang
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Bantuan"
              onClick={() =>
                setHeaderPanel((current) =>
                  current === "help" ? null : "help",
                )
              }
            >
              <HelpCircle />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifikasi"
              onClick={() =>
                setHeaderPanel((current) =>
                  current === "notifications" ? null : "notifications",
                )
              }
            >
              <Bell />
            </Button>
            <div className="mx-1 hidden h-7 w-px bg-border sm:block" />
            <button
              aria-label={`Profil ${accountName}`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-muted"
              onClick={() =>
                setHeaderPanel((current) =>
                  current === "profile" ? null : "profile",
                )
              }
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10">
                <UserRound className="h-4 w-4" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-tight">
                  {accountName}
                </p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Keluar"
              onClick={logout}
            >
              <LogOut />
            </Button>
          </div>
        </div>
        {headerPanel ? (
          <HeaderPanel
            panel={headerPanel}
            accountName={accountName}
            accountNip={accountNip}
            accountRole={roleLabel}
            accountSupervisor={accountSupervisor}
            currentViewRole={viewRole}
            switchRoles={accountSwitchRoles}
            notificationDescription={notificationDescription}
            onClose={() => setHeaderPanel(null)}
            onSwitchRole={switchDashboardRole}
            onOpenHistory={() => {
              setHeaderPanel(null);
              setActiveTab("history");
            }}
            onOpenProfile={() => {
              setHeaderPanel(null);
              setProfileOpen(true);
            }}
          />
        ) : null}
      </header>

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="app-surface overflow-hidden rounded-lg border shadow-sm">
          <div className="grid items-center gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-6">
            <div className="relative z-10">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Tahun Anggaran {activeFiscalYear}</Badge>
                <Badge variant="outline">
                  {viewRole === "atasan"
                    ? `Atasan: ${accountName}`
                    : viewRole === "pyb"
                      ? `PyB: ${accountName} - ${accountNip}`
                      : `NIP ${accountNip}`}
                </Badge>
                <Badge variant="success" className="gap-2">
                  <MessageCircle className="h-3.5 w-3.5" />
                  WA aktif
                </Badge>
              </div>
              <h2 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                {dashboardTitle}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {dashboardDescription}
              </p>
              <div className="mt-4 flex w-full flex-col gap-2 rounded-md border bg-white p-3 text-sm shadow-sm sm:w-fit sm:min-w-80 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span>{currentDateText}</span>
                </div>
                <div className="hidden h-5 w-px bg-border sm:block" />
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <Clock3 className="h-4 w-4" />
                  <span>{currentClockText} WIB</span>
                </div>
              </div>
            </div>
            <EmployeeLeaveAnimation />
          </div>
        </section>

        {viewRole === "atasan" ? (
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4">
            <MetricCard
              icon={<Clock3 />}
              label="Perlu Keputusan"
              value={`${pendingLeader} pengajuan`}
              detail="Menunggu telaah tingkat 1"
            />
            <MetricCard
              icon={<ShieldCheck />}
              label="Diteruskan ke PyB"
              value={`${pendingPyb} pengajuan`}
              detail="Sudah disetujui atasan"
            />
            <MetricCard
              icon={<FileText />}
              label="Total Bawahan"
              value={`${supervisorRequests.length} pengajuan`}
              detail={`Reviewer: ${accountName}`}
            />
            <MetricCard
              icon={<MessageCircle />}
              label="Notifikasi"
              value="WA siap"
              detail="Keputusan dikirim otomatis"
            />
            <MetricCard
              icon={<CheckCircle2 />}
              label="Selesai"
              value={`${supervisorRequests.filter((request) => request.status === "Disetujui").length} final`}
              detail="Dokumen sudah melewati alur"
            />
          </section>
        ) : null}

        {viewRole === "pyb" ? (
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4">
            <MetricCard
              icon={<ShieldCheck />}
              label="Menunggu Keputusan Final"
              value={`${pendingPyb} pengajuan`}
              detail="Sudah ditelaah atasan langsung"
            />
            <MetricCard
              icon={<FileCheck2 />}
              label="PDF Final"
              value={`${pybRequests.filter((request) => request.status === "Disetujui").length} dokumen`}
              detail="Siap diunduh pegawai"
            />
            <MetricCard
              icon={<XCircle />}
              label="Ditolak"
              value={`${pybRequests.filter((request) => request.status === "Ditolak").length} pengajuan`}
              detail="Keputusan final PyB"
            />
            <MetricCard
              icon={<FileText />}
              label="Total Dokumen"
              value={`${pybRequests.length} pengajuan`}
              detail={`Pejabat: ${accountName}`}
            />
            <MetricCard
              icon={<MessageCircle />}
              label="Notifikasi"
              value="WA siap"
              detail="Hasil final dikirim otomatis"
            />
          </section>
        ) : null}

        <section
          className={cn(
            "grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4",
            (viewRole === "atasan" || viewRole === "pyb") && "hidden",
          )}
        >
          <MetricCard
            icon={<CalendarDays />}
            label="Sisa Cuti Tahunan"
            value={`${annualEffectiveLeft} hari`}
            detail={`Berjalan ${annualCurrentLeft} hari, lampau ${annualCarryOverLeft} hari`}
          >
            <div className="space-y-3">
              <Progress value={(annualCurrentLeft / quotaTotal) * 100} />
              <div className="grid gap-2 text-xs">
                {annualQuotaRows.map((quota) => (
                  <div
                    className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1.5"
                    key={quota.year}
                  >
                    <span>
                      {quota.year === activeFiscalYear
                        ? `${quota.year} - berjalan`
                        : `${quota.year} - lalu`}
                    </span>
                    <span className="font-semibold">{quota.remaining} hari</span>
                  </div>
                ))}
              </div>
            </div>
          </MetricCard>
          <MetricCard
            icon={<Clock3 />}
            label="Menunggu Atasan"
            value={`${pendingLeader} pengajuan`}
            detail="Tahap 1 persetujuan"
          />
          <MetricCard
            icon={<ShieldCheck />}
            label="Menunggu PyB"
            value={`${pendingPyb} pengajuan`}
            detail="Tahap final persetujuan"
          />
          <MetricCard
            icon={<MessageCircle />}
            label="Notifikasi WA"
            value="4 terkirim"
            detail="Pengajuan, eskalasi, dan hasil final"
          />
          <MetricCard
            icon={<FileCheck2 />}
            label="Hak Cuti Sakit"
            value="Sesuai kebutuhan"
            detail={`${sickDaysUsed} hari digunakan • wajib dokumen medis`}
          />
        </section>

        <section
          className={cn(
            "grid items-start gap-5 xl:grid-cols-[1.15fr_0.85fr]",
            (viewRole === "pyb" || viewRole === "admin") && "hidden",
          )}
        >
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Formulir Pengajuan Cuti</CardTitle>
                  <CardDescription>
                    Data pengajuan mengikuti kategori cuti resmi BKN.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="w-fit">
                  {viewRole === "atasan"
                    ? "Atasan Langsung sebagai Pemohon"
                    : viewRole === "pppk"
                      ? "PPPK"
                    : "Pegawai"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Jenis cuti</Label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLeaveTypes.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="supporting-document">
                      Dokumen pendukung
                    </Label>
                    <Badge
                      variant={requiresSupportingDocument ? "warning" : "secondary"}
                    >
                      {requiresSupportingDocument ? "Wajib" : "Tidak wajib"}
                    </Badge>
                  </div>
                  <Input
                    id="supporting-document"
                    type="file"
                    disabled={!requiresSupportingDocument}
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) =>
                      setSupportingDocument(event.target.files?.[0] ?? null)
                    }
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    {requiresSupportingDocument
                      ? "Unggah PDF atau gambar dokumen yang mendukung jenis cuti ini."
                      : "Cuti Tahunan dapat diajukan tanpa dokumen pendukung."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Tanggal mulai</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal selesai</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Alasan</Label>
                  <Input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Alamat selama cuti</Label>
                  <Input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3 rounded-md border bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Estimasi durasi: {newRequestDays} hari kerja kalender
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Rute persetujuan: Atasan Langsung lalu Pejabat Berwenang.
                  </p>
                </div>
                <Button className="w-full shadow-sm shadow-primary/20 sm:w-auto" onClick={submitRequest}>
                  <Send />
                  Kirim
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden xl:sticky xl:top-24">
            <CardHeader>
              <CardTitle>Alur Persetujuan</CardTitle>
              <CardDescription>
                Posisi pengajuan dalam proses persetujuan berjenjang.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border bg-sky-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Pengajuan terbaru</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      CUTI-2026-018 • Cuti Tahunan
                    </p>
                  </div>
                  <Badge variant="info">Pending Atasan</Badge>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <TimelineItem
                  title="Pegawai mengirim pengajuan"
                  detail="WA terkirim ke Atasan Langsung"
                  active
                />
                <TimelineItem
                  title="Atasan memberi keputusan"
                  detail="Jika setuju, WA terkirim ke PyB"
                  active={pendingPyb > 0}
                />
                <TimelineItem
                  title="PyB menyetujui final"
                  detail="Kuota dipotong dan PDF tersedia"
                  active={requests.some((request) => request.status === "Disetujui")}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-[65px] z-30 -mx-4 flex flex-col gap-3 border-y bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-lg sm:border">
            <TabsList className="scrollbar-soft h-auto w-full justify-start overflow-x-auto bg-muted/70 p-1 sm:w-auto">
              <TabsTrigger value="approval">Persetujuan</TabsTrigger>
              {viewRole === "admin" ? (
                <TabsTrigger value="admin">Admin Pembuat Daftar Cuti</TabsTrigger>
              ) : null}
              <TabsTrigger value="history">Riwayat</TabsTrigger>
              <TabsTrigger value="document">Formulir PDF</TabsTrigger>
            </TabsList>
            <p className="hidden text-xs text-muted-foreground lg:block">
              Sesuai Peraturan BKN No. 24 Tahun 2017
            </p>
          </div>

          <TabsContent value="approval">
            <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>
                    {viewRole === "pegawai" || viewRole === "pppk"
                      ? "Pengajuan Saya"
                      : viewRole === "atasan"
                        ? "Antrean Telaah Atasan"
                        : viewRole === "pyb"
                          ? "Antrean Persetujuan Final"
                        : "Antrean Pengajuan"}
                  </CardTitle>
                  <CardDescription>
                    {viewRole === "pegawai" || viewRole === "pppk"
                      ? `Pengajuan milik ${accountName} • NIP ${accountNip}`
                      : "Pilih pengajuan untuk melihat detail persetujuan."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {visibleApprovals.map((request) => (
                    <button
                      key={request.id}
                      onClick={() => setSelectedId(request.id)}
                      className={cn(
                        "w-full rounded-md border bg-background p-4 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-sm",
                        selected.id === request.id && "border-primary bg-primary/5 shadow-sm",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{request.employee}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {request.type} • {request.days} hari
                          </p>
                        </div>
                        <Badge
                          variant={
                            statusStyles[request.status] as
                              | "default"
                              | "secondary"
                              | "destructive"
                              | "outline"
                              | "success"
                              | "warning"
                              | "info"
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle>{selected.id}</CardTitle>
                      <CardDescription>
                        {selected.employee} • NIP {selected.nip}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        statusStyles[selected.status] as
                          | "default"
                          | "secondary"
                          | "destructive"
                          | "outline"
                          | "success"
                          | "warning"
                          | "info"
                      }
                    >
                      {selected.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Detail label="Jenis cuti" value={selected.type} />
                    <Detail label="Tanggal" value={`${selected.start} - ${selected.end}`} />
                    <Detail label="Durasi" value={`${selected.days} hari`} />
                    <Detail label="Alamat" value={selected.address} />
                    <Detail label="Alasan" value={selected.reason} wide />
                  </div>

                  <div className="rounded-md border">
                    <ApprovalStep
                      title="Tingkat 1"
                      person={selected.reviewer}
                      role="Atasan Langsung"
                      status={
                        selected.status === "Pending Atasan"
                          ? "Menunggu"
                          : selected.status === "Ditolak" || selected.status === "Perbaikan"
                            ? selected.status
                            : "Disetujui"
                      }
                    />
                    <Separator />
                    <ApprovalStep
                      title="Tingkat 2"
                      person={selected.approver}
                      role="Pejabat yang Berwenang"
                      status={
                        selected.status === "Disetujui" || selected.status === "Ditolak"
                          ? selected.status
                          : selected.status === "Pending Pejabat"
                            ? "Menunggu"
                            : "Belum masuk"
                      }
                    />
                  </div>

                  {selected.status !== "Pending Atasan" ||
                  viewRole === "admin" ||
                  viewRole === "atasan" ||
                  viewRole === "pyb" ? (
                    <div
                      className={cn(
                        "flex flex-col gap-3 rounded-md bg-muted/55 p-4 sm:flex-row sm:items-center",
                        (viewRole === "admin" ||
                          viewRole === "atasan" ||
                          viewRole === "pyb") &&
                          "sm:justify-end",
                      )}
                    >
                    {selected.status !== "Pending Atasan" ? (
                      <div className="sm:mr-auto">
                        <p className="text-sm font-medium">{selected.note}</p>
                        <p className="text-sm text-muted-foreground">
                          Log keputusan tersimpan di tabel approvals.
                        </p>
                      </div>
                    ) : null}
                      {viewRole === "admin" ||
                      viewRole === "atasan" ||
                      viewRole === "pyb" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            moveRequest(
                              selected.id,
                              "Perbaikan",
                              "Pengajuan dikembalikan untuk perbaikan data",
                            )
                          }
                        >
                          <Clock3 />
                          Tunda
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() =>
                            moveRequest(
                              selected.id,
                              "Ditolak",
                              "Pengajuan ditolak dan WA hasil terkirim ke pegawai",
                            )
                          }
                        >
                          <XCircle />
                          Tolak
                        </Button>
                        <Button
                          onClick={() =>
                            moveRequest(
                              selected.id,
                              viewRole === "atasan" ||
                              selected.status === "Pending Atasan"
                                ? "Pending Pejabat"
                                : "Disetujui",
                              viewRole === "atasan" ||
                              selected.status === "Pending Atasan"
                                ? "Disetujui atasan, WA terkirim ke PyB"
                                : "Disetujui final, kuota dipotong dan PDF tersedia",
                            )
                          }
                        >
                          <CheckCircle2 />
                          Setuju
                        </Button>
                      </div>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="admin">
            <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle>Dashboard Admin Pembuat Daftar Cuti</CardTitle>
                      <CardDescription>
                        Kelola pegawai, kuota tahunan, routing atasan, dan status dokumen.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="gap-2">
                      <Building2 className="h-3.5 w-3.5" />
                      Pengelola
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AdminStat label="Total PNS" value="48" detail="4 peran aktif" />
                    <AdminStat label={`Kuota Tahun ${activeFiscalYear}`} value="576 hari" detail="48 x 12 hari" />
                    <AdminStat label="Sisa Efektif BKN" value={`${adminCarryOverTotal} hari`} detail="Sisa lama setelah batas BKN" />
                    <AdminStat label="Total Bisa Dipakai" value={`${adminAvailableTotal} hari`} detail={`Maks. 18/24 termasuk ${activeFiscalYear}`} />
                    <AdminStat label="Butuh Review" value={`${pendingLeader + pendingPyb}`} detail="Lintas unit kerja" />
                    <AdminStat label="PDF Final" value="12" detail="Siap diunduh" />
                  </div>
                  <div className="rounded-md border bg-muted/45 p-4">
                    <p className="text-sm font-semibold">Aksi cepat pengelola</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          openAction(
                            "Tambah Pegawai",
                            "Form pegawai baru siap digunakan. Data NIP, peran, nomor WhatsApp, dan atasan langsung akan disimpan.",
                            "Tambah Pegawai",
                            { mode: "add" },
                          )
                        }
                      >
                        <UsersRound />
                        Tambah Pegawai
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          openAction(
                            "Reset Kuota Tahunan",
                            `Kuota tahun ${activeFiscalYear} akan dibuat sebesar 12 hari dan saldo lama akan dihitung ulang sesuai batas BKN.`,
                            "Jalankan Reset",
                          )
                        }
                      >
                        <CalendarDays />
                        Reset Kuota Tahunan
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          openAction(
                            "Validasi Nomor WhatsApp",
                            "Sistem menemukan 3 nomor aktif dan 1 nomor yang perlu diperiksa kembali.",
                            "Tandai Sudah Diperiksa",
                          )
                        }
                      >
                        <MessageCircle />
                        Cek Nomor WA
                      </Button>
                      <Button variant="outline" onClick={downloadRecap}>
                        <FileText />
                        Rekap Dokumen
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Manajemen Pegawai & Kuota</CardTitle>
                  <CardDescription>
                    Data ringkas untuk validasi hak cuti dan jalur persetujuan.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-3 font-medium">Pegawai</th>
                          <th className="py-3 font-medium">Peran</th>
                          <th className="py-3 font-medium">Gol/Ruang</th>
                          <th className="py-3 font-medium">Atasan</th>
                          <th className="py-3 font-medium">Sisa {activeFiscalYear}</th>
                          <th className="py-3 font-medium">
                            Sisa {activeFiscalYear - 1}/{activeFiscalYear - 2}
                          </th>
                          <th className="py-3 font-medium">Efektif BKN</th>
                          <th className="py-3 font-medium">Status BKN</th>
                          <th className="py-3 font-medium">WA</th>
                          <th className="py-3 font-medium">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminEmployees.map((employee) => (
                          <tr key={employee.nip} className="border-b last:border-0">
                            <td className="py-3">
                              <p className="font-medium">{employee.name}</p>
                              <p className="text-xs text-muted-foreground">{employee.nip}</p>
                            </td>
                            <td className="py-3">{formatEmployeeRoles(employee)}</td>
                            <td className="py-3">
                              {hasEmployeeRole(employee, "PPPK") ? "-" : employee.grade}
                            </td>
                            <td className="py-3">{employee.supervisor}</td>
                            <td className="py-3">
                              <QuotaMeter quota={employee.quotas[0]} />
                            </td>
                            <td className="py-3">
                              <div className="space-y-2">
                                {employee.quotas.slice(1).map((quota) => (
                                  <div
                                    className="flex items-center justify-between gap-3 rounded-md bg-muted/55 px-2 py-1 text-xs"
                                    key={quota.year}
                                  >
                                    <span>{quota.year}</span>
                                    <span className="font-semibold">{quota.remaining} hari</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 font-semibold">
                              {getBknEffectiveQuota(employee)}{" "}
                              hari
                            </td>
                            <td className="py-3">
                              <Badge
                                variant={
                                  employee.bknMode === "Tidak digunakan 2 tahun"
                                    ? "info"
                                    : employee.bknMode === "Batas 18 hari"
                                      ? "warning"
                                      : "secondary"
                                }
                              >
                                {employee.bknMode}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="space-y-1">
                                <Badge variant={employee.whatsapp === "Aktif" ? "success" : "warning"}>
                                  {employee.whatsapp}
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                  {employee.whatsappNumber || "Belum diisi"}
                                </p>
                              </div>
                            </td>
                            <td className="py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  openAction(
                            `Ubah ${employee.name}`,
                            `Data ${formatEmployeeRoles(employee)}, atasan ${employee.supervisor}, kuota, dan nomor WhatsApp siap diperbarui.`,
                            "Simpan Perubahan",
                            { mode: "edit", employee },
                          )
                        }
                      >
                        Ubah
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          openAction(
                            `Hapus ${employee.name}`,
                            `Pegawai ${employee.name} dengan NIP ${employee.nip} akan dihapus dari daftar simulasi.`,
                            "Hapus Pegawai",
                            { mode: "delete", employee },
                          )
                        }
                      >
                        <Trash2 />
                        Delete
                      </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle>Monitoring Approval</CardTitle>
                  <CardDescription>Pengajuan yang perlu dipantau admin.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {requests.map((request) => (
                    <div key={request.id} className="rounded-md border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{request.id}</p>
                          <p className="text-sm text-muted-foreground">{request.employee}</p>
                        </div>
                        <Badge
                          variant={
                            statusStyles[request.status] as
                              | "default"
                              | "secondary"
                              | "destructive"
                              | "outline"
                              | "success"
                              | "warning"
                              | "info"
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Pengaturan WhatsApp Fonnte</CardTitle>
                  <CardDescription>Ganti token API dan uji kirim notifikasi.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border bg-muted/45 p-3">
                    <p className="text-xs text-muted-foreground">Status token</p>
                    <p className="mt-1 text-sm font-semibold">{fonnteTokenStatus}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fonnte-token">Token API Fonnte</Label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="fonnte-token"
                        type="password"
                        value={fonnteToken}
                        onChange={(event) => setFonnteToken(event.target.value)}
                        placeholder="Masukkan token Fonnte"
                        className="pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Token disimpan untuk sesi server berjalan. Untuk produksi, tetap isi
                      FONNTE_TOKEN di Vercel Environment Variables.
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={saveFonnteToken}
                    disabled={isSavingFonnte}
                  >
                    <ShieldCheck />
                    {isSavingFonnte ? "Menyimpan..." : "Simpan Token API"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={clearFonnteToken}
                    disabled={isSavingFonnte}
                  >
                    Hapus Token Dashboard
                  </Button>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="fonnte-test-number">Nomor WA tes</Label>
                    <Input
                      id="fonnte-test-number"
                      value={testWaNumber}
                      onChange={(event) => setTestWaNumber(event.target.value)}
                      placeholder="6281234567890"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={testFonnteToken}
                    disabled={isTestingFonnte}
                  >
                    <Send />
                    {isTestingFonnte ? "Mengirim..." : "Uji Kirim WA"}
                  </Button>
                  <Separator />
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">Template Pesan WA</p>
                        <p className="text-xs text-muted-foreground">
                          Pengajuan cuti ke atasan langsung.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyWaTemplate}
                      >
                        <Copy />
                        Salin
                      </Button>
                    </div>
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border bg-background p-3 text-xs leading-5 text-foreground">
                      {waLeaveRequestTemplate}
                    </pre>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Audit Notifikasi</CardTitle>
                  <CardDescription>Status pengiriman WhatsApp otomatis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <AdminLog title="Pengajuan baru" detail="Terkirim ke Arif Hidayat" status="Berhasil" />
                  <AdminLog title="Eskalasi PyB" detail="Terkirim ke Dewi Lestari" status="Berhasil" />
                  <AdminLog title="Nomor pegawai" detail="Nadia Putri perlu validasi nomor" status="Perlu cek" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Kontrol Tahunan</CardTitle>
                  <CardDescription>Perawatan data kuota dan carry-over 2 tahun ke belakang.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Detail label="Tahun aktif" value={String(activeFiscalYear)} />
                  <Detail label="Default cuti tahunan" value="12 hari" />
                  <Detail label="Sisa tahun sebelumnya" value="Maks. 6 hari" />
                  <Detail label="Maks. normal" value="18 hari termasuk tahun berjalan" />
                  <Detail label="Tidak dipakai 2 tahun+" value="Maks. 24 hari termasuk tahun berjalan" />
                  <Detail label="Ditangguhkan dinas" value="Dihitung penuh sesuai keputusan PyB" />
                  <Detail label="Terakhir reset" value={`1 Januari ${activeFiscalYear}`} />
                  <Detail
                    label="Reset otomatis berikutnya"
                    value={`1 Januari ${activeFiscalYear + 1}`}
                  />
                  <Button
                    className="w-full"
                    onClick={() =>
                      openAction(
                        "Reset & Arsipkan Kuota",
                        "Saldo tahun lama akan diarsipkan, batas 6/18/24 hari diterapkan, lalu kuota tahun baru dibuat.",
                        "Reset & Arsipkan",
                      )
                    }
                  >
                    <CalendarDays />
                    Reset & Arsipkan Kuota
                  </Button>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Cuti</CardTitle>
                <CardDescription>
                  {viewRole === "pegawai" || viewRole === "pppk"
                    ? `Pengajuan milik ${accountName} • NIP ${accountNip}`
                    : viewRole === "atasan"
                      ? historyScope === "pribadi"
                        ? `Pengajuan pribadi ${accountName}.`
                        : `Pengajuan bawahan yang direview ${accountName}.`
                      : "Seluruh pengajuan pegawai dengan status terkini."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {viewRole === "atasan" ? (
                  <div className="mb-4 inline-flex w-full rounded-md bg-muted p-1 sm:w-auto">
                    <Button
                      className="flex-1 sm:flex-none"
                      size="sm"
                      variant={historyScope === "bawahan" ? "default" : "ghost"}
                      onClick={() => setHistoryScope("bawahan")}
                    >
                      <UsersRound />
                      Riwayat Bawahan
                    </Button>
                    <Button
                      className="flex-1 sm:flex-none"
                      size="sm"
                      variant={historyScope === "pribadi" ? "default" : "ghost"}
                      onClick={() => setHistoryScope("pribadi")}
                    >
                      <UserRound />
                      Riwayat Pribadi
                    </Button>
                  </div>
                ) : null}
                <div className="mb-5 grid gap-3 rounded-md border bg-muted/35 p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                  <div className="space-y-2">
                    <Label>Bulan</Label>
                    <Select value={historyMonth} onValueChange={setHistoryMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bulan" />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((month) => (
                          <SelectItem value={month} key={month}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tahun</Label>
                    <Select value={historyYear} onValueChange={setHistoryYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tahun" />
                      </SelectTrigger>
                      <SelectContent>
                        {historyYears.map((year) => (
                          <SelectItem value={year} key={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full lg:w-auto"
                    disabled={visibleHistory.length === 0}
                    onClick={downloadHistoryPdf}
                  >
                    <Download />
                    Download PDF Riwayat
                  </Button>
                  <p className="text-xs text-muted-foreground lg:col-span-3">
                    Menampilkan {visibleHistory.length} pengajuan untuk periode{" "}
                    {historyMonth === "Semua Bulan"
                      ? `tahun ${historyYear}`
                      : `${historyMonth} ${historyYear}`}.
                  </p>
                </div>

                {viewRole === "pegawai" ? (
                  <div className="mb-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border bg-muted/35 p-4">
                      <p className="text-sm text-muted-foreground">
                        Cuti sakit digunakan
                      </p>
                      <p className="mt-1 text-2xl font-semibold">
                        {sickDaysUsed} hari
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Berdasarkan pengajuan yang telah disetujui.
                      </p>
                    </div>
                    <div className="rounded-md border border-sky-200 bg-sky-50 p-4">
                      <p className="text-sm font-semibold text-sky-800">
                        Hak cuti sakit
                      </p>
                      <p className="mt-1 text-sm leading-6 text-sky-700">
                        Tidak memakai saldo cuti tahunan. Dapat diberikan paling
                        lama 1 tahun dan diperpanjang paling lama 6 bulan sesuai
                        surat keterangan dokter.
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-3 font-medium">Nomor</th>
                        <th className="py-3 font-medium">Pegawai</th>
                        <th className="py-3 font-medium">Jenis</th>
                        <th className="py-3 font-medium">Tanggal</th>
                        <th className="py-3 font-medium">Status</th>
                        <th className="py-3 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleHistory.length === 0 ? (
                        <tr>
                          <td
                            className="py-8 text-center text-muted-foreground"
                            colSpan={6}
                          >
                            Tidak ada riwayat cuti pada periode ini.
                          </td>
                        </tr>
                      ) : null}
                      {visibleHistory.map((request) => (
                        <tr key={request.id} className="border-b last:border-0">
                          <td className="py-3 font-medium">{request.id}</td>
                          <td className="py-3">{request.employee}</td>
                          <td className="py-3">{request.type}</td>
                          <td className="py-3">
                            {request.start} - {request.end}
                          </td>
                          <td className="py-3">
                            <Badge
                              variant={
                                statusStyles[request.status] as
                                  | "default"
                                  | "secondary"
                                  | "destructive"
                                  | "outline"
                                  | "success"
                                  | "warning"
                                  | "info"
                              }
                            >
                              {request.status}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedId(request.id);
                                  setActiveTab("document");
                                  window.setTimeout(
                                    () =>
                                      window.scrollTo({
                                        top: 520,
                                        behavior: "smooth",
                                      }),
                                    0,
                                  );
                                }}
                              >
                                <FileText />
                                Preview
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={request.status !== "Disetujui"}
                                onClick={() => downloadPdf(request)}
                              >
                                <Download />
                                PDF
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="document">
            <section className="space-y-4">
              <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">Formulir Cuti Resmi</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.id} - {selected.employee}
                  </p>
                </div>
                <Button
                  className="w-full shadow-sm shadow-primary/20 sm:w-auto"
                  disabled={selected.status !== "Disetujui"}
                  onClick={() => downloadPdf(selected)}
                >
                  <Download />
                  Unduh PDF Final
                </Button>
              </div>
              <DispositionSheet
                request={selected}
                employee={adminEmployees.find(
                  (employee) => employee.nip === selected.nip,
                )}
              />
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {dialog ? (
        <ActionDialog
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirmLabel}
          mode={dialog.mode}
          employee={dialog.employee}
          onCancel={() => setDialog(null)}
          onConfirm={confirmAction}
        />
      ) : null}

      {profileOpen && accountEmployee ? (
        <EmployeeProfileDialog
          employee={accountEmployee}
          currentViewRole={viewRole}
          switchRoles={accountSwitchRoles}
          onClose={() => setProfileOpen(false)}
          onSwitchRole={switchDashboardRole}
        />
      ) : null}

      <div className="fixed bottom-4 left-4 z-50 hidden rounded-md border bg-card p-1 shadow-lg lg:flex">
        <button
          className={cn(
            "rounded-sm px-3 py-1.5 text-xs font-medium",
            viewRole === "pegawai"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
          onClick={() => {
            setViewRole("pegawai");
            setActiveTab("approval");
          }}
        >
          Pegawai
        </button>
        <button
          className={cn(
            "rounded-sm px-3 py-1.5 text-xs font-medium",
            viewRole === "pppk"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
          onClick={() => {
            setViewRole("pppk");
            setActiveTab("approval");
          }}
        >
          PPPK
        </button>
        <button
          className={cn(
            "rounded-sm px-3 py-1.5 text-xs font-medium",
            viewRole === "atasan"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
          onClick={() => {
            setViewRole("atasan");
            setActiveTab("approval");
          }}
        >
          Atasan
        </button>
        <button
          className={cn(
            "rounded-sm px-3 py-1.5 text-xs font-medium",
            viewRole === "pyb"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
          onClick={() => {
            setViewRole("pyb");
            setActiveTab("approval");
          }}
        >
          PyB
        </button>
        <button
          className={cn(
            "rounded-sm px-3 py-1.5 text-xs font-medium",
            viewRole === "admin"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
          onClick={() => {
            setViewRole("admin");
            setActiveTab("admin");
          }}
        >
          Admin Pembuat Daftar Cuti
        </button>
      </div>

      {toast ? (
        <div
          className="fixed bottom-4 left-4 right-4 z-[70] flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg sm:left-auto sm:w-[420px]"
          role="status"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{toast}</span>
          </div>
          <button
            className="rounded-sm p-1 hover:bg-emerald-100"
            onClick={() => setToast("")}
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function EmployeeLeaveAnimation() {
  return (
    <div
      className="leave-scene relative isolate h-[190px] overflow-hidden rounded-lg border border-emerald-900/10 shadow-[0_16px_40px_rgba(15,95,88,0.12)] sm:h-[210px]"
      aria-label="Animasi pegawai membawa koper saat cuti"
      role="img"
    >
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm backdrop-blur">
        <span className="leave-status-dot h-2 w-2 rounded-full bg-emerald-500" />
        Sedang Cuti
      </div>
      <svg
        aria-hidden="true"
        className="h-full w-full"
        viewBox="0 0 360 210"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="leaveSky" x1="180" y1="0" x2="180" y2="210">
            <stop stopColor="#DDF4F0" />
            <stop offset="1" stopColor="#F7FBF6" />
          </linearGradient>
          <linearGradient id="leaveGround" x1="16" y1="183" x2="334" y2="183">
            <stop stopColor="#A7D9C6" />
            <stop offset="1" stopColor="#69B99A" />
          </linearGradient>
        </defs>

        <rect width="360" height="210" fill="url(#leaveSky)" />
        <circle className="leave-sun" cx="298" cy="47" r="22" fill="#FFD369" />
        <g className="leave-cloud leave-cloud-one" fill="white" fillOpacity=".82">
          <ellipse cx="78" cy="54" rx="26" ry="9" />
          <circle cx="68" cy="48" r="10" />
          <circle cx="83" cy="46" r="13" />
        </g>
        <g className="leave-cloud leave-cloud-two" fill="white" fillOpacity=".62">
          <ellipse cx="225" cy="81" rx="18" ry="6" />
          <circle cx="218" cy="77" r="7" />
          <circle cx="228" cy="76" r="9" />
        </g>

        <path d="M0 173C53 157 93 172 137 167C190 161 231 143 279 154C309 161 334 161 360 154V210H0V173Z" fill="#D9EEDF" />
        <path d="M0 187C54 169 99 188 151 177C213 164 256 175 310 167C328 164 344 166 360 169V210H0V187Z" fill="url(#leaveGround)" />
        <path d="M18 190C95 180 168 190 237 178C276 172 311 174 344 170" stroke="white" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round" />

        <g opacity=".92">
          <path d="M39 150V91H105V158" fill="#F7FAFC" stroke="#0F6A62" strokeWidth="3" />
          <path d="M31 93L72 68L113 93" fill="#0F6A62" />
          <rect x="48" y="105" width="15" height="16" rx="2" fill="#B9DDD8" />
          <rect x="79" y="105" width="15" height="16" rx="2" fill="#B9DDD8" />
          <rect x="62" y="132" width="20" height="26" rx="2" fill="#F2C66D" />
          <path d="M30 159H113" stroke="#0F6A62" strokeWidth="4" strokeLinecap="round" />
        </g>
        <g className="leave-plane">
          <path d="M141 49L177 35L166 52L185 58L180 64L159 59L146 72L150 56L137 53L141 49Z" fill="#13796F" />
          <path d="M145 51L174 39" stroke="white" strokeOpacity=".7" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        <g transform="translate(303 100)">
          <path d="M0 65C2 35 6 10 15-8" stroke="#7A5C3D" strokeWidth="7" strokeLinecap="round" />
          <path d="M15-7C0-8-9-1-16 8C-4 7 5 5 15-1" fill="#249A70" />
          <path d="M16-7C22-20 33-24 45-22C35-12 28-7 18-2" fill="#1E8562" />
          <path d="M16-6C27-8 38-3 44 6C33 4 26 1 18-2" fill="#2BAA7A" />
          <path d="M14-7C7-21-3-26-15-24C-7-13 1-7 12-2" fill="#2BAA7A" />
        </g>

        <g className="leave-traveler">
          <ellipse cx="226" cy="184" rx="47" ry="7" fill="#0F6A62" fillOpacity=".13" />
          <g className="leave-suitcase">
            <path d="M258 137V128C258 124 261 121 265 121H270C274 121 277 124 277 128V137" stroke="#805531" strokeWidth="3" />
            <rect x="250" y="135" width="35" height="42" rx="6" fill="#E7A748" stroke="#805531" strokeWidth="2.5" />
            <path d="M262 137V176M274 137V176" stroke="#C88331" strokeWidth="2" />
            <circle cx="258" cy="181" r="4" fill="#173F3A" />
            <circle cx="278" cy="181" r="4" fill="#173F3A" />
          </g>
          <g className="leave-person">
            <circle cx="206" cy="87" r="16" fill="#B86F45" />
            <path d="M191 85C190 72 198 67 208 69C217 71 221 77 221 87C217 82 213 78 209 76C204 83 198 86 191 85Z" fill="#173F3A" />
            <path d="M211 87C214 84 218 86 217 90C216 94 212 94 210 92" fill="#B86F45" />
            <path d="M201 94C204 97 208 97 211 94" stroke="#713D2C" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M188 108C194 100 212 100 219 108L226 145H180L188 108Z" fill="#13796F" />
            <path d="M191 105L177 129" stroke="#B86F45" strokeWidth="8" strokeLinecap="round" />
            <g className="leave-wave-arm">
              <path d="M216 107L228 86" stroke="#B86F45" strokeWidth="8" strokeLinecap="round" />
              <path d="M228 86L235 76" stroke="#B86F45" strokeWidth="7" strokeLinecap="round" />
              <path d="M234 77L238 69M234 77L242 74M233 77L234 68" stroke="#B86F45" strokeWidth="2.5" strokeLinecap="round" />
            </g>
            <path d="M183 141L180 176" stroke="#203F48" strokeWidth="11" strokeLinecap="round" />
            <g className="leave-walk-leg">
              <path d="M217 141L230 173" stroke="#203F48" strokeWidth="11" strokeLinecap="round" />
              <path d="M229 174L239 177" stroke="#173F3A" strokeWidth="7" strokeLinecap="round" />
            </g>
            <path d="M179 177L169 180" stroke="#173F3A" strokeWidth="7" strokeLinecap="round" />
            <path d="M183 113C188 118 194 121 201 121" stroke="#83C9BB" strokeWidth="2" strokeLinecap="round" />
            <path d="M177 129L251 143" stroke="#805531" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </g>
      </svg>
      <div className="absolute bottom-3 right-4 rounded-md bg-emerald-950/80 px-2.5 py-1 text-[10px] font-medium tracking-wide text-white/90 backdrop-blur">
        Rehat sejenak, kembali lebih segar
      </div>
    </div>
  );
}

function HeaderPanel({
  panel,
  accountName,
  accountNip,
  accountRole,
  accountSupervisor,
  currentViewRole,
  switchRoles,
  notificationDescription,
  onClose,
  onSwitchRole,
  onOpenHistory,
  onOpenProfile,
}: {
  panel: "help" | "notifications" | "profile";
  accountName: string;
  accountNip: string;
  accountRole: string;
  accountSupervisor: string;
  currentViewRole: ViewRole;
  switchRoles: ViewRole[];
  notificationDescription: string;
  onClose: () => void;
  onSwitchRole: (role: ViewRole) => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
}) {
  const content = {
    help: {
      title: "Bantuan",
      description:
        "Pengajuan diproses oleh Atasan Langsung, kemudian Pejabat Berwenang. Hubungi Admin Pembuat Daftar Cuti bila data akun atau kuota tidak sesuai.",
    },
    notifications: {
      title: "Notifikasi",
      description: notificationDescription,
    },
    profile: {
      title: accountName,
      description: `NIP ${accountNip} - ${accountRole} - Atasan: ${accountSupervisor}`,
    },
  }[panel];

  return (
    <div className="absolute right-4 top-[62px] z-50 w-[calc(100%-2rem)] max-w-sm rounded-lg border bg-card p-4 shadow-lg sm:right-6 lg:right-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{content.title}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {content.description}
          </p>
        </div>
        <button
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onClose}
          aria-label="Tutup panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 w-full"
        onClick={panel === "profile" ? onOpenProfile : onOpenHistory}
      >
        {panel === "profile" ? "Lihat Profil" : "Lihat Riwayat Cuti"}
      </Button>
      {panel === "profile" && switchRoles.length > 1 ? (
        <div className="mt-4 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ganti peran
          </p>
          <div className="mt-2 grid gap-2">
            {switchRoles.map((role) => (
              <button
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm font-medium transition",
                  currentViewRole === role
                    ? "border-primary bg-primary/10 text-primary"
                    : "bg-background text-muted-foreground hover:border-primary hover:text-primary",
                )}
                key={role}
                type="button"
                onClick={() => onSwitchRole(role)}
              >
                {viewRoleLabels[role]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmployeeProfileDialog({
  employee,
  currentViewRole,
  switchRoles,
  onClose,
  onSwitchRole,
}: {
  employee: AdminEmployee;
  currentViewRole: ViewRole;
  switchRoles: ViewRole[];
  onClose: () => void;
  onSwitchRole: (role: ViewRole) => void;
}) {
  const sortedQuotas = [...employee.quotas].sort((a, b) => b.year - a.year);
  const totalRemaining = sortedQuotas.reduce(
    (total, quota) => total + quota.remaining,
    0,
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4">
      <section
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-card shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-profile-title"
      >
        <div className="flex items-start justify-between gap-4 border-b p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h3 id="employee-profile-title" className="font-semibold">
                {employee.name}
              </h3>
              <p className="text-sm text-muted-foreground">NIP {employee.nip}</p>
            </div>
          </div>
          <button
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Tutup profil"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Detail label="Peran" value={formatEmployeeRoles(employee)} />
            {!hasEmployeeRole(employee, "PPPK") ? (
              <Detail label="Golongan/Ruang" value={employee.grade} />
            ) : null}
            <Detail
              label="Masa kerja"
              value={`${employee.serviceYears} tahun ${employee.serviceMonths} bulan`}
            />
            <Detail label="Atasan langsung" value={employee.supervisor} />
            <Detail
              label="Nomor WhatsApp"
              value={employee.whatsappNumber || "Belum diisi"}
            />
            <Detail label="Status WhatsApp" value={employee.whatsapp} />
          </div>

          {switchRoles.length > 1 ? (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-semibold">Switch Peran</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pilih peran aktif untuk membuka dashboard sesuai kewenangan akun ini.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {switchRoles.map((role) => (
                  <button
                    className={cn(
                      "rounded-md border px-3 py-2 text-left text-sm font-medium transition",
                      currentViewRole === role
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:border-primary hover:text-primary",
                    )}
                    key={role}
                    type="button"
                    onClick={() => onSwitchRole(role)}
                  >
                    {viewRoleLabels[role]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Saldo Cuti Tahunan</p>
                <p className="text-xs text-muted-foreground">
                  Tahun berjalan dan dua tahun sebelumnya
                </p>
              </div>
              <p className="text-lg font-semibold text-primary">
                {totalRemaining} hari
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {sortedQuotas.map((quota) => (
                <div
                  className="rounded-md border bg-muted/40 px-3 py-2"
                  key={quota.year}
                >
                  <p className="text-xs text-muted-foreground">{quota.year}</p>
                  <p className="mt-1 font-semibold">{quota.remaining} hari</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ActionDialog({
  title,
  description,
  confirmLabel,
  mode,
  employee,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  mode?: "add" | "edit" | "delete";
  employee?: AdminEmployee;
  onCancel: () => void;
  onConfirm: (updatedEmployee?: AdminEmployee) => void;
}) {
  const isEmployeeForm = mode === "add" || mode === "edit";
  const currentQuota = employee?.quotas.find(
    (quota) => quota.year === activeFiscalYear,
  );
  const previousQuota = employee?.quotas.find(
    (quota) => quota.year === activeFiscalYear - 1,
  );
  const olderQuota = employee?.quotas.find(
    (quota) => quota.year === activeFiscalYear - 2,
  );
  const roleOptions = [
    "Pegawai",
    "PPPK",
    "Atasan Langsung",
    "Pejabat Berwenang",
    "Admin Pembuat Daftar Cuti",
  ];
  const [name, setName] = useState(employee?.name ?? "");
  const [nip, setNip] = useState(employee?.nip ?? "");
  const [grade, setGrade] = useState(employee?.grade ?? employeeGrade);
  const [serviceYears, setServiceYears] = useState(
    String(employee?.serviceYears ?? 0),
  );
  const [serviceMonths, setServiceMonths] = useState(
    String(employee?.serviceMonths ?? 0),
  );
  const [whatsappNumber, setWhatsappNumber] = useState(
    employee?.whatsappNumber ?? "",
  );
  const [accountPassword, setAccountPassword] = useState("");
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    employee ? getEmployeeRoles(employee) : ["Pegawai"],
  );
  const normalizedSelectedRoles = selectedRoles.length
    ? selectedRoles
    : ["Pegawai"];
  const primarySelectedRole = normalizedSelectedRoles[0];
  const isSelectedPppk = normalizedSelectedRoles.includes("PPPK");
  const isSelectedPyb = normalizedSelectedRoles.includes("Pejabat Berwenang");
  const toggleSelectedRole = (role: string) => {
    setSelectedRoles((current) => {
      if (current.includes(role)) {
        const next = current.filter((item) => item !== role);
        return next.length ? next : ["Pegawai"];
      }

      return [...current, role];
    });
  };
  const [selectedSupervisor, setSelectedSupervisor] = useState(
    employee?.supervisor ?? "Arif Hidayat",
  );
  const [currentRemaining, setCurrentRemaining] = useState(
    String(currentQuota?.remaining ?? 12),
  );
  const [previousRemaining, setPreviousRemaining] = useState(
    String(previousQuota?.remaining ?? 0),
  );
  const [olderRemaining, setOlderRemaining] = useState(
    String(olderQuota?.remaining ?? 0),
  );
  const supervisorOptions = [
    { name: "Arif Hidayat", nip: "198503172008011002" },
    { name: "Dewi Lestari", nip: "197705182001122001" },
    ...initialAdminEmployees
      .filter(
        (item) =>
          hasEmployeeRole(item, "Atasan Langsung") ||
          hasEmployeeRole(item, "Pejabat Berwenang") ||
          hasEmployeeRole(item, "Admin Pembuat Daftar Cuti"),
      )
  ].filter(
    (item, index, items) =>
      items.findIndex((candidate) => candidate.name === item.name) === index,
  );
  const clampNumber = (value: string, min: number, max: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return min;
    return Math.min(max, Math.max(min, parsed));
  };
  const buildEmployee = (): AdminEmployee | undefined => {
    if (!isEmployeeForm) return undefined;

    const nextCurrentRemaining = clampNumber(currentRemaining, 0, 12);
    const nextPreviousRemaining = clampNumber(previousRemaining, 0, 6);
    const nextOlderRemaining = clampNumber(olderRemaining, 0, 6);
    const nextServiceYears = clampNumber(serviceYears, 0, 50);
    const nextServiceMonths = clampNumber(serviceMonths, 0, 11);
    const nextWhatsappNumber = whatsappNumber.trim();

    return {
      name: name.trim() || employee?.name || "Pegawai Baru",
      nip: nip.trim() || employee?.nip || "NIP-BARU",
      role: primarySelectedRole,
      roles: normalizedSelectedRoles,
      grade: isSelectedPppk ? "" : grade.trim() || employeeGrade,
      serviceYears: nextServiceYears,
      serviceMonths: nextServiceMonths,
      serviceAsOf: getJakartaYearMonth(),
      supervisor:
        isSelectedPyb && normalizedSelectedRoles.length === 1
          ? "-"
          : selectedSupervisor,
      quotas: [
        {
          year: activeFiscalYear,
          remaining: nextCurrentRemaining,
          used: Math.max(0, 12 - nextCurrentRemaining),
        },
        {
          year: activeFiscalYear - 1,
          remaining: nextPreviousRemaining,
          used: Math.max(0, 12 - nextPreviousRemaining),
        },
        {
          year: activeFiscalYear - 2,
          remaining: nextOlderRemaining,
          used: Math.max(0, 12 - nextOlderRemaining),
        },
      ],
      bknMode: employee?.bknMode ?? "Normal",
      whatsapp: nextWhatsappNumber ? "Aktif" : "Perlu cek",
      whatsappNumber: nextWhatsappNumber,
    };
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4">
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg border bg-card p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="action-dialog-title" className="text-lg font-semibold">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <button
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            onClick={onCancel}
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isEmployeeForm ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee-name">Nama pegawai</Label>
              <Input
                id="employee-name"
                placeholder="Nama lengkap"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-nip">NIP</Label>
              <Input
                id="employee-nip"
                placeholder="18 digit NIP"
                inputMode="numeric"
                value={nip}
                onChange={(event) => setNip(event.target.value)}
              />
            </div>
            {!isSelectedPppk ? (
              <div className="space-y-2">
                <Label>Golongan/Ruang</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih golongan ruang" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map((option) => (
                      <SelectItem value={option} key={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Masa kerja</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label
                    className="text-xs text-muted-foreground"
                    htmlFor="employee-service-years"
                  >
                    Tahun
                  </Label>
                  <Input
                    id="employee-service-years"
                    type="number"
                    min="0"
                    max="50"
                    value={serviceYears}
                    onChange={(event) => setServiceYears(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    className="text-xs text-muted-foreground"
                    htmlFor="employee-service-months"
                  >
                    Bulan
                  </Label>
                  <Input
                    id="employee-service-months"
                    type="number"
                    min="0"
                    max="11"
                    value={serviceMonths}
                    onChange={(event) => setServiceMonths(event.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Bertambah otomatis setiap pergantian bulan kalender Jakarta.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-whatsapp">No. WhatsApp</Label>
              <Input
                id="employee-whatsapp"
                placeholder="62812xxxxxxx"
                inputMode="tel"
                value={whatsappNumber}
                onChange={(event) => setWhatsappNumber(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Gunakan format kode negara, contoh 6281234567890.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="employee-password">
                {mode === "add" ? "Kata sandi akun" : "Kata sandi baru (opsional)"}
              </Label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="employee-password"
                  type={showAccountPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="px-10"
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  value={accountPassword}
                  onChange={(event) => setAccountPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAccountPassword((current) => !current)}
                  aria-label={
                    showAccountPassword
                      ? "Sembunyikan kata sandi akun"
                      : "Tampilkan kata sandi akun"
                  }
                >
                  {showAccountPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {mode === "add"
                  ? "Digunakan bersama NIP untuk masuk ke akun pegawai."
                  : "Kosongkan apabila kata sandi akun tidak diubah."}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Peran</Label>
              <p className="text-xs text-muted-foreground">
                Bisa memilih lebih dari satu peran untuk satu akun.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {roleOptions.map((role) => (
                  <button
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-left text-xs font-medium transition hover:border-primary hover:text-primary",
                      normalizedSelectedRoles.includes(role)
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-background text-muted-foreground",
                    )}
                    key={role}
                    type="button"
                    onClick={() => toggleSelectedRole(role)}
                    aria-pressed={normalizedSelectedRoles.includes(role)}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Atasan langsung</Label>
              <Select
                value={selectedSupervisor}
                onValueChange={setSelectedSupervisor}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih atasan langsung" />
                </SelectTrigger>
                <SelectContent>
                  {supervisorOptions.map((option) => (
                    <SelectItem value={option.name} key={option.nip}>
                      {option.name} - NIP {option.nip}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Dipakai untuk routing persetujuan tingkat 1.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="current-leave-remaining">
                Sisa cuti {activeFiscalYear} (berjalan)
              </Label>
              <Input
                id="current-leave-remaining"
                type="number"
                min="0"
                max="12"
                value={currentRemaining}
                onChange={(event) => setCurrentRemaining(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previous-leave-remaining">
                Sisa cuti {activeFiscalYear - 1}
              </Label>
              <Input
                id="previous-leave-remaining"
                type="number"
                min="0"
                max="6"
                value={previousRemaining}
                onChange={(event) => setPreviousRemaining(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maksimal 6 hari sesuai pembatasan akumulasi tahun sebelumnya.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="older-leave-remaining">
                Sisa cuti {activeFiscalYear - 2} (dua tahun lalu)
              </Label>
              <Input
                id="older-leave-remaining"
                type="number"
                min="0"
                max="6"
                value={olderRemaining}
                onChange={(event) => setOlderRemaining(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maksimal 6 hari dan digunakan lebih dahulu saat cuti tahunan.
              </p>
            </div>
          </div>
        ) : null}

        {mode === "delete" ? (
          <div className="mt-5 rounded-md border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
            Data pegawai akan dihapus dari tabel admin pada sesi ini. Riwayat
            pengajuan yang sudah ada tetap ditampilkan sebagai data transaksi.
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button
            variant={mode === "delete" ? "destructive" : "default"}
            disabled={mode === "add" && accountPassword.length < 6}
            onClick={() => onConfirm(buildEmployee())}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  children?: ReactNode;
}) {
  return (
    <Card className="group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs leading-5 text-muted-foreground sm:text-sm">{label}</p>
            <p className="mt-1 text-xl font-semibold sm:mt-2 sm:text-2xl">{value}</p>
          </div>
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground transition group-hover:scale-105 sm:flex">
            {icon}
          </div>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground sm:mt-3 sm:text-sm">{detail}</p>
        {children ? <div className="mt-3 sm:mt-4">{children}</div> : null}
      </CardContent>
    </Card>
  );
}

function AdminStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border bg-white p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function AdminLog({
  title,
  detail,
  status,
}: {
  title: string;
  detail: string;
  status: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-white p-3 shadow-sm">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <Badge variant={status === "Berhasil" ? "success" : "warning"}>{status}</Badge>
    </div>
  );
}

function QuotaMeter({
  quota,
}: {
  quota: { year: number; remaining: number; used: number };
}) {
  return (
    <div className="min-w-32">
      <div className="mb-1 flex justify-between text-xs">
        <span>{quota.year}</span>
        <span>{quota.remaining} hari</span>
      </div>
      <Progress value={(quota.remaining / 12) * 100} />
      <p className="mt-1 text-xs text-muted-foreground">{quota.used} hari dipakai</p>
    </div>
  );
}

function Detail({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={cn("rounded-md border bg-white p-3 shadow-sm", wide && "sm:col-span-2")}>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function TimelineItem({
  title,
  detail,
  active,
}: {
  title: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={cn(
          "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border shadow-sm",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-muted text-muted-foreground",
        )}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function ApprovalStep({
  title,
  person,
  role,
  status,
}: {
  title: string;
  person: string;
  role: string;
  status: string;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">
          {person} • {role}
        </p>
      </div>
      <Badge variant={status === "Disetujui" ? "success" : status === "Ditolak" ? "destructive" : "secondary"}>
        {status}
      </Badge>
    </div>
  );
}

function DispositionSheet({
  request,
  employee,
}: {
  request: LeaveRequest;
  employee?: AdminEmployee;
}) {
  const leaveType = request.type.replace("Cuti ", "");
  const hasReviewerSignature = request.status !== "Pending Atasan";
  const hasApproverSignature =
    request.status === "Disetujui" || request.status === "Ditolak";
  const isLeave = (value: string) =>
    value.toLowerCase().includes(leaveType.toLowerCase());
  const annualStatementRows = getAnnualQuotaStatementRows(employee, request);

  if (hasEmployeeRole(employee, "PPPK")) {
    return <PppkDispositionSheet request={request} employee={employee} />;
  }

  return (
    <div className="scrollbar-soft overflow-x-auto rounded-lg border bg-white p-3 shadow-sm sm:p-4">
      <div className="mx-auto w-full min-w-[860px] max-w-[980px] bg-white px-8 py-7 text-[11px] leading-tight text-black shadow-[0_0_0_1px_rgba(15,23,42,0.06)]">
        <div className="mb-6 grid grid-cols-2">
          <span />
          <div className="justify-self-end pr-10">
            <p>LAMPIRAN II:</p>
            <p>SURAT EDARAN SEKRETARIS MAHKAMAH AGUNG</p>
            <p>REPUBLIK INDONESIA</p>
            <p>NOMOR 13 TAHUN 2019</p>
            <p className="mt-4">Sampang, {request.submittedAt}</p>
            <p className="mt-4">Yth. Ketua Pengadilan Agama Sampang</p>
            <p>di</p>
            <p>Sampang</p>
          </div>
        </div>
        <h3 className="text-center text-sm font-bold">
          FORMULIR PERMINTAAN DAN PEMBERIAN CUTI
        </h3>
        <p className="mb-4 text-center text-xs">
          Nomor: {getLeaveDocumentNumber(request)}
        </p>

        <table className="w-full border-collapse border border-black">
          <tbody>
            <tr>
              <PreviewSectionTitle title="I. DATA PEGAWAI" colSpan={4} />
            </tr>
            <tr>
              <PreviewLabel>Nama</PreviewLabel>
              <PreviewCell>{request.employee.toUpperCase()}</PreviewCell>
              <PreviewLabel>NIP</PreviewLabel>
              <PreviewCell>{request.nip}</PreviewCell>
            </tr>
            <tr>
              <PreviewLabel>Jabatan</PreviewLabel>
              <PreviewCell>Pelaksana</PreviewCell>
              <PreviewLabel>GOL. RUANG</PreviewLabel>
              <PreviewCell>{employeeGrade}</PreviewCell>
            </tr>
            <tr>
              <PreviewLabel>Unit Kerja</PreviewLabel>
              <PreviewCell>PENGADILAN AGAMA SAMPANG</PreviewCell>
              <PreviewLabel>MASA KERJA</PreviewLabel>
              <PreviewCell>{formatRequestServicePeriod(request)}</PreviewCell>
            </tr>
          </tbody>
        </table>

        <PreviewSpacer />
        <table className="w-full border-collapse border border-black">
          <colgroup>
            <col className="w-[43%]" />
            <col className="w-[7%]" />
            <col className="w-[43%]" />
            <col className="w-[7%]" />
          </colgroup>
          <tbody>
            <tr>
              <PreviewSectionTitle title="II. JENIS CUTI YANG DIAMBIL" colSpan={4} />
            </tr>
            <tr>
              <PreviewCell>1. Cuti Tahunan</PreviewCell>
              <PreviewCell align="center">{isLeave("Tahunan") ? "✓" : ""}</PreviewCell>
              <PreviewCell>2. Cuti Besar</PreviewCell>
              <PreviewCell align="center">{isLeave("Besar") ? "✓" : ""}</PreviewCell>
            </tr>
            <tr>
              <PreviewCell>3. Cuti Sakit</PreviewCell>
              <PreviewCell align="center">{isLeave("Sakit") ? "✓" : ""}</PreviewCell>
              <PreviewCell>
                4. Cuti Melahirkan
              </PreviewCell>
              <PreviewCell align="center">{isLeave("Melahirkan") ? "✓" : ""}</PreviewCell>
            </tr>
            <tr>
              <PreviewCell>
                5. Cuti Karena Alasan Penting
              </PreviewCell>
              <PreviewCell align="center">{isLeave("Alasan Penting") ? "✓" : ""}</PreviewCell>
              <PreviewCell>
                6. Cuti di Luar Tanggungan Negara
              </PreviewCell>
              <PreviewCell align="center">
                {isLeave("Luar Tanggungan Negara") ? "✓" : ""}
              </PreviewCell>
            </tr>
          </tbody>
        </table>

        <PreviewSpacer />
        <PreviewSingleSection title="III. ALASAN CUTI">
          {request.reason}
        </PreviewSingleSection>

        <PreviewSpacer />
        <table className="w-full border-collapse border border-black">
          <tbody>
            <tr>
              <PreviewSectionTitle title="IV. LAMANYA CUTI" colSpan={6} />
            </tr>
            <tr>
              <PreviewLabel>Selama</PreviewLabel>
              <PreviewCell>{request.days} hari kerja</PreviewCell>
              <PreviewLabel>Mulai tanggal</PreviewLabel>
              <PreviewCell>{request.start}</PreviewCell>
              <PreviewCell>s/d</PreviewCell>
              <PreviewCell>{request.end}</PreviewCell>
            </tr>
          </tbody>
        </table>

        <PreviewSpacer />
        <table className="w-full table-fixed border-collapse border border-black">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            <col className="w-[16%]" />
            <col className="w-[11%]" />
            <col className="w-[50%]" />
          </colgroup>
          <tbody>
            <tr>
              <PreviewSectionTitle title="V. CATATAN CUTI" colSpan={5} />
            </tr>
            <tr>
              <PreviewSectionTitle title="1. CUTI TAHUNAN" colSpan={3} />
              <PreviewSectionTitle title="PARAF PETUGAS CUTI" />
              <PreviewSectionTitle title="2. CUTI BESAR" />
            </tr>
            <tr>
              <PreviewLabel>Tahun</PreviewLabel>
              <PreviewLabel>Sisa</PreviewLabel>
              <PreviewLabel>Keterangan</PreviewLabel>
              <td className="border border-black" rowSpan={4} />
              <PreviewSectionTitle title="3. CUTI SAKIT" />
            </tr>
            {annualStatementRows.map((quota, index) => (
              <tr key={quota.year}>
                <PreviewCell>{quota.year}</PreviewCell>
                <PreviewCell>{quota.remaining}</PreviewCell>
                <PreviewCell>{quota.note}</PreviewCell>
                <PreviewSectionTitle
                  title={[
                    "4. CUTI MELAHIRKAN",
                    "5. CUTI KARENA ALASAN PENTING",
                    "6. CUTI DI LUAR TANGGUNGAN NEGARA",
                  ][index] ?? ""}
                />
              </tr>
            ))}
          </tbody>
        </table>

        <PreviewSpacer />
        <table className="w-full border-collapse border border-black">
          <colgroup>
            <col className="w-[50%]" />
            <col className="w-[12%]" />
            <col className="w-[38%]" />
          </colgroup>
          <tbody>
            <tr>
              <PreviewSectionTitle
                title="VI. ALAMAT SELAMA MENJALANKAN CUTI"
                colSpan={3}
              />
            </tr>
            <tr>
              <td className="h-36 border border-black p-2 align-top" rowSpan={2}>
                {request.address.toUpperCase()}
              </td>
              <PreviewLabel align="center">Telp.</PreviewLabel>
              <PreviewCell>085234566541</PreviewCell>
            </tr>
            <tr>
              <td className="border border-black p-2 text-center align-top" colSpan={2}>
                <p>Hormat saya,</p>
                <div className="my-2 flex justify-center">
                  <QrVerificationMark
                    code={buildVerificationPayload(
                      request,
                      request.employee.toUpperCase(),
                      request.nip,
                    )}
                  />
                </div>
                <p className="text-[9px]">Telah ditandatangani oleh</p>
                <p className="font-bold">{request.employee.toUpperCase()}</p>
                <p>NIP. {request.nip}</p>
              </td>
            </tr>
          </tbody>
        </table>

        <PreviewSpacer />
        <table className="w-full table-fixed border-collapse border border-black">
          <colgroup>
            <col className="w-1/4" />
            <col className="w-1/4" />
            <col className="w-1/4" />
            <col className="w-1/4" />
          </colgroup>
          <tbody>
            <tr>
              <PreviewSectionTitle
                title="VII. PERTIMBANGAN ATASAN LANGSUNG"
                colSpan={4}
              />
            </tr>
            <tr>
              {["DISETUJUI", "PERUBAHAN", "DITANGGUHKAN", "TIDAK DISETUJUI"].map(
                (item) => (
                  <PreviewLabel align="center" key={item}>
                    {item}
                  </PreviewLabel>
                ),
              )}
            </tr>
            <tr>
              <PreviewCell align="center">
                {["Pending Pejabat", "Disetujui"].includes(request.status)
                  ? "✓"
                  : ""}
              </PreviewCell>
              <PreviewCell align="center">
                {request.status === "Perbaikan" ? "✓" : ""}
              </PreviewCell>
              <PreviewCell align="center" />
              <PreviewCell align="center">
                {request.status === "Ditolak" ? "✓" : ""}
              </PreviewCell>
            </tr>
            <tr>
              <td className="h-28 border border-black" colSpan={2} />
              <td className="border border-black p-2 text-center align-top" colSpan={2}>
                <p>Pejabat yang memberi pertimbangan,</p>
                {hasReviewerSignature ? (
                  <>
                    <div className="my-2 flex justify-center">
                      <QrVerificationMark
                        code={buildVerificationPayload(
                          request,
                          request.reviewer.toUpperCase(),
                          "198503172008011002",
                        )}
                      />
                    </div>
                    <p className="text-[9px]">Telah ditandatangani oleh</p>
                    <p className="font-bold">{request.reviewer.toUpperCase()}</p>
                    <p>NIP. 198503172008011002</p>
                  </>
                ) : (
                  <div className="mt-8">
                    <p className="font-bold">DRAFT</p>
                    <p className="mt-1 text-[10px]">
                      Menunggu tanda tangan atasan langsung
                    </p>
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <PreviewSpacer />
        <table className="w-full table-fixed border-collapse border border-black">
          <colgroup>
            <col className="w-1/4" />
            <col className="w-1/4" />
            <col className="w-1/4" />
            <col className="w-1/4" />
          </colgroup>
          <tbody>
            <tr>
              <PreviewSectionTitle
                title="VIII. KEPUTUSAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI"
                colSpan={4}
              />
            </tr>
            <tr>
              {["DISETUJUI", "PERUBAHAN", "DITANGGUHKAN", "TIDAK DISETUJUI"].map(
                (item) => (
                  <PreviewLabel align="center" key={item}>
                    {item}
                  </PreviewLabel>
                ),
              )}
            </tr>
            <tr>
              <PreviewCell align="center">
                {request.status === "Disetujui" ? "✓" : ""}
              </PreviewCell>
              <PreviewCell align="center" />
              <PreviewCell align="center" />
              <PreviewCell align="center">
                {request.status === "Ditolak" ? "✓" : ""}
              </PreviewCell>
            </tr>
            <tr>
              <td className="h-28 border border-black" colSpan={2} />
              <td className="border border-black p-2 text-center align-top" colSpan={2}>
                <p>Pejabat yang berwenang memberikan cuti,</p>
                {hasApproverSignature ? (
                  <>
                    <div className="my-2 flex justify-center">
                      <QrVerificationMark
                        code={buildVerificationPayload(
                          request,
                          request.approver.toUpperCase(),
                          request.approver === "Dewi Lestari"
                            ? "197705182001122001"
                            : "-",
                        )}
                      />
                    </div>
                    <p className="text-[9px]">Telah ditandatangani oleh</p>
                    <p className="font-bold">{request.approver.toUpperCase()}</p>
                    <p>
                      NIP. {request.approver === "Dewi Lestari"
                        ? "197705182001122001"
                        : "-"}
                    </p>
                  </>
                ) : (
                  <div className="mt-8">
                    <p className="font-bold">DRAFT</p>
                    <p className="mt-1 text-[10px]">
                      Menunggu keputusan pejabat berwenang
                    </p>
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PppkDispositionSheet({
  request,
  employee,
}: {
  request: LeaveRequest;
  employee?: AdminEmployee;
}) {
  const leaveType = request.type.replace("Cuti ", "");
  const isLeave = (value: string) =>
    value.toLowerCase().includes(leaveType.toLowerCase());
  const annualStatementRows = getAnnualQuotaStatementRows(employee, request);
  const hasReviewerSignature = request.status !== "Pending Atasan";
  const hasApproverSignature =
    request.status === "Disetujui" || request.status === "Ditolak";

  return (
    <div className="scrollbar-soft overflow-x-auto rounded-lg border bg-white p-3 shadow-sm sm:p-4">
      <div className="mx-auto w-full min-w-[860px] max-w-[980px] bg-white px-8 py-7 text-[11px] leading-tight text-black shadow-[0_0_0_1px_rgba(15,23,42,0.06)]">
        <div className="mb-6 grid grid-cols-2">
          <span />
          <div className="justify-self-end pr-10">
            <p>LAMPIRAN II</p>
            <p>KEPUTUSAN SEKRETARIS MAHKAMAH AGUNG</p>
            <p>REPUBLIK INDONESIA</p>
            <p>NOMOR : 212/SEK/SK.KP5.3/II/2024</p>
            <p>TANGGAL : 23 Februari 2024</p>
            <p className="mt-4">Sampang, {request.submittedAt}</p>
            <p className="mt-4">Yth. Ketua Pengadilan Agama Sampang</p>
            <p>Di</p>
            <p>Sampang</p>
          </div>
        </div>

        <h3 className="text-center text-sm font-bold">
          FORMULIR PERMINTAAN DAN PEMBERIAN CUTI
        </h3>
        <p className="mb-4 text-center text-xs">
          Nomor : {getLeaveDocumentNumber(request)}
        </p>

        <table className="w-full border-collapse border border-black">
          <tbody>
            <tr>
              <PreviewSectionTitle title="I. DATA PEGAWAI" colSpan={4} />
            </tr>
            <tr>
              <PreviewLabel>NAMA</PreviewLabel>
              <PreviewCell>{request.employee.toUpperCase()}</PreviewCell>
              <PreviewLabel>NIP</PreviewLabel>
              <PreviewCell>{request.nip}</PreviewCell>
            </tr>
            <tr>
              <PreviewLabel>JABATAN</PreviewLabel>
              <PreviewCell>OPERATOR LAYANAN OPERASIONAL</PreviewCell>
              <PreviewLabel>MASA KERJA</PreviewLabel>
              <PreviewCell>{formatRequestServicePeriod(request).toUpperCase()}</PreviewCell>
            </tr>
            <tr>
              <PreviewLabel>UNIT KERJA</PreviewLabel>
              <PreviewCell colSpan={3}>PENGADILAN AGAMA SAMPANG</PreviewCell>
            </tr>
          </tbody>
        </table>

        <PreviewSpacer />
        <table className="w-full border-collapse border border-black">
          <colgroup>
            <col className="w-[90%]" />
            <col className="w-[10%]" />
          </colgroup>
          <tbody>
            <tr>
              <PreviewSectionTitle title="II. JENIS CUTI YANG DIAMBIL" colSpan={2} />
            </tr>
            <tr>
              <PreviewCell>1. CUTI TAHUNAN</PreviewCell>
              <PreviewCell align="center">{isLeave("Tahunan") ? "✓" : ""}</PreviewCell>
            </tr>
            <tr>
              <PreviewCell>2. CUTI SAKIT</PreviewCell>
              <PreviewCell align="center">{isLeave("Sakit") ? "✓" : ""}</PreviewCell>
            </tr>
            <tr>
              <PreviewCell>3. CUTI MELAHIRKAN</PreviewCell>
              <PreviewCell align="center">
                {isLeave("Melahirkan") ? "✓" : ""}
              </PreviewCell>
            </tr>
          </tbody>
        </table>

        <PreviewSpacer />
        <table className="w-full border-collapse border border-black">
          <tbody>
            <tr>
              <PreviewSectionTitle title="IV. LAMANYA CUTI" colSpan={6} />
            </tr>
            <tr>
              <PreviewLabel>Selama</PreviewLabel>
              <PreviewCell>{request.days} hari</PreviewCell>
              <PreviewLabel>Mulai tanggal</PreviewLabel>
              <PreviewCell>{request.start}</PreviewCell>
              <PreviewCell align="center">s.d.</PreviewCell>
              <PreviewCell>{request.end}</PreviewCell>
            </tr>
          </tbody>
        </table>

        <PreviewSpacer />
        <table className="w-full table-fixed border-collapse border border-black">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[20%]" />
            <col className="w-[40%]" />
          </colgroup>
          <tbody>
            <tr>
              <PreviewSectionTitle title="V. CATATAN CUTI" colSpan={5} />
            </tr>
            <tr>
              <PreviewSectionTitle title="1. CUTI TAHUNAN" rowSpan={4} />
              <PreviewLabel>TAHUN</PreviewLabel>
              <PreviewLabel>SISA</PreviewLabel>
              <PreviewLabel>KETERANGAN</PreviewLabel>
              <PreviewSectionTitle title="PARAF PETUGAS CUTI" />
            </tr>
            {annualStatementRows.map((quota, index) => (
              <tr key={quota.year}>
                <PreviewCell>{quota.year}</PreviewCell>
                <PreviewCell>{quota.remaining}</PreviewCell>
                <PreviewCell>{quota.note}</PreviewCell>
                {index === 0 ? (
                  <td className="border border-black" rowSpan={5} />
                ) : null}
              </tr>
            ))}
            <tr>
              <PreviewSectionTitle title="2. CUTI SAKIT" colSpan={3} />
              <PreviewCell />
            </tr>
            <tr>
              <PreviewSectionTitle title="3. CUTI MELAHIRKAN" colSpan={3} />
              <PreviewCell />
            </tr>
          </tbody>
        </table>

        <PreviewSpacer />
        <table className="w-full border-collapse border border-black">
          <colgroup>
            <col className="w-[50%]" />
            <col className="w-[14%]" />
            <col className="w-[36%]" />
          </colgroup>
          <tbody>
            <tr>
              <PreviewSectionTitle
                title="VI. ALAMAT SELAMA MENJALANKAN CUTI"
                colSpan={3}
              />
            </tr>
            <tr>
              <td className="h-40 border border-black p-2 align-top" rowSpan={2}>
                {request.address.toUpperCase()}
              </td>
              <PreviewLabel align="center">TELP</PreviewLabel>
              <PreviewCell>085234566541</PreviewCell>
            </tr>
            <tr>
              <td className="border border-black p-2 text-center align-top" colSpan={2}>
                <p>Hormat saya,</p>
                <div className="my-2 flex justify-center">
                  <QrVerificationMark
                    code={buildVerificationPayload(
                      request,
                      request.employee.toUpperCase(),
                      request.nip,
                    )}
                  />
                </div>
                <p className="text-[9px]">Telah ditandatangani oleh</p>
                <p className="font-bold">{request.employee.toUpperCase()}</p>
                <p>NIP. {request.nip}</p>
              </td>
            </tr>
            <tr>
              <PreviewSectionTitle
                title="VII. PERTIMBANGAN ATASAN LANGSUNG"
                colSpan={3}
              />
            </tr>
            <tr>
              <PreviewLabel align="center">DISETUJUI</PreviewLabel>
              <PreviewLabel align="center">PERUBAHAN</PreviewLabel>
              <PreviewLabel align="center">DITANGGUHKAN</PreviewLabel>
            </tr>
            <tr>
              <PreviewCell align="center">
                {["Pending Pejabat", "Disetujui"].includes(request.status)
                  ? "✓"
                  : ""}
              </PreviewCell>
              <PreviewCell align="center">
                {request.status === "Perbaikan" ? "✓" : ""}
              </PreviewCell>
              <PreviewCell align="center" />
            </tr>
            <tr>
              <td className="h-24 border border-black" />
              <td className="border border-black p-2 text-center align-top" colSpan={2}>
                {hasReviewerSignature ? (
                  <>
                    <p>Pejabat yang memberi pertimbangan,</p>
                    <div className="my-2 flex justify-center">
                      <QrVerificationMark
                        code={buildVerificationPayload(
                          request,
                          request.reviewer.toUpperCase(),
                          "198503172008011002",
                        )}
                      />
                    </div>
                    <p className="text-[9px]">Telah ditandatangani oleh</p>
                    <p className="font-bold">{request.reviewer.toUpperCase()}</p>
                    <p>NIP. 198503172008011002</p>
                  </>
                ) : (
                  <div className="mt-6">
                    <p>Pejabat yang memberi pertimbangan,</p>
                    <p className="mt-6 font-bold">DRAFT</p>
                    <p className="text-[10px]">
                      Menunggu tanda tangan atasan langsung
                    </p>
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <PreviewSectionTitle
                title="VIII. KEPUTUSAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI"
                colSpan={3}
              />
            </tr>
            <tr>
              <PreviewLabel align="center">DISETUJUI</PreviewLabel>
              <PreviewLabel align="center">PERUBAHAN</PreviewLabel>
              <PreviewLabel align="center">DITANGGUHKAN</PreviewLabel>
            </tr>
            <tr>
              <PreviewCell align="center">
                {request.status === "Disetujui" ? "✓" : ""}
              </PreviewCell>
              <PreviewCell align="center" />
              <PreviewCell align="center" />
            </tr>
            <tr>
              <td className="h-24 border border-black" />
              <td className="border border-black p-2 text-center align-top" colSpan={2}>
                {hasApproverSignature ? (
                  <>
                    <p>Pejabat yang berwenang memberikan cuti,</p>
                    <div className="my-2 flex justify-center">
                      <QrVerificationMark
                        code={buildVerificationPayload(
                          request,
                          request.approver.toUpperCase(),
                          request.approver === "Dewi Lestari"
                            ? "197705182001122001"
                            : "-",
                        )}
                      />
                    </div>
                    <p className="text-[9px]">Telah ditandatangani oleh</p>
                    <p className="font-bold">{request.approver.toUpperCase()}</p>
                    <p>
                      NIP. {request.approver === "Dewi Lestari"
                        ? "197705182001122001"
                        : "-"}
                    </p>
                  </>
                ) : (
                  <div className="mt-6">
                    <p>Pejabat yang berwenang memberikan cuti,</p>
                    <p className="mt-6 font-bold">DRAFT</p>
                    <p className="text-[10px]">
                      Menunggu keputusan pejabat berwenang
                    </p>
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewSectionTitle({
  title,
  colSpan,
  rowSpan,
}: {
  title: string;
  colSpan?: number;
  rowSpan?: number;
}) {
  return (
    <td
      className="border border-black bg-white p-1.5 font-bold"
      colSpan={colSpan}
      rowSpan={rowSpan}
    >
      {title}
    </td>
  );
}

function PreviewLabel({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <td className={cn("border border-black p-1.5 font-bold", align === "center" && "text-center")}>
      {children}
    </td>
  );
}

function PreviewCell({
  children,
  colSpan,
  align = "left",
}: {
  children?: ReactNode;
  colSpan?: number;
  align?: "left" | "center";
}) {
  return (
    <td className={cn("border border-black p-1.5", align === "center" && "text-center")} colSpan={colSpan}>
      {children}
    </td>
  );
}

function PreviewSingleSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <table className="w-full border-collapse border border-black">
      <tbody>
        <tr>
          <PreviewSectionTitle title={title} />
        </tr>
        <tr>
          <td className="border border-black p-2">{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

function PreviewSpacer() {
  return <div className="h-3" />;
}

function QrVerificationMark({ code }: { code: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let mounted = true;

    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(code, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 96,
        }),
      )
      .then((dataUrl) => {
        if (mounted) {
          setSrc(dataUrl);
        }
      });

    return () => {
      mounted = false;
    };
  }, [code]);

  return (
    <div className="flex h-16 w-16 items-center justify-center border border-black bg-white p-1">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="QR verifikasi dokumen"
          className="h-full w-full"
          src={src}
        />
      ) : (
        <span className="text-[8px]">QR</span>
      )}
    </div>
  );
}
