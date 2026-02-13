import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/layout/Navbar";
import StatusBadge from "@/components/booking/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Users, CalendarDays, Clock, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";

const AdminDashboard = () => {
  const [helpers, setHelpers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [serviceFilter, setServiceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const fetchAll = useCallback(async () => {
    const [hRes, bRes, aRes] = await Promise.all([
      supabase.from("helper_profiles").select("*, profiles(full_name)"),
      supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("assignment_attempts").select("*").order("offered_at", { ascending: false }).limit(200),
    ]);
    if (hRes.data) setHelpers(hRes.data);
    if (bRes.data) setBookings(bRes.data);
    if (aRes.data) setAttempts(aRes.data);
  }, []);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "helper_profiles" }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  // Metrics
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const noHelperCount = bookings.filter((b) => b.status === "no_helper").length;
  const rejections = attempts.filter((a) => a.response === "rejected").length;
  const acceptances = attempts.filter((a) => a.response === "accepted").length;
  const rejectionRate = attempts.length > 0 ? ((rejections / attempts.length) * 100).toFixed(1) : "0";

  const avgAssignTime = (() => {
    const assigned = bookings.filter((b) => b.status === "completed" || b.status === "assigned" || b.status === "en_route" || b.status === "started");
    if (assigned.length === 0) return "N/A";
    const totalMs = assigned.reduce((sum, b) => {
      return sum + (new Date(b.updated_at).getTime() - new Date(b.created_at).getTime());
    }, 0);
    return `${Math.round(totalMs / assigned.length / 1000)}s`;
  })();

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    if (serviceFilter !== "all" && b.service_type !== serviceFilter) return false;
    if (dateFilter && !b.created_at.startsWith(dateFilter)) return false;
    return true;
  });

  const serviceTypes = [...new Set(bookings.map((b) => b.service_type))];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Admin Dashboard</h1>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { icon: CalendarDays, label: "Total Bookings", value: totalBookings, color: "text-primary" },
            { icon: TrendingUp, label: "Completed", value: completedBookings, color: "text-status-completed" },
            { icon: AlertTriangle, label: "No Helper", value: noHelperCount, color: "text-destructive" },
            { icon: BarChart3, label: "Rejection Rate", value: `${rejectionRate}%`, color: "text-status-busy" },
            { icon: Clock, label: "Avg Assign Time", value: avgAssignTime, color: "text-status-en-route" },
            { icon: Users, label: "Active Helpers", value: helpers.filter((h) => h.status === "available").length, color: "text-status-available" },
          ].map((m) => (
            <Card key={m.label} className="shadow-card">
              <CardContent className="p-4 text-center">
                <m.icon className={`h-5 w-5 mx-auto mb-2 ${m.color}`} />
                <p className="text-2xl font-bold text-foreground">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Helpers Table */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Helpers ({helpers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {helpers.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No helpers</TableCell></TableRow>
                    ) : helpers.map((h) => (
                      <TableRow key={h.helper_id}>
                        <TableCell className="font-medium">{(h as any).profiles?.full_name || "—"}</TableCell>
                        <TableCell className="text-xs">{h.skills?.join(", ")}</TableCell>
                        <TableCell>⭐ {Number(h.rating).toFixed(1)}</TableCell>
                        <TableCell><StatusBadge status={h.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {h.last_location_at ? new Date(h.last_location_at).toLocaleTimeString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Bookings Table */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle>Bookings</CardTitle>
                <div className="flex gap-2">
                  <Select value={serviceFilter} onValueChange={setServiceFilter}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue placeholder="Service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      {serviceTypes.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-[140px] h-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Attempts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No bookings</TableCell></TableRow>
                    ) : filteredBookings.slice(0, 20).map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="capitalize font-medium">{b.service_type}</TableCell>
                        <TableCell><StatusBadge status={b.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</TableCell>
                        <TableCell>{attempts.filter((a) => a.booking_id === b.id).length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
