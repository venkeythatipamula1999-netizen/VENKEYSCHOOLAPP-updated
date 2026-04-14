"use client";
// src/context/AdminContext.tsx

import {
  createContext, useContext, useState,
  useEffect, useCallback, ReactNode,
} from "react";
import {
  signInWithEmailAndPassword, signOut,
  onAuthStateChanged, User,
} from "firebase/auth";
import {
  collection, query, where, orderBy,
  limit, onSnapshot, Timestamp, doc, getDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { reportError } from "@/lib/errorReporter";
import { useGlobalErrorListener } from "@/hooks/useGlobalErrorListener";
import type {
  School, Teacher, Student, SchoolClass,
  MarkEdit, Alert, LeaveRequest, Trip, Salary, Fee,
  DashboardMetrics,
} from "@/types";

interface AdminContextType {
  // Auth
  user:            User | null;
  authLoading:     boolean;
  login:           (email: string, password: string) => Promise<void>;
  logout:          () => Promise<void>;
  // Data
  schools:         School[];
  teachers:        Teacher[];
  students:        Student[];
  classes:         SchoolClass[];
  marksAudit:      MarkEdit[];
  notifications:   Alert[];
  leaves:          LeaveRequest[];
  trips:           Trip[];
  salaries:        Salary[];
  fees:            Fee[];
  metrics:         DashboardMetrics;
  unreadCount:     number;
}

const AdminContext = createContext<AdminContextType | null>(null);

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const [user,        setUser]        = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── GLOBAL ERROR CAPTURE ─────────────────────────────────
  // Catches ALL unhandled JS errors and promise rejections app-wide
  useGlobalErrorListener();

  const [schools,       setSchools]       = useState<School[]>([]);
  const [teachers,      setTeachers]      = useState<Teacher[]>([]);
  const [students,      setStudents]      = useState<Student[]>([]);
  const [classes,       setClasses]       = useState<SchoolClass[]>([]);
  const [marksAudit,    setMarksAudit]    = useState<MarkEdit[]>([]);
  const [notifications, setNotifications] = useState<Alert[]>([]);
  const [leaves,        setLeaves]        = useState<LeaveRequest[]>([]);
  const [trips,         setTrips]         = useState<Trip[]>([]);
  const [salaries,      setSalaries]      = useState<Salary[]>([]);
  const [fees,          setFees]          = useState<Fee[]>([]);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    schools: 0, teachers: 0, students: 0,
    marksToday: 0, attendanceToday: 0, activeTeachers: 0,
  });

  // ── AUTH ────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Verify this user is actually a super admin before granting access
        try {
          const snap = await getDoc(doc(db, "superadmins", u.uid));
          if (snap.exists()) {
            setUser(u);
          } else {
            // Session exists but user is not a super admin — boot them out
            await signOut(auth);
            setUser(null);
          }
        } catch {
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
  }, []);

  // ── LIVE FIRESTORE LISTENERS ────────────────────────────
  useEffect(() => {
    if (!user) return;

    const today     = new Date().toISOString().slice(0, 10);
    const startDay  = new Date(); startDay.setHours(0, 0, 0, 0);
    const unsubs: (() => void)[] = [];

    // Schools
    unsubs.push(onSnapshot(collection(db, "schools"), snap => {
      setSchools(snap.docs.map(d => ({ id: d.id, ...d.data() } as School)));
      setMetrics(m => ({ ...m, schools: snap.size }));
    }, (err) => reportError({ type: "firestore_error", severity: "high", message: `schools listener failed: ${err.message}`, details: err.stack })));

    // Teachers
    unsubs.push(onSnapshot(
      query(collection(db, "users"), where("role", "==", "teacher")),
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Teacher));
        setTeachers(data);
        setMetrics(m => ({
          ...m,
          teachers:       snap.size,
          activeTeachers: data.filter(t => t.status !== "inactive").length,
        }));
      },
      (err) => reportError({ type: "firestore_error", severity: "high", message: `teachers listener failed: ${err.message}`, details: err.stack })
    ));

    // Students
    unsubs.push(onSnapshot(collection(db, "students"), snap => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
      setMetrics(m => ({ ...m, students: snap.size }));
    }));

    // Classes
    unsubs.push(onSnapshot(collection(db, "classes"), snap => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass)));
    }));

    // Marks audit
    unsubs.push(onSnapshot(
      query(collection(db, "markEdits"), orderBy("timestamp", "desc"), limit(200)),
      snap => {
        setMarksAudit(snap.docs.map(d => ({
          id: d.id, ...d.data(),
          ts: (d.data().timestamp as Timestamp)?.toDate?.()?.toLocaleString("en-IN") || "—",
        } as MarkEdit)));
      }
    ));

    // Today's attendance
    unsubs.push(onSnapshot(
      query(collection(db, "attendance"),
        where("date", "==", today), where("status", "==", "present")),
      snap => setMetrics(m => ({ ...m, attendanceToday: snap.size }))
    ));

    // Today's marks
    unsubs.push(onSnapshot(
      query(collection(db, "student_marks"),
        where("timestamp", ">=", Timestamp.fromDate(startDay))),
      snap => setMetrics(m => ({ ...m, marksToday: snap.size }))
    ));

    // Alerts / notifications
    unsubs.push(onSnapshot(
      query(collection(db, "alerts"), orderBy("timestamp", "desc"), limit(50)),
      snap => {
        setNotifications(snap.docs.map(d => ({
          id: d.id, ...d.data(),
          ts: (d.data().timestamp as Timestamp)?.toDate?.()?.toLocaleString("en-IN") || "—",
        } as Alert)));
      }
    ));

    // Leaves
    unsubs.push(onSnapshot(collection(db, "leave_requests"), snap => {
      setLeaves(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest)));
    }));

    // Trips
    unsubs.push(onSnapshot(
      query(collection(db, "trips"), orderBy("startTime", "desc"), limit(50)),
      snap => setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip)))
    ));

    // Salaries
    unsubs.push(onSnapshot(collection(db, "salaries"), snap => {
      setSalaries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Salary)));
    }));

    // Fees
    unsubs.push(onSnapshot(collection(db, "fees"), snap => {
      setFees(snap.docs.map(d => ({ id: d.id, ...d.data() } as Fee)));
    }));

    return () => unsubs.forEach(fn => fn());
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    // Step 1: Sign in with Firebase Auth
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    // Step 2: Check if this UID exists in the "superadmins" collection
    const superAdminDoc = await getDoc(doc(db, "superadmins", uid));

    if (!superAdminDoc.exists()) {
      // Not a super admin — sign them out immediately and throw
      await signOut(auth);
      throw new Error("ACCESS_DENIED");
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AdminContext.Provider value={{
      user, authLoading, login, logout,
      schools, teachers, students, classes,
      marksAudit, notifications, leaves,
      trips, salaries, fees, metrics, unreadCount,
    }}>
      {children}
    </AdminContext.Provider>
  );
}
