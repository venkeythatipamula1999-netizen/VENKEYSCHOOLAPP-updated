"use client";
// src/app/settings/page.tsx
import { useState }    from "react";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth }        from "@/lib/firebase";
import { useAdmin }    from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, Btn, FormField, FormInput } from "@/components/ui";

export default function SettingsPage() {
  const { user, metrics, schools, teachers, students, classes, marksAudit, notifications, leaves, trips, salaries, fees } = useAdmin();
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [pwdMsg,     setPwdMsg]     = useState("");
  const [pwdError,   setPwdError]   = useState("");

  const changePassword = async () => {
    if (!currentPwd || !newPwd) { setPwdError("Fill both fields."); return; }
    setPwdError(""); setPwdMsg("");
    try {
      const cred = EmailAuthProvider.credential(user!.email!, currentPwd);
      await reauthenticateWithCredential(auth.currentUser!, cred);
      await updatePassword(auth.currentUser!, newPwd);
      setPwdMsg("✓ Password updated!"); setCurrentPwd(""); setNewPwd("");
    } catch (e: unknown) {
      setPwdError(e instanceof Error ? e.message.replace("Firebase: ","") : "Error");
    }
  };

  const dataRows = [
    ["Schools", schools.length],["Teachers", teachers.length],["Students", students.length],
    ["Classes", classes.length],["Mark Edits", marksAudit.length],["Leaves", leaves.length],
    ["Trips", trips.length],["Notifications", notifications.length],
    ["Salaries", salaries.length],["Fees", fees.length],
  ];

  const collections = ["students","users","classes","student_marks","attendance","leaveRequests","leave_requests","trips","trip_scans","salaries","fees","events","activities","alerts","parent_children","markEdits","schools"];

  return (
    <DashboardLayout title="Settings">
      <div className="grid grid-cols-2 gap-5">
        {/* Change password */}
        <Card>
          <div className="p-5">
            <h3 className="text-navy text-[15px] font-extrabold mb-4">🔑 Change Password</h3>
            {pwdMsg   && <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-4 py-2.5 text-[12px] font-semibold mb-4">{pwdMsg}</div>}
            {pwdError && <div className="bg-rose-50 text-brand-rose border border-rose-200 rounded-lg px-4 py-2.5 text-[12px] font-semibold mb-4">{pwdError}</div>}
            <FormField label="Current Password"><FormInput placeholder="••••••••" value={currentPwd} onChange={setCurrentPwd} type="password" /></FormField>
            <FormField label="New Password"><FormInput placeholder="••••••••" value={newPwd} onChange={setNewPwd} type="password" /></FormField>
            <Btn variant="primary" onClick={changePassword} className="mt-1">Update Password</Btn>
          </div>
        </Card>

        {/* Firebase config */}
        <Card>
          <div className="p-5">
            <h3 className="text-navy text-[15px] font-extrabold mb-4">🔥 Firebase Connection</h3>
            {[
              ["Project ID", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID],
              ["Auth Domain", `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`],
              ["Storage", `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`],
              ["Backend URL",   "http://localhost:5000"],
              ["Auth User",     user?.email || "—"],
              ["UID",           user?.uid || "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                <span className="text-[12px] text-slate-500">{k}</span>
                <span className="text-[12px] font-semibold text-navy font-mono">{v}</span>
              </div>
            ))}
            <div className="mt-3 flex items-center gap-2 bg-brand-emerald/10 border border-brand-emerald/20 rounded-xl px-3 py-2.5">
              <span className="w-2 h-2 bg-brand-emerald rounded-full animate-pulse" />
              <span className="text-brand-emerald text-[12px] font-semibold">All Firestore listeners active</span>
            </div>
          </div>
        </Card>

        {/* Live data summary */}
        <Card>
          <div className="p-5">
            <h3 className="text-navy text-[15px] font-extrabold mb-4">📊 Live Data Summary</h3>
            {dataRows.map(([lbl, val]) => (
              <div key={String(lbl)} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                <span className="text-[12px] text-slate-500">{lbl}</span>
                <span className="text-[15px] font-black text-navy">{val}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Firestore collections */}
        <Card>
          <div className="p-5">
            <h3 className="text-navy text-[15px] font-extrabold mb-4">🗄️ Firestore Collections</h3>
            <div className="flex flex-wrap gap-2">
              {collections.map(c => (
                <span key={c} className="bg-slate-100 text-slate-600 text-[11px] font-semibold font-mono px-2.5 py-1 rounded-full">{c}</span>
              ))}
            </div>
            <p className="text-[11.5px] text-slate-400 mt-4">All {collections.length} collections monitored via onSnapshot listeners. Every screen updates automatically when data changes in any collection.</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
