"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plug, CheckCircle2, Copy,
  MessageSquare, Mail, Megaphone, Users, Globe, Search,
  RefreshCw, Info, ChevronDown, ChevronUp, ExternalLink, KeyRound
} from "lucide-react";

// ─── Integration Definitions ─────────────────────────────────────────────────

type IntegrationCategory = "leads" | "messaging" | "marketing" | "email";

type SecretField = {
  name: string;
  label: string;
  placeholder: string;
  hint?: string;
};

type IntegrationDef = {
  key: string;
  label: string;
  description: string;
  category: IntegrationCategory;
  logoColor: string;
  docsUrl: string;
  setupSteps: string[];
  secrets: SecretField[];
  badge?: string;
};

const INTEGRATIONS: IntegrationDef[] = [
  // ── Lead Sources ──────────────────────────────────────────────────────────
  {
    key: "indiamart",
    label: "IndiaMART",
    description: "Auto-import buyer enquiries from your IndiaMART seller account directly into CRM leads.",
    category: "leads",
    logoColor: "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
    docsUrl: "https://seller.indiamart.com/messagecentre/leadmanager.html",
    badge: "Connected",
    setupSteps: [
      "Log in to IndiaMART Seller panel → Lead Manager → API.",
      "Copy your API Key.",
      "Add it as a secret named INDIAMART_API_KEY in the Secrets (Environment Variables) of the backend.",
    ],
    secrets: [
      { name: "INDIAMART_API_KEY", label: "IndiaMART API Key", placeholder: "IM-xxxxxxxxxxxx" },
    ],
  },
  {
    key: "tradeindia",
    label: "TradeIndia",
    description: "Pull buyer leads from TradeIndia into the CRM automatically using their lead export API.",
    category: "leads",
    logoColor: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    docsUrl: "https://www.tradeindia.com/",
    setupSteps: [
      "Log in to TradeIndia Seller Dashboard → Settings → API Access.",
      "Generate an API key.",
      "Add it as TRADEINDIA_API_KEY and your seller ID as TRADEINDIA_SELLER_ID.",
    ],
    secrets: [
      { name: "TRADEINDIA_API_KEY", label: "TradeIndia API Key", placeholder: "TI-xxxxxxxxxxxx" },
      { name: "TRADEINDIA_SELLER_ID", label: "Seller ID", placeholder: "12345678" },
    ],
  },
  {
    key: "justdial",
    label: "Just Dial",
    description: "Receive leads from Just Dial business listings via their lead delivery webhook or CSV export.",
    category: "leads",
    logoColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
    docsUrl: "https://www.justdial.com/",
    setupSteps: [
      "Contact Just Dial business support to enable API/webhook lead delivery.",
      "Add your Just Dial API key as JUSTDIAL_API_KEY.",
      "Add your registered mobile / pack ID as JUSTDIAL_PACK_ID.",
    ],
    secrets: [
      { name: "JUSTDIAL_API_KEY", label: "Just Dial API Key", placeholder: "JD-xxxxxxxxxxxx" },
      { name: "JUSTDIAL_PACK_ID", label: "Pack / Mobile ID", placeholder: "9XXXXXXXXX" },
    ],
  },
  // ── WhatsApp ─────────────────────────────────────────────────────────────
  {
    key: "whatsapp_twilio",
    label: "WhatsApp via Twilio",
    description: "Send WhatsApp messages to leads and customers using Twilio's WhatsApp Business API.",
    category: "messaging",
    logoColor: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    docsUrl: "https://www.twilio.com/docs/whatsapp",
    setupSteps: [
      "Create a Twilio account at twilio.com.",
      "Go to Messaging → Senders → WhatsApp and enable the sandbox (testing) or request a dedicated number (production).",
      "Copy Account SID and Auth Token from the Console Dashboard.",
      "Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.",
    ],
    secrets: [
      { name: "TWILIO_ACCOUNT_SID", label: "Account SID", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
      { name: "TWILIO_AUTH_TOKEN", label: "Auth Token", placeholder: "Your auth token" },
      { name: "TWILIO_WHATSAPP_FROM", label: "WhatsApp From", placeholder: "whatsapp:+14155238886", hint: "Prefix with 'whatsapp:'" },
    ],
  },
  {
    key: "whatsapp_meta",
    label: "WhatsApp via Meta (Cloud API)",
    description: "Use Meta's official WhatsApp Cloud API to send messages through a verified business number.",
    category: "messaging",
    logoColor: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    setupSteps: [
      "Create a Meta developer app at developers.facebook.com.",
      "Enable WhatsApp product → add a phone number and verify it.",
      "Generate a permanent access token (System User in Business Manager).",
      "Add META_WHATSAPP_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID. Also set WHATSAPP_PROVIDER=meta.",
    ],
    secrets: [
      { name: "META_WHATSAPP_TOKEN", label: "Permanent Access Token", placeholder: "EAAxxxxxxxxxx..." },
      { name: "META_WHATSAPP_PHONE_NUMBER_ID", label: "Phone Number ID", placeholder: "1234567890123" },
      { name: "WHATSAPP_PROVIDER", label: "Provider Switch", placeholder: "meta", hint: "Set to 'meta' to use this instead of Twilio" },
    ],
  },
  // ── SMS ───────────────────────────────────────────────────────────────────
  {
    key: "sms_twilio",
    label: "SMS via Twilio",
    description: "Send transactional and marketing SMS to leads and customers via Twilio.",
    category: "messaging",
    logoColor: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
    docsUrl: "https://www.twilio.com/docs/sms",
    setupSteps: [
      "In Twilio Console, buy or verify an SMS-capable phone number.",
      "Copy Account SID and Auth Token.",
      "Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_SMS_FROM.",
    ],
    secrets: [
      { name: "TWILIO_ACCOUNT_SID", label: "Account SID", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
      { name: "TWILIO_AUTH_TOKEN", label: "Auth Token", placeholder: "Your auth token" },
      { name: "TWILIO_SMS_FROM", label: "SMS From Number", placeholder: "+15551234567" },
    ],
  },
  {
    key: "sms_textlocal",
    label: "SMS via Textlocal (India)",
    description: "Send SMS in India using Textlocal's bulk SMS API — ideal for OTP, alerts, and campaigns.",
    category: "messaging",
    logoColor: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
    docsUrl: "https://api.textlocal.in/docs/",
    setupSteps: [
      "Register at textlocal.in and verify your account.",
      "Go to Settings → API Keys and generate a key.",
      "Get DLT-registered sender ID and template IDs from your DLT portal.",
      "Add TEXTLOCAL_API_KEY, TEXTLOCAL_SENDER, and optionally TEXTLOCAL_TEMPLATE_ID.",
    ],
    secrets: [
      { name: "TEXTLOCAL_API_KEY", label: "Textlocal API Key", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
      { name: "TEXTLOCAL_SENDER", label: "Sender ID (DLT)", placeholder: "WMORSC" },
    ],
  },
  // ── Email ─────────────────────────────────────────────────────────────────
  {
    key: "email_sendgrid",
    label: "Email via SendGrid",
    description: "Send transactional emails and marketing campaigns using SendGrid's high-deliverability infrastructure.",
    category: "email",
    logoColor: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    docsUrl: "https://docs.sendgrid.com/api-reference/mail-send/mail-send",
    setupSteps: [
      "Create a free SendGrid account at sendgrid.com.",
      "Complete Sender Identity verification (domain or single sender).",
      "Go to Settings → API Keys → Create API Key (Full Access or Mail Send only).",
      "Add SENDGRID_API_KEY and EMAIL_FROM (verified email).",
    ],
    secrets: [
      { name: "SENDGRID_API_KEY", label: "SendGrid API Key", placeholder: "SG.xxxxxxxxxxxxxxxxxxxxxxxx" },
      { name: "EMAIL_FROM", label: "Verified Sender Email", placeholder: "crm@yourcompany.com" },
    ],
  },
  {
    key: "email_mailgun",
    label: "Email via Mailgun",
    description: "Reliable transactional email delivery using Mailgun. Good alternative to SendGrid with a free tier.",
    category: "email",
    logoColor: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
    docsUrl: "https://documentation.mailgun.com/",
    setupSteps: [
      "Sign up at mailgun.com and add your domain.",
      "Verify DNS records for your domain.",
      "Go to API Security → Add new API key.",
      "Add SMTP_API_URL, SMTP_API_KEY, EMAIL_FROM, and EMAIL_PROVIDER=smtp.",
    ],
    secrets: [
      { name: "SMTP_API_URL", label: "Mailgun API Endpoint", placeholder: "https://api.mailgun.net/v3/yourdomain.com/messages" },
      { name: "SMTP_API_KEY", label: "Mailgun API Key", placeholder: "key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
      { name: "EMAIL_FROM", label: "Sender Email", placeholder: "crm@yourcompany.com" },
      { name: "EMAIL_PROVIDER", label: "Provider Switch", placeholder: "smtp", hint: "Set to 'smtp' to use Mailgun instead of SendGrid" },
    ],
  },
  // ── Marketing / Ads ───────────────────────────────────────────────────────
  {
    key: "meta_ads",
    label: "Meta Ads (Facebook/Instagram)",
    description: "Pull lead form submissions from Meta Ads into CRM automatically via Lead Ads webhook or Graph API.",
    category: "marketing",
    logoColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400",
    docsUrl: "https://developers.facebook.com/docs/marketing-api/guides/lead-ads/",
    badge: "Popular",
    setupSteps: [
      "In Meta Business Manager, create a System User with ads_read permission.",
      "Generate a long-lived access token (60-day or permanent via System User).",
      "Add META_ADS_ACCESS_TOKEN and META_ADS_PAGE_ID.",
      "Set up a webhook in your Meta App to point to your backend API.",
    ],
    secrets: [
      { name: "META_ADS_ACCESS_TOKEN", label: "System User Access Token", placeholder: "EAAxxxxxxxxxx..." },
      { name: "META_ADS_PAGE_ID", label: "Facebook Page ID", placeholder: "1234567890" },
      { name: "META_ADS_APP_SECRET", label: "App Secret (for webhook verification)", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
    ],
  },
];

const CATEGORY_META: Record<IntegrationCategory, { label: string; icon: React.ReactNode; color: string }> = {
  leads: { label: "Lead Sources", icon: <Users size={15} />, color: "text-orange-600" },
  messaging: { label: "Messaging", icon: <MessageSquare size={15} />, color: "text-green-600" },
  email: { label: "Email", icon: <Mail size={15} />, color: "text-blue-600" },
  marketing: { label: "Marketing & Ads", icon: <Megaphone size={15} />, color: "text-indigo-600" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | IntegrationCategory>("all");
  const [configuring, setConfiguring] = useState<string | null>(null);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => api.get<any[]>("/integrations"),
  });

  const getStatus = (key: string) => integrations?.find((i) => i.key === key);

  const filtered = INTEGRATIONS.filter((i) => {
    const matchesSearch =
      i.label.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" || i.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const grouped = (["leads", "messaging", "email", "marketing"] as IntegrationCategory[]).map((cat) => ({
    cat,
    items: filtered.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plug size={22} className="text-primary" /> Integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect third-party APIs for leads, messaging, email, and marketing campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/60 px-3 py-2 rounded-lg border">
          <Info size={14} className="shrink-0 text-primary" />
          <span>API keys are stored securely in backend <strong>Environment Variables</strong> — never hardcoded.</span>
        </div>
      </div>

      {/* Stats bar */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["leads", "messaging", "email", "marketing"] as IntegrationCategory[]).map((cat) => {
            const total = INTEGRATIONS.filter((i) => i.category === cat).length;
            const enabled = (integrations || []).filter((i: any) => {
              const def = INTEGRATIONS.find((d) => d.key === i.key);
              return def?.category === cat && i.enabled;
            }).length;
            const meta = CATEGORY_META[cat];
            return (
              <Card key={cat} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setActiveTab(cat)}>
                <CardContent className="pt-3 pb-3">
                  <div className={`mb-1 ${meta.color}`}>{meta.icon}</div>
                  <p className="text-xs text-muted-foreground">{meta.label}</p>
                  <p className="text-lg font-bold">{enabled}<span className="text-xs text-muted-foreground font-normal">/{total} active</span></p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search integrations..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="leads" className="text-xs">Leads</TabsTrigger>
            <TabsTrigger value="messaging" className="text-xs">Messaging</TabsTrigger>
            <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
            <TabsTrigger value="marketing" className="text-xs">Marketing</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Integration groups */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ cat, items }) => (
            <div key={cat}>
              <div className={`flex items-center gap-2 mb-3 text-sm font-semibold ${CATEGORY_META[cat].color}`}>
                {CATEGORY_META[cat].icon}
                {CATEGORY_META[cat].label}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((def) => {
                  const status = getStatus(def.key);
                  const isEnabled = status?.enabled ?? false;
                  return (
                    <IntegrationCard
                      key={def.key}
                      def={def}
                      isEnabled={isEnabled}
                      onConfigure={() => setConfiguring(def.key)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          {grouped.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Globe size={40} className="mx-auto mb-3 opacity-30" />
              <p>No integrations match your search.</p>
            </div>
          )}
        </div>
      )}

      {/* How to connect banner */}
      <HowToConnectBanner />

      {configuring && (
        <ConfigureDialog
          def={INTEGRATIONS.find((i) => i.key === configuring)!}
          onClose={() => setConfiguring(null)}
        />
      )}
    </div>
  );
}

// ─── Integration Card ─────────────────────────────────────────────────────────
function IntegrationCard({ def, isEnabled, onConfigure }: {
  def: IntegrationDef;
  isEnabled: boolean;
  onConfigure: () => void;
}) {
  const qc = useQueryClient();

  const toggleIntegration = useMutation({
    mutationFn: (checked: boolean) => {
      if (checked) {
        return api.post("/integrations", { key: def.key, label: def.label, enabled: true });
      } else {
        return api.put(`/integrations/${def.key}/toggle`, { enabled: false });
      }
    },
    onSuccess: (_, checked) => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(`${def.label} ${checked ? "enabled" : "disabled"}`);
    },
  });

  return (
    <Card className={`relative transition-all hover:shadow-md ${isEnabled ? "border-primary/40 ring-1 ring-primary/20" : ""}`}>
      {isEnabled && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 size={16} className="text-green-500 bg-green-50 rounded-full" />
        </div>
      )}
      <CardHeader className="pb-2 pr-8">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${def.logoColor}`}>
            {def.label.charAt(0)}
          </div>
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              {def.label}
              {def.badge && <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 font-semibold">{def.badge}</Badge>}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[36px]">{def.description}</p>

        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-2 mt-2">
            <Switch
              checked={isEnabled}
              onCheckedChange={(c) => toggleIntegration.mutate(c)}
              className="cursor-pointer"
            />
            <span className="text-xs font-semibold text-muted-foreground">{isEnabled ? "Enabled" : "Disabled"}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={onConfigure} className="cursor-pointer h-7 text-xs mt-2 font-semibold">
            <KeyRound size={12} className="mr-1" /> Setup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Configure Dialog ─────────────────────────────────────────────────────────
function ConfigureDialog({ def, onClose }: { def: IntegrationDef; onClose: () => void }) {
  const qc = useQueryClient();
  const [stepsOpen, setStepsOpen] = useState(true);
  const [notes, setNotes] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  
  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.get<any>("/auth/me")
  });

  const upsertIntegration = useMutation({
    mutationFn: () => api.post("/integrations", {
      key: def.key,
      label: def.label,
      enabled: true,
      configuredBy: user?.name || "Admin",
      notes: notes || undefined,
      credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(`${def.label} marked as configured`);
      onClose();
    }
  });

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${def.logoColor}`}>
              {def.label.charAt(0)}
            </div>
            <div>
              <p className="text-base font-bold">Configure {def.label}</p>
              <a href={def.docsUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase font-bold tracking-wider text-primary hover:underline flex items-center gap-1">
                <ExternalLink size={10} /> Official Docs
              </a>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Description */}
          <p className="text-sm text-muted-foreground">{def.description}</p>

          {/* Setup steps */}
          <div className="rounded-xl border bg-muted/20">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold cursor-pointer"
              onClick={() => setStepsOpen((o) => !o)}
            >
              <span className="flex items-center gap-2"><RefreshCw size={14} className="text-primary"/> Setup Steps</span>
              {stepsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {stepsOpen && (
              <ol className="px-4 pb-4 space-y-3">
                {def.setupSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-xs text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0">
                      {i + 1}
                    </span>
                    <span className="leading-snug pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Secret keys to add */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-primary">
              <KeyRound size={14} />
              Required Credentials
            </p>
            <div className="space-y-3">
              {def.secrets.map((s) => (
                <div key={s.name} className="rounded-xl border border-border/60 bg-background p-4 space-y-1 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[11px] font-bold text-primary bg-primary/5 px-2 py-1 rounded">{s.name}</p>
                  </div>
                  <p className="text-xs font-medium text-foreground mt-2">{s.label}</p>
                  <Input 
                    type={s.name.includes("URL") || s.name.includes("FROM") || s.name.includes("PROVIDER") ? "text" : "password"}
                    placeholder={s.placeholder} 
                    value={credentials[s.name] || ""} 
                    onChange={(e) => setCredentials({ ...credentials, [s.name]: e.target.value })} 
                    className="mt-1 font-mono text-xs" 
                  />
                  {s.hint && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1"><Info size={12} className="shrink-0 mt-0.5" />{s.hint}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase">Configuration Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Configured for production environment."
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={() => upsertIntegration.mutate()} disabled={upsertIntegration.isPending} className="flex-1 cursor-pointer h-10">
              <CheckCircle2 size={16} className="mr-2" /> Mark as Configured & Enable
            </Button>
            <Button variant="outline" onClick={onClose} className="cursor-pointer h-10">Cancel</Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Marking as configured records the status. The actual API keys must be added locally to your server's backend environment variables.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── How to Connect Banner ────────────────────────────────────────────────────
function HowToConnectBanner() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <button className="flex items-center justify-between w-full cursor-pointer group" onClick={() => setOpen((o) => !o)}>
          <CardTitle className="text-sm flex items-center gap-2 text-primary font-bold">
            <Info size={16} className="text-primary/70 group-hover:text-primary transition-colors" /> How to connect an API
          </CardTitle>
          {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>
      </CardHeader>
      {open && (
        <CardContent className="text-xs text-muted-foreground space-y-3 pt-2 pl-9">
          <p>1. Click <strong className="text-foreground">Setup</strong> on any integration card above and follow the steps to get your API key from the provider.</p>
          <p>2. Paste the required keys and credentials in the inputs provided.</p>
          <p>3. Click <strong className="text-foreground">Mark as Configured & Enable</strong> to save your credentials securely to the database.</p>
          <p>4. The integration is now live — buttons in CRM and other modules will use these backend integrations using your saved credentials.</p>
          <p className="text-[10px] pt-2 border-t border-primary/10 text-primary/70 font-semibold italic">Your credentials are encrypted dynamically by Mongoose and stored directly in your Database, keeping them seamlessly available across the entire platform.</p>
        </CardContent>
      )}
    </Card>
  );
}
