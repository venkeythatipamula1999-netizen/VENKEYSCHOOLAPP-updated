"use client";
// src/app/trips/page.tsx
import { useAdmin }    from "@/context/AdminContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardHeader, Table, Tr, Td, Badge, LiveBadge, EmptyState } from "@/components/ui";

export default function TripsPage() {
  const { trips } = useAdmin();
  return (
    <DashboardLayout title="Bus Trips">
      <Card>
        <CardHeader title="🚌 Trip Records" count={trips.length}>
          <LiveBadge collection="trips" />
        </CardHeader>
        <Table headers={["Driver ID","Trip Type","Status","Start Time","End Time","School"]}>
          {trips.length > 0 ? trips.map(t => (
            <Tr key={t.id}>
              <Td mono>{t.driverId || "—"}</Td>
              <Td><Badge status={t.tripType || "morning"} /></Td>
              <Td><Badge status={t.status || "completed"} /></Td>
              <Td mono>{t.startTime || "—"}</Td>
              <Td mono>{t.endTime || "—"}</Td>
              <Td mono>{t.schoolId || "—"}</Td>
            </Tr>
          )) : <EmptyState icon="🚌" message="No trips recorded yet" />}
        </Table>
      </Card>
    </DashboardLayout>
  );
}
