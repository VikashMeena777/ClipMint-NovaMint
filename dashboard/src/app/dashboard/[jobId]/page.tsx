"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import type { Job, Clip } from "@/lib/types";
import { JOB_STATUS_LABELS } from "@/lib/types";
import {
    ArrowLeft, Download, ExternalLink, Copy, Share2, Star,
    Clock, Film, Loader2, RefreshCw, AlertTriangle, Image,
    Check, ChevronRight,
} from "lucide-react";

const PIPELINE_STEPS = [
    { key: "downloading", label: "Download" },
    { key: "transcribing", label: "Transcribe" },
    { key: "analyzing", label: "Analyze" },
    { key: "clipping", label: "Clip" },
    { key: "captioning", label: "Caption" },
    { key: "uploading", label: "Upload" },
];

function getStepState(stepKey: string, jobStatus: string) {
    const stepOrder = PIPELINE_STEPS.map((s) => s.key);
    const currentIdx = stepOrder.indexOf(jobStatus);
    const stepIdx = stepOrder.indexOf(stepKey);
    if (jobStatus === "done") return "completed";
    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "active";
    return "pending";
}

export default function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
    const { jobId } = use(params);
    const supabase = createClient();
    const [job, setJob] = useState<Job | null>(null);
    const [clips, setClips] = useState<Clip[]>([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);
    const [downloadingAll, setDownloadingAll] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const { data: jobData } = await supabase.from("jobs").select("*").eq("id", jobId).single();
            if (jobData) setJob(jobData as Job);

            const { data: clipsData } = await supabase.from("clips").select("*").eq("job_id", jobId).order("clip_index", { ascending: true });
            if (clipsData) setClips(clipsData as Clip[]);
            setLoading(false);
        }
        load();

        // Real-time updates for this job
        const channel = supabase
            .channel(`job-${jobId}`)
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs", filter: `id=eq.${jobId}` }, (payload) => {
                setJob(payload.new as Job);
            })
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "clips", filter: `job_id=eq.${jobId}` }, (payload) => {
                setClips((prev) => [...prev, payload.new as Clip]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [jobId]);

    const handleRetry = async () => {
        if (!job) return;
        setRetrying(true);
        await supabase.from("jobs").update({ status: "queued", progress: 0, error_message: null }).eq("id", job.id);
        setJob((j) => j ? { ...j, status: "queued", progress: 0, error_message: null } : j);
        try {
            const res = await fetch("/api/trigger-pipeline", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ job_id: job.id, video_url: job.video_url, caption_style: job.caption_style, max_clips: job.max_clips }),
            });
            if (!res.ok) setJob((j) => j ? { ...j, status: "failed", error_message: "Could not start processing. Please try again." } : j);
        } catch {
            setJob((j) => j ? { ...j, status: "failed", error_message: "Could not start processing. Please check your connection." } : j);
        }
        setRetrying(false);
    };

    const toDirectDriveUrl = (url: string): string => {
        const match = url.match(/\/file\/d\/([^/]+)/);
        if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
        const idMatch = url.match(/[?&]id=([^&]+)/);
        if (idMatch) return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
        return url;
    };

    const triggerDownload = (url: string) => {
        const downloadUrl = toDirectDriveUrl(url);
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = downloadUrl;
        document.body.appendChild(iframe);
        setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 10000);
    };

    const handleDownloadAll = () => {
        if (clips.length === 0) return;
        setDownloadingAll(true);
        const validClips = clips.filter((c) => c.drive_url);
        validClips.forEach((clip, i) => {
            setTimeout(() => {
                triggerDownload(clip.drive_url!);
                if (i === validClips.length - 1) setDownloadingAll(false);
            }, i * 1000);
        });
    };

    const handleCopy = (clipId: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(clipId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) {
        return (
            <div>
                <div className="skeleton h-7 w-44 mb-6 rounded-lg" />
                <div className="skeleton h-20 mb-5 rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    if (!job) {
        return (
            <div>
                <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white no-underline text-sm mb-5 transition-colors">
                    <ArrowLeft size={16} /> Back to Jobs
                </Link>
                <div className="glass-card p-10 text-center max-w-md mx-auto">
                    <Film size={40} className="text-[#64748b] mb-4 mx-auto" />
                    <h2 className="text-lg font-bold text-slate-200 mb-2">Job Not Found</h2>
                    <p className="text-sm text-[#64748b]">This job doesn&apos;t exist or you don&apos;t have access.</p>
                </div>
            </div>
        );
    }

    const statusInfo = JOB_STATUS_LABELS[job.status];
    const isProcessing = !["done", "failed", "queued", "cancelled"].includes(job.status);

    return (
        <div>
            {/* ─── Header ─── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[#64748b] hover:text-slate-300 no-underline text-xs mb-3 transition-colors">
                        <ArrowLeft size={14} /> Back to Jobs
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100 mb-2">
                        Job {jobId.slice(0, 8)}
                    </h1>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-[#64748b]">
                        <span 
                            className="plan-badge font-bold px-2.5 py-1 rounded-md border text-[10px] tracking-wider uppercase flex items-center gap-1"
                            style={{ 
                                backgroundColor: `${statusInfo.color}15`, 
                                color: statusInfo.color, 
                                borderColor: `${statusInfo.color}30` 
                            }}
                        >
                            {statusInfo.emoji} {statusInfo.label}
                        </span>
                        <span className="flex items-center gap-1"><Clock size={13} /> {new Date(job.created_at).toLocaleString()}</span>
                        <span>Style: {job.caption_style}</span>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        className="btn-secondary w-full sm:w-auto px-4 py-2.5 text-xs font-semibold" 
                        onClick={handleDownloadAll} 
                        disabled={downloadingAll || clips.length === 0}
                    >
                        {downloadingAll ? <><Loader2 size={14} className="animate-spin" /> Downloading...</> : <><Download size={14} /> Download All ({clips.length})</>}
                    </button>
                </div>
            </div>

            {/* ─── Job Overview Card ─── */}
            <div className="glass-card p-5 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <div className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider mb-1">SOURCE</div>
                        <div className="text-xs text-slate-300 font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{job.video_url || job.video_filename || "—"}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider mb-1">CAPTION STYLE</div>
                        <div className="text-xs text-slate-300 font-semibold">{job.caption_style}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider mb-1">MAX CLIPS</div>
                        <div className="text-xs text-slate-300 font-semibold">{job.max_clips}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider mb-1">CLIPS GENERATED</div>
                        <div className="text-xs text-[#10b981] font-bold">{clips.length}</div>
                    </div>
                </div>
            </div>

            {/* ─── Step Progress Indicator ─── */}
            {(isProcessing || job.status === "done") && (
                <div className="glass-card p-6 mb-6">
                    <div className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-4">PROCESSING PIPELINE</div>
                    <div className="step-progress">
                        {PIPELINE_STEPS.map((step, i) => {
                            const state = job.status === "done" ? "completed" : getStepState(step.key, job.status);
                            return (
                                <div key={step.key} className="step-item">
                                    {i < PIPELINE_STEPS.length - 1 && <div className={`step-connector ${state === "completed" ? "completed" : state === "active" ? "active" : ""}`} />}
                                    <div className={`step-circle ${state}`}>
                                        {state === "completed" ? <Check size={14} /> : i + 1}
                                    </div>
                                    <span className={`text-[10px] font-semibold mt-1.5 ${state === "active" ? "text-[#8b5cf6]" : state === "completed" ? "text-[#10b981]" : "text-[#64748b]"}`}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─── Error/Cancelled states ─── */}
            {job.status === "failed" && (
                <div className="glass-card p-5 mb-6 border-red-500/20 bg-red-500/5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <div className="text-sm font-bold text-[#ef4444] mb-1.5">Processing failed</div>
                            <div className="text-xs text-slate-300 bg-black/30 border border-white/5 p-3 rounded-lg mb-3.5 leading-relaxed font-mono">
                                {job.error_message || "Something went wrong. Please try again or contact support."}
                            </div>
                            <button 
                                className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5" 
                                onClick={handleRetry} 
                                disabled={retrying}
                            >
                                {retrying ? <><Loader2 size={14} className="animate-spin" /> Retrying...</> : <><RefreshCw size={14} /> Retry</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {job.status === "cancelled" && (
                <div className="glass-card p-5 mb-6 border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <div className="text-sm font-bold text-[#f59e0b] mb-1.5">Processing cancelled</div>
                            <div className="text-xs text-slate-300 mb-3.5">This job was cancelled. You can retry to reprocess your video.</div>
                            <button 
                                className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5" 
                                onClick={handleRetry} 
                                disabled={retrying}
                            >
                                {retrying ? <><Loader2 size={14} className="animate-spin" /> Retrying...</> : <><RefreshCw size={14} /> Retry</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Clips Gallery ─── */}
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                <Film size={18} className="text-[#8b5cf6]" />
                {clips.length} Clip{clips.length !== 1 ? "s" : ""} Generated
            </h2>

            {clips.length === 0 ? (
                <div className="glass-card p-12 text-center max-w-md mx-auto">
                    <Film size={36} className="text-[#64748b] opacity-40 mb-3 mx-auto" />
                    <p className="text-sm text-[#64748b]">
                        {job.status === "done" ? "No clips were generated for this job." : "Clips will appear here once processing is complete."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clips.map((clip, i) => (
                        <div 
                            key={clip.id} 
                            className="glass-card animate-fade-in-up !p-0 overflow-hidden hover:border-[#8b5cf6]/35 shadow-lg flex flex-col" 
                            style={{ animationDelay: `${i * 0.06}s` }}
                        >
                            {/* Preview area */}
                            <div className="h-44 bg-gradient-to-br from-[#0d0c12] to-[#12101b] flex items-center justify-center relative overflow-hidden border-b border-white/5">
                                {clip.thumbnail_url ? (
                                    <img 
                                        src={clip.thumbnail_url} 
                                        alt={clip.title || `Clip ${clip.clip_index + 1}`} 
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                                    />
                                ) : (
                                    <Film size={36} className="text-[#64748b]/20" />
                                )}
                                {clip.viral_score != null && (
                                    <div 
                                        className={`absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-md border ${
                                            clip.viral_score >= 80 
                                                ? "bg-emerald-500/20 text-[#10b981] border-emerald-500/20" 
                                                : "bg-amber-500/20 text-[#f59e0b] border-amber-500/20"
                                        }`}
                                    >
                                        <Star size={13} /> {clip.viral_score}
                                    </div>
                                )}
                                {clip.duration_seconds != null && (
                                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 text-[10px] font-bold text-slate-200 backdrop-blur-sm">
                                        {Math.round(clip.duration_seconds)}s
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-100 mb-1 leading-snug">
                                        {clip.title || `Clip ${clip.clip_index + 1}`}
                                    </h3>
                                    {clip.hook_caption && (
                                        <p className="text-xs text-[#64748b] mb-3 leading-relaxed line-clamp-2 italic">
                                            &ldquo;{clip.hook_caption}&rdquo;
                                        </p>
                                    )}
                                    {clip.hashtags && clip.hashtags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-3.5">
                                            {clip.hashtags.slice(0, 4).map((tag) => (
                                                <span key={tag} className="text-[9px] px-2 py-0.5 rounded bg-[#8b5cf6]/10 text-[#c084fc] font-semibold border border-[#8b5cf6]/10">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1.5 mt-auto">
                                    <button 
                                        className="btn-primary flex-1 justify-center py-2 px-2.5 text-xs font-semibold shadow-md" 
                                        onClick={() => clip.drive_url && triggerDownload(clip.drive_url)}
                                    >
                                        <Download size={13} /> Video
                                    </button>
                                    {clip.thumbnail_url && (
                                        <button 
                                            className="btn-secondary py-2 px-2.5 text-xs font-semibold" 
                                            onClick={() => triggerDownload(clip.thumbnail_url!)} 
                                            title="Download Thumbnail"
                                        >
                                            <Image size={13} />
                                        </button>
                                    )}
                                    <button
                                        className="btn-secondary py-2 px-2.5 text-xs font-semibold"
                                        onClick={() => handleCopy(clip.id, `${clip.title}\n\n${clip.hook_caption}\n\n${clip.hashtags?.join(" ")}`)}
                                        title={copiedId === clip.id ? "Copied!" : "Copy caption & hashtags"}
                                    >
                                        {copiedId === clip.id ? <Check size={13} className="text-[#10b981]" /> : <Copy size={13} />}
                                    </button>
                                    <a 
                                        href={clip.drive_url || "#"} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="btn-secondary py-2 px-2.5 text-xs font-semibold" 
                                        title="Open in Drive"
                                    >
                                        <ExternalLink size={13} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
