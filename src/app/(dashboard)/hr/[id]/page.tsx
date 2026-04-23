"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ChevronLeft, Mail, Phone, MapPin, Building2, Briefcase, 
  Calendar, IndianRupee, User, Clock, CheckCircle, XCircle, 
  AlertCircle, TrendingUp, Star, FileText, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

const getRatingLabel = (score: number) => {
  if (score >= 4.5) return { label: "Exceptional", color: "text-emerald-600" };
  if (score >= 3.5) return { label: "Exceeds Expectations", color: "text-green-600" };
  if (score >= 2.5) return { label: "Meets Expectations", color: "text-blue-600" };
  if (score >= 1.5) return { label: "Needs Improvement", color: "text-yellow-600" };
  return { label: "Unsatisfactory", color: "text-red-500" };
};

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  const { data: employee, isLoading: isLoadingEmp } = useQuery({
    queryKey: ["hr", "employees", id],
    queryFn: () => api.get<any>(`/hr/employees/${id}`),
  });

  const { data: attendanceSummary } = useQuery({
    queryKey: ["hr", "attendance-summary", id],
    queryFn: () => api.get<any>(`/hr/attendance/summary?employeeId=${id}&month=${new Date().toISOString().slice(0, 7)}`),
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ["hr", "reviews", id],
    queryFn: () => api.get<any[]>(`/hr/reviews?employeeId=${id}`),
    enabled: !!id,
  });

  const { data: leaves } = useQuery({
    queryKey: ["hr", "leaves", id],
    queryFn: () => api.get<any[]>(`/hr/leave?employeeId=${id}`),
    enabled: !!id,
  });

  if (isLoadingEmp) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Employee not found</p>
        <Button variant="link" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const attendanceRate = attendanceSummary 
    ? (attendanceSummary.present / (attendanceSummary.totalDays || 1)) * 100 
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb / Back */}
      <button 
        onClick={() => router.back()} 
        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 cursor-pointer"
      >
        <ChevronLeft size={16} className="mr-1" /> Back to HR Records
      </button>

      {/* Profile Header */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-primary/5 via-primary/2 to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-primary/20">
              {employee.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{employee.name}</h1>
                <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold py-0.5 px-2 bg-background/50">
                  {employee.employeeId}
                </Badge>
                <Badge className={cn("text-xs py-0.5 px-2 capitalize", 
                  employee.status === "active" ? "bg-green-500/10 text-green-600 border-green-200" : 
                  "bg-muted text-muted-foreground")}>
                  {employee.status}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground font-medium">{employee.designation}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center"><Mail size={14} className="mr-1.5" /> {employee.email}</span>
                {employee.phone && <span className="flex items-center"><Phone size={14} className="mr-1.5" /> {employee.phone}</span>}
                <span className="flex items-center"><Building2 size={14} className="mr-1.5" /> {employee.department}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="cursor-pointer">Edit Profile</Button>
              <Button className="cursor-pointer">Action</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Work Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Attendance (Current Month)</span>
                  <span className="font-bold">{Math.round(attendanceRate)}%</span>
                </div>
                <Progress value={attendanceRate} className="h-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-muted/30 p-3 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Present Days</p>
                  <p className="text-xl font-bold">{attendanceSummary?.present ?? 0}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Pending Leaves</p>
                  <p className="text-xl font-bold text-amber-600">{leaves?.filter(l => l.status === "pending").length ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Core Info */}
          <Card>
            <CardHeader className="pb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Employment Details
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-dashed">
                <span className="text-muted-foreground flex items-center"><Calendar size={14} className="mr-2" /> Joined On</span>
                <span className="font-medium text-foreground">{new Date(employee.joiningDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-dashed">
                <span className="text-muted-foreground flex items-center"><IndianRupee size={14} className="mr-2" /> Monthly Gross</span>
                <span className="font-medium text-emerald-600">₹{employee.salary?.toLocaleString() ?? "Not Set"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-dashed">
                <span className="text-muted-foreground flex items-center"><User size={14} className="mr-2" /> Manager</span>
                <span className="font-medium text-foreground">{employee.managerId ? "Assigned" : "N/A"}</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <span className="text-muted-foreground flex items-center mb-1"><MapPin size={14} className="mr-2" /> Address</span>
                <p className="text-foreground leading-relaxed pl-6">{employee.address || "No address provided"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Dynamic Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-11 bg-transparent p-0 gap-6">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-semibold">Overview</TabsTrigger>
              <TabsTrigger value="attendance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-semibold">Attendance</TabsTrigger>
              <TabsTrigger value="performance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-semibold">Performance</TabsTrigger>
              <TabsTrigger value="leaves" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-semibold">Leaves</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-6 space-y-6">
              {/* Recent Activity Mini-List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-card shadow-sm border-muted/50">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base flex items-center"><Star size={16} className="text-amber-500 mr-2" /> Latest Review</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {reviews && reviews.length > 0 ? (
                      (() => {
                        const { label, color } = getRatingLabel(reviews[0].overallScore);
                        return (
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-semibold">{reviews[0].period}</p>
                                <p className={cn("text-[10px] font-bold uppercase tracking-tight", color)}>{label}</p>
                              </div>
                              <span className={cn("text-lg font-bold", color)}>{reviews[0].overallScore.toFixed(1)}/5</span>
                            </div>
                            <Progress value={(reviews[0].overallScore / 5) * 100} className="h-1" />
                            <p className="text-xs italic text-muted-foreground leading-relaxed line-clamp-2">"{reviews[0].comments}"</p>
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">No performance reviews yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card shadow-sm border-muted/50">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base flex items-center"><AlertCircle size={16} className="text-primary mr-2" /> Recent Attendance</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {attendanceSummary?.records?.slice(0, 3).map((reg: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm py-1 border-b last:border-0 border-dashed">
                        <span>{reg.date}</span>
                        <Badge variant="outline" className={cn("text-[10px] h-5", reg.status === 'present' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                          {reg.status}
                        </Badge>
                      </div>
                    ))}
                    {!attendanceSummary?.records?.length && <p className="text-sm text-muted-foreground py-4 text-center">No recent records.</p>}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="pt-6">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium">Date</th>
                          <th className="text-left px-4 py-3 font-medium">Status</th>
                          <th className="text-left px-4 py-3 font-medium">Check In</th>
                          <th className="text-left px-4 py-3 font-medium">Check Out</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {attendanceSummary?.records?.map((r: any, i: number) => (
                          <tr key={i} className="hover:bg-muted/20">
                            <td className="px-4 py-3">{r.date}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={cn(r.status === 'present' ? "text-green-600 border-green-200" : "text-red-500 border-red-200")}>
                                {r.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{r.checkIn || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{r.checkOut || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Performance Reviews</h3>
                <Button onClick={() => setShowReviewDialog(true)} className="cursor-pointer">
                  <Plus size={14} className="mr-1.5" /> New Review
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {reviews?.map((r, i) => {
                  const { label, color } = getRatingLabel(r.overallScore);
                  return (
                    <Card key={i} className="hover:shadow-sm transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-sm">{r.period}</p>
                            <p className="text-xs text-muted-foreground">Review Date: {r.reviewDate}</p>
                          </div>
                          <div className="text-right">
                            <p className={cn("text-xl font-bold leading-none", color)}>{r.overallScore.toFixed(1)}<span className="text-xs text-muted-foreground">/5</span></p>
                            <p className={cn("text-[10px] font-bold uppercase tracking-tight mt-1", color)}>{label}</p>
                          </div>
                        </div>

                        {/* Star rating visual */}
                        <div className="flex gap-0.5 mb-4">
                          {Array.from({ length: 5 }).map((_, starIdx) => (
                            <Star 
                              key={starIdx} 
                              size={14} 
                              className={starIdx < Math.round(r.overallScore) ? "text-yellow-400 fill-yellow-400" : "text-muted/50"} 
                            />
                          ))}
                        </div>

                        {/* KPI bars */}
                        <div className="space-y-3">
                          {r.kpiScores?.slice(0, 5).map((k: any, kIdx: number) => (
                            <div key={kIdx}>
                              <div className="flex justify-between text-[11px] mb-1">
                                <span className="text-muted-foreground font-medium">{k.kpi || k.name}</span>
                                <span className="font-bold">{k.score || k.value}/5</span>
                              </div>
                              <Progress value={((k.score || k.value) / 5) * 100} className="h-1.5" />
                            </div>
                          ))}
                        </div>

                        {r.comments && (
                          <div className="mt-4 pt-3 border-t border-dashed">
                            <p className="text-xs text-muted-foreground italic leading-relaxed">"{r.comments}"</p>
                          </div>
                        )}

                        <div className="mt-4 flex items-center gap-2 pt-3 border-t">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                            {(r.reviewer?.name || "M").charAt(0)}
                          </div>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            Reviewed by <span className="text-foreground">{r.reviewer?.name || "Manager"}</span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {!reviews?.length && (
                  <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border-2 border-dashed">
                    No performance reviews available for this employee.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="leaves" className="pt-6">
              <div className="space-y-4">
                {leaves?.map((l, i) => (
                  <Card key={i} className="overflow-hidden border-l-4" style={{ borderLeftColor: l.status === 'approved' ? '#10b981' : l.status === 'pending' ? '#f59e0b' : '#ef4444' }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="capitalize">{l.leaveType}</Badge>
                          <span className="text-sm font-medium">{l.startDate} to {l.endDate}</span>
                        </div>
                        <Badge variant={l.status === 'approved' ? 'default' : 'secondary'} className="capitalize h-5">{l.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Reason: {l.reason}</p>
                    </CardContent>
                  </Card>
                ))}
                {!leaves?.length && <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border-2 border-dashed">No leave requests found.</div>}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {/* Performance Review Dialog */}
      {showReviewDialog && (
        <PerformanceReviewDialog 
          open={showReviewDialog} 
          onClose={() => setShowReviewDialog(false)} 
          employeeId={id as string}
        />
      )}
    </div>
  );
}

function PerformanceReviewDialog({ open, onClose, employeeId }: { open: boolean, onClose: () => void, employeeId: string }) {
  const qc = useQueryClient();
  const { data: employees } = useQuery({ queryKey: ["hr", "employees"], queryFn: () => api.get<any[]>("/hr/employees") });
  const createReview = useMutation({ 
    mutationFn: (d: any) => api.post("/hr/reviews", d), 
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "reviews", employeeId] });
      toast.success("Performance review saved");
      onClose();
    } 
  });

  const DEFAULT_KPIS = ["Quality of Work", "Productivity", "Teamwork", "Communication", "Punctuality"];
  const [form, setForm] = useState({
    reviewerId: "",
    period: `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
    reviewDate: new Date().toISOString().slice(0, 10),
    comments: "",
  });
  const [kpiScores, setKpiScores] = useState(DEFAULT_KPIS.map((kpi) => ({ kpi, score: 3, target: 5 })));

  const overallScore = kpiScores.length > 0 ? kpiScores.reduce((s, k) => s + k.score, 0) / kpiScores.length : 0;

  const handleSave = async () => {
    if (!form.reviewerId) { toast.error("Select a reviewer"); return; }
    await createReview.mutateAsync({
      employeeId,
      reviewerId: form.reviewerId,
      period: form.period,
      kpiScores,
      overallScore: parseFloat(overallScore.toFixed(2)),
      comments: form.comments || undefined,
      reviewDate: form.reviewDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Performance Review</DialogTitle>
          <CardDescription>Assess employee contributions for the current period.</CardDescription>
        </DialogHeader>
        <div className="space-y-5 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Reviewer (Manager) *</Label>
              <Select value={form.reviewerId} onValueChange={(v) => setForm({ ...form, reviewerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {employees?.map((e) => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Review Period</Label>
              <Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="e.g. 2024-Q3" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-bold">KPI Scoring</Label>
              <div className="bg-primary/10 px-2 py-1 rounded text-primary text-sm font-bold">
                Overall: {overallScore.toFixed(1)}/5
              </div>
            </div>
            <div className="grid gap-4">
              {kpiScores.map((k, i) => (
                <div key={k.kpi} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium">{k.kpi}</span>
                    <span className="font-bold text-primary">{k.score}/5</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button 
                        key={v} 
                        onClick={() => {
                          const newScores = [...kpiScores];
                          newScores[i].score = v;
                          setKpiScores(newScores);
                        }}
                        className={cn(
                          "flex-1 py-1.5 rounded text-xs transition-all cursor-pointer border",
                          k.score >= v 
                            ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                            : "bg-muted/50 border-transparent hover:bg-muted"
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Feedback & Comments</Label>
            <textarea 
              className="w-full min-h-[100px] p-3 rounded-md border text-sm bg-background focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="Provide detailed feedback on strengths and areas for improvement..."
              value={form.comments}
              onChange={(e) => setForm({ ...form, comments: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={createReview.isPending}>
              {createReview.isPending ? "Saving..." : "Save Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
