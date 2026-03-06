/**
 * ClipMint API Gateway — Cloudflare Worker
 *
 * Routes:
 *   POST /api/v1/jobs         — Submit a new video processing job
 *   GET  /api/v1/jobs         — List user's jobs
 *   GET  /api/v1/jobs/:id     — Get job details
 *   GET  /api/v1/jobs/:id/clips — Get clips for a job
 *   GET  /api/v1/health       — Health check
 */

export interface Env {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_KEY: string;
    GITHUB_TOKEN: string;
    GITHUB_REPO: string;
    CORS_ORIGIN: string;
    RATE_LIMIT_PER_MINUTE: string;
    CACHE: KVNamespace;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiUser {
    id: string;
    plan: string;
    videos_used: number;
    videos_limit: number;
}

interface CreateJobBody {
    video_url: string;
    caption_style?: string;
    max_clips?: number;
    source_type?: string;
}

// ─── CORS Headers ────────────────────────────────────────────────────────────

function corsHeaders(origin: string): HeadersInit {
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
    };
}

function jsonResponse(data: unknown, status = 200, env?: Env): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            ...corsHeaders(env?.CORS_ORIGIN || "*"),
        },
    });
}

function errorResponse(message: string, status: number, env?: Env): Response {
    return jsonResponse({ error: message }, status, env);
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

async function authenticateRequest(
    request: Request,
    env: Env
): Promise<ApiUser | null> {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const apiKey = authHeader.slice(7);
    if (!apiKey || apiKey.length < 10) return null;

    // Hash the API key to look up in database
    const keyBuffer = new TextEncoder().encode(apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", keyBuffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    // Check Supabase for the key
    const keyRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/api_keys?key_hash=eq.${hashHex}&is_active=eq.true&select=user_id`,
        {
            headers: {
                apikey: env.SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            },
        }
    );

    const keys = (await keyRes.json()) as Array<{ user_id: string }>;
    if (!keys.length) return null;

    // Get user profile
    const profileRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${keys[0].user_id}&select=id,plan,videos_used,videos_limit`,
        {
            headers: {
                apikey: env.SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            },
        }
    );

    const profiles = (await profileRes.json()) as ApiUser[];
    return profiles[0] || null;
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────

async function checkRateLimit(
    userId: string,
    env: Env
): Promise<boolean> {
    const key = `rate:${userId}:${Math.floor(Date.now() / 60000)}`;
    const current = parseInt((await env.CACHE.get(key)) || "0");
    const limit = parseInt(env.RATE_LIMIT_PER_MINUTE) || 30;

    if (current >= limit) return false;

    await env.CACHE.put(key, String(current + 1), { expirationTtl: 120 });
    return true;
}

// ─── Route Handlers ──────────────────────────────────────────────────────────

async function handleCreateJob(
    request: Request,
    user: ApiUser,
    env: Env
): Promise<Response> {
    // Check quota
    if (user.videos_used >= user.videos_limit) {
        return errorResponse(
            `Video limit reached (${user.videos_used}/${user.videos_limit}). Upgrade your plan.`,
            429,
            env
        );
    }

    const body = (await request.json()) as CreateJobBody;

    if (!body.video_url) {
        return errorResponse("video_url is required", 400, env);
    }

    const VALID_STYLES = [
        "hormozi", "bounce", "fade", "glow", "typewriter",
        "glitch", "neon", "colorful", "minimal",
    ];
    const captionStyle = body.caption_style || "hormozi";
    if (!VALID_STYLES.includes(captionStyle)) {
        return errorResponse(`Invalid caption_style. Must be one of: ${VALID_STYLES.join(", ")}`, 400, env);
    }

    const maxClips = Math.min(Math.max(body.max_clips || 10, 1), 20);

    // Create job in Supabase
    const jobRes = await fetch(`${env.SUPABASE_URL}/rest/v1/jobs`, {
        method: "POST",
        headers: {
            apikey: env.SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
        },
        body: JSON.stringify({
            user_id: user.id,
            video_url: body.video_url,
            caption_style: captionStyle,
            max_clips: maxClips,
            source_type: body.source_type || "url",
            status: "queued",
        }),
    });

    const jobs = (await jobRes.json()) as Array<{ id: string }>;
    if (!jobs.length) {
        return errorResponse("Failed to create job", 500, env);
    }

    const jobId = jobs[0].id;

    // Trigger GitHub Actions workflow
    try {
        await fetch(
            `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/process-video.yml/dispatches`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
                    Accept: "application/vnd.github.v3+json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ref: "main",
                    inputs: {
                        job_id: jobId,
                        video_url: body.video_url,
                        caption_style: captionStyle,
                        max_clips: String(maxClips),
                    },
                }),
            }
        );
    } catch {
        // Update job status to failed if trigger fails
        await fetch(
            `${env.SUPABASE_URL}/rest/v1/jobs?id=eq.${jobId}`,
            {
                method: "PATCH",
                headers: {
                    apikey: env.SUPABASE_SERVICE_KEY,
                    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                    "Content-Type": "application/json",
                    Prefer: "return=minimal",
                },
                body: JSON.stringify({
                    status: "failed",
                    error_message: "Failed to trigger processing pipeline",
                }),
            }
        );
        return errorResponse("Failed to trigger processing pipeline", 500, env);
    }

    // Increment videos_used
    await fetch(
        `${env.SUPABASE_URL}/rest/v1/rpc/increment_videos_used`,
        {
            method: "POST",
            headers: {
                apikey: env.SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ p_user_id: user.id }),
        }
    );

    return jsonResponse(
        {
            id: jobId,
            status: "queued",
            message: "Video processing started. You'll be notified when done.",
        },
        201,
        env
    );
}

