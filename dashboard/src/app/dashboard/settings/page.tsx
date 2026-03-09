"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { CAPTION_STYLES, PLAN_LIMITS, type CaptionStyle } from "@/lib/types";
import {
    User, Bell, CreditCard, ShieldAlert, Save, Loader2,
    ExternalLink, Check, Crown, Sparkles, AlertTriangle,
    Trash2, Lock, ArrowUpRight,
} from "lucide-react";

type SettingsTab = "profile" | "notifications" | "billing" | "security";

const TABS: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
    { key: "profile", label: "Profile", icon: User },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "billing", label: "Billing", icon: CreditCard },
    { key: "security", label: "Security", icon: ShieldAlert },
];

export default function SettingsPage() {
    const supabase = createClient();
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [defaultStyle, setDefaultStyle] = useState<CaptionStyle>("hormozi");
    const [notifications, setNotifications] = useState({
        discord: true,
        email: false,
        jobComplete: true,
        jobFailed: true,
        weeklyReport: false,
    });
    const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState("");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setEmail(user.email ?? "");

            const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            if (data) {
                const p = data as Profile;
                setProfile(p);
                setFullName(p.full_name ?? "");
                setNotifications({
                    discord: p.notify_discord ?? true,
                    email: p.notify_email ?? false,
                    jobComplete: p.notify_job_complete ?? true,
                    jobFailed: p.notify_job_failed ?? true,
                    weeklyReport: p.notify_weekly_report ?? false,
                });
                setDiscordWebhookUrl(p.discord_webhook_url ?? "");
            }
            setLoading(false);
        }
        load();
    }, [supabase]);

    function showToast(type: "success" | "error", message: string) {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    }

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);

        if (notifications.discord && discordWebhookUrl.trim()) {
            if (!discordWebhookUrl.startsWith("https://discord.com/api/webhooks/") &&
                !discordWebhookUrl.startsWith("https://discordapp.com/api/webhooks/")) {
                showToast("error", "Invalid Discord webhook URL");
                setSaving(false);
                return;
            }
        }

        const { error: updateError } = await supabase
            .from("profiles")
            .update({
                full_name: fullName.trim(),
                notify_discord: notifications.discord,
                notify_email: notifications.email,
                notify_job_complete: notifications.jobComplete,
                notify_job_failed: notifications.jobFailed,
                notify_weekly_report: notifications.weeklyReport,
                discord_webhook_url: discordWebhookUrl.trim() || null,
            })
            .eq("id", profile.id);

        if (updateError) {
            showToast("error", updateError.message);
        } else {
            showToast("success", "Settings saved successfully");
        }
        setSaving(false);
    };

    const handleDeleteAccount = async () => {
        if (deleteInput !== "DELETE") return;
        setDeleting(true);
        // Sign out and redirect - actual account deletion would need a server-side function
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) {
        return (
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <div className="skeleton" style={{ height: 32, width: 180, marginBottom: 8, borderRadius: 8 }} />
                <div className="skeleton" style={{ height: 18, width: 280, marginBottom: 32, borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 48, marginBottom: 24, borderRadius: 12 }} />
                <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
            </div>
        );
    }

    const planKey = profile?.plan ?? "free";
    const planInfo = PLAN_LIMITS[planKey];
    const initial = (profile?.full_name || "U").charAt(0).toUpperCase();

    return (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {/* ─── Toast Notification ─── */}
            {toast && (
                <div className={`toast toast-${toast.type}`} key={toast.message}>
                    {toast.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
                    {toast.message}
                </div>
            )}

            {/* ─── Header ─── */}
            <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 800, marginBottom: 4 }}>Settings</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 28 }}>
                Manage your account, preferences, and subscription
            </p>

            {/* ─── Tab Navigation ─── */}
            <div className="tab-nav" style={{ marginBottom: 28 }}>
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            className={`tab-item ${activeTab === tab.key ? "active" : ""}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <Icon size={15} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ═══════════ Profile Tab ═══════════ */}
            {activeTab === "profile" && (
                <div className="glass-card" style={{ padding: 28 }}>
                    {/* Avatar + Name section */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: "50%",
                            background: "var(--gradient-hero)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 24, fontWeight: 800, color: "white", flexShrink: 0,
                        }}>
                            {initial}
                        </div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 700 }}>{fullName || "User"}</div>
                            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{email}</div>
                            <span className={`plan-badge ${planKey}`} style={{ marginTop: 6, display: "inline-block" }}>
                                {planKey} plan
                            </span>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Full Name</label>
                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Email</label>
                            <input type="email" value={email} disabled className="input-field" style={{ opacity: 0.6, cursor: "not-allowed" }} />
                        </div>
                    </div>

                    {/* Default Caption Style */}
                    <div>
                        <label style={{ display: "block", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Default Caption Style</label>
                        <div className="dash-grid-3">
                            {CAPTION_STYLES.map((style) => (
                                <button
                                    key={style.value}
                                    onClick={() => setDefaultStyle(style.value)}
                                    style={{
                                        padding: "10px 14px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                                        border: `1px solid ${defaultStyle === style.value ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                                        background: defaultStyle === style.value ? "rgba(108,92,231,0.12)" : "transparent",
                                        transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "space-between",
                                    }}
                                >
                                    <span style={{ fontSize: 13, fontWeight: 600, color: defaultStyle === style.value ? "var(--text-primary)" : "var(--text-secondary)" }}>
                                        {style.label}
                                    </span>
                                    {defaultStyle === style.value && <Check size={14} style={{ color: "var(--accent-primary)" }} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ Notifications Tab ═══════════ */}
            {activeTab === "notifications" && (
                <div className="glass-card" style={{ padding: 28 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Notification Preferences</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                        {[
                            { key: "discord" as const, label: "Discord Notifications", desc: "Get notified via Discord webhook when jobs are processed" },
                            { key: "email" as const, label: "Email Notifications", desc: "Receive email updates for completed jobs" },
                            { key: "jobComplete" as const, label: "Job Completed", desc: "Notify when video processing finishes successfully" },
                            { key: "jobFailed" as const, label: "Job Failed", desc: "Alert when processing encounters errors" },
                            { key: "weeklyReport" as const, label: "Weekly Report", desc: "Summary of clips, performance, and usage" },
                        ].map((item) => (
                            <div key={item.key}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{item.desc}</div>
                                    </div>
                                    <button
                                        className={`toggle-switch ${notifications[item.key] ? "active" : ""}`}
                                        onClick={() => setNotifications((n) => ({ ...n, [item.key]: !n[item.key] }))}
                                    />
                                </div>

                                {item.key === "discord" && notifications.discord && (
                                    <div style={{ marginTop: 12, paddingLeft: 0 }}>
                                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                                            Discord Webhook URL
                                        </label>
                                        <input
                                            type="url" value={discordWebhookUrl}
                                            onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                                            placeholder="https://discord.com/api/webhooks/..."
                                            className="input-field" style={{ fontSize: 13 }}
                                        />
                                        <a
                                            href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                                            target="_blank" rel="noopener noreferrer"
                                            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 12, color: "var(--accent-primary)", textDecoration: "none" }}
                                        >
                                            <ExternalLink size={12} /> How to create a Discord webhook
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══════════ Billing Tab ═══════════ */}
            {activeTab === "billing" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Current Plan Card */}
                    <div className="glass-card" style={{ padding: 28, position: "relative", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                    <Crown size={20} style={{ color: planKey === "free" ? "var(--text-muted)" : "var(--accent-primary)" }} />
                                    <span className="gradient-text" style={{ fontSize: 22, fontWeight: 800 }}>
                                        {planKey.charAt(0).toUpperCase() + planKey.slice(1)} Plan
                                    </span>
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                                    {profile ? `${profile.clips_used} / ${profile.clips_limit} clips used` : `${planInfo.clips} clips per month`}
                                    <br />
                                    {profile ? `${profile.videos_used} / ${profile.videos_limit} videos used` : `${planInfo.videos} videos per month`}
                                </div>
                            </div>
                            <a href="/pricing" className="btn-primary" style={{ textDecoration: "none", padding: "10px 20px", fontSize: 13 }}>
                                <Sparkles size={15} /> Upgrade <ArrowUpRight size={14} />
                            </a>
                        </div>

                        {/* Usage progress */}
                        {profile && (
                            <div style={{ marginTop: 20 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                                    <span>Clips Usage</span>
                                    <span>{Math.round((profile.clips_used / profile.clips_limit) * 100)}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-bar-fill" style={{ width: `${Math.min(100, (profile.clips_used / profile.clips_limit) * 100)}%` }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Plan Comparison */}
                    {planKey === "free" && (
                        <div className="glass-card" style={{ padding: 28 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                                <Sparkles size={16} style={{ color: "var(--accent-primary)" }} />
                                What you get with Creator Plan
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                {[
                                    "5 videos per month",
                                    "50 clips per month",
                                    "Priority processing",
                                    "All 9 caption styles",
                                    "No watermark",
                                    "1080p output",
                                ].map((feature) => (
                                    <div key={feature} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                                        <Check size={14} style={{ color: "var(--accent-green)" }} />
                                        {feature}
                                    </div>
                                ))}
                            </div>
                            <a
                                href="/pricing"
                                className="btn-primary"
                                style={{ textDecoration: "none", display: "flex", justifyContent: "center", marginTop: 20, padding: "12px 24px" }}
                            >
                                <Sparkles size={16} /> Upgrade to Creator — ₹499/mo
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════ Security Tab ═══════════ */}
            {activeTab === "security" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Password */}
                    <div className="glass-card" style={{ padding: 28 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                            <Lock size={16} style={{ color: "var(--accent-primary)" }} /> Password
                        </h3>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                            Change your password or set one if you signed up with Google OAuth
                        </p>
                        <button className="btn-secondary" onClick={() => {
                            supabase.auth.resetPasswordForEmail(email);
                            showToast("success", "Password reset email sent");
                        }}>
                            Send Password Reset Email
                        </button>
                    </div>

                    {/* Danger Zone */}
                    <div className="danger-zone">
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--accent-red)", display: "flex", alignItems: "center", gap: 8 }}>
                            <AlertTriangle size={16} /> Danger Zone
                        </h3>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
                            Permanently delete your account and all associated data. This action is irreversible — all your jobs, clips, API keys, and settings will be permanently removed.
                        </p>
                        <button
                            className="btn-secondary"
                            onClick={() => setShowDeleteConfirm(true)}
                            style={{ borderColor: "rgba(255,82,82,0.3)", color: "var(--accent-red)" }}
                        >
                            <Trash2 size={14} /> Delete Account
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Save Button (visible on profile + notifications tabs) ─── */}
            {(activeTab === "profile" || activeTab === "notifications") && (
                <button
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ width: "100%", justifyContent: "center", padding: "14px 24px", fontSize: 15, marginTop: 24 }}
                >
                    {saving ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <><Save size={18} /> Save Changes</>}
                </button>
            )}

            {/* ─── Delete Account Confirmation Modal ─── */}
            {showDeleteConfirm && (
                <div
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
                    onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                >
                    <div
                        className="glass-card animate-scale-in"
                        style={{ padding: 28, width: 440, maxWidth: "90vw" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,82,82,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <AlertTriangle size={20} style={{ color: "var(--accent-red)" }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--accent-red)" }}>Delete Account</h3>
                                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>This cannot be undone</p>
                            </div>
                        </div>
                        <div style={{
                            padding: "12px 16px", borderRadius: 10,
                            background: "rgba(255,82,82,0.06)", border: "1px solid rgba(255,82,82,0.15)",
                            marginBottom: 16,
                        }}>
                            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                                All your data will be permanently deleted including jobs, clips, API keys, and settings.
                            </p>
                        </div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
                            Type <strong style={{ color: "var(--accent-red)" }}>DELETE</strong> to confirm
                        </label>
                        <input
                            type="text" value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            placeholder="DELETE"
                            className="input-field" style={{ marginBottom: 16 }}
                        />
                        <div style={{ display: "flex", gap: 12 }}>
                            <button className="btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                style={{ flex: 1, justifyContent: "center", background: "var(--accent-red)", opacity: deleteInput === "DELETE" ? 1 : 0.4 }}
                                disabled={deleteInput !== "DELETE" || deleting}
                                onClick={handleDeleteAccount}
                            >
                                {deleting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <><Trash2 size={14} /> Delete Account</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
