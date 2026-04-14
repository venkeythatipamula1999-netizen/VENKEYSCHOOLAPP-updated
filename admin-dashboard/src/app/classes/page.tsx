"use client";
// src/app/classes/page.tsx
import { useAdmin }      from "@/context/AdminContext";
import DashboardLayout   from "@/components/layout/DashboardLayout";
import { Card, CardHeader, Table, Tr, Td, LiveBadge, EmptyState } from "@/components/ui";

export default function ClassesPage() {
  const { classes, students } = useAdmin();
  return (
    <DashboardLayout title="Classes Management">
      <Card>
        <CardHeader title="📚 Classes" count={classes.length}>
          <LiveBadge collection="classes" />
        </CardHeader>
        <Table headers={["Class Name","School ID","Students","Created"]}>
          {classes.length > 0 ? classes.map(c => (
            <Tr key={c.id}>
              <Td><strong className="text-navy">{c.name || c.id}</strong></Td>
              <Td mono>{c.schoolId || c.school_id || "—"}</Td>
              <Td><strong>{students.filter(s => s.classId === c.name || s.classId === c.id).length}</strong></Td>
              <Td mono>{(c.createdAt as any)?.toDate?.()?.toLocaleDateString("en-IN") || "—"}</Td>
            </Tr>
          )) : <EmptyState icon="📚" message="No classes yet" />}
        </Table>
      </Card>
    </DashboardLayout>
  );
}
