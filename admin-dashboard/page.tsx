"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAdmin } from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card, CardHeader, FilterBar, FilterInput,
  Table, Tr, Td, Badge, LiveBadge, EmptyState, Modal,
} from "@/components/ui";

const API_URL = "https://1b59c4a1-d915-4b50-bf44-dacb602b7bf8-00-32892q8c36byf.janeway.replit.dev";
const SUPER_KEY = "VIDLYM_SUPER_2026_XK9M";

const SCHOOL_COLORS = ["#0D1B2A","#00B4D8","#10B981","#8B5CF6","#F43F5E","#F5A623"];

function getInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase()).join("");
}

function getAreaCode(place: string) {
  if (!place) return "LOC";
  const c = place.trim().toUpperCase();
  const combined = (c[0] + c.slice(1).replace(/[AEIOU]/g, "")).replace(/[^A-Z]/g, "");
  return combined.slice(0, 4).padEnd(3, combined[combined.length - 1] || "X");
}

function generateSchoolCode(name: string, village: string) {
  return `${getInitials(name)}-${getAreaCode(village)}`;
}

function QRDisplay({ value }: { value: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-36 h-36 bg-white border-2 border-navy rounded-xl flex items-center justify-center p-2 shadow">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(value)}`}
          alt="QR"
          className="w-full h-full object-contain"
        />
      </div>
      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{value}</span>
    </div>
  );
}

