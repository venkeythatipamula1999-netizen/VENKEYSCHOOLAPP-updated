"use client";
// src/app/schools/page.tsx
import { useState, useEffect, useRef } from "react";
import { useRouter }                   from "next/navigation";
import {
  collection, getDocs, query, where,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAdmin }     from "@/context/AdminContext";
import DashboardLayout  from "@/components/layout/DashboardLayout";
import {
  Card, CardHeader, FilterBar, FilterInput,
  Table, Tr, Td, Badge, Btn, LiveBadge, EmptyState,
  Modal, FormField, FormInput,
} from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
const SUPER_KEY = process.env.NEXT_PUBLIC_SUPER_ADMIN_KEY || "VIDLYM_SUPER_2026_XK9M";

const SCHOOL_COLORS = ["#0D1B2A","#00B4D8","#10B981","#8B5CF6","#F43F5E","#F5A623"];

// ── helpers ───────────────────────────────────────────────────
function getInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).join("");
}
function getAreaCode(place: string) {
  if (!place) return "LOC";
  const c = place.trim().toUpperCase();
  const combined = (c[0] + c.slice(1).replace(/[AEIOU]/g,"")).replace(/[^A-Z]/g,"");
  return combined.slice(0,4).padEnd(3, combined[combined.length-1] || "X");
}
function generateSchoolCode(name: string, village: string) {
  return `${getInitials(name)}-${getAreaCode(village)}`;
}
function generateTempPassword(schoolCode: string) {
  // Format: VL@<SchoolCode><4-digit year><2-digit random>
  // e.g. VL@SPGOPA2026#47 — easy to read, school-specific
  const rand = String(Math.floor(10 + Math.random() * 90));
  return `VL@${schoolCode}${new Date().getFullYear()}#${rand}`;
}

async function getNextSchoolId() {
  const snap = await getDocs(collection(db, "schools"));
  return `SCH${String(snap.size + 1).padStart(6,"0")}`;
}
async function resolveUniqueCode(base: string) {
  const snap = await getDocs(
    query(collection(db,"schools"), where("school_code",">=",base), where("school_code","<=",base+"\uf8ff"))
  );
  const existing = snap.docs.map(d => d.data().school_code as string);
  if (!existing.includes(base)) return base;
  let i = 1;
  while (true) {
    const c = `${base}-${String(i).padStart(2,"0")}`;
    if (!existing.includes(c)) return c;
    i++;
  }
}

// ── QR display ────────────────────────────────────────────────
function QRDisplay({ value }: { value: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-36 h-36 bg-white border-2 border-navy rounded-xl flex items-center justify-center p-2 shadow">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(value)}&bgcolor=ffffff&color=0f2744`}
          alt={`QR for ${value}`}
          className="w-full h-full object-contain"
        />
      </div>
      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{value}</span>
    </div>
  );
}

// ── WhatsApp badge ────────────────────────────────────────────
function WABadge({ config }: { config: any }) {
  if (!config?.phoneNumber)
    return <span className="text-[10px] bg-slate-100 text-slate-400 font-semibold px-2 py-0.5 rounded-full">⬜ Not set</span>;
  if (config?.verified)
    return <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">✅ Active</span>;
  return <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">⚠️ Pending</span>;
}

