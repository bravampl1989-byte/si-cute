"use client";

import {
  Suspense,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Copy,
  Clock3,
  Trash2,
  Download,
  Eye,
  EyeOff,
  FileBarChart2,
  FileCheck2,
  FileText,
  History,
  HelpCircle,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  Send,
  Settings,
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
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type RequestStatus =
  | "Pending Admin"
  | "Pending Atasan"
  | "Pending Pejabat"
  | "Disetujui"
  | "Ditolak"
  | "Perbaikan";

type ViewRole = "pegawai" | "pppk" | "atasan" | "pyb" | "admin";

type LeaveRequest = {
  id: string;
  dbId?: number;
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
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentUrl?: string | null;
    noSurat?: string | null;
};

type SupportingAttachment = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
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
const maxSupportingDocumentSize = 3 * 1024 * 1024;
const employeeRowsPerPage = 10;

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

function getJakartaDateInput(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readSupportingAttachment(file: File) {
  return new Promise<SupportingAttachment>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Dokumen pendukung gagal dibaca."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Format dokumen pendukung tidak didukung."));
        return;
      }

      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
  });
}

function downloadAttachment(request: LeaveRequest) {
  if (!request.attachmentUrl) return;

  const anchor = document.createElement("a");
  anchor.href = request.attachmentUrl;
  anchor.download = request.attachmentName ?? `Lampiran-${request.id}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function previewAttachment(request: LeaveRequest) {
  if (!request.attachmentUrl) return;

  const previewWindow = window.open();
  if (!previewWindow) {
    downloadAttachment(request);
    return;
  }

  previewWindow.document.write(
    `<iframe src="${request.attachmentUrl}" style="border:0;width:100vw;height:100vh"></iframe>`,
  );
  previewWindow.document.close();
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

type AdminEmployee = {
  name: string;
  nip: string;
  role: string;
  roles?: string[];
  position: string;
  grade: string;
  serviceYears: number;
  serviceMonths: number;
  serviceAsOf: string;
  supervisor: string;
  approver?: string;
  quotas: { year: number; remaining: number; used: number }[];
  bknMode: string;
  whatsapp: string;
  whatsappNumber: string;
  accountPassword?: string;
};

type HolidayDate = {
  date: string;
  label: string;
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
  pegawai: "198907192020121001",
  pppk: "198907192020121001",
  atasan: "197206132006041019",
  pyb: "197905292005022001",
  admin: "198907192020121001",
};

const apiRoleToViewRole: Record<string, ViewRole> = {
  pegawai: "pegawai",
  pppk: "pppk",
  atasan_langsung: "atasan",
  pejabat_berwenang: "pyb",
  admin_hr: "admin",
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

const statusStyles: Record<RequestStatus, string> = {
      "Pending Admin": "secondary",
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

function getLeaveDocumentSuffix(request: LeaveRequest) {
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
  const input = request.submittedAt;
  const isoMatch = input.match(/(\d{4})-(\d{2})-(\d{2})/);
  const indonesianMatch = input.match(
    /(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/,
  );
  const month = isoMatch
    ? Object.keys(romanMonths)[Number(isoMatch[2]) - 1]
    : indonesianMatch?.[1];
  const year = isoMatch?.[1] ?? indonesianMatch?.[2] ?? String(activeFiscalYear);

  return `KPA.W13-A31/KP5.3/${romanMonths[month ?? ""] ?? "-"}/${year}`;
}

function getLeaveDocumentNumber(request: LeaveRequest) {
  return (
    request.noSurat?.trim() ||
    `............/${getLeaveDocumentSuffix(request)}`
  );
}

function matchesHistoryPeriod(request: LeaveRequest, month: string, year: string) {
  const dateText = `${request.start} ${request.end}`;
  const matchesMonth = month === "Semua Bulan" || dateText.includes(month);
  const matchesYear = dateText.includes(year);

  return matchesMonth && matchesYear;
}

function diffDays(start: string, end: string, holidays: HolidayDate[] = []) {
  const a = new Date(start);
  const b = new Date(end);
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
  if (!Number.isFinite(diff) || diff <= 0) return 1;

  const holidaySet = new Set(holidays.map((holiday) => holiday.date));
  let workingDays = 0;

  for (let index = 0; index < diff; index += 1) {
    const date = new Date(a);
    date.setDate(a.getDate() + index);
    const day = date.getDay();
    const inputValue = formatInputDate(date);
    if (day === 0 || day === 6 || holidaySet.has(inputValue)) continue;
    workingDays += 1;
  }

  return Math.max(workingDays, 1);
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
  const [viewRole, setViewRole] = useState<ViewRole>("pegawai");
  const [activeAccountNip, setActiveAccountNip] = useState(
    defaultAccountNipByRole.admin,
  );
  const [adminEmployees, setAdminEmployees] = useState(() =>
    advanceServicePeriods(ensureAnnualQuotaYear([], activeFiscalYear), getJakartaYearMonth()),
  );
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveType, setLeaveType] = useState("Cuti Tahunan");
  const [startDate, setStartDate] = useState(() => getJakartaDateInput());
  const [endDate, setEndDate] = useState(() => getJakartaDateInput());
  const [reason, setReason] = useState("");
  const [address, setAddress] = useState("");
  const [supportingDocument, setSupportingDocument] = useState<File | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState("");
  const [approvalNoSurat, setApprovalNoSurat] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [historyMonth, setHistoryMonth] = useState("Semua Bulan");
  const [historyYear, setHistoryYear] = useState(String(activeFiscalYear));
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePage, setEmployeePage] = useState(1);
  const [historyScope, setHistoryScope] = useState<"bawahan" | "pribadi">(
    "bawahan",
  );
  const [headerPanel, setHeaderPanel] = useState<
    "help" | "notifications" | "profile" | null
  >(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    mode?: "add" | "edit" | "delete";
    employee?: AdminEmployee;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [successPopup, setSuccessPopup] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [fonnteToken, setFonnteToken] = useState("");
  const [fonnteTokenStatus, setFonnteTokenStatus] = useState(
    "Belum dicek",
  );
  const [testWaNumber, setTestWaNumber] = useState("6281234567890");
  const [isSavingFonnte, setIsSavingFonnte] = useState(false);
  const [isTestingFonnte, setIsTestingFonnte] = useState(false);
  const [holidayDate, setHolidayDate] = useState(() => getJakartaDateInput());
  const [holidayLabel, setHolidayLabel] = useState("Libur nasional");
  const [holidayDates, setHolidayDates] = useState<HolidayDate[]>([]);
  const [isSavingHoliday, setIsSavingHoliday] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [manualSignatures, setManualSignatures] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    const role = searchParams.get("role");
    const accountNipParam = searchParams.get("nip");

    if (!role) {
      const savedUser = window.localStorage.getItem("cutipns-user");

      if (!savedUser) {
        router.replace("/login");
        return;
      }

      try {
        const user = JSON.parse(savedUser) as {
          nip?: string;
          peran?: string;
          peranTambahan?: string[];
        };
        const userRoles = user.peranTambahan?.length
          ? user.peranTambahan
          : user.peran
            ? [user.peran]
            : [];
        const nextRole =
          userRoles.map((userRole) => apiRoleToViewRole[userRole]).find(Boolean) ??
          "pegawai";

        setViewRole(nextRole);
        setActiveAccountNip(user.nip ?? defaultAccountNipByRole[nextRole]);
        setActiveTab("dashboard");
        setAuthChecked(true);
        return;
      } catch {
        window.localStorage.removeItem("cutipns-user");
        router.replace("/login");
        return;
      }
    }

    if (role === "admin") {
      setViewRole("admin");
      setActiveAccountNip(accountNipParam ?? defaultAccountNipByRole.admin);
      setActiveTab("dashboard");
    } else if (role === "atasan") {
      setViewRole("atasan");
      setActiveAccountNip(accountNipParam ?? defaultAccountNipByRole.atasan);
      setActiveTab("dashboard");
    } else if (role === "pyb") {
      setViewRole("pyb");
      setActiveAccountNip(accountNipParam ?? defaultAccountNipByRole.pyb);
      setActiveTab("dashboard");
    } else if (role === "pppk") {
      setViewRole("pppk");
      setActiveAccountNip(accountNipParam ?? defaultAccountNipByRole.pppk);
      setActiveTab("dashboard");
    } else {
      setViewRole("pegawai");
      setActiveAccountNip(accountNipParam ?? defaultAccountNipByRole.pegawai);
      setActiveTab("dashboard");
    }
    setAuthChecked(true);
  }, [router, searchParams]);

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
          hasDatabaseToken?: boolean;
          maskedDatabaseToken?: string;
          hasRuntimeToken?: boolean;
          hasEnvToken?: boolean;
          maskedEnvToken?: string;
        }) => {
          if (data.hasDatabaseToken) {
            setFonnteTokenStatus(
              `Token database aktif ${
                data.maskedDatabaseToken ? `(${data.maskedDatabaseToken})` : ""
              }`,
            );
            return;
          }

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
    const saved = window.localStorage.getItem("cutipns:manual-signatures");
    if (!saved) return;
    try {
      setManualSignatures(JSON.parse(saved) as Record<string, string>);
    } catch {
      window.localStorage.removeItem("cutipns:manual-signatures");
    }
  }, []);

  async function loadAdminEmployees() {
    try {
      setIsLoadingEmployees(true);
      const response = await fetch("/api/admin/employees");
      const result = (await response.json()) as {
        employees?: AdminEmployee[];
        error?: string;
      };

      if (!response.ok || !result.employees) {
        throw new Error(result.error ?? "Data pegawai belum bisa dimuat.");
      }

      setAdminEmployees(
        advanceServicePeriods(
          ensureAnnualQuotaYear(result.employees, activeFiscalYear),
          getJakartaYearMonth(),
        ),
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Data pegawai belum bisa dimuat.",
      );
    } finally {
      setIsLoadingEmployees(false);
    }
  }

  async function loadLeaveRequests() {
    try {
      const response = await fetch("/api/leave-requests");
      const result = (await response.json()) as {
        requests?: LeaveRequest[];
        error?: string;
      };

      if (!response.ok || !result.requests) {
        throw new Error(result.error ?? "Data pengajuan belum bisa dimuat.");
      }

      setRequests(result.requests);
      setSelectedId((current) => current || result.requests?.[0]?.id || "");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Data pengajuan belum bisa dimuat.",
      );
    }
  }

  async function loadHolidayDates() {
    try {
      const response = await fetch("/api/admin/holidays");
      const result = (await response.json()) as {
        holidays?: HolidayDate[];
        error?: string;
      };

      if (!response.ok || !result.holidays) {
        throw new Error(result.error ?? "Tanggal libur belum bisa dimuat.");
      }

      setHolidayDates(result.holidays);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Tanggal libur belum bisa dimuat.",
      );
    }
  }

  async function loadInitialDashboard() {
    const dashboardCacheKey = `cutipns:dashboard:${viewRole}:${activeAccountNip}`;
    type DashboardResult = {
      employees?: AdminEmployee[];
      requests?: Array<LeaveRequest & { databaseId?: number }>;
      error?: string;
    };
    const applyDashboard = (result: DashboardResult) => {
      if (!result.employees || !result.requests) return false;
      setAdminEmployees(
        advanceServicePeriods(
          ensureAnnualQuotaYear(result.employees, activeFiscalYear),
          getJakartaYearMonth(),
        ),
      );
      const dashboardRequests = result.requests.map((request) => ({
        ...request,
        dbId: request.dbId ?? request.databaseId,
      }));
      setRequests(dashboardRequests);
      setSelectedId((current) => current || dashboardRequests[0]?.id || "");
      return true;
    };

    let hasCachedDashboard = false;
    try {
      const stored = window.sessionStorage.getItem(dashboardCacheKey);
      if (stored) {
        const cached = JSON.parse(stored) as { expiresAt?: number; data?: DashboardResult };
        if ((cached.expiresAt ?? 0) > Date.now() && cached.data) {
          hasCachedDashboard = applyDashboard(cached.data);
        }
      }
    } catch {
      window.sessionStorage.removeItem(dashboardCacheKey);
    }

    try {
      setIsLoadingEmployees(!hasCachedDashboard);
      const dashboardParams = new URLSearchParams({
        role: viewRole,
        nip: activeAccountNip,
      });
      const response = await fetch(`/api/dashboard?${dashboardParams.toString()}`);
      const result = (await response.json()) as DashboardResult;

      if (!response.ok || !applyDashboard(result)) {
        throw new Error(result.error ?? "Data dashboard belum bisa dimuat.");
      }
      window.sessionStorage.setItem(
        dashboardCacheKey,
        JSON.stringify({ expiresAt: Date.now() + 20_000, data: result }),
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Data dashboard belum bisa dimuat.",
      );
    } finally {
      setIsLoadingEmployees(false);
    }
  }

  useEffect(() => {
    if (!authChecked) return;
    loadInitialDashboard();
  }, [authChecked, viewRole, activeAccountNip]);

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

  useEffect(() => {
    if (endDate < startDate) {
      setEndDate(startDate);
    }
  }, [endDate, startDate]);

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
  const pybEmployee = adminEmployees.find((employee) =>
    getEmployeeRoles(employee).includes("Pejabat Berwenang"),
  );
  const currentPybName = pybEmployee?.name ?? "Pejabat Berwenang";
  const currentPybNip = pybEmployee?.nip ?? "-";
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
      viewRole === "admin"
        ? request.status === "Pending Admin"
        : viewRole === "atasan"
        ? request.status === "Pending Atasan"
        : viewRole === "pyb"
          ? request.status === "Pending Pejabat"
          : true,
  );
  const selectedPool =
    activeTab === "approval"
      ? visibleApprovals
      : activeTab === "history" && viewRole === "atasan" && historyScope === "pribadi"
        ? supervisorPersonalRequests
        : dashboardRequests;
  const selectedRequest =
    selectedPool.find((request) => request.id === selectedId) ??
    selectedPool[0] ??
    (activeTab === "approval" ? undefined : dashboardRequests[0]);
  const hasSelectedRequest = Boolean(selectedRequest);
  const selected: LeaveRequest =
    selectedRequest ?? {
      id: "Belum ada pengajuan",
      employee: accountName,
      nip: accountNip,
      type: "-",
      start: "-",
      end: "-",
      submittedAt: "-",
      serviceYearsAtSubmission: accountEmployee?.serviceYears ?? 0,
      serviceMonthsAtSubmission: accountEmployee?.serviceMonths ?? 0,
      days: 0,
      reason: "Belum ada pengajuan cuti untuk akun ini.",
      address: "-",
      status: "Pending Atasan",
      reviewer: accountSupervisor,
      approver: currentPybName,
      note: "Belum ada pengajuan cuti.",
    };
  useEffect(() => {
    setApprovalNoSurat(selected.noSurat?.split("/")[0]?.trim() || "");
  }, [selected.id, selected.noSurat]);
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
  const pendingAdmin = dashboardRequests.filter(
      (request) => request.status === "Pending Admin",
    ).length;
    const pendingLeader = dashboardRequests.filter(
      (request) => request.status === "Pending Atasan",
    ).length;
  const pendingPyb = dashboardRequests.filter(
    (request) => request.status === "Pending Pejabat",
  ).length;
  const latestDashboardRequest = dashboardRequests[0];
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
  const adminRoleTotal = new Set(adminEmployees.flatMap((employee) => getEmployeeRoles(employee))).size;
  const adminCurrentQuotaTotal = adminEmployees.reduce(
    (total, employee) =>
      total +
      (employee.quotas.find((quota) => quota.year === activeFiscalYear)?.remaining ?? 0),
    0,
  );
  const adminFinalPdfTotal = requests.filter(
    (request) => request.status === "Disetujui",
  ).length;
  const adminInvalidWhatsapp = adminEmployees.filter(
    (employee) => !employee.whatsappNumber,
  );
  const normalizedEmployeeSearch = employeeSearch.trim().toLowerCase();
  const filteredAdminEmployees = normalizedEmployeeSearch
    ? adminEmployees.filter((employee) =>
        [
          employee.name,
          employee.nip,
          formatEmployeeRoles(employee),
          employee.position,
          employee.grade,
          employee.supervisor,
          employee.approver ?? "",
          employee.whatsappNumber,
          employee.bknMode,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedEmployeeSearch),
      )
    : adminEmployees;
  const employeeTotalPages = Math.max(
    1,
    Math.ceil(filteredAdminEmployees.length / employeeRowsPerPage),
  );
  const safeEmployeePage = Math.min(employeePage, employeeTotalPages);
  const paginatedAdminEmployees = filteredAdminEmployees.slice(
    (safeEmployeePage - 1) * employeeRowsPerPage,
    safeEmployeePage * employeeRowsPerPage,
  );
  const employeePageStart =
    filteredAdminEmployees.length === 0
      ? 0
      : (safeEmployeePage - 1) * employeeRowsPerPage + 1;
  const employeePageEnd = Math.min(
    safeEmployeePage * employeeRowsPerPage,
    filteredAdminEmployees.length,
  );

  useEffect(() => {
    if (employeePage > employeeTotalPages) {
      setEmployeePage(employeeTotalPages);
    }
  }, [employeePage, employeeTotalPages]);

  const newRequestDays = useMemo(
    () => diffDays(startDate, endDate, holidayDates),
    [endDate, holidayDates, startDate],
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

Silakan buka aplikasi SI CUTE untuk memberikan keputusan Setujui, Tunda atau Tolak.
Link: https://sicute.pa-sampang.go.id/login

Pesan ini dikirim otomatis oleh SI CUTE.`;

  async function submitRequest() {
    if (requiresSupportingDocument && !supportingDocument) {
      showToast(`Dokumen pendukung wajib untuk ${leaveType}.`);
      return;
    }
    if (supportingDocument && supportingDocument.size > maxSupportingDocumentSize) {
      showToast("Ukuran dokumen pendukung maksimal 3 MB.");
      return;
    }

    const applicantNip = accountEmployee?.nip ?? accountNip;
    if (!manualSignatures[applicantNip]) {
      showToast("Tanda tangan pemohon wajib diisi sebelum pengajuan dikirim.");
      return;
    }
    try {
      const attachment = supportingDocument
        ? await readSupportingAttachment(supportingDocument)
        : null;
      const response = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nip: applicantNip,
          type: leaveType,
          startDate,
          endDate,
          days: newRequestDays,
          reason,
          address,
          attachment,
        }),
      });
      const result = (await response.json()) as {
        requests?: LeaveRequest[];
        error?: string;
      };

      if (!response.ok || !result.requests) {
        throw new Error(result.error ?? "Pengajuan belum bisa dikirim.");
      }

      setRequests(result.requests);
      setSelectedId(result.requests[0]?.id ?? "");
      setSupportingDocument(null);
      setActiveTab("approval");
      setSuccessPopup({
        title: "Pengajuan Terkirim",
        description: `${result.requests[0]?.id ?? "Pengajuan"} sudah masuk ke antrean Verifikasi Admin.`,
      });
      showToast(`${result.requests[0]?.id ?? "Pengajuan"} berhasil disimpan ke database.`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Pengajuan belum bisa dikirim.",
      );
    }
  }

  async function moveRequest(id: string, status: RequestStatus, note: string) {
    const targetRequest = requests.find((request) => request.id === id);
    let finalNote = note;

    const isApprovalDecision =
      status === "Pending Atasan" ||
      status === "Pending Pejabat" ||
      status === "Disetujui";
    const noSurat = targetRequest
      ? `${approvalNoSurat.trim()}/${getLeaveDocumentSuffix(targetRequest)}`
      : "";

    if (isApprovalDecision && !noSurat) {
      showToast("Nomor surat wajib diisi sebelum menyetujui pengajuan.");
      return;
    }
    if (
      isApprovalDecision &&
      (viewRole === "atasan" || viewRole === "pyb") &&
      !manualSignatures[accountNip]
    ) {
      showToast(
        `Tanda tangan ${viewRole === "atasan" ? "atasan langsung" : "Pejabat Berwenang"} wajib diisi sebelum menyetujui.`,
      );
      return;
    }

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

      const deductionText = deductionResult.deductions
        .map((deduction) => `${deduction.year}: ${deduction.days} hari`)
        .join(", ");
      finalNote = `${note}. Kuota dipotong dari saldo terlama (${deductionText})`;
    }

    try {
      const response = await fetch("/api/leave-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          dbId: targetRequest?.dbId,
          status,
          note: finalNote,
          approverNip: accountNip,
          noSurat: isApprovalDecision ? noSurat : undefined,
        }),
      });
      const result = (await response.json()) as {
        requests?: LeaveRequest[];
        error?: string;
      };

      if (!response.ok || !result.requests) {
        throw new Error(result.error ?? "Keputusan belum bisa disimpan.");
      }

      setRequests(result.requests);
      const nextVisible = result.requests.filter((request) => {
        const belongsToRole =
          viewRole === "atasan"
            ? request.reviewer === accountName
            : viewRole === "pyb"
              ? request.approver === accountName
              : true;
        const waitingForRole =
          viewRole === "admin"
            ? request.status === "Pending Admin"
            : viewRole === "atasan"
            ? request.status === "Pending Atasan"
            : viewRole === "pyb"
              ? request.status === "Pending Pejabat"
            : request.status === "Pending Admin" ||
              request.status === "Pending Atasan" ||
              request.status === "Pending Pejabat";

        return belongsToRole && waitingForRole;
      });
      setSelectedId(nextVisible[0]?.id ?? "");
      await loadAdminEmployees();
      setSuccessPopup({
        title: "Persetujuan Berhasil",
        description: `${targetRequest?.id ?? "Pengajuan"} ${finalNote.toLowerCase()}.`,
      });
      showToast(`${finalNote} Keputusan tersimpan di database.`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Keputusan belum bisa disimpan.",
      );
    }
  }

  async function handleAdminReview(
    request: LeaveRequest,
    action: "setuju" | "tolak" | "tunda",
    noSurat?: string,
  ) {
    try {
      const response = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.dbId,
          action,
          noSurat: noSurat || undefined,
          catatan: "",
          adminNip: accountNip,
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        newStatus?: string;
        error?: string;
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Keputusan gagal diproses.");
      }
      const refreshed = await fetch("/api/leave-requests");
      const data = (await refreshed.json()) as {
        requests?: LeaveRequest[];
      };
      if (data.requests) {
        setRequests(data.requests);
        setSelectedId(
          (current) => data.requests?.[0]?.id ?? current,
        );
      }
      const label =
        action === "setuju"
          ? "Disetujui & diteruskan ke atasan"
          : action === "tolak"
            ? "Ditolak"
            : "Ditunda";
      showToast(`${request.id} ${label}.`);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Keputusan gagal diproses.",
      );
    }
  }

  async function deleteLeaveRequest(request: LeaveRequest) {
    const confirmed = window.confirm(
      `Hapus riwayat ${request.id} milik ${request.employee}? Data pengajuan akan dihapus dari database.`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/leave-requests?id=${encodeURIComponent(
          String(request.dbId ?? request.id),
        )}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as {
        requests?: LeaveRequest[];
        error?: string;
      };

      if (!response.ok || !result.requests) {
        throw new Error(result.error ?? "Riwayat cuti belum bisa dihapus.");
      }

      setRequests(result.requests);
      setSelectedId((current) =>
        current === request.id ? result.requests?.[0]?.id ?? "" : current,
      );
      showToast(`${request.id} berhasil dihapus dari database.`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Riwayat cuti belum bisa dihapus.",
      );
    }
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  function saveManualSignature(nip: string, dataUrl: string) {
    setManualSignatures((current) => {
      const next = { ...current };
      if (dataUrl) next[nip] = dataUrl;
      else delete next[nip];
      window.localStorage.setItem(
        "cutipns:manual-signatures",
        JSON.stringify(next),
      );
      return next;
    });
    showToast(dataUrl ? "Tanda tangan disimpan." : "Tanda tangan dihapus.");
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
        `Token database aktif${result.maskedToken ? ` (${result.maskedToken})` : ""}`,
      );
      showToast("Token API Fonnte berhasil disimpan ke database.");
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

  async function saveHolidayDates(nextHolidays: HolidayDate[]) {
    setIsSavingHoliday(true);
    try {
      const response = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holidays: nextHolidays }),
      });
      const result = (await response.json()) as {
        holidays?: HolidayDate[];
        error?: string;
      };

      if (!response.ok || !result.holidays) {
        throw new Error(result.error ?? "Tanggal libur belum bisa disimpan.");
      }

      setHolidayDates(result.holidays);
      showToast("Tanggal libur berhasil disimpan.");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Tanggal libur belum bisa disimpan.",
      );
    } finally {
      setIsSavingHoliday(false);
    }
  }

  async function addHolidayDate() {
    if (!holidayDate) {
      showToast("Tanggal libur wajib diisi.");
      return;
    }

    await saveHolidayDates([
      ...holidayDates.filter((holiday) => holiday.date !== holidayDate),
      {
        date: holidayDate,
        label: holidayLabel.trim() || "Libur",
      },
    ]);
  }

  async function removeHolidayDate(date: string) {
    await saveHolidayDates(holidayDates.filter((holiday) => holiday.date !== date));
  }

  async function copyWaTemplate() {
    try {
      await navigator.clipboard.writeText(waLeaveRequestTemplate);
      showToast("Template pesan WA berhasil disalin.");
    } catch {
      showToast("Template belum bisa disalin otomatis.");
    }
  }

  async function confirmAction(updatedEmployee?: AdminEmployee) {
    if (!dialog) return;

    try {
      if (dialog.mode === "delete" && dialog.employee) {
        const response = await fetch(
          `/api/admin/employees?nip=${encodeURIComponent(dialog.employee.nip)}`,
          { method: "DELETE" },
        );
        const result = (await response.json()) as {
          employees?: AdminEmployee[];
          error?: string;
        };

        if (!response.ok || !result.employees) {
          throw new Error(result.error ?? "Pegawai belum bisa dihapus.");
        }

        setAdminEmployees(result.employees);
      }

      if ((dialog.mode === "edit" || dialog.mode === "add") && updatedEmployee) {
        const response = await fetch("/api/admin/employees", {
          method: dialog.mode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedEmployee),
        });
        const result = (await response.json()) as {
          employees?: AdminEmployee[];
          error?: string;
        };

        if (!response.ok || !result.employees) {
          throw new Error(result.error ?? "Data pegawai belum bisa disimpan.");
        }

        setAdminEmployees(result.employees);
      }

      if (dialog.title.startsWith("Reset")) {
        const response = await fetch("/api/admin/employees", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reset-current-year-quota",
            year: activeFiscalYear,
          }),
        });
        const result = (await response.json()) as {
          employees?: AdminEmployee[];
          error?: string;
        };

        if (!response.ok || !result.employees) {
          throw new Error(result.error ?? "Kuota tahunan belum bisa direset.");
        }

        setAdminEmployees(result.employees);
      }

      showToast(`${dialog.title} berhasil diproses.`);
      setDialog(null);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Aksi belum bisa diproses.",
      );
    }
  }

  async function downloadPdf(request: LeaveRequest) {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    const requestEmployee = adminEmployees.find(
      (employee) => employee.nip === request.nip,
    );
    const reviewerEmployee = adminEmployees.find(
      (employee) => employee.name === request.reviewer,
    );
    const approverEmployee = adminEmployees.find(
      (employee) => employee.name === request.approver,
    );
    const annualStatementRows = getAnnualQuotaStatementRows(
      requestEmployee,
      request,
    );
    const hasReviewerSignature = request.status !== "Pending Atasan";
    const hasApproverSignature =
      request.status === "Disetujui" || request.status === "Ditolak";
    const employeeMark = manualSignatures[request.nip] ?? "";
    const reviewerMark = manualSignatures[reviewerEmployee?.nip ?? ""] ?? "";
    const approverMark =
      manualSignatures[approverEmployee?.nip ?? currentPybNip] ?? "";
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
      drawCell(requestEmployee?.position ?? "OPERATOR LAYANAN OPERASIONAL", 40, 79, 55, 6, { fontSize: 5.8 });
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
      if (employeeMark) {
        pdf.addImage(employeeMark, "PNG", 139.5, 208, 26, 12);
      }
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
        if (reviewerMark) {
          pdf.addImage(reviewerMark, "PNG", 132, 260, 26, 12);
        }
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
    drawCell(requestEmployee?.position ?? "Pelaksana", 40, 62, 55, 6);
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
    if (employeeMark) {
      pdf.addImage(employeeMark, "PNG", 139.5, 188, 26, 13);
    }
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
      if (reviewerMark) {
        pdf.addImage(reviewerMark, "PNG", 139.5, 240, 26, 13);
      }
      pdf.text("Telah ditandatangani oleh", 152.5, 254, { align: "center" });
      pdf.setFont("helvetica", "bold");
      pdf.text(request.reviewer.toUpperCase(), 152.5, 256.5, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.text(`NIP. ${reviewerEmployee?.nip ?? "-"}`, 152.5, 258.5, {
        align: "center",
      });
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
      if (approverMark) {
        pdf.addImage(approverMark, "PNG", 139.5, 279.5, 26, 12);
      }
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
    setActiveTab("dashboard");
    setHeaderPanel(null);
    setProfileOpen(false);
    router.push(`/?role=${viewRoleToQuery[nextRole]}&nip=${nextAccountNip}`, {
      scroll: false,
    });
  }

  const shellTitle =
    activeTab === "pengajuan"
      ? "Pengajuan Cuti"
      : activeTab === "approval"
        ? "Persetujuan"
    : activeTab === "admin"
      ? "Pegawai & Kuota"
      : activeTab === "notifications"
        ? "Notifikasi WhatsApp"
      : activeTab === "settings"
        ? "Pengaturan"
      : activeTab === "holidays"
        ? "Set Tanggal Libur"
      : activeTab === "history"
        ? "Riwayat Cuti"
        : activeTab === "document"
          ? "Laporan PDF"
          : "Dashboard";

  if (!authChecked) {
    return (
      <main className="sofia-theme flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-4 shadow-sm">
          <PaSampangLogo className="h-10 w-10 rounded-md" />
          <div>
            <p className="font-semibold">SI CUTE</p>
            <p className="text-sm text-muted-foreground">Memeriksa sesi masuk...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="sofia-theme admin-shell min-h-screen text-foreground">
      <div className="flex min-h-screen">
        <DashboardSidebar
          activeTab={activeTab}
          accountRole={roleLabel}
          viewRole={viewRole}
          onSelect={setActiveTab}
          onLogout={logout}
        />
        <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-white/95 shadow-[0_1px_18px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu />
            </Button>
            <div className="hidden h-8 w-px bg-border lg:block" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold uppercase tracking-normal text-[#14285a]">
                {shellTitle}
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                SI CUTE - Sistem Cuti Elektronik Pengadilan Agama Sampang
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

      <div className="flex w-full flex-col gap-5 px-4 pb-24 pt-5 sm:px-6 lg:px-7 lg:pb-5">
        {activeTab === "dashboard" ? (
          <>
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
          <section className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4">
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
          <section className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4">
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

        {viewRole === "admin" ? (
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
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <AdminStat
                  label="Total Pegawai"
                  value={`${adminEmployees.length}`}
                  detail={`${adminRoleTotal} peran aktif`}
                />
                <AdminStat
                  label={`Kuota Tahun ${activeFiscalYear}`}
                  value={`${adminCurrentQuotaTotal} hari`}
                  detail={`${adminEmployees.length} akun terdaftar`}
                />
                <AdminStat
                  label="Sisa Efektif BKN"
                  value={`${adminCarryOverTotal} hari`}
                  detail="Sisa lama setelah batas BKN"
                />
                <AdminStat
                  label="Total Bisa Dipakai"
                  value={`${adminAvailableTotal} hari`}
                  detail={`Maks. 18/24 termasuk ${activeFiscalYear}`}
                />
                <AdminStat
                  label="Butuh Review"
                  value={`${pendingAdmin + pendingLeader + pendingPyb}`}
                    detail="Menunggu review admin + atasan + pejabat"
                />
                <AdminStat
                  label="PDF Final"
                  value={`${adminFinalPdfTotal}`}
                  detail="Siap diunduh"
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        <section
          className={cn(
            "grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4",
            (viewRole === "atasan" || viewRole === "pyb" || viewRole === "admin") &&
              "hidden",
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
          </>
        ) : null}

        {activeTab === "pengajuan" ? (
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
                    accept="image/*,.pdf"
                    capture="environment"
                    onChange={(event) =>
                      setSupportingDocument(event.target.files?.[0] ?? null)
                    }
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    {requiresSupportingDocument
                      ? "Ambil foto lewat kamera HP atau unggah PDF/gambar dokumen pendukung."
                      : "Opsional. Anda dapat mengambil foto dengan kamera HP atau memilih PDF/gambar."}
                  </p>
                  {supportingDocument ? (
                    <p className="text-xs font-medium text-foreground">
                      Lampiran dipilih: {supportingDocument.name}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Tanggal mulai</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      const nextStart = event.target.value;
                      setStartDate(nextStart);
                      setEndDate((current) =>
                        current < nextStart ? nextStart : current,
                      );
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal selesai</Label>
                  <Input
                    type="date"
                    min={startDate}
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
                <div className="space-y-3 md:col-span-2">
                  <div>
                    <Label>Tanda tangan pemohon</Label>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Gambar menggunakan mouse, stylus, atau jari. Tanda tangan
                      wajib diisi sebelum pengajuan dikirim dan akan digunakan
                      pada dokumen cuti.
                    </p>
                  </div>
                  <SignaturePad
                    value={manualSignatures[accountNip] ?? ""}
                    onChange={(dataUrl) =>
                      saveManualSignature(accountNip, dataUrl)
                    }
                  />
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3 rounded-md border bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Estimasi durasi: {newRequestDays} hari kerja
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sabtu, Minggu, dan tanggal libur dari admin tidak dihitung.
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
              {!latestDashboardRequest ? (
                <div className="rounded-md border border-dashed bg-muted/35 p-4">
                  <p className="text-sm font-semibold">Belum ada pengajuan</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Data akan muncul setelah pengajuan cuti dibuat.
                  </p>
                </div>
              ) : null}
              <div
                className={cn(
                  "rounded-md border bg-sky-50 p-4",
                  !latestDashboardRequest && "hidden",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {latestDashboardRequest ? "Pengajuan terbaru" : "Belum ada pengajuan"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {latestDashboardRequest
                        ? `${latestDashboardRequest.id} - ${latestDashboardRequest.type}`
                        : "Data pengajuan belum tersedia"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      (latestDashboardRequest
                        ? statusStyles[latestDashboardRequest.status]
                        : "info") as
                        | "default"
                        | "secondary"
                        | "destructive"
                        | "outline"
                        | "success"
                        | "warning"
                        | "info"
                    }
                  >
                    {latestDashboardRequest?.status ?? "Belum ada"}
                  </Badge>
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
        ) : null}

        {activeTab !== "dashboard" ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="approval">
            <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>
                    {viewRole === "pegawai" || viewRole === "pppk"
                      ? "Pengajuan Saya"
                      : viewRole === "admin"
                        ? "Antrean Verifikasi Admin"
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
                  {visibleApprovals.length === 0 ? (
                    <div className="rounded-md border border-dashed bg-muted/35 p-5 text-sm text-muted-foreground">
                      Belum ada pengajuan cuti yang perlu diproses.
                    </div>
                  ) : (
                    visibleApprovals.map((request) => (
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
                    ))
                  )}
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

                  {selected.attachmentUrl ? (
                    <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          Dokumen pendukung
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {selected.attachmentName ?? "Lampiran pengajuan cuti"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => previewAttachment(selected)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => downloadAttachment(selected)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-md border">
                    <ApprovalStep
                      title="Tingkat 0"
                      person="Admin Pembuat Daftar Cuti"
                      role="Verifikasi Administrasi"
                      status={
                        selected.status === "Pending Admin"
                          ? "Menunggu"
                          : selected.status === "Ditolak" || selected.status === "Perbaikan"
                            ? selected.status
                            : "Disetujui"
                      }
                    />
                    <Separator />
                    <ApprovalStep
                      title="Tingkat 1"
                      person={selected.reviewer}
                      role="Atasan Langsung"
                      status={
                        selected.status === "Pending Admin" || selected.status === "Pending Atasan"
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

                  {viewRole === "admin" || viewRole === "atasan" || viewRole === "pyb" ? (
                    <div className="space-y-3 rounded-md border bg-blue-50/45 p-4">
                      <div className="space-y-2">
                        <Label htmlFor="approval-no-surat">Nomor surat</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="approval-no-surat"
                            value={approvalNoSurat}
                            onChange={(event) => setApprovalNoSurat(event.target.value)}
                            placeholder="Nomor urut"
                            className="max-w-36"
                          />
                          <span className="text-sm text-muted-foreground">
                            /{getLeaveDocumentSuffix(selected)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Nomor ini akan tampil pada formulir cuti/PDF yang dicetak.
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          Tanda tangan {viewRole === "admin" ? "Admin" : viewRole === "atasan" ? "Atasan Langsung" : "Pejabat Berwenang"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {viewRole === "admin"
                            ? "Nomor surat menjadi syarat wajib sebelum keputusan Setuju dapat diproses."
                            : "Tanda tangan dan nomor surat wajib diisi sebelum tombol Setuju dapat memproses keputusan."}
                        </p>
                      </div>
                      {viewRole !== "admin" ? <SignaturePad
                        value={manualSignatures[accountNip] ?? ""}
                        onChange={(dataUrl) => saveManualSignature(accountNip, dataUrl)}
                      /> : null}
                    </div>
                  ) : null}

                  {hasSelectedRequest && (selected.status !== "Pending Admin" ||
                  viewRole === "admin" ||
                  viewRole === "atasan" ||
                  viewRole === "pyb") ? (
                    <div
                      className={cn(
                        "flex flex-col gap-3 rounded-md bg-muted/55 p-4 sm:flex-row sm:items-center",
                        (viewRole === "admin" ||
                          viewRole === "atasan" ||
                          viewRole === "pyb") &&
                          "sm:justify-end",
                      )}
                    >
                    {selected.status !== "Pending Admin" ? (
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
                              viewRole === "admin"
                                ? "Pending Atasan"
                                : viewRole === "atasan"
                                  ? "Pending Pejabat"
                                  : "Disetujui",
                              viewRole === "admin"
                                ? "Diverifikasi admin dan diteruskan ke atasan langsung"
                                : viewRole === "atasan"
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
            <section className="grid gap-5">
              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="rounded-md border bg-muted/45 p-4">
                    <p className="text-sm font-semibold">Aksi cepat pengelola</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Button
                        variant="outline"
                        className="h-auto min-h-12 justify-start whitespace-normal px-3 py-3 text-left leading-snug [&_svg]:mr-1 [&_svg]:size-4"
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
                        <span>Tambah Pegawai</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto min-h-12 justify-start whitespace-normal px-3 py-3 text-left leading-snug [&_svg]:mr-1 [&_svg]:size-4"
                        onClick={() =>
                          openAction(
                            "Reset Kuota Tahunan",
                            `Kuota tahun ${activeFiscalYear} akan dibuat sebesar 12 hari dan saldo lama akan dihitung ulang sesuai batas BKN.`,
                            "Jalankan Reset",
                          )
                        }
                      >
                        <CalendarDays />
                        <span>Reset Kuota Tahunan</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto min-h-12 justify-start whitespace-normal px-3 py-3 text-left leading-snug [&_svg]:mr-1 [&_svg]:size-4"
                        onClick={() =>
                          openAction(
                            "Validasi Nomor WhatsApp",
                            "Sistem menemukan 3 nomor aktif dan 1 nomor yang perlu diperiksa kembali.",
                            "Tandai Sudah Diperiksa",
                          )
                        }
                      >
                        <MessageCircle />
                        <span>Cek Nomor WA</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto min-h-12 justify-start whitespace-normal px-3 py-3 text-left leading-snug [&_svg]:mr-1 [&_svg]:size-4"
                        onClick={downloadRecap}
                      >
                        <FileText />
                        <span>Rekap Dokumen</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <CardTitle>Manajemen Pegawai & Kuota</CardTitle>
                      <CardDescription>
                        Data ringkas untuk validasi hak cuti dan jalur persetujuan.
                      </CardDescription>
                    </div>
                    <div className="w-full space-y-2 lg:max-w-xs">
                      <Label htmlFor="employee-search">Cari pegawai</Label>
                      <Input
                        id="employee-search"
                        placeholder="Nama, NIP, peran, atasan, pejabat, WA"
                        value={employeeSearch}
                        onChange={(event) => {
                          setEmployeeSearch(event.target.value);
                          setEmployeePage(1);
                        }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Menampilkan {employeePageStart}-{employeePageEnd} dari{" "}
                    {filteredAdminEmployees.length} data
                    {filteredAdminEmployees.length !== adminEmployees.length
                      ? `, total ${adminEmployees.length} pegawai.`
                      : "."}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-3 font-medium">Pegawai</th>
                          <th className="py-3 font-medium">Jabatan</th>
                          <th className="py-3 font-medium">Peran</th>
                          <th className="py-3 font-medium">Gol/Ruang</th>
                          <th className="py-3 font-medium">Atasan</th>
                          <th className="py-3 font-medium">Pejabat</th>
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
                        {isLoadingEmployees ? (
                          <tr>
                            <td
                              className="py-6 text-center text-muted-foreground"
                              colSpan={12}
                            >
                              Memuat data pegawai dari database...
                            </td>
                          </tr>
                        ) : adminEmployees.length === 0 ? (
                          <tr>
                            <td
                              className="py-6 text-center text-muted-foreground"
                              colSpan={12}
                            >
                              Belum ada pegawai. Gunakan tombol Tambah Pegawai.
                            </td>
                          </tr>
                        ) : filteredAdminEmployees.length === 0 ? (
                          <tr>
                            <td
                              className="py-6 text-center text-muted-foreground"
                              colSpan={12}
                            >
                              Tidak ada pegawai yang cocok dengan pencarian.
                            </td>
                          </tr>
                        ) : (
                          paginatedAdminEmployees.map((employee) => (
                            <tr key={employee.nip} className="border-b last:border-0">
                              <td className="py-3">
                                <p className="font-medium">{employee.name}</p>
                                <p className="text-xs text-muted-foreground">{employee.nip}</p>
                              </td>
                              <td className="py-3">{employee.position}</td>
                              <td className="py-3">{formatEmployeeRoles(employee)}</td>
                              <td className="py-3">
                                {hasEmployeeRole(employee, "PPPK") ? "-" : employee.grade}
                              </td>
                              <td className="py-3">{employee.supervisor}</td>
                              <td className="py-3">{employee.approver ?? "-"}</td>
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
                                {getBknEffectiveQuota(employee)} hari
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
                                      `Pegawai ${employee.name} dengan NIP ${employee.nip} akan dihapus dari database.`,
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
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Halaman {safeEmployeePage} dari {employeeTotalPages} • 10 data
                      per halaman
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={safeEmployeePage <= 1}
                        onClick={() =>
                          setEmployeePage((current) => Math.max(1, current - 1))
                        }
                      >
                        Sebelumnya
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={safeEmployeePage >= employeeTotalPages}
                        onClick={() =>
                          setEmployeePage((current) =>
                            Math.min(employeeTotalPages, current + 1),
                          )
                        }
                      >
                        Berikutnya
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="hidden">
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
                        disabled={!hasSelectedRequest}
                      >
                        <Copy />
                        Salin
                      </Button>
                    </div>
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border bg-background p-3 text-xs leading-5 text-foreground">
                      {hasSelectedRequest
                        ? waLeaveRequestTemplate
                        : "Belum ada pengajuan cuti untuk dibuatkan template pesan WhatsApp."}
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
                  {requests.length === 0 && adminInvalidWhatsapp.length === 0 ? (
                    <div className="rounded-md border border-dashed bg-muted/35 p-4 text-sm text-muted-foreground">
                      Belum ada riwayat notifikasi WhatsApp.
                    </div>
                  ) : null}
                  {requests.length > 0 ? (
                    <>
                      <AdminLog
                        title="Pengajuan baru"
                        detail={`${requests.length} pengajuan tercatat`}
                        status="Berhasil"
                      />
                      <AdminLog
                        title="PDF final"
                        detail={`${adminFinalPdfTotal} dokumen final`}
                        status={adminFinalPdfTotal > 0 ? "Berhasil" : "Perlu cek"}
                      />
                    </>
                  ) : null}
                  {adminInvalidWhatsapp.map((employee) => (
                    <AdminLog
                      key={employee.nip}
                      title="Nomor pegawai"
                      detail={`${employee.name} perlu validasi nomor`}
                      status="Perlu cek"
                    />
                  ))}
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

          <TabsContent value="notifications">
            <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Kirim Notifikasi WhatsApp</CardTitle>
                  <CardDescription>
                    Kelola template pesan dan uji pengiriman melalui Fonnte.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border bg-muted/45 p-3">
                    <p className="text-xs text-muted-foreground">Status token</p>
                    <p className="mt-1 text-sm font-semibold">{fonnteTokenStatus}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notification-test-number">Nomor WA tes</Label>
                    <Input
                      id="notification-test-number"
                      value={testWaNumber}
                      onChange={(event) => setTestWaNumber(event.target.value)}
                      placeholder="6281234567890"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={testFonnteToken}
                    disabled={isTestingFonnte}
                  >
                    <Send />
                    {isTestingFonnte ? "Mengirim..." : "Uji Kirim WA"}
                  </Button>
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
                        disabled={!hasSelectedRequest}
                      >
                        <Copy />
                        Salin
                      </Button>
                    </div>
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border bg-background p-3 text-xs leading-5 text-foreground">
                      {hasSelectedRequest
                        ? waLeaveRequestTemplate
                        : "Belum ada pengajuan cuti untuk dibuatkan template pesan WhatsApp."}
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
                  {requests.length === 0 && adminInvalidWhatsapp.length === 0 ? (
                    <div className="rounded-md border border-dashed bg-muted/35 p-4 text-sm text-muted-foreground">
                      Belum ada riwayat notifikasi WhatsApp.
                    </div>
                  ) : null}
                  {requests.length > 0 ? (
                    <>
                      <AdminLog
                        title="Pengajuan baru"
                        detail={`${requests.length} pengajuan tercatat`}
                        status="Berhasil"
                      />
                      <AdminLog
                        title="PDF final"
                        detail={`${adminFinalPdfTotal} dokumen final`}
                        status={adminFinalPdfTotal > 0 ? "Berhasil" : "Perlu cek"}
                      />
                    </>
                  ) : null}
                  {adminInvalidWhatsapp.map((employee) => (
                    <AdminLog
                      key={employee.nip}
                      title="Nomor pegawai"
                      detail={`${employee.name} perlu validasi nomor`}
                      status="Perlu cek"
                    />
                  ))}
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="settings">
            <section className="grid gap-5 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Pengaturan WhatsApp Fonnte</CardTitle>
                  <CardDescription>Ganti token API dan simpan ke database.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border bg-muted/45 p-3">
                    <p className="text-xs text-muted-foreground">Status token</p>
                    <p className="mt-1 text-sm font-semibold">{fonnteTokenStatus}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-fonnte-token">Token API Fonnte</Label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="settings-fonnte-token"
                        type="password"
                        value={fonnteToken}
                        onChange={(event) => setFonnteToken(event.target.value)}
                        placeholder="Masukkan token Fonnte"
                        className="pl-9"
                      />
                    </div>
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
                    variant="outline"
                    className="w-full"
                    onClick={clearFonnteToken}
                    disabled={isSavingFonnte}
                  >
                    Hapus Token Dashboard
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kontrol Tahunan</CardTitle>
                  <CardDescription>
                    Perawatan data kuota dan carry-over 2 tahun ke belakang.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Detail label="Tahun aktif" value={String(activeFiscalYear)} />
                  <Detail label="Default cuti tahunan" value="12 hari" />
                  <Detail label="Sisa tahun sebelumnya" value="Maks. 6 hari" />
                  <Detail label="Maks. normal" value="18 hari termasuk tahun berjalan" />
                  <Detail label="Tidak dipakai 2 tahun+" value="Maks. 24 hari termasuk tahun berjalan" />
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

          <TabsContent value="holidays">
            <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Set Tanggal Libur</CardTitle>
                  <CardDescription>
                    Tambahkan libur nasional, cuti bersama, atau libur lokal kantor.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="holiday-date">Tanggal libur</Label>
                    <Input
                      id="holiday-date"
                      type="date"
                      value={holidayDate}
                      onChange={(event) => setHolidayDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holiday-label">Nama/keterangan</Label>
                    <Input
                      id="holiday-label"
                      value={holidayLabel}
                      onChange={(event) => setHolidayLabel(event.target.value)}
                      placeholder="Contoh: Cuti bersama Idulfitri"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={addHolidayDate}
                    disabled={isSavingHoliday}
                  >
                    <CalendarDays />
                    {isSavingHoliday ? "Menyimpan..." : "Tambah Tanggal Libur"}
                  </Button>
                  <div className="rounded-lg border bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">
                    Sabtu dan Minggu otomatis tidak dihitung sebagai hari kerja.
                    Menu ini dipakai untuk tanggal libur tambahan yang jatuh pada
                    hari kerja.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daftar Tanggal Libur</CardTitle>
                  <CardDescription>
                    Tanggal di bawah ini akan dikecualikan dari hitungan durasi cuti.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {holidayDates.length === 0 ? (
                    <div className="rounded-md border border-dashed bg-muted/35 p-5 text-sm text-muted-foreground">
                      Belum ada tanggal libur tambahan.
                    </div>
                  ) : (
                    holidayDates.map((holiday) => (
                      <div
                        key={holiday.date}
                        className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold">{holiday.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {fmtDate(holiday.date)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="justify-start text-destructive hover:text-destructive sm:justify-center"
                          onClick={() => removeHolidayDate(holiday.date)}
                          disabled={isSavingHoliday}
                        >
                          <Trash2 />
                          Hapus
                        </Button>
                      </div>
                    ))
                  )}
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
                              {viewRole === "admin" && request.status === "Pending Admin" ? (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700"
                                    onClick={() => {
                                      setSelectedId(request.id);
                                      setActiveTab("approval");
                                    }}
                                  >
                                    <CheckCircle2 />
                                    Proses
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-yellow-600 hover:text-yellow-700"
                                    onClick={() => handleAdminReview(request, "tunda")}
                                  >
                                    <Clock3 />
                                    Tunda
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleAdminReview(request, "tolak")}
                                  >
                                    <XCircle />
                                    Tolak
                                  </Button>
                                </div>
                              ) : null}
                              {viewRole === "admin" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => deleteLeaveRequest(request)}
                                >
                                  <Trash2 />
                                  Hapus
                                </Button>
                              ) : null}
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
                  disabled={!hasSelectedRequest || selected.status !== "Disetujui"}
                  onClick={() => downloadPdf(selected)}
                >
                  <Download />
                  Unduh PDF Final
                </Button>
              </div>
              {hasSelectedRequest ? (
                <DispositionSheet
                  request={selected}
                  employee={adminEmployees.find(
                    (employee) => employee.nip === selected.nip,
                  )}
                  employees={adminEmployees}
                />
              ) : (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Belum ada formulir cuti yang dapat dipratinjau. Formulir akan
                    muncul setelah pegawai membuat pengajuan cuti.
                  </CardContent>
                </Card>
              )}
            </section>
          </TabsContent>
        </Tabs>
        ) : null}
      </div>

      <footer className="mb-20 border-t bg-white/70 px-4 py-5 text-center text-xs text-muted-foreground sm:px-6 lg:mb-0 lg:px-7">
        © {activeFiscalYear} SI CUTE - Sistem Cuti Elektronik | Pengadilan Agama Sampang
      </footer>

      <MobileNavigation
        activeTab={activeTab}
        viewRole={viewRole}
        onSelect={(tab) => {
          setActiveTab(tab);
          setMobileMenuOpen(false);
        }}
      />

      {mobileMenuOpen ? (
        <MobileMenuDrawer
          activeTab={activeTab}
          accountRole={roleLabel}
          viewRole={viewRole}
          onClose={() => setMobileMenuOpen(false)}
          onLogout={logout}
          onSelect={(tab) => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }}
        />
      ) : null}

      {dialog ? (
        <ActionDialog
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirmLabel}
          mode={dialog.mode}
          employee={dialog.employee}
          employees={adminEmployees}
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
      {successPopup ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-5">
          <Card className="w-full max-w-md border-emerald-200 bg-white shadow-2xl">
            <CardContent className="flex flex-col items-center px-7 py-9 text-center">
              <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="size-11" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{successPopup.title}</h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                {successPopup.description}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Notifikasi proses cuti dapat dipantau pada halaman Persetujuan.
              </p>
              <Button className="mt-7 w-full" onClick={() => setSuccessPopup(null)}>
                Lanjutkan
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
        </div>
      </div>
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

function getNavigationItems(viewRole: ViewRole, activeTab: string) {
  const isAdmin = viewRole === "admin";
  return [
    {
      label: "Dashboard",
      shortLabel: "Home",
      icon: LayoutDashboard,
      tab: "dashboard",
      active: activeTab === "dashboard",
    },
    {
      label: "Pengajuan Cuti",
      shortLabel: "Ajukan",
      icon: ClipboardList,
      tab: "pengajuan",
      active: activeTab === "pengajuan",
    },
    {
      label: "Persetujuan",
      shortLabel: "Setuju",
      icon: ShieldCheck,
      tab: "approval",
      active: activeTab === "approval",
    },
    {
      label: "Pegawai & Kuota",
      shortLabel: "Pegawai",
      icon: UsersRound,
      tab: "admin",
      active: activeTab === "admin",
      adminOnly: true,
    },
    {
      label: "Notifikasi WhatsApp",
      shortLabel: "WA",
      icon: MessageCircle,
      tab: "notifications",
      active: activeTab === "notifications",
      adminOnly: true,
    },
    {
      label: "Laporan PDF",
      shortLabel: "PDF",
      icon: FileBarChart2,
      tab: "document",
      active: activeTab === "document",
    },
    {
      label: "Pengaturan",
      shortLabel: "Setting",
      icon: Settings,
      tab: "settings",
      active: activeTab === "settings",
      adminOnly: true,
    },
    {
      label: "Set Tanggal Libur",
      shortLabel: "Libur",
      icon: CalendarDays,
      tab: "holidays",
      active: activeTab === "holidays",
      adminOnly: true,
    },
    {
      label: "Riwayat Aktivitas",
      shortLabel: "Riwayat",
      icon: History,
      tab: "history",
      active: activeTab === "history",
    },
  ].filter((item) => !item.adminOnly || isAdmin);
}

function DashboardSidebar({
  activeTab,
  accountRole,
  viewRole,
  onSelect,
  onLogout,
}: {
  activeTab: string;
  accountRole: string;
  viewRole: ViewRole;
  onSelect: (tab: string) => void;
  onLogout: () => void;
}) {
  const items = getNavigationItems(viewRole, activeTab);

  return (
    <aside className="admin-sidebar hidden min-h-screen w-[236px] shrink-0 flex-col bg-[#062f5f] text-white lg:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <PaSampangLogo className="h-11 w-11 rounded-md bg-white/10 object-contain p-0.5 ring-1 ring-white/15" />
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight">SI CUTE</p>
          <p className="text-[11px] leading-4 text-blue-100/85">
            Sistem Cuti Elektronik
          </p>
          <p className="text-[10px] leading-3 text-blue-100/70">
            Pengadilan Agama Sampang
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-blue-50/85 transition hover:bg-white/10 hover:text-white",
                item.active && "bg-[#0b67c2] text-white shadow-[0_10px_24px_rgba(3,24,56,0.28)]",
              )}
              onClick={() => onSelect(item.tab)}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-4 pb-5">
        <div className="mb-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-blue-50/85">
          <p className="font-semibold text-white">{accountRole}</p>
          <p className="mt-0.5">Akun aktif</p>
        </div>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-md border border-white/12 px-3 py-2.5 text-left text-sm font-medium text-blue-50/85 transition hover:bg-white/10 hover:text-white"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

function MobileNavigation({
  activeTab,
  viewRole,
  onSelect,
}: {
  activeTab: string;
  viewRole: ViewRole;
  onSelect: (tab: string) => void;
}) {
  const items = getNavigationItems(viewRole, activeTab);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 px-2 py-2 shadow-[0_-10px_28px_rgba(15,36,70,0.12)] backdrop-blur lg:hidden">
      <div className="scrollbar-soft flex gap-1 overflow-x-auto pb-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className={cn(
                "flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium text-muted-foreground",
                item.active && "bg-primary text-primary-foreground shadow-sm",
              )}
              onClick={() => onSelect(item.tab)}
            >
              <Icon className="h-4 w-4" />
              <span className="leading-tight">{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function MobileMenuDrawer({
  activeTab,
  accountRole,
  viewRole,
  onClose,
  onSelect,
  onLogout,
}: {
  activeTab: string;
  accountRole: string;
  viewRole: ViewRole;
  onClose: () => void;
  onSelect: (tab: string) => void;
  onLogout: () => void;
}) {
  const items = getNavigationItems(viewRole, activeTab);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/45 lg:hidden">
      <aside className="admin-sidebar flex h-full w-[86vw] max-w-[340px] flex-col text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-5 py-5">
          <div className="flex items-center gap-3">
            <PaSampangLogo className="h-11 w-11 rounded-md bg-white/10 object-contain p-0.5 ring-1 ring-white/15" />
            <div>
              <p className="text-lg font-bold leading-tight">SI CUTE</p>
              <p className="text-[11px] leading-4 text-blue-100/85">
                Sistem Cuti Elektronik
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-blue-50/85 hover:bg-white/10"
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-medium text-blue-50/85 transition hover:bg-white/10 hover:text-white",
                  item.active && "bg-[#0b67c2] text-white shadow-[0_10px_24px_rgba(3,24,56,0.28)]",
                )}
                onClick={() => onSelect(item.tab)}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 pb-5">
          <div className="mb-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-blue-50/85">
            <p className="font-semibold text-white">{accountRole}</p>
            <p className="mt-0.5">Akun aktif</p>
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-md border border-white/12 px-3 py-2.5 text-left text-sm font-medium text-blue-50/85 transition hover:bg-white/10 hover:text-white"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </div>
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
            <Detail label="Jabatan" value={employee.position} />
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
  employees,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  mode?: "add" | "edit" | "delete";
  employee?: AdminEmployee;
  employees: AdminEmployee[];
  onCancel: () => void;
  onConfirm: (updatedEmployee?: AdminEmployee) => void | Promise<void>;
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
  const [position, setPosition] = useState(employee?.position ?? "Pelaksana");
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
    employee?.supervisor ?? "-",
  );
  const [selectedApprover, setSelectedApprover] = useState(
    employee?.approver ?? "-",
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
    { name: "-", nip: "-" },
    ...employees.filter(
      (item) =>
        item.nip !== employee?.nip &&
        (hasEmployeeRole(item, "Atasan Langsung") ||
          hasEmployeeRole(item, "Pejabat Berwenang") ||
          hasEmployeeRole(item, "Admin Pembuat Daftar Cuti")),
    ),
  ].filter(
    (item, index, items) =>
      items.findIndex((candidate) => candidate.name === item.name) === index,
  );
  const approverOptions = [
    { name: "-", nip: "-" },
    ...employees.filter(
      (item) =>
        item.nip !== employee?.nip &&
        (hasEmployeeRole(item, "Pejabat Berwenang") ||
          hasEmployeeRole(item, "Admin Pembuat Daftar Cuti")),
    ),
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
      position: position.trim() || "Pelaksana",
      grade: isSelectedPppk ? "" : grade.trim() || employeeGrade,
      serviceYears: nextServiceYears,
      serviceMonths: nextServiceMonths,
      serviceAsOf: getJakartaYearMonth(),
      supervisor:
        isSelectedPyb && normalizedSelectedRoles.length === 1
          ? "-"
          : selectedSupervisor,
      approver:
        isSelectedPyb && normalizedSelectedRoles.length === 1
          ? "-"
          : selectedApprover,
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
      accountPassword,
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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="employee-position">Jabatan</Label>
              <Input
                id="employee-position"
                placeholder="Contoh: Analis Perkara Peradilan"
                value={position}
                onChange={(event) => setPosition(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Jabatan ini digunakan otomatis pada formulir PDF cuti.
              </p>
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
                      {option.nip === "-"
                        ? "Tanpa atasan langsung"
                        : `${option.name} - NIP ${option.nip}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Dipakai untuk routing persetujuan tingkat 1.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Pejabat berwenang</Label>
              <Select value={selectedApprover} onValueChange={setSelectedApprover}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pejabat berwenang" />
                </SelectTrigger>
                <SelectContent>
                  {approverOptions.map((option) => (
                    <SelectItem value={option.name} key={option.nip}>
                      {option.nip === "-"
                        ? "Tanpa pejabat berwenang"
                        : `${option.name} - NIP ${option.nip}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Dipakai untuk routing persetujuan final tingkat 2.
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
  employees,
}: {
  request: LeaveRequest;
  employee?: AdminEmployee;
  employees: AdminEmployee[];
}) {
  const leaveType = request.type.replace("Cuti ", "");
  const hasReviewerSignature = request.status !== "Pending Atasan";
  const hasApproverSignature =
    request.status === "Disetujui" || request.status === "Ditolak";
  const isLeave = (value: string) =>
    value.toLowerCase().includes(leaveType.toLowerCase());
  const annualStatementRows = getAnnualQuotaStatementRows(employee, request);
  const reviewerEmployee = employees.find(
    (item) => item.name === request.reviewer,
  );
  const approverEmployee = employees.find(
    (item) => item.name === request.approver,
  );

  if (hasEmployeeRole(employee, "PPPK")) {
    return (
      <PppkDispositionSheet
        request={request}
        employee={employee}
        employees={employees}
      />
    );
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
              <PreviewCell>{employee?.position ?? "Pelaksana"}</PreviewCell>
              <PreviewLabel>GOL. RUANG</PreviewLabel>
              <PreviewCell>{employee?.grade ?? employeeGrade}</PreviewCell>
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
                          reviewerEmployee?.nip ?? "-",
                        )}
                      />
                    </div>
                    <p className="text-[9px]">Telah ditandatangani oleh</p>
                    <p className="font-bold">{request.reviewer.toUpperCase()}</p>
                    <p>NIP. {reviewerEmployee?.nip ?? "-"}</p>
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
                          approverEmployee?.nip ?? "-",
                        )}
                      />
                    </div>
                    <p className="text-[9px]">Telah ditandatangani oleh</p>
                    <p className="font-bold">{request.approver.toUpperCase()}</p>
                    <p>NIP. {approverEmployee?.nip ?? "-"}</p>
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
  employees,
}: {
  request: LeaveRequest;
  employee?: AdminEmployee;
  employees: AdminEmployee[];
}) {
  const leaveType = request.type.replace("Cuti ", "");
  const isLeave = (value: string) =>
    value.toLowerCase().includes(leaveType.toLowerCase());
  const annualStatementRows = getAnnualQuotaStatementRows(employee, request);
  const hasReviewerSignature = request.status !== "Pending Atasan";
  const hasApproverSignature =
    request.status === "Disetujui" || request.status === "Ditolak";
  const reviewerEmployee = employees.find(
    (item) => item.name === request.reviewer,
  );
  const approverEmployee = employees.find(
    (item) => item.name === request.approver,
  );

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
              <PreviewCell>{employee?.position ?? "OPERATOR LAYANAN OPERASIONAL"}</PreviewCell>
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
                          reviewerEmployee?.nip ?? "-",
                        )}
                      />
                    </div>
                    <p className="text-[9px]">Telah ditandatangani oleh</p>
                    <p className="font-bold">{request.reviewer.toUpperCase()}</p>
                    <p>NIP. {reviewerEmployee?.nip ?? "-"}</p>
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
                          approverEmployee?.nip ?? "-",
                        )}
                      />
                    </div>
                    <p className="text-[9px]">Telah ditandatangani oleh</p>
                    <p className="font-bold">{request.approver.toUpperCase()}</p>
                    <p>NIP. {approverEmployee?.nip ?? "-"}</p>
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

function SignaturePad({
  value,
  onChange,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (!value) return;
    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = value;
  }, [value]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    drawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const current = point(event);
    context.beginPath();
    context.moveTo(current.x, current.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const current = point(event);
    context.strokeStyle = "#111827";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineTo(current.x, current.y);
    context.stroke();
  }

  function finishDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(event.currentTarget.toDataURL("image/png"));
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    onChange("");
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={720}
        height={220}
        aria-label="Area menggambar tanda tangan"
        className="h-44 w-full touch-none rounded-md border-2 border-dashed border-primary/30 bg-white shadow-inner"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={finishDrawing}
        onPointerCancel={finishDrawing}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Gunakan mouse, stylus, atau jari.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
          <Trash2 />
          Hapus Tanda Tangan
        </Button>
      </div>
    </div>
  );
}

function QrVerificationMark({ code }: { code: string }) {
  const [imageSrc, setImageSrc] = useState("");

  useEffect(() => {
    const nipLine = code.split("\n").find((line) => line.startsWith("NIP "));
    const nip = nipLine?.slice(4).trim() ?? "";
    try {
      const saved = JSON.parse(
        window.localStorage.getItem("cutipns:manual-signatures") ?? "{}",
      ) as Record<string, string>;
      setImageSrc(saved[nip] ?? "");
    } catch {
      setImageSrc("");
    }
  }, [code]);

  return (
    <div className="flex h-16 w-28 items-center justify-center bg-white p-1">
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="Tanda tangan manual"
          className="max-h-full max-w-full object-contain"
          src={imageSrc}
        />
      ) : (
        <span className="px-2 text-center text-[8px] text-gray-500">
          Tanda tangan belum tersedia
        </span>
      )}
    </div>
  );
}










