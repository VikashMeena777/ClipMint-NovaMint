"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
    Upload,
    Link2,
    HardDrive,
    ArrowRight,
    Sparkles,
    Info,
    Loader2,
    CheckCircle2,
    X,
} from "lucide-react";
import { CAPTION_STYLES, type CaptionStyle } from "@/lib/types";

export default function NewVideoPage() {
    const router = useRouter();
    const supabase = createClient();
    const [videoUrl, setVideoUrl] = useState("");
    const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("hormozi");
    const [maxClips, setMaxClips] = useState(10);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sourceType, setSourceType] = useState<"url" | "upload" | "drive">("url");

    // File upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith("video/")) {
            setError("Please select a video file (MP4, MOV, WebM).");
            return;
        }
        if (file.size > 500 * 1024 * 1024) {
            setError("File is too large. Max size is 500MB.");
            return;
        }
        setError(null);
        setSelectedFile(file);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const clearFile = () => {
        setSelectedFile(null);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const uploadFile = async (userId: string): Promise<string | null> => {
        if (!selectedFile) return null;
        setIsUploading(true);
        setUploadProgress(10);

        const ext = selectedFile.name.split(".").pop() || "mp4";
        const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        setUploadProgress(30);

        const { error: uploadError } = await supabase.storage
            .from("videos")
            .upload(filePath, selectedFile, {
                cacheControl: "3600",
                upsert: false,
            });

        if (uploadError) {
            setError(`Upload failed: ${uploadError.message}`);
            setIsUploading(false);
            return null;
        }

        setUploadProgress(90);

        const { data: urlData } = supabase.storage
            .from("videos")
            .getPublicUrl(filePath);

        setUploadProgress(100);
        setIsUploading(false);
        return urlData.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate inputs based on source type
        if (sourceType === "upload" && !selectedFile) {
            setError("Please select a video file to upload.");
            return;
        }
        if (sourceType !== "upload" && !videoUrl.trim()) return;

        setIsSubmitting(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setError("You must be logged in to submit a video.");
            setIsSubmitting(false);
            return;
        }

        // Check plan limits before proceeding
        const { data: profile } = await supabase
            .from("profiles")
            .select("clips_used, clips_limit, videos_used, videos_limit")
            .eq("id", user.id)
            .single();

        if (profile) {
            if (profile.videos_used >= profile.videos_limit) {
                setError(`You've reached your plan limit of ${profile.videos_limit} video(s). Please upgrade to process more videos.`);
                setIsSubmitting(false);
                return;
            }
            if (profile.clips_used >= profile.clips_limit) {
                setError(`You've reached your plan limit of ${profile.clips_limit} clips. Please upgrade to generate more clips.`);
                setIsSubmitting(false);
                return;
            }
        }

        // Handle file upload if needed
        let finalVideoUrl = videoUrl.trim();
        if (sourceType === "upload") {
            const uploadedUrl = await uploadFile(user.id);
            if (!uploadedUrl) {
                setIsSubmitting(false);
                return;
            }
            finalVideoUrl = uploadedUrl;
        }

        const { data, error: insertError } = await supabase
            .from("jobs")
            .insert({
                user_id: user.id,
                video_url: finalVideoUrl,
                video_filename: sourceType === "upload" ? selectedFile?.name : null,
                source_type: sourceType,
                caption_style: captionStyle,
                max_clips: maxClips,
                status: "queued",
                progress: 0,
            })
            .select("id")
            .single();

        if (insertError) {
            setError(insertError.message);
            setIsSubmitting(false);
            return;
        }

        if (data) {
            // Increment videos_used
            if (profile) {
                await supabase
                    .from("profiles")
                    .update({ videos_used: profile.videos_used + 1 })
                    .eq("id", user.id);
            }

            // Trigger the processing pipeline
            try {
                await fetch("/api/trigger-pipeline", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        job_id: data.id,
                        video_url: finalVideoUrl,
                        caption_style: captionStyle,
                        max_clips: maxClips,
                    }),
                });
            } catch (triggerErr) {
                console.warn("Processing trigger failed:", triggerErr);
            }
            router.push(`/dashboard/${data.id}`);
        }
    };

    return (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                New Video
            </h1>
            <p
                style={{
                    color: "var(--text-secondary)",
                    fontSize: 15,
                    marginBottom: 40,
                }}
            >
                Upload a video and let AI create viral clips with animated captions
            </p>

            <form onSubmit={handleSubmit}>
                {/* ─── Source Type Tabs ─── */}
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 24,
                    }}
                >
                    {[
                        { value: "url" as const, label: "Paste URL", icon: <Link2 size={16} /> },
                        { value: "upload" as const, label: "Upload File", icon: <Upload size={16} /> },
                        { value: "drive" as const, label: "Google Drive", icon: <HardDrive size={16} /> },
                    ].map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setSourceType(tab.value)}
                            style={{
                                flex: 1,
                                padding: "12px 16px",
                                borderRadius: 10,
                                border: `1px solid ${sourceType === tab.value ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                                background: sourceType === tab.value ? "rgba(108,92,231,0.15)" : "var(--bg-secondary)",
                                color: sourceType === tab.value ? "var(--text-primary)" : "var(--text-secondary)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                fontSize: 14,
                                fontWeight: sourceType === tab.value ? 600 : 400,
                                transition: "all 0.2s ease",
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ─── URL Input ─── */}
                {sourceType === "url" && (
                    <div style={{ marginBottom: 28 }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 8,
                                color: "var(--text-secondary)",
                            }}
                        >
                            Video URL
                        </label>
                        <input
                            type="url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://youtube.com/watch?v=... or Instagram/Facebook URL"
                            className="input-field"
                            required
                        />
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginTop: 8,
                                fontSize: 13,
                                color: "var(--text-muted)",
                            }}
                        >
                            <Info size={14} />
                            Supports YouTube, Instagram, Facebook, and direct MP4 links
                        </div>
                    </div>
                )}

                {/* ─── File Upload ─── */}
                {sourceType === "upload" && (
                    <div style={{ marginBottom: 28 }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 8,
                                color: "var(--text-secondary)",
                            }}
                        >
                            Upload Video File
                        </label>

                        {selectedFile ? (
                            /* ─── Selected file preview ─── */
                            <div
                                style={{
                                    border: "2px solid var(--accent-primary)",
                                    borderRadius: 16,
                                    padding: "24px",
                                    background: "rgba(108,92,231,0.05)",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <CheckCircle2 size={24} style={{ color: "var(--accent-primary)" }} />
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                                                {selectedFile.name}
                                            </div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                                {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearFile}
                                        style={{
                                            background: "rgba(239,68,68,0.1)",
                                            border: "1px solid rgba(239,68,68,0.3)",
                                            borderRadius: 8,
                                            padding: "6px",
                                            cursor: "pointer",
                                            color: "#EF4444",
                                            display: "flex",
                                        }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                {isUploading && (
                                    <div style={{ marginTop: 16 }}>
                                        <div className="progress-bar" style={{ height: 6 }}>
                                            <div
                                                className="progress-bar-fill"
                                                style={{ width: `${uploadProgress}%`, transition: "width 0.3s ease" }}
                                            />
                                        </div>
                                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, textAlign: "center" }}>
                                            Uploading... {uploadProgress}%
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* ─── Drop zone ─── */
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                style={{
                                    border: `2px dashed ${isDragging ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                                    borderRadius: 16,
                                    padding: "48px 24px",
                                    textAlign: "center",
                                    cursor: "pointer",
                                    transition: "all 0.3s ease",
                                    background: isDragging ? "rgba(108,92,231,0.08)" : "var(--bg-secondary)",
                                }}
                            >
                                <Upload
                                    size={36}
                                    style={{
                                        color: isDragging ? "var(--accent-primary)" : "var(--text-muted)",
                                        marginBottom: 12,
                                    }}
                                />
                                <p style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
                                    Drag & drop your video here, or click to browse
                                </p>
                                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                                    MP4, MOV, WebM — max 500MB
                                </p>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            onChange={handleFileInputChange}
                            style={{ display: "none" }}
                        />
                    </div>
                )}

                {/* ─── Drive ─── */}
                {sourceType === "drive" && (
                    <div style={{ marginBottom: 28 }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 8,
                                color: "var(--text-secondary)",
                            }}
                        >
                            Google Drive Link
                        </label>
                        <input
                            type="url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://drive.google.com/file/d/..."
                            className="input-field"
                            required
                        />
                    </div>
                )}

                {/* ─── Caption Style Picker ─── */}
                <div style={{ marginBottom: 28 }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: 14,
                            fontWeight: 600,
                            marginBottom: 12,
                            color: "var(--text-secondary)",
                        }}
                    >
                        Caption Style
                    </label>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 10,
                        }}
                    >
                        {CAPTION_STYLES.map((style) => (
                            <button
                                key={style.value}
                                type="button"
                                onClick={() => setCaptionStyle(style.value)}
                                style={{
                                    padding: "14px 16px",
                                    borderRadius: 12,
                                    border: `1px solid ${captionStyle === style.value ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                                    background: captionStyle === style.value
                                        ? "rgba(108,92,231,0.15)"
                                        : "var(--bg-secondary)",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "all 0.2s ease",
                                    position: "relative",
                                }}
                            >
                                {captionStyle === style.value && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 8,
                                            right: 8,
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            background: "var(--accent-primary)",
                                        }}
                                    />
                                )}
                                <div
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: captionStyle === style.value
                                            ? "var(--text-primary)"
                                            : "var(--text-secondary)",
                                        marginBottom: 2,
                                    }}
                                >
                                    {style.label}
                                </div>
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: "var(--text-muted)",
                                    }}
                                >
                                    {style.description}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── Max Clips ─── */}
                <div style={{ marginBottom: 36 }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: 14,
                            fontWeight: 600,
                            marginBottom: 8,
                            color: "var(--text-secondary)",
                        }}
                    >
                        Max Clips: {maxClips}
                    </label>
                    <input
                        type="range"
                        min={1}
                        max={20}
                        value={maxClips}
                        onChange={(e) => setMaxClips(Number(e.target.value))}
                        style={{
                            width: "100%",
                            accentColor: "var(--accent-primary)",
                        }}
                    />
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            color: "var(--text-muted)",
                            marginTop: 4,
                        }}
                    >
                        <span>1 clip</span>
                        <span>20 clips</span>
                    </div>
                </div>

                {/* ─── Error ─── */}
                {error && (
                    <div
                        style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            color: "#EF4444",
                            fontSize: 13,
                            marginBottom: 16,
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* ─── Submit ─── */}
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSubmitting || isUploading || (sourceType !== "upload" && !videoUrl.trim()) || (sourceType === "upload" && !selectedFile)}
                    style={{
                        width: "100%",
                        justifyContent: "center",
                        padding: "16px 24px",
                        fontSize: 16,
                    }}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                            {isUploading ? "Uploading..." : "Submitting..."}
                        </>
                    ) : (
                        <>
                            <Sparkles size={18} /> Start Processing{" "}
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>

                {/* ─── Info box ─── */}
                <div
                    className="glass-card"
                    style={{
                        padding: 20,
                        marginTop: 24,
                        display: "flex",
                        gap: 12,
                    }}
                >
                    <Info
                        size={20}
                        style={{
                            color: "var(--accent-primary)",
                            flexShrink: 0,
                            marginTop: 2,
                        }}
                    />
                    <div>
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                marginBottom: 4,
                            }}
                        >
                            How long does it take?
                        </div>
                        <p
                            style={{
                                color: "var(--text-secondary)",
                                fontSize: 13,
                                lineHeight: 1.6,
                            }}
                        >
                            Processing typically takes 5-15 minutes depending on
                            video length. You&apos;ll receive a notification when
                            your clips are ready. The AI downloads the video,
                            transcribes the audio, detects viral moments, generates
                            clips, and renders professional captions.
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}