// ── Logo uploader ─────────────────────────────────────────────
function LogoUploader({ logoUrl, logoFile, uploadProgress, onFileChange }: {
  logoUrl: string; logoFile: File | null;
  uploadProgress: number | null; onFileChange: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview  = logoFile ? URL.createObjectURL(logoFile) : logoUrl;
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        onClick={() => inputRef.current?.click()}
        className="w-28 h-28 rounded-full border-4 border-dashed border-slate-300 hover:border-navy
                   bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden transition group relative"
      >
        {preview ? (
          <>
            <img src={preview} alt="logo" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                            flex items-center justify-center transition rounded-full">
              <span className="text-white text-xs font-bold">Change</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-navy transition">
            <span className="text-3xl">🏫</span>
            <span className="text-[10px] font-bold">Upload Logo</span>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
        className="hidden" onChange={e => { if (e.target.files?.[0]) onFileChange(e.target.files[0]); }} />
      {uploadProgress !== null && uploadProgress < 100 && (
        <div className="w-full">
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>Uploading…</span><span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-navy rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}
      {uploadProgress === 100 && (
        <span className="text-[11px] text-emerald-600 font-bold">✅ Logo uploaded</span>
      )}
      <p className="text-[10px] text-slate-400 text-center">
        PNG, JPG, SVG · Max 2 MB<br/>Appears on app splash screen and login page
      </p>
    </div>
  );
}

// ── Color picker ─────────────────────────────────────────────
const PRESET_COLORS = ["#0D1B2A","#1E40AF","#0F766E","#7C3AED","#BE123C","#B45309","#166534","#1D4ED8"];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-slate-500 mb-2">School Theme Color</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESET_COLORS.map(c => (
          <button key={c} onClick={() => onChange(c)}
            className={`w-8 h-8 rounded-lg border-2 transition cursor-pointer
              ${value === c ? "border-navy scale-110 shadow-md" : "border-transparent hover:scale-105"}`}
            style={{ background: c }} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-10 h-8 rounded cursor-pointer border border-slate-200" />
        <span className="font-mono text-[12px] text-slate-500">{value}</span>
        <span className="text-[10px] text-slate-400">— or pick custom</span>
      </div>
      <div className="mt-3 rounded-xl overflow-hidden border border-slate-200">
        <div className="h-8 flex items-center justify-center" style={{ background: value }}>
          <span className="text-white text-[11px] font-bold">Splash screen</span>
        </div>
        <div className="h-6 flex items-center justify-center bg-white">
          <span className="text-[10px] font-bold" style={{ color: value }}>Login page accent</span>
        </div>
      </div>
    </div>
  );
}

type ModalTab = "info" | "branding" | "whatsapp";

// ── MAIN ─────────────────────────────────────────────────────
export default function SchoolsPage() {
  const { schools, teachers, students } = useAdmin();
  const router = useRouter();

  const [search,          setSearch]          = useState("");
  const [showModal,       setShowModal]        = useState(false);
  const [showQR,          setShowQR]           = useState<{ code: string; name: string; logoUrl: string; color: string } | null>(null);
  const [credentials,     setCredentials]      = useState<{ email: string; password: string; schoolCode: string; adminName: string } | null>(null);
  const [saving,          setSaving]           = useState(false);
  const [preview,         setPreview]          = useState("");
  const [activeTab,       setActiveTab]        = useState<ModalTab>("info");
  const [logoFile,        setLogoFile]         = useState<File | null>(null);
  const [uploadProgress,  setUploadProgress]   = useState<number | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl]  = useState("");
  const [testing,         setTesting]          = useState(false);
  const [testResult,      setTestResult]       = useState<"success"|"fail"|null>(null);

  // Reset password state
  const [resetTarget,     setResetTarget]      = useState<{ id: string; name: string; email: string } | null>(null);
  const [resetting,       setResetting]        = useState(false);
  const [resetResult,     setResetResult]      = useState<{ password: string; email: string; schoolName: string; resetAt: string } | null>(null);

  const emptyForm = {
    school_name:"", village:"", district:"", state:"",
    adminName:"", adminEmail:"", adminPhone:"",
    primaryColor:"#0D1B2A", tagline:"",
    waPhone:"", waPhoneNumberId:"", waAccessToken:"", waBusinessId:"",
    waTriggerAttendance:true, waTriggerFees:true, waTriggerExams:true,
    waTriggerAnnouncements:true, waTriggerEmergency:true,
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (form.school_name && form.village) setPreview(generateSchoolCode(form.school_name, form.village));
    else setPreview("");
  }, [form.school_name, form.village]);

  const filtered = schools.filter(s =>
    !search || (s.name || s.schoolName || s.id || "").toLowerCase().includes(search.toLowerCase())
  );

  const resetModal = () => {
    setShowModal(false); setActiveTab("info"); setForm(emptyForm);
    setLogoFile(null); setUploadProgress(null); setUploadedLogoUrl(""); setTestResult(null);
  };

  const uploadLogo = (schoolCode: string): Promise<string> =>
    new Promise((resolve, reject) => {
      if (!logoFile) { resolve(""); return; }
      const ext = logoFile.name.split(".").pop();
      const task = uploadBytesResumable(ref(storage, `school_logos/${schoolCode}.${ext}`), logoFile);
      task.on("state_changed",
        snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        () => getDownloadURL(task.snapshot.ref).then(resolve).catch(reject),
      );
    });

  const createSchool = async () => {
    if (!form.school_name || !form.village) return;
    if (!form.adminEmail) {
      alert("Admin email is required to create login credentials.");
      setActiveTab("info");
      return;
    }
    setSaving(true);
    try {
      // ── Step 1: Upload logo if provided ──
      const baseCode    = generateSchoolCode(form.school_name, form.village);
      let logoUrl = "";
      if (logoFile) {
        setActiveTab("branding");
        logoUrl = await uploadLogo(baseCode);
        setUploadedLogoUrl(logoUrl);
      }

      // ── Step 2: Build WhatsApp config ──
      const whatsappConfig = form.waPhoneNumberId ? {
        phoneNumber: form.waPhone, phoneNumberId: form.waPhoneNumberId,
        accessToken: form.waAccessToken, businessAccountId: form.waBusinessId,
        verified: testResult === "success",
        enabledTriggers: {
          attendance: form.waTriggerAttendance, fees: form.waTriggerFees,
          exams: form.waTriggerExams, announcements: form.waTriggerAnnouncements,
          emergency: form.waTriggerEmergency,
        },
      } : null;

      // ── Step 3: Create school via backend API (correct doc ID, creates Firebase auth) ──
      const res = await fetch(`${API_URL}/api/super/schools/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-super-admin-key": SUPER_KEY,
        },
        body: JSON.stringify({
          schoolName:        form.school_name,
          location:          form.village,
          district:          form.district,
          state:             form.state,
          principalName:     form.adminName,
          principalEmail:    form.adminEmail,
          principalPhone:    form.adminPhone,
          principalPassword: generateTempPassword(baseCode),
          primaryColor:      form.primaryColor,
          tagline:           form.tagline,
          logoUrl,
          ...(whatsappConfig ? { whatsappConfig } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "School creation failed.");
        return;
      }

      const school_code  = data.schoolId;
      const tempPassword = data.principalPassword || generateTempPassword(school_code);

      // ── Step 4: Show credentials modal, then QR ──
      setShowModal(false);
      setCredentials({ email: form.adminEmail, password: tempPassword, schoolCode: school_code, adminName: form.adminName });
      setForm(emptyForm); setLogoFile(null); setUploadProgress(null); setUploadedLogoUrl(""); setActiveTab("info");
    } catch (err) {
      console.error("[createSchool] Error:", err);
      alert("Network error. Please check your connection and try again.");
    } finally { setSaving(false); }
  };

  const testWhatsApp = async () => {
    if (!form.waPhoneNumberId || !form.waAccessToken || !form.waPhone) return;
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch("/api/whatsapp/test", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ phoneNumberId: form.waPhoneNumberId, accessToken: form.waAccessToken, toPhone: form.waPhone }),
      });
      setTestResult(res.ok ? "success" : "fail");
    } catch { setTestResult("fail"); }
    finally  { setTesting(false); }
  };

  const toggleStatus = async (id: string, current?: string) => {
    const newStatus = current === "suspended" ? "active" : "suspended";
    await fetch(`${API_URL}/api/super/schools/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-super-admin-key": SUPER_KEY },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const resetPassword = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await fetch(`${API_URL}/api/super/schools/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-super-admin-key": SUPER_KEY },
      });
      const data = await res.json();
      if (!res.ok) { alert(data?.error || "Password reset failed."); return; }
      setResetTarget(null);
      setResetResult({
        password:   data.tempPassword,
        email:      data.adminEmail,
        schoolName: data.schoolName,
        resetAt:    data.resetAt,
      });
    } catch (err) {
      alert("Network error. Please check your connection.");
    } finally {
      setResetting(false);
    }
  };

  const TABS: { key: ModalTab; label: string; icon: string }[] = [
    { key:"info",     label:"School Info", icon:"🏫" },
    { key:"branding", label:"Branding",    icon:"🎨" },
    { key:"whatsapp", label:"WhatsApp",    icon:"💬" },
  ];

  const TRIGGER_LABELS = [
    { key:"waTriggerAttendance",    label:"Attendance alerts" },
    { key:"waTriggerFees",          label:"Fee reminders" },
    { key:"waTriggerExams",         label:"Exam results" },
    { key:"waTriggerAnnouncements", label:"Announcements" },
    { key:"waTriggerEmergency",     label:"Emergency notices" },
  ] as const;

  return (
    <DashboardLayout title="Schools Management">
      
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { icon:"🏫", label:"Total Schools",   val: schools.length,                                                     cls:"text-navy" },
          { icon:"✅", label:"Active",           val: schools.filter(s => s.status !== "suspended").length,              cls:"text-emerald-500" },
          { icon:"⊘",  label:"Suspended",        val: schools.filter(s => s.status === "suspended").length,              cls:"text-rose-400" },
          { icon:"💬", label:"WhatsApp Active",  val: schools.filter(s => (s as any).whatsappConfig?.verified).length,  cls:"text-green-500" },
        ].map(({ icon, label, val, cls }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
            <div className={`text-3xl font-black ${cls}`}>{val}</div>
            <div className="text-sm text-slate-500 font-medium mt-1">{icon} {label}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader title="🏫 All Schools" count={filtered.length}>
          <LiveBadge collection="schools" />
          <Btn variant="gold" onClick={() => setShowModal(true)}>＋ Onboard School</Btn>
        </CardHeader>
        <FilterBar>
          <FilterInput placeholder="🔍  Search schools…" value={search} onChange={setSearch} />
        </FilterBar>
        <Table headers={["School","Code","Location","Admin","Teachers","Students","WhatsApp","Status","Actions"]}>
          {filtered.length > 0 ? filtered.map((s, i) => {
            const tCount = teachers.filter(t => t.schoolId === s.id || t.school_id === s.id).length;
            const sCount = students.filter(st => st.schoolId === s.id || st.school_id === s.id).length;
            const code   = (s as any).school_code || s.id;
            const logoUrl = (s as any).logoUrl || "";
            const color   = (s as any).primaryColor || SCHOOL_COLORS[i % 6];
            return (
              <Tr key={s.id}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200"
                      style={{ background: logoUrl ? "#fff" : color }}>
                      {logoUrl
                        ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
                        : <span className="text-[11px] font-black text-white">{(s.name||s.schoolName||"S").slice(0,2).toUpperCase()}</span>
                      }
                    </div>
                    <div>
                      <div className="font-bold text-navy text-[13px]">{s.name||s.schoolName||s.id}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{(s as any).school_id||"—"}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[12px] bg-navy/5 text-navy px-2 py-1 rounded">{code}</span>
                    <button onClick={() => setShowQR({ code, name: s.name||s.schoolName||s.id, logoUrl, color })}
                      className="text-slate-400 hover:text-navy" title="Show QR">📱</button>
                  </div>
                </Td>
                <Td>
                  <div className="text-[12px]">
                    <div className="font-semibold text-slate-700">{(s as any).village||s.city||"—"}</div>
                    <div className="text-slate-400 text-[10px]">{(s as any).district||""}{(s as any).state ? ` · ${(s as any).state}` : ""}</div>
                  </div>
                </Td>
                <Td>
                  <div className="text-[12px]">
                    <div className="font-semibold text-slate-700">{s.adminName||"—"}</div>
                    <div className="text-slate-400 text-[10px]">{s.adminEmail||""}</div>
                  </div>
                </Td>
                <Td><strong>{tCount}</strong></Td>
                <Td><strong>{sCount}</strong></Td>
                <Td><WABadge config={(s as any).whatsappConfig} /></Td>
                <Td><Badge status={s.status||"active"} /></Td>
                <Td>
                  <div className="flex items-center gap-2">
                    {/* View Button */}
                    <button
                      onClick={() => router.push(`/schools/${s.id}`)}
                      className="px-3 py-1.5 rounded-lg bg-teal-100 text-teal-800 text-[12px] font-bold hover:bg-teal-200 transition"
                    >
                      👁 View
                    </button>

                    {/* Suspend/Enable Button */}
                    <button
                      onClick={() => toggleStatus(s.id, s.status)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition ${
                        s.status === "suspended" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {s.status === "suspended" ? "✓ Enable" : "⊘ Suspend"}
                    </button>

                    {/* Reset PW Button */}
                    <button
                      onClick={() => setResetTarget({ id: s.id, name: s.name||s.schoolName||s.id, email: s.adminEmail||s.principalEmail||"" })}
                      className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-[12px] font-bold hover:bg-amber-200 border border-amber-200 transition"
                    >
                      🔑 Reset PW
                    </button>
                  </div>
                </Td>
              </Tr>
            );
          }) : <EmptyState icon="🏫" message="No schools yet — onboard your first school!" />}
        </Table>
      </Card>

      {/* ══ RESET PASSWORD — CONFIRM MODAL ══ */}
      {resetTarget && (
        <Modal title="🔑 Reset Admin Password" onClose={() => setResetTarget(null)}>
          <div className="space-y-5 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
              <div className="text-[13px] font-bold text-amber-800 mb-1">⚠️ Are you sure?</div>
              <div className="text-[12px] text-amber-700">
                This will immediately reset the login password for:
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 space-y-2">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">School</div>
                <div className="font-bold text-navy text-[14px]">{resetTarget.name}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Admin Email</div>
                <div className="font-mono text-[13px] text-slate-700">{resetTarget.email || "(no email on record)"}</div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-[11px] text-blue-700 space-y-1">
              <div className="font-bold">What happens next:</div>
              <div>• A secure temporary password is generated</div>
              <div>• The admin's Firebase account is updated immediately</div>
              <div>• They will be forced to change the password on next login</div>
              <div>• This action is logged in the school's security log</div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setResetTarget(null)}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-[13px] hover:bg-slate-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={resetPassword}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-navy font-bold text-[13px] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetting ? (
                  <><span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />Resetting…</>
                ) : "🔑 Yes, Reset Password"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ RESET PASSWORD — RESULT MODAL ══ */}
      {resetResult && (
        <Modal title="✅ Password Reset Successful" onClose={() => setResetResult(null)}>
          <div className="space-y-4 py-2">

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <div className="text-[12px] text-emerald-700 font-bold">✅ Password has been reset</div>
              <div className="text-[11px] text-emerald-600 mt-1">
                Share these credentials with the school admin securely. They must change their password on next login.
              </div>
            </div>

            <ResetCredRow label="School" value={resetResult.schoolName} />
            <ResetCredRow label="Admin Email" value={resetResult.email} />
            <ResetCredRow label="New Temporary Password" value={resetResult.password} highlight />

            <button
              onClick={() => {
                const text = `Vidhaya Layam — Password Reset\n\nSchool: ${resetResult.schoolName}\nEmail: ${resetResult.email}\nNew Password: ${resetResult.password}\n\nPlease change your password immediately after logging in.`;
                navigator.clipboard.writeText(text);
              }}
              className="w-full py-2.5 rounded-xl bg-navy text-white text-[13px] font-bold hover:opacity-90 transition"
            >
              📋 Copy All Details
            </button>

            <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-[11px] text-rose-700">
              <span className="font-bold">⚠️ Security notice:</span> This password is shown only once. The admin is flagged to change it on next login. Reset at: <span className="font-mono">{new Date(resetResult.resetAt).toLocaleString("en-IN")}</span>
            </div>

            <button
              onClick={() => setResetResult(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-[13px] hover:bg-slate-200 transition"
            >
              Done
            </button>
          </div>
        </Modal>
      )}

      {/* ══ ONBOARD MODAL ══ */}
      {showModal && (
        <Modal title="🏫 Onboard New School" onClose={resetModal}>
          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition
                  ${activeTab === t.key ? "bg-white text-navy shadow-sm" : "text-slate-500 hover:text-navy"}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className="max-h-[65vh] overflow-y-auto pr-1 space-y-3">

            {/* TAB 1 — School Info */}
            {activeTab === "info" && <>
              {preview && (
                <div className="bg-gold/10 border border-gold/30 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-gold uppercase tracking-wide">Generated School Code</div>
                    <div className="font-mono font-black text-navy text-xl mt-0.5">{preview}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">May add -01, -02 if duplicate</div>
                  </div>
                  <div className="text-3xl">🏫</div>
                </div>
              )}
              <FormField label="School Name *">
                <FormInput placeholder="e.g. Akshara High School" value={form.school_name}
                  onChange={v => setForm(f => ({ ...f, school_name: v }))} />
              </FormField>
              <FormField label="Village / City *">
                <FormInput placeholder="e.g. Gopalraopet" value={form.village}
                  onChange={v => setForm(f => ({ ...f, village: v }))} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="District">
                  <FormInput placeholder="e.g. Siddipet" value={form.district}
                    onChange={v => setForm(f => ({ ...f, district: v }))} />
                </FormField>
                <FormField label="State">
                  <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                    className="w-full border border-slate-200 bg-slate-50 px-3.5 py-2.5 rounded-xl text-[13px] text-navy outline-none focus:border-brand-teal focus:bg-white transition">
                    <option value="">Select State</option>
                    {["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"].map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">School Admin</div>
                <FormField label="Admin Name">
                  <FormInput placeholder="e.g. Dr. Ramesh Kumar" value={form.adminName}
                    onChange={v => setForm(f => ({ ...f, adminName: v }))} />
                </FormField>
                <FormField label="Admin Email *  (used as login ID)">
                  <FormInput placeholder="admin@school.edu.in" value={form.adminEmail}
                    onChange={v => setForm(f => ({ ...f, adminEmail: v }))} type="email" />
                </FormField>
                <p className="text-[10px] text-amber-600 font-semibold -mt-1 mb-2 ml-1">
                  ⚠️ Required — a login account will be created with this email
                </p>
                <FormField label="Admin Phone">
                  <FormInput placeholder="+91 9876543210" value={form.adminPhone}
                    onChange={v => setForm(f => ({ ...f, adminPhone: v }))} />
                </FormField>
              </div>
              <Btn variant="gold" onClick={() => setActiveTab("branding")}>Next → Set Branding 🎨</Btn>
            </>}

            {/* TAB 2 — Branding */}
            {activeTab === "branding" && <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] text-blue-700 font-semibold">🎨 App Branding</div>
                  <span className="text-[10px] bg-blue-100 text-blue-500 font-bold px-2 py-0.5 rounded-full">Optional — can be added later</span>
                </div>
                <div className="text-[11px] text-blue-600 mt-1">
                  Logo and color appear on the <strong>splash screen</strong> and <strong>login page</strong> in the mobile app. You can skip and onboard the school now.
                </div>
              </div>

              <LogoUploader
                logoUrl={uploadedLogoUrl} logoFile={logoFile}
                uploadProgress={uploadProgress}
                onFileChange={f => { setLogoFile(f); setUploadProgress(null); }}
              />

              <div className="border-t border-slate-100 pt-3">
                <ColorPicker value={form.primaryColor} onChange={c => setForm(f => ({ ...f, primaryColor: c }))} />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <FormField label="School Tagline (optional)">
                  <FormInput placeholder="e.g. Excellence in Education" value={form.tagline}
                    onChange={v => setForm(f => ({ ...f, tagline: v }))} />
                </FormField>
                <p className="text-[10px] text-slate-400 mt-1">Shown below school name on splash screen</p>
              </div>

              {/* Live preview */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 pt-3 pb-1">📱 Live preview</div>
                <div className="mx-4 mb-4 rounded-xl flex flex-col items-center justify-center py-6 gap-2"
                  style={{ background: form.primaryColor }}>
                  {logoFile ? (
                    <img src={URL.createObjectURL(logoFile)} alt="logo"
                      className="w-16 h-16 rounded-full object-cover border-4 border-white/30" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white font-black text-xl">{getInitials(form.school_name||"S")}</span>
                    </div>
                  )}
                  <div className="text-white font-black text-[15px] text-center px-4">{form.school_name||"School Name"}</div>
                  {form.tagline && <div className="text-white/70 text-[11px] text-center px-4">{form.tagline}</div>}
                  <div className="text-white/40 text-[9px] mt-1">Powered by Vidhaya Layam</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Btn variant="outline"  onClick={() => setActiveTab("info")}>← Back</Btn>
                <Btn variant="gold"     onClick={() => setActiveTab("whatsapp")}>Next → WhatsApp 💬</Btn>
                <Btn variant="outline"  onClick={createSchool} disabled={saving}>
                  {saving ? "Creating…" : "Skip & Onboard ✓"}
                </Btn>
              </div>
            </>}

            {/* TAB 3 — WhatsApp */}
            {activeTab === "whatsapp" && <>
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <div className="text-[12px] text-green-700 font-semibold">💬 Optional — can be added later</div>
                <div className="text-[11px] text-green-600 mt-1">School can be onboarded without WhatsApp credentials.</div>
              </div>
              <FormField label="WhatsApp Business Number">
                <FormInput placeholder="+91 9876543210" value={form.waPhone}
                  onChange={v => setForm(f => ({ ...f, waPhone: v }))} />
              </FormField>
              <FormField label="Meta Phone Number ID">
                <FormInput placeholder="e.g. 123456789012345" value={form.waPhoneNumberId}
                  onChange={v => setForm(f => ({ ...f, waPhoneNumberId: v }))} />
              </FormField>
              <FormField label="Meta Access Token">
                <FormInput placeholder="EAAxxxxx…" value={form.waAccessToken}
                  onChange={v => setForm(f => ({ ...f, waAccessToken: v }))} />
              </FormField>
              <FormField label="WABA ID">
                <FormInput placeholder="e.g. 987654321098765" value={form.waBusinessId}
                  onChange={v => setForm(f => ({ ...f, waBusinessId: v }))} />
              </FormField>
              <div className="flex items-center gap-3">
                <button onClick={testWhatsApp}
                  disabled={testing || !form.waPhoneNumberId || !form.waAccessToken || !form.waPhone}
                  className="px-4 py-2 rounded-xl text-[12px] font-bold bg-green-600 text-white
                             disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-green-700 transition">
                  {testing ? "Testing…" : "📡 Test Connection"}
                </button>
                {testResult === "success" && <span className="text-emerald-600 text-[12px] font-bold">✅ Connected!</span>}
                {testResult === "fail"    && <span className="text-rose-600   text-[12px] font-bold">❌ Failed</span>}
              </div>
              <div className="border-t border-slate-100 pt-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Enable Triggers</div>
                <div className="space-y-2">
                  {TRIGGER_LABELS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form[key] as boolean}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                        className="w-4 h-4 accent-green-600 cursor-pointer" />
                      <span className="text-[13px] text-slate-600">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Btn variant="outline" onClick={() => setActiveTab("branding")}>← Back</Btn>
                <Btn variant="outline" onClick={createSchool} disabled={saving}>
                  {saving ? "Creating…" : "Skip & Onboard ✓"}
                </Btn>
              </div>
            </>}
          </div>

          <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-slate-100">
            <Btn variant="outline" onClick={resetModal}>Cancel</Btn>
            <Btn variant="gold" onClick={createSchool} disabled={saving || !form.school_name || !form.village || !form.adminEmail}>
              {saving ? "Creating…" : "✓ Onboard School"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* ══ CREDENTIALS MODAL ══ */}
      {credentials && (
        <Modal title="🔐 Admin Login Credentials" onClose={() => {
          // Show QR after dismissing credentials
          setShowQR({ code: credentials.schoolCode, name: form.school_name || credentials.adminName, logoUrl: "", color: "#0D1B2A" });
          setCredentials(null);
        }}>
          <div className="space-y-4 py-2">

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <div className="text-[12px] text-amber-700 font-bold">⚠️ Copy these credentials now</div>
              <div className="text-[11px] text-amber-600 mt-1">
                This password is shown <strong>only once</strong>. Share it with the principal securely.
                They will be prompted to change it on first login.
              </div>
            </div>

            {/* Credential cards */}
            <CredentialRow label="School Code" value={credentials.schoolCode} />
            <CredentialRow label="Login Email" value={credentials.email} />
            <CredentialRow label="Temporary Password" value={credentials.password} highlight />

            {/* Copy all button */}
            <button
              onClick={() => {
                const text = `Vidhaya Layam — Admin Credentials\n\nSchool Code: ${credentials.schoolCode}\nEmail: ${credentials.email}\nTemp Password: ${credentials.password}\n\nPlease change your password after first login.`;
                navigator.clipboard.writeText(text);
              }}
              className="w-full py-2.5 rounded-xl bg-navy text-white text-[13px] font-bold hover:opacity-90 transition"
            >
              📋 Copy All Credentials
            </button>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-[11px] text-blue-700 space-y-1">
              <div className="font-bold">What to tell the principal:</div>
              <div>1. Open the Vidhaya Layam app</div>
              <div>2. Scan the QR code (shown next) or enter the school code manually</div>
              <div>3. Login with the email and temporary password above</div>
              <div>4. You'll be asked to set a new password immediately</div>
            </div>

            <Btn variant="gold" onClick={() => {
              // Dismissing shows QR
              const cred = credentials;
              setCredentials(null);
              // find the newly created school — fall back to code only
              setShowQR({ code: cred.schoolCode, name: cred.adminName, logoUrl: "", color: "#0D1B2A" });
            }}>
              ✓ Done — Show QR Code →
            </Btn>
          </div>
        </Modal>
      )}

      {/* ══ QR MODAL ══ */}
      {showQR && (
        <Modal title="📱 School Onboarded!" onClose={() => setShowQR(null)}>
          <div className="flex flex-col items-center gap-5 py-2">
            {/* Branded preview */}
            <div className="w-full rounded-2xl flex flex-col items-center justify-center py-8 gap-3"
              style={{ background: showQR.color || "#0D1B2A" }}>
              {showQR.logoUrl ? (
                <img src={showQR.logoUrl} alt="logo"
                  className="w-20 h-20 rounded-full object-cover border-4 border-white/30" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-white font-black text-2xl">{getInitials(showQR.name)}</span>
                </div>
              )}
              <div className="text-white font-black text-lg text-center px-6">{showQR.name}</div>
              <div className="text-white/40 text-[10px]">This is how it looks in the app</div>
            </div>

            <QRDisplay value={showQR.code} />

            <div className="text-center">
              <div className="text-sm font-bold text-navy">School Code: <span className="font-mono">{showQR.code}</span></div>
              <div className="text-xs text-slate-400 mt-1">Share this QR with the School Admin to set up the mobile app</div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 w-full text-center">
              <p className="text-[12px] text-emerald-700 font-semibold">
                ✅ School onboarded successfully!<br/>
                <span className="font-normal">Logo, color and QR are saved to Firestore.</span>
              </p>
            </div>
            <Btn variant="outline" onClick={() => setShowQR(null)}>Close</Btn>
          </div>
        </Modal>
      )}

    </DashboardLayout>
  );
}

// ── CredentialRow — copy-on-click row ────────────────────────
function CredentialRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</div>
      <div
        onClick={copy}
        className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border cursor-pointer transition
          ${highlight
            ? "bg-navy border-navy/20 text-white"
            : "bg-slate-50 border-slate-200 text-navy hover:bg-slate-100"
          }`}
      >
        <span className="font-mono font-bold text-[14px] tracking-wide">{value}</span>
        <span className="text-[11px] font-semibold flex-shrink-0">
          {copied ? "✅ Copied!" : "📋 Copy"}
        </span>
      </div>
    </div>
  );
}
// ── ResetCredRow — copy-on-click row for reset results ────────────────
function ResetCredRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</div>
      <div
        onClick={copy}
        className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition
          ${highlight
            ? "bg-amber-500 border-amber-600 text-white"
            : "bg-slate-50 border-slate-200 text-navy hover:bg-slate-100"
          }`}
      >
        <span className="font-mono font-bold text-[13px] tracking-wide truncate">{value}</span>
        <span className="text-[10px] font-semibold flex-shrink-0 bg-white/20 px-2 py-0.5 rounded">
          {copied ? "✅ Copied!" : "📋 Copy"}
        </span>
      </div>
    </div>
  );
}
