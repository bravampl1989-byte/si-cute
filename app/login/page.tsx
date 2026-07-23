"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaSampangLogo } from "@/components/pa-sampang-logo";

export default function LoginPage() {
  const router = useRouter();
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nip, password }),
      });
      const result = (await response.json()) as {
        error?: string;
        user?: {
          nip: string;
          nama: string;
          peran: string;
          peranTambahan?: string[];
        };
      };

      if (!response.ok || !result.user) {
        setError(result.error ?? "Gagal masuk. Silakan coba kembali.");
        return;
      }

      window.localStorage.setItem("cutipns-user", JSON.stringify(result.user));
      router.push("/");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="sofia-theme grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
      <section className="relative hidden overflow-hidden bg-[#30346f] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(92,98,229,0.9),rgba(21,179,163,0.72))]" />
        <div className="absolute inset-0 opacity-25">
          <div className="absolute left-0 right-0 top-28 h-px bg-white/35" />
          <div className="absolute left-0 right-0 top-44 h-px bg-white/20" />
          <div className="absolute bottom-24 left-0 right-0 h-px bg-white/20" />
        </div>

        <div className="relative flex items-center gap-3">
          <PaSampangLogo className="h-16 w-16" />
          <div>
            <p className="text-lg font-semibold">SI CUTE</p>
            <p className="text-xs text-white/65">
              Sistem Cuti Elektronik Pengadilan Agama Sampang
            </p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-md bg-white/10">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-normal">
            Pengelolaan cuti yang tertib, transparan, dan mudah dipantau.
          </h1>
          <div className="mt-5 max-w-md text-sm leading-6 text-white/70">
            <p>Pengajuan dan persetujuan cuti berjenjang berpedoman pada:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Peraturan Badan Kepegawaian Negara Nomor 7 Tahun 2021.</li>
              <li>Surat Edaran SEKMA Nomor 13 Tahun 2029.</li>
              <li>Keputusan SEKMA Nomor 212/SEK/SK.KP5.3/II/2024.</li>
            </ol>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-3 border-t border-white/15 pt-6">
            <LoginFeature value="2 tingkat" label="Persetujuan" />
            <LoginFeature value="3 regulasi" label="Ketentuan cuti" />
            <LoginFeature value="WhatsApp" label="Notifikasi" />
          </div>
        </div>

        <p className="relative text-xs text-white/45">
          Sistem internal instansi. Akses hanya untuk pengguna terdaftar.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-8">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardContent className="p-0 sm:p-8">
              <div className="mb-7">
                <div className="mb-6 flex items-center gap-3">
                  <PaSampangLogo className="h-16 w-16" />
                  <div className="min-w-0">
                    <p className="text-lg font-semibold leading-tight">SI CUTE</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Sistem Cuti Elektronik Pengadilan Agama Sampang
                    </p>
                  </div>
                </div>
                <h2 className="text-2xl font-semibold tracking-normal">
                  Masuk ke akun Anda
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Gunakan NIP dan kata sandi yang telah didaftarkan oleh Admin Pembuat Daftar Cuti.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="nip">NIP</Label>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="nip"
                      inputMode="numeric"
                      autoComplete="username"
                      className="h-11 pl-10"
                      value={nip}
                      onChange={(event) =>
                        setNip(event.target.value.replace(/\D/g, "").slice(0, 18))
                      }
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Masukkan 18 digit Nomor Induk Pegawai.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Kata sandi</Label>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => {
                        setError("");
                        setNotice(
                          "Permintaan reset dicatat. Hubungi Admin Pembuat Daftar Cuti untuk menerima kata sandi baru.",
                        );
                      }}
                    >
                      Lupa kata sandi?
                    </button>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="h-11 px-10"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={
                        showPassword
                          ? "Sembunyikan kata sandi"
                          : "Tampilkan kata sandi"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button className="h-11 w-full" disabled={isLoading}>
                  {isLoading ? "Memeriksa akun..." : "Masuk"}
                </Button>

                {error ? (
                  <p
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
                {notice ? (
                  <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
                    {notice}
                  </p>
                ) : null}
              </form>

              <div className="mt-7 border-t pt-5">
                <p className="text-center text-xs leading-5 text-muted-foreground">
                  Hubungi Admin Pembuat Daftar Cuti apabila akun belum terdaftar atau mengalami
                  kendala akses.
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © 2026 - Pengadilan Agama Sampang
          </p>
        </div>
      </section>
    </main>
  );
}

function LoginFeature({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-sm font-semibold">{value}</p>
      <p className="mt-1 text-xs text-white/55">{label}</p>
    </div>
  );
}