async function handleListJobs(
    user: ApiUser,
    url: URL,
    env: Env
): Promise<Response> {
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const status = url.searchParams.get("status");

    let query = `${env.SUPABASE_URL}/rest/v1/jobs?user_id=eq.${user.id}&order=created_at.desc&limit=${limit}&offset=${offset}`;
    query += "&select=id,video_url,caption_style,status,progress,clips_count,created_at,completed_at";

    if (status) {
        query += `&status=eq.${status}`;
    }

    const res = await fetch(query, {
        headers: {
            apikey: env.SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        },
    });

    const jobs = await res.json();
    return jsonResponse({ jobs, limit, offset }, 200, env);
}

async function handleGetJob(
    user: ApiUser,
    jobId: string,
    env: Env
): Promise<Response> {
    const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/jobs?id=eq.${jobId}&user_id=eq.${user.id}`,
        {
            headers: {
                apikey: env.SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            },
        }
    );

    const jobs = (await res.json()) as unknown[];
    if (!jobs.length) {
        return errorResponse("Job not found", 404, env);
    }

    return jsonResponse(jobs[0], 200, env);
}

async function handleGetClips(
    user: ApiUser,
    jobId: string,
    env: Env
): Promise<Response> {
    // Verify job belongs to user
    const jobRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/jobs?id=eq.${jobId}&user_id=eq.${user.id}&select=id`,
        {
            headers: {
                apikey: env.SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            },
        }
    );

    const jobs = (await jobRes.json()) as unknown[];
    if (!jobs.length) {
        return errorResponse("Job not found", 404, env);
    }

    const clipsRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/clips?job_id=eq.${jobId}&order=clip_index.asc`,
        {
            headers: {
                apikey: env.SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            },
        }
    );

    const clips = await clipsRes.json();
    return jsonResponse({ clips }, 200, env);
}

// ─── Main Router ─────────────────────────────────────────────────────────────

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Handle CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders(env.CORS_ORIGIN),
            });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        // Health check (no auth required)
        if (path === "/api/v1/health") {
            return jsonResponse(
                {
                    status: "ok",
                    service: "ClipMint API",
                    version: "1.0.0",
                    timestamp: new Date().toISOString(),
                },
                200,
                env
            );
        }

        // All other routes require auth
        const user = await authenticateRequest(request, env);
        if (!user) {
            return errorResponse(
                "Unauthorized. Provide a valid API key via Authorization: Bearer <key>",
                401,
                env
            );
        }

        // Rate limit check
        const withinLimit = await checkRateLimit(user.id, env);
        if (!withinLimit) {
            return errorResponse(
                "Rate limit exceeded. Please try again in a minute.",
                429,
                env
            );
        }

        // Route matching
        const jobIdMatch = path.match(/^\/api\/v1\/jobs\/([a-f0-9-]+)$/);
        const clipsMatch = path.match(/^\/api\/v1\/jobs\/([a-f0-9-]+)\/clips$/);

        // POST /api/v1/jobs — Create job
        if (path === "/api/v1/jobs" && request.method === "POST") {
            return handleCreateJob(request, user, env);
        }

        // GET /api/v1/jobs — List jobs
        if (path === "/api/v1/jobs" && request.method === "GET") {
            return handleListJobs(user, url, env);
        }

        // GET /api/v1/jobs/:id/clips — Get clips
        if (clipsMatch && request.method === "GET") {
            return handleGetClips(user, clipsMatch[1], env);
        }

        // GET /api/v1/jobs/:id — Get job
        if (jobIdMatch && request.method === "GET") {
            return handleGetJob(user, jobIdMatch[1], env);
        }

        return errorResponse("Not found", 404, env);
    },
};