export default function SchoolsPage() {
  const { schools, teachers, students } = useAdmin();
  const router = useRouter();

  const [search,    setSearch]    = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showQR,    setShowQR]    = useState<any>(null);
  const [saving,    setSaving]    = useState(false);
  const [preview,   setPreview]   = useState("");
  const [logoFile,  setLogoFile]  = useState<File | null>(null);

  const emptyForm = {
    school_name: "", village: "", district: "", state: "",
    adminName: "", adminEmail: "", adminPhone: "",
    primaryColor: "#0D1B2A", tagline: "",
  };
  const [form, setForm] = useState(emptyForm);

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    if (form.school_name && form.village) {
      setPreview(generateSchoolCode(form.school_name, form.village));
    } else {
      setPreview("");
    }
  }, [form.school_name, form.village]);

  const filtered = schools.filter((s) =>
    (s.name || s.schoolName || "").toLowerCase().includes(search.toLowerCase())
  );

  const resetModal = () => {
    setShowModal(false);
    setForm(emptyForm);
    setLogoFile(null);
    setPreview("");
  };

  const uploadLogo = (schoolCode: string): Promise<string> =>
    new Promise((resolve, reject) => {
      if (!logoFile) return resolve("");
      const ext = logoFile.name.split(".").pop();
      const task = uploadBytesResumable(
        ref(storage, `school_logos/${schoolCode}.${ext}`),
        logoFile
      );
      task.on("state_changed", () => {}, reject, () =>
        getDownloadURL(task.snapshot.ref).then(resolve).catch(reject)
      );
    });

  const createSchool = async () => {
    if (!form.school_name || !form.village) {
      alert("Please fill in School Name and Village.");
      return;
    }
    if (!form.adminName || !form.adminEmail) {
      alert("Please fill in Admin Name and Admin Email.");
      return;
    }

    setSaving(true);

    try {
      const schoolCode = generateSchoolCode(form.school_name, form.village);

      let logoUrl = "";
      if (logoFile) {
        logoUrl = await uploadLogo(schoolCode);
      }

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
          principalPassword: "School@123",
          primaryColor:      form.primaryColor,
          tagline:           form.tagline,
          logoUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "School creation failed.");
        return;
      }

      setShowModal(false);
      setShowQR({ code: data.schoolId || schoolCode, name: form.school_name, logoUrl });
      setForm(emptyForm);
      setLogoFile(null);

    } catch (err) {
      console.error("[Onboard] Error:", err);
      alert("Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, current?: string) => {
    await updateDoc(doc(db, "schools", id), {
      status: current === "suspended" ? "active" : "suspended",
    });
  };

  return (
    <DashboardLayout title="Schools Management">

      {/* SUMMARY */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-navy">{schools.length}</div>
          <div className="text-sm text-slate-500 mt-1">🏫 Total Schools</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-emerald-500">
            {schools.filter((s) => s.status !== "suspended").length}
          </div>
          <div className="text-sm text-slate-500 mt-1">✅ Active</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-rose-400">
            {schools.filter((s) => s.status === "suspended").length}
          </div>
          <div className="text-sm text-slate-500 mt-1">⊘ Suspended</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card">
          <div className="text-3xl font-black text-blue-500">
            {teachers.length}
          </div>
          <div className="text-sm text-slate-500 mt-1">👩‍🏫 Total Staff</div>
        </div>
      </div>

      <Card>
        <CardHeader title="🏫 All Schools" count={filtered.length}>
          <LiveBadge collection="schools" />
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="bg-amber-400 hover:bg-amber-500 px-4 py-2 rounded-xl font-bold text-navy text-sm transition"
          >
            ＋ Onboard School
          </button>
        </CardHeader>

        <FilterBar>
          <FilterInput
            placeholder="🔍 Search schools..."
            value={search}
            onChange={setSearch}
          />
        </FilterBar>

        <Table headers={["School","Code","Location","Admin","Teachers","Students","Status","Actions"]}>
          {filtered.length > 0 ? (
            filtered.map((s, i) => {
              const tCount = teachers.filter((t) => t.schoolId === s.id).length;
              const sCount = students.filter((st) => st.schoolId === s.id).length;
              const code   = (s as any).school_code || s.id;
              const color  = SCHOOL_COLORS[i % 6];

              return (
                <Tr key={s.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: (s as any).primaryColor || color }}
                      >
                        <span className="text-[10px] font-black text-white">
                          {(s.name || s.schoolName || "S").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-navy text-[13px]">{s.name || s.schoolName}</div>
                        <div className="text-[10px] text-slate-400">{(s as any).location || ""}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-[12px] bg-navy/5 text-navy px-2 py-1 rounded">{code}</span>
                      <button
                        type="button"
                        onClick={() => setShowQR({ code, name: s.name || s.schoolName })}
                        className="text-slate-400 hover:text-navy ml-1"
                        title="Show QR"
                      >📱</button>
                    </div>
                  </Td>
                  <Td>{(s as any).village || (s as any).location || "—"}</Td>
                  <Td>
                    <div>
                      <div className="font-semibold text-[12px]">{s.adminName || "—"}</div>
                      <div className="text-[10px] text-slate-400">{s.adminEmail || ""}</div>
                    </div>
                  </Td>
                  <Td><strong>{tCount}</strong></Td>
                  <Td><strong>{sCount}</strong></Td>
                  <Td><Badge status={s.status || "active"} /></Td>
                  <Td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/schools/${s.id}`)}
                        className="bg-teal-500 text-white px-3 py-1 rounded-lg text-[12px] font-semibold hover:bg-teal-600 transition"
                      >👁 View</button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(s.id, s.status)}
                        className="bg-red-400 text-white px-3 py-1 rounded-lg text-[12px] font-semibold hover:bg-red-500 transition"
                      >
                        {s.status === "suspended" ? "✓ Enable" : "⊘ Suspend"}
                      </button>
                    </div>
                  </Td>
                </Tr>
              );
            })
          ) : (
            <EmptyState icon="🏫" message="No schools yet — onboard your first school!" />
          )}
        </Table>
      </Card>

      {/* QR MODAL */}
      {showQR && (
        <Modal title={`📱 QR — ${showQR.name}`} onClose={() => setShowQR(null)}>
          <div className="flex flex-col items-center gap-4 py-4">
            <QRDisplay value={showQR.code} />
            <p className="text-[12px] text-slate-500 text-center">
              Share this QR code so teachers and parents can join <strong>{showQR.name}</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowQR(null)}
              className="bg-amber-400 hover:bg-amber-500 px-6 py-2 rounded-xl font-bold text-navy transition"
            >
              Done
            </button>
          </div>
        </Modal>
      )}

      {/* ONBOARD MODAL */}
      {showModal && (
        <Modal title="🏫 Onboard New School" onClose={resetModal}>
          <div className="space-y-3">

            {preview && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-amber-600 font-bold">Auto-generated School Code</div>
                  <div className="font-mono font-black text-navy text-lg">{preview}</div>
                </div>
                <span className="text-2xl">🏷️</span>
              </div>
            )}

            <input
              type="text"
              placeholder="School Name *"
              value={form.school_name}
              onChange={(e) => set("school_name", e.target.value)}
              className="w-full border border-slate-300 p-2.5 rounded-lg text-[13px] focus:outline-none focus:border-navy"
            />
            <input
              type="text"
              placeholder="Village / Location *"
              value={form.village}
              onChange={(e) => set("village", e.target.value)}
              className="w-full border border-slate-300 p-2.5 rounded-lg text-[13px] focus:outline-none focus:border-navy"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="District"
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                className="w-full border border-slate-300 p-2.5 rounded-lg text-[13px] focus:outline-none focus:border-navy"
              />
              <input
                type="text"
                placeholder="State"
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                className="w-full border border-slate-300 p-2.5 rounded-lg text-[13px] focus:outline-none focus:border-navy"
              />
            </div>
            <input
              type="text"
              placeholder="Tagline (optional)"
              value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              className="w-full border border-slate-300 p-2.5 rounded-lg text-[13px] focus:outline-none focus:border-navy"
            />

            <div className="border-t border-slate-100 pt-2">
              <div className="text-[10px] font-bold text-slate-400 mb-2">PRINCIPAL DETAILS</div>
              <input
                type="text"
                placeholder="Principal Name *"
                value={form.adminName}
                onChange={(e) => set("adminName", e.target.value)}
                className="w-full border border-slate-300 p-2.5 rounded-lg text-[13px] focus:outline-none focus:border-navy mb-2"
              />
              <input
                type="email"
                placeholder="Principal Email *"
                value={form.adminEmail}
                onChange={(e) => set("adminEmail", e.target.value)}
                className="w-full border border-slate-300 p-2.5 rounded-lg text-[13px] focus:outline-none focus:border-navy mb-2"
              />
              <input
                type="tel"
                placeholder="Principal Phone"
                value={form.adminPhone}
                onChange={(e) => set("adminPhone", e.target.value)}
                className="w-full border border-slate-300 p-2.5 rounded-lg text-[13px] focus:outline-none focus:border-navy"
              />
              <div className="text-[10px] text-slate-400 mt-1">
                Default password: <span className="font-mono font-bold">School@123</span>
              </div>
            </div>

            {/* FOOTER BUTTONS */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={resetModal}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-[13px] hover:bg-slate-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createSchool}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-navy font-bold text-[13px] transition disabled:opacity-50"
              >
                {saving ? "Creating school…" : "🏫 Onboard School"}
              </button>
            </div>

          </div>
        </Modal>
      )}

    </DashboardLayout>
  );
            }
