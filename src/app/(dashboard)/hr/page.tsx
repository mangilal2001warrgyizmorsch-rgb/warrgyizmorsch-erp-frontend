"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Users, Calendar, ClipboardList, IndianRupee,
  Plus, Search, CheckCircle, XCircle, Clock,
  TrendingUp, UserCheck, UserX, AlertCircle,
  ChevronLeft, ChevronRight, Star, Edit, Trash2, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

const DEPARTMENTS = ["Engineering", "Manufacturing", "Sales", "Purchase", "Finance", "HR", "Quality", "Logistics", "Management"];
const LEAVE_TYPES = ["casual", "sick", "earned", "unpaid"];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, sub, icon: Icon, color }: { title: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={cn("p-2.5 rounded-lg", color)}>
            <Icon size={18} className="text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Employee Form Dialog ─────────────────────────────────────────────────────
function EmployeeDialog({ open, onClose, initial, employees }: {
  open: boolean;
  onClose: () => void;
  initial?: { id: string; name: string; email: string; phone?: string; department: string; designation: string; joiningDate: string; salary?: number; address?: string };
  employees: Array<{ _id: string; name: string }>;
}) {
  const qc = useQueryClient();
  const createEmployee = useMutation({ mutationFn: (d: any) => api.post("/hr/employees", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "employees"] }) });
  const updateEmployee = useMutation({ mutationFn: ({ id, ...d }: any) => api.put(`/hr/employees/${id}`, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "employees"] }) });

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    department: initial?.department ?? "Engineering",
    designation: initial?.designation ?? "",
    joiningDate: initial?.joiningDate ?? new Date().toISOString().slice(0, 10),
    salary: initial?.salary?.toString() ?? "",
    address: initial?.address ?? "",
  });

  const handleSave = async () => {
    if (!form.name || !form.email || !form.designation) { toast.error("Name, email and designation are required"); return; }
    const payload = { ...form, salary: form.salary ? parseFloat(form.salary) : undefined, phone: form.phone || undefined, address: form.address || undefined };
    if (initial) {
      await updateEmployee.mutateAsync({ id: initial.id, ...payload });
      toast.success("Employee updated");
    } else {
      await createEmployee.mutateAsync(payload);
      toast.success("Employee added");
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial ? "Edit Employee" : "Add New Employee"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" /></div>
            <div><Label>Email *</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@company.com" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Department *</Label>
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Designation *</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Software Engineer" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Joining Date</Label><Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></div>
            <div><Label>Monthly Salary (₹)</Label><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="50000" /></div>
          </div>
          <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="City, State" /></div>
          <Button onClick={handleSave} className="w-full cursor-pointer">{initial ? "Update Employee" : "Add Employee"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Employees Tab ────────────────────────────────────────────────────────────
function EmployeesTab() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const qc = useQueryClient();
  const { data: employees } = useQuery({ queryKey: ["hr", "employees"], queryFn: () => api.get<any[]>("/hr/employees") });
  const deleteEmployee = useMutation({ mutationFn: ({ id }: any) => api.delete(`/hr/employees/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "employees"] }) });

  const filtered = employees?.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()) || e.designation.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "all" || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  const editTarget = employees?.find((e) => e._id === editing);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex items-center">
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex w-full sm:w-64 items-center">
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search employees..." className="h-10 pl-8 w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => setShowNew(true)} className="h-10 cursor-pointer"><Plus size={14} className="mr-1" />Add Employee</Button>
        </div>
      </div>

      {/* Employee Table */}
      {!employees ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dept & Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Salary</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(filtered ?? []).map((e) => (
                <tr key={e._id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap text-xs text-muted-foreground">{e.employeeId}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        {e.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link href={`/hr/${e._id}`} className="font-semibold text-sm hover:text-primary transition-colors block">
                          {e.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{e.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium">{e.designation}</p>
                    <p className="text-xs text-muted-foreground">{e.department}</p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(e.joiningDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge className={cn("text-[10px] px-1.5 py-0 capitalize h-5", 
                      e.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : 
                      e.status === "on_leave" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400")}>
                      {e.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    {e.salary ? `₹${e.salary.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/hr/${e._id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary cursor-pointer">
                          <Eye size={14} />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => setEditing(e._id)} className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer">
                        <Edit size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={async () => { if (confirm(`Delete ${e.name}?`)) { await deleteEmployee.mutateAsync({ id: e._id }); toast.success("Deleted"); } }} className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(filtered ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-muted-foreground">
                    <Users size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-lg text-foreground">No employees found</p>
                    <p className="text-sm mt-1">Try adjusting your search or department filter</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <EmployeeDialog open={showNew} onClose={() => setShowNew(false)} employees={employees ?? []} />}
      {editing && editTarget && (
        <EmployeeDialog open={!!editing} onClose={() => setEditing(null)} initial={{ id: editTarget._id, name: editTarget.name, email: editTarget.email, phone: editTarget.phone, department: editTarget.department, designation: editTarget.designation, joiningDate: editTarget.joiningDate, salary: editTarget.salary, address: editTarget.address }} employees={employees ?? []} />
      )}
    </div>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────
function AttendanceTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMode, setViewMode] = useState<"daily" | "employee">("daily");
  const [selectedEmployee, setSelectedEmployee] = useState<string | "">("");
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));

  const qc = useQueryClient();
  const { data: employees } = useQuery({ queryKey: ["hr", "employees"], queryFn: () => api.get<any[]>("/hr/employees") });
  const { data: dailyAttendance } = useQuery({ queryKey: ["hr", "attendance", selectedDate], queryFn: () => api.get<any[]>(`/hr/attendance?date=${selectedDate}`) });
  const { data: empSummary } = useQuery({ queryKey: ["hr", "attendanceSummary", selectedEmployee, selectedMonth], queryFn: () => api.get<any>(`/hr/attendance/summary?employeeId=${selectedEmployee}&month=${selectedMonth}`), enabled: !!selectedEmployee });
  const markAttendance = useMutation({ mutationFn: (d: any) => api.post("/hr/attendance", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "attendance"] }) });
  const bulkMark = useMutation({ mutationFn: (d: any) => api.post("/hr/attendance/bulk", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "attendance"] }) });

  // Which employees have attendance marked for the selected date
  const markedIds = new Set(dailyAttendance?.map((a) => a.employeeId));
  const unmarkedEmployees = employees?.filter((e) => e.status === "active" && !markedIds.has(e._id)) ?? [];

  const handleQuickMark = async (empId: string, status: string) => {
    await markAttendance.mutateAsync({ employeeId: empId, date: selectedDate, status, checkIn: status === "present" ? "09:00" : undefined, checkOut: status === "present" ? "18:00" : undefined });
    toast.success("Attendance marked");
  };

  const handleMarkAllPresent = async () => {
    if (unmarkedEmployees.length === 0) { toast.info("All employees already marked"); return; }
    await bulkMark.mutateAsync({
      date: selectedDate,
      records: unmarkedEmployees.map((e) => ({ employeeId: e._id, status: "present", checkIn: "09:00", checkOut: "18:00" })),
    });
    toast.success(`Marked ${unmarkedEmployees.length} employees present`);
  };

  const STATUS_OPTS = [
    { value: "present", label: "Present", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    { value: "absent", label: "Absent", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    { value: "half_day", label: "Half Day", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    { value: "leave", label: "On Leave", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  ];

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex gap-2">
          <Button size="sm" variant={viewMode === "daily" ? "default" : "secondary"} onClick={() => setViewMode("daily")} className="cursor-pointer">Daily View</Button>
          <Button size="sm" variant={viewMode === "employee" ? "default" : "secondary"} onClick={() => setViewMode("employee")} className="cursor-pointer">Employee View</Button>
        </div>
        {viewMode === "daily" && (
          <div className="flex items-center gap-2">
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40" />
            <Button size="sm" variant="secondary" onClick={handleMarkAllPresent} className="cursor-pointer">Mark All Present</Button>
          </div>
        )}
        {viewMode === "employee" && (
          <div className="flex items-center gap-2">
            <Select value={selectedEmployee} onValueChange={(v) => setSelectedEmployee(v)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>{employees?.map((e) => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-40" />
          </div>
        )}
      </div>

      {/* Daily View */}
      {viewMode === "daily" && (
        <div className="space-y-3">
          {/* Summary chips */}
          {dailyAttendance && (
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTS.map((s) => {
                const count = dailyAttendance.filter((a) => a.status === s.value).length;
                return <span key={s.value} className={cn("text-xs px-3 py-1 rounded-full font-medium", s.color)}>{s.label}: {count}</span>;
              })}
              <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">Unmarked: {unmarkedEmployees.length}</span>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Employee</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Department</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Check In</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Check Out</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees?.filter((e) => e.status === "active").map((emp) => {
                  const record = dailyAttendance?.find((a) => a.employeeId === emp._id);
                  return (
                    <tr key={emp._id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-sm">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.employeeId}</p>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell">{emp.department}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">{record?.checkIn ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">{record?.checkOut ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {record ? (
                          <Badge className={cn("text-xs", STATUS_OPTS.find((s) => s.value === record.status)?.color ?? "")}>
                            {STATUS_OPTS.find((s) => s.value === record.status)?.label ?? record.status}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Not marked</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          {STATUS_OPTS.map((s) => (
                            <button key={s.value} title={s.label} onClick={() => handleQuickMark(emp._id, s.value)}
                              className={cn("p-1 rounded text-xs cursor-pointer border transition-colors", record?.status === s.value ? s.color + " border-transparent" : "border-border hover:bg-muted")}>
                              {s.value === "present" ? <CheckCircle size={13} /> : s.value === "absent" ? <XCircle size={13} /> : s.value === "half_day" ? <Clock size={13} /> : <Calendar size={13} />}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Monthly View */}
      {viewMode === "employee" && selectedEmployee && empSummary && (
        <div className="space-y-4">
          {/* Monthly summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Present", value: empSummary.present, color: "text-green-600" },
              { label: "Absent", value: empSummary.absent, color: "text-red-500" },
              { label: "Half Day", value: empSummary.halfDay, color: "text-yellow-600" },
              { label: "On Leave", value: empSummary.onLeave, color: "text-blue-600" },
              { label: "Avg Hours", value: `${empSummary.avgHours.toFixed(1)}h`, color: "text-primary" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Attendance % bar */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Attendance Rate</p>
                <p className="text-sm font-bold text-primary">
                  {empSummary.totalDays > 0 ? Math.round((empSummary.present + empSummary.halfDay * 0.5) / empSummary.totalDays * 100) : 0}%
                </p>
              </div>
              <Progress value={empSummary.totalDays > 0 ? Math.round((empSummary.present + empSummary.halfDay * 0.5) / empSummary.totalDays * 100) : 0} className="h-2" />
            </CardContent>
          </Card>

          {/* Day-by-day records */}
          {empSummary.records.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Date</th>
                    <th className="text-left px-4 py-2 font-medium">Check In</th>
                    <th className="text-left px-4 py-2 font-medium">Check Out</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {empSummary.records.sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
                    <tr key={r._id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{r.date}</td>
                      <td className="px-4 py-2 text-muted-foreground">{r.checkIn ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{r.checkOut ?? "—"}</td>
                      <td className="px-4 py-2">
                        <Badge className={cn("text-xs", STATUS_OPTS.find((s) => s.value === r.status)?.color ?? "")}>
                          {STATUS_OPTS.find((s) => s.value === r.status)?.label ?? r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {viewMode === "employee" && !selectedEmployee && (
        <div className="py-16 text-center text-muted-foreground">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p>Select an employee to view their attendance summary</p>
        </div>
      )}
    </div>
  );
}

// ─── Leave Management Tab ─────────────────────────────────────────────────────
function LeaveTab() {
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [showNew, setShowNew] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ employeeId: "" as string | "", leaveType: "casual", startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), reason: "" });

  const qc = useQueryClient();
  const { data: leaveRequests } = useQuery({ queryKey: ["hr", "leaves", filter], queryFn: () => api.get<any[]>(`/hr/leave${filter ? `?status=${filter}` : ""}`) });
  const { data: employees } = useQuery({ queryKey: ["hr", "employees"], queryFn: () => api.get<any[]>("/hr/employees") });
  const createLeave = useMutation({ mutationFn: (d: any) => api.post("/hr/leave", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "leaves"] }) });
  const updateLeave = useMutation({ mutationFn: ({ id, ...d }: any) => api.put(`/hr/leave/${id}/status`, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "leaves"] }) });

  const handleCreate = async () => {
    if (!leaveForm.employeeId || !leaveForm.reason) { toast.error("Select employee and provide reason"); return; }
    await createLeave.mutateAsync({ employeeId: leaveForm.employeeId as string, leaveType: leaveForm.leaveType, startDate: leaveForm.startDate, endDate: leaveForm.endDate, reason: leaveForm.reason });
    toast.success("Leave request submitted");
    setShowNew(false);
    setLeaveForm({ employeeId: "", leaveType: "casual", startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), reason: "" });
  };

  const getDayCount = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.round(diff / 86400000) + 1);
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const pending = leaveRequests?.filter((r) => r.status === "pending").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex gap-2">
          {[["all", "All"], ["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v === "all" ? undefined : v)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors", (filter === undefined && v === "all") || filter === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
              {l}{v === "pending" && pending > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{pending}</span>}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowNew(true)} className="cursor-pointer"><Plus size={14} className="mr-1" />Request Leave</Button>
      </div>

      {!leaveRequests ? <Skeleton className="h-48" /> : (
        <div className="space-y-2">
          {leaveRequests.map((r) => (
            <Card key={r._id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {r.employee?.name.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{r.employee?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{r.leaveType} leave · {r.startDate} to {r.endDate} ({getDayCount(r.startDate, r.endDate)} day{getDayCount(r.startDate, r.endDate) > 1 ? "s" : ""})</p>
                      <p className="text-xs text-muted-foreground mt-0.5 italic">"{r.reason}"</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={cn("text-xs", STATUS_COLORS[r.status] ?? "")}>{r.status}</Badge>
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" className="cursor-pointer h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => { updateLeave.mutateAsync({ id: r._id, status: "approved" }); toast.success("Leave approved"); }}>
                          <CheckCircle size={12} className="mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="secondary" className="cursor-pointer h-7 text-xs text-red-600 hover:text-red-700" onClick={() => { updateLeave.mutateAsync({ id: r._id, status: "rejected" }); toast.success("Leave rejected"); }}>
                          <XCircle size={12} className="mr-1" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {leaveRequests.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
              <p>No leave requests</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee *</Label>
              <Select value={leaveForm.employeeId} onValueChange={(v) => setLeaveForm({ ...leaveForm, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees?.map((e) => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type</Label>
              <Select value={leaveForm.leaveType} onValueChange={(v) => setLeaveForm({ ...leaveForm, leaveType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAVE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From</Label><Input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} /></div>
              <div><Label>To</Label><Input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} /></div>
            </div>
            <div><Label>Reason *</Label><Input value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Brief reason for leave" /></div>
            {leaveForm.startDate && leaveForm.endDate && (
              <p className="text-xs text-muted-foreground">Duration: {getDayCount(leaveForm.startDate, leaveForm.endDate)} day(s)</p>
            )}
            <Button onClick={handleCreate} className="w-full cursor-pointer">Submit Request</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ─── Payroll Tab ──────────────────────────────────────────────────────────────
function PayrollTab() {
  const today = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(today);
  const { data: payroll } = useQuery({ queryKey: ["hr", "payroll", month], queryFn: () => api.get<any[]>(`/hr/payroll?month=${month}`) });

  const totalGross = payroll?.reduce((s, p) => s + (p?.grossSalary ?? 0), 0) ?? 0;
  const totalNet = payroll?.reduce((s, p) => s + (p?.netSalary ?? 0), 0) ?? 0;
  const totalPF = payroll?.reduce((s, p) => s + (p?.pf ?? 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Gross Payroll</p><p className="text-lg font-bold">₹{totalGross.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Net Payroll</p><p className="text-lg font-bold text-green-600">₹{totalNet.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">Total PF</p><p className="text-lg font-bold text-blue-600">₹{totalPF.toLocaleString()}</p></CardContent></Card>
        </div>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
      </div>

      {!payroll ? <Skeleton className="h-64" /> : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Employee</th>
                <th className="text-right px-4 py-3 font-medium">Basic</th>
                <th className="text-right px-4 py-3 font-medium">HRA</th>
                <th className="text-right px-4 py-3 font-medium">Gross</th>
                <th className="text-right px-4 py-3 font-medium">PF</th>
                <th className="text-right px-4 py-3 font-medium">ESI</th>
                <th className="text-right px-4 py-3 font-medium">Absent Ded.</th>
                <th className="text-right px-4 py-3 font-medium text-green-600">Net Pay</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((p, i) => p && (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.employee.name}</p>
                    <p className="text-xs text-muted-foreground">{p.employee.employeeId} · {p.presentDays}/{p.workingDays} days</p>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">₹{Math.round(p.basic).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">₹{Math.round(p.hra).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium">₹{Math.round(p.grossSalary).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-500">-₹{Math.round(p.pf).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-500">-₹{Math.round(p.esi).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-500">
                    {p.absentDeduction > 0 ? `-₹${Math.round(p.absentDeduction).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">₹{Math.round(p.netSalary).toLocaleString()}</td>
                </tr>
              ))}
              {(payroll.length === 0 || payroll.every((p) => !p)) && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No salary data. Add salaries to employees first.</td></tr>
              )}
            </tbody>
            {payroll.length > 0 && (
              <tfoot className="bg-muted/30 border-t font-semibold">
                <tr>
                  <td className="px-4 py-3">Total ({payroll.filter(Boolean).length} employees)</td>
                  <td colSpan={2} />
                  <td className="px-4 py-3 text-right">₹{Math.round(totalGross).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-500">-₹{Math.round(totalPF).toLocaleString()}</td>
                  <td colSpan={2} />
                  <td className="px-4 py-3 text-right text-green-600">₹{Math.round(totalNet).toLocaleString()}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main HR Page ─────────────────────────────────────────────────────────────
export default function HRPage() {
  const [tab, setTab] = useState("employees");
  const { data: stats } = useQuery({ queryKey: ["hr", "stats"], queryFn: () => api.get<any>("/hr/stats") });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header Stats */}
      {!stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Total Employees" value={stats.totalEmployees} sub={`${stats.activeEmployees} active`} icon={Users} color="bg-primary" />
          <StatCard title="Present Today" value={stats.presentToday} sub="Marked attendance" icon={UserCheck} color="bg-green-500" />
          <StatCard title="Absent Today" value={stats.absentToday} sub="Marked absent" icon={UserX} color="bg-red-500" />
          <StatCard title="Pending Leaves" value={stats.pendingLeaves} sub="Awaiting approval" icon={AlertCircle} color="bg-amber-500" />
          <StatCard title="Departments" value={Object.keys(stats.deptBreakdown).length} sub="Active departments" icon={ClipboardList} color="bg-violet-500" />
        </div>
      )}

      {/* Dept Breakdown */}
      {stats && Object.keys(stats.deptBreakdown).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(stats.deptBreakdown).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
            <span key={dept} className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">{dept}: {count}</span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="employees" className="cursor-pointer"><Users size={14} className="mr-1.5" />Employees</TabsTrigger>
          <TabsTrigger value="attendance" className="cursor-pointer"><Calendar size={14} className="mr-1.5" />Attendance</TabsTrigger>
          <TabsTrigger value="leave" className="cursor-pointer"><ClipboardList size={14} className="mr-1.5" />Leave</TabsTrigger>
          <TabsTrigger value="payroll" className="cursor-pointer"><IndianRupee size={14} className="mr-1.5" />Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4"><EmployeesTab /></TabsContent>
        <TabsContent value="attendance" className="mt-4"><AttendanceTab /></TabsContent>
        <TabsContent value="leave" className="mt-4"><LeaveTab /></TabsContent>
        <TabsContent value="payroll" className="mt-4"><PayrollTab /></TabsContent>
      </Tabs>
    </div>
  );
}
