"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, User, Mail, Lock, Briefcase, Shield, Save, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const DEPARTMENTS = ["Engineering", "Manufacturing", "Sales", "Purchase", "Finance", "HR", "Quality", "Logistics", "Management"];

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();

  if (isLoading || !user) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
          <div className="md:col-span-2 h-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#00afa7]">Account Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your profile, account preferences, and security settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <aside className="md:col-span-4 lg:col-span-3">
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl border border-border/50 shadow-sm mb-6">
            <div className="w-20 h-20 rounded-full bg-[#00afa7]/10 text-[#00afa7] flex items-center justify-center text-2xl font-bold mb-4 border-2 border-[#00afa7]/20">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <h2 className="font-bold text-lg leading-tight">{user.name}</h2>
            <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
            <div className="mt-4 px-3 py-1 bg-[#00afa7]/5 text-[#00afa7] text-[10px] font-bold uppercase rounded-full border border-[#00afa7]/10">
              {user.role}
            </div>
          </div>
        </aside>

        <main className="md:col-span-8 lg:col-span-9">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer px-6">
                <User size={15} className="mr-2" /> Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer px-6">
                <Shield size={15} className="mr-2" /> Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="animate-in slide-in-from-bottom-2 duration-300">
              <ProfileForm user={user} />
            </TabsContent>

            <TabsContent value="security" className="animate-in slide-in-from-bottom-2 duration-300">
              <SecurityForm />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

function ProfileForm({ user }: { user: any }) {
  const qc = useQueryClient();
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    department: user.department || "",
  });

  const updateProfile = useMutation({
    mutationFn: (data: any) => api.put("/users/me", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Profile Updated", {
        description: "Your personal information has been saved successfully.",
      });
    },
    onError: (err: any) => {
      toast.error("Update Failed", {
        description: err.message || "Could not update profile information.",
      });
    },
  });

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardHeader className="bg-muted/30 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <User size={18} className="text-[#00afa7]" /> Personal Information
        </CardTitle>
        <CardDescription className="text-xs">Update your name and primary contact details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
              <User size={12} /> Full Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-background/50 focus:ring-1 focus:ring-[#00afa7]/20 transition-all border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
              <Mail size={12} /> Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-background/50 focus:ring-1 focus:ring-[#00afa7]/20 transition-all border-border/50"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="department" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            <Briefcase size={12} /> Department
          </Label>
          <Select
            value={formData.department}
            onValueChange={(val) => setFormData({ ...formData, department: val })}
          >
            <SelectTrigger className="bg-background/50 border-border/50">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/10 border-t border-border/50 flex justify-end gap-3 py-4">
        <Button
          onClick={() => updateProfile.mutate(formData)}
          disabled={updateProfile.isPending}
          className="px-8 cursor-pointer font-bold uppercase text-[11px] tracking-widest bg-[#00afa7] hover:bg-[#00afa7]/90 text-black shadow-lg shadow-[#00afa7]/20 transition-all hover:scale-[1.02]"
        >
          {updateProfile.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save size={14} className="mr-2" />
          )}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}

function SecurityForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const changePassword = useMutation({
    mutationFn: (data: any) => api.put("/users/me/password", data),
    onSuccess: () => {
      toast.success("Password Updated", {
        description: "Your account security settings have been updated.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast.error("Security Update Failed", {
        description: err.message || "Please check your current password and try again.",
      });
    },
  });

  const handleUpdate = () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords mismatch", {
        description: "Your new password and confirmation do not match.",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password too weak", {
        description: "New password must be at least 6 characters long.",
      });
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardHeader className="bg-muted/30 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield size={18} className="text-red-500" /> Password & Security
        </CardTitle>
        <CardDescription className="text-xs">Secure your account with a strong, unique password.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2 max-w-md">
          <Label htmlFor="current" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            <Lock size={12} /> Current Password
          </Label>
          <div className="relative">
            <Input
              id="current"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-background/50 border-border/50 pr-10 focus:ring-1 focus:ring-red-500/20"
              placeholder="Enter current password"
            />
            <button
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="new" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
              <Lock size={12} /> New Password
            </Label>
            <div className="relative">
              <Input
                id="new"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-background/50 border-border/50 pr-10 focus:ring-1 focus:ring-[#00afa7]/20"
                placeholder="6+ characters"
              />
              <button
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
              <Lock size={12} /> Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-background/50 border-border/50 pr-10 focus:ring-1 focus:ring-[#00afa7]/20"
                placeholder="Repeat new password"
              />
              <button
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/10 border-t border-border/50 flex justify-end gap-3 py-4">
        <Button
          onClick={handleUpdate}
          disabled={changePassword.isPending || !currentPassword || !newPassword}
          variant="outline"
          className="px-8 cursor-pointer font-bold uppercase text-[11px] tracking-widest border-red-500/50 text-red-500 hover:bg-red-500/10 transition-all hover:scale-[1.02]"
        >
          {changePassword.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Shield size={14} className="mr-2" />
          )}
          Update Security
        </Button>
      </CardFooter>
    </Card>
  );
}
