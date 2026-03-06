import React, { useMemo } from "react";
import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    Sequence,
    interpolate,
    spring,
} from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { parseSrtContent, type SrtEntry } from "./utils/parseCaptions";

// ---------------------------------------------------------------------------
// Schema — defines the props that can be set from Remotion Studio inspector
// ---------------------------------------------------------------------------
export const captionedClipSchema = z.object({
    /** Raw SRT content string (will be parsed into captions) */
    srtContent: z.string(),
    /** Caption style preset name */
    captionStyle: z.enum([
        "hormozi",
        "bounce",
        "fade",
        "glow",
        "typewriter",
        "glitch",
        "neon",
        "colorful",
        "minimal",
    ]),
    /** Background color of the video area */
    backgroundColor: zColor(),
    /** Accent color for highlights */
    accentColor: zColor(),
    /** Base font size in pixels */
    fontSize: z.number().min(24).max(120),
});

export type CaptionedClipProps = z.infer<typeof captionedClipSchema>;

// ---------------------------------------------------------------------------
// Main Composition
// ---------------------------------------------------------------------------
export const CaptionedClip: React.FC<CaptionedClipProps> = ({
    srtContent,
    captionStyle,
    backgroundColor,
    accentColor,
    fontSize,
}) => {
    const { fps, width, height } = useVideoConfig();

    // Parse the SRT content into structured entries
    const entries = useMemo(() => parseSrtContent(srtContent), [srtContent]);

    return (
        <AbsoluteFill
            style={{
                backgroundColor,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            {/* Gradient background effect */}
            <AbsoluteFill
                style={{
                    background: `radial-gradient(ellipse at center, ${backgroundColor}00 0%, ${backgroundColor} 70%)`,
                }}
            />

            {/* ClipMint branding watermark */}
            <div
                style={{
                    position: "absolute",
                    top: 40,
                    right: 40,
                    color: "rgba(255,255,255,0.15)",
                    fontSize: 24,
                    fontFamily: "Inter, Arial, sans-serif",
                    fontWeight: 700,
                    letterSpacing: 2,
                }}
            >
                CLIPMINT
            </div>

            {/* Caption sequences */}
            {entries.map((entry, index) => {
                const startFrame = Math.round((entry.startMs / 1000) * fps);
                const endFrame = Math.round((entry.endMs / 1000) * fps);
                const durationInFrames = endFrame - startFrame;

                if (durationInFrames <= 0) return null;

                return (
                    <Sequence
                        key={`caption-${index}`}
                        from={startFrame}
                        durationInFrames={durationInFrames}
                    >
                        <CaptionRenderer
                            text={entry.text}
                            style={captionStyle}
                            accentColor={accentColor}
                            fontSize={fontSize}
                            index={index}
                            width={width}
                        />
                    </Sequence>
                );
            })}
        </AbsoluteFill>
    );
};

// ---------------------------------------------------------------------------
// Caption Renderer — routes to the correct style component
// ---------------------------------------------------------------------------
interface CaptionRendererProps {
    text: string;
    style: CaptionedClipProps["captionStyle"];
    accentColor: string;
    fontSize: number;
    index: number;
    width: number;
}

const CaptionRenderer: React.FC<CaptionRendererProps> = (props) => {
    switch (props.style) {
        case "hormozi":
            return <HormoziCaption {...props} />;
        case "bounce":
            return <BounceCaption {...props} />;
        case "fade":
            return <FadeCaption {...props} />;
        case "glow":
            return <GlowCaption {...props} />;
        case "typewriter":
            return <TypewriterCaption {...props} />;
        case "glitch":
            return <GlitchCaption {...props} />;
        case "neon":
            return <NeonCaption {...props} />;
        case "colorful":
            return <ColorfulCaption {...props} />;
        case "minimal":
            return <MinimalCaption {...props} />;
        default:
            return <HormoziCaption {...props} />;
    }
};

// ---------------------------------------------------------------------------
// Shared wrapper for positioning captions in the lower third
// ---------------------------------------------------------------------------
const CaptionWrapper: React.FC<{
    children: React.ReactNode;
    width: number;
}> = ({ children, width }) => (
    <AbsoluteFill
        style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: 200,
            paddingLeft: 60,
            paddingRight: 60,
        }}
    >
        <div style={{ maxWidth: width - 120, textAlign: "center" }}>
            {children}
        </div>
    </AbsoluteFill>
);

// ===========================================================================
// CAPTION STYLE 1: HORMOZI (word-by-word highlight)
// ===========================================================================
const HormoziCaption: React.FC<CaptionRendererProps> = ({
    text,
    accentColor,
    fontSize,
    width,
}) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const words = text.split(" ");
    const totalWords = words.length;

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 12,
                }}
            >
                {words.map((word, i) => {
                    // Each word gets highlighted in sequence
                    const wordStart = (i / totalWords) * durationInFrames;
                    const wordEnd = ((i + 1) / totalWords) * durationInFrames;
                    const isActive = frame >= wordStart && frame < wordEnd;

                    const scale = isActive
                        ? spring({ frame: frame - wordStart, fps, config: { stiffness: 300, damping: 20 } })
                        : 1;

                    return (
                        <span
                            key={i}
                            style={{
                                fontSize,
                                fontFamily: "'Inter', 'Arial Black', sans-serif",
                                fontWeight: 900,
                                color: isActive ? accentColor : "#FFFFFF",
                                textTransform: "uppercase",
                                WebkitTextStroke: isActive ? "0px" : "2px rgba(0,0,0,0.8)",
                                paintOrder: "stroke fill",
                                transform: `scale(${isActive ? 1 + scale * 0.15 : 1})`,
                                display: "inline-block",
                                textShadow: isActive
                                    ? `0 0 30px ${accentColor}66, 0 4px 8px rgba(0,0,0,0.5)`
                                    : "0 4px 8px rgba(0,0,0,0.5)",
                                transition: "color 0.1s",
                            }}
                        >
                            {word}
                        </span>
                    );
                })}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// CAPTION STYLE 2: BOUNCE
// ===========================================================================
const BounceCaption: React.FC<CaptionRendererProps> = ({
    text,
    accentColor,
    fontSize,
    width,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const entrance = spring({
        frame,
        fps,
        config: { stiffness: 200, damping: 12 },
    });

    const translateY = interpolate(entrance, [0, 1], [80, 0]);
    const scale = interpolate(entrance, [0, 1], [0.5, 1]);

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    fontSize,
                    fontFamily: "'Inter', 'Arial Black', sans-serif",
                    fontWeight: 900,
                    color: "#FFFFFF",
                    textTransform: "uppercase",
                    transform: `translateY(${translateY}px) scale(${scale})`,
                    textShadow: `0 0 20px ${accentColor}88, 0 6px 12px rgba(0,0,0,0.6)`,
                    WebkitTextStroke: "2px rgba(0,0,0,0.6)",
                    paintOrder: "stroke fill",
                }}
            >
                {text}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// CAPTION STYLE 3: FADE
// ===========================================================================
const FadeCaption: React.FC<CaptionRendererProps> = ({
    text,
    fontSize,
    width,
}) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();

    const opacity = interpolate(
        frame,
        [0, 8, durationInFrames - 8, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateRight: "clamp" }
    );

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    fontSize: fontSize * 0.9,
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    opacity,
                    textShadow: "0 4px 12px rgba(0,0,0,0.6)",
                }}
            >
                {text}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// CAPTION STYLE 4: GLOW
// ===========================================================================
const GlowCaption: React.FC<CaptionRendererProps> = ({
    text,
    accentColor,
    fontSize,
    width,
}) => {
    const frame = useCurrentFrame();
    const pulse = Math.sin(frame * 0.15) * 0.3 + 0.7;

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    fontSize,
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 800,
                    color: accentColor,
                    textShadow: `0 0 ${20 * pulse}px ${accentColor}, 0 0 ${40 * pulse}px ${accentColor}88, 0 0 ${60 * pulse}px ${accentColor}44`,
                    textTransform: "uppercase",
                }}
            >
                {text}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// CAPTION STYLE 5: TYPEWRITER
// ===========================================================================
const TypewriterCaption: React.FC<CaptionRendererProps> = ({
    text,
    fontSize,
    width,
}) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();

    const charsToShow = Math.floor(
        interpolate(frame, [0, durationInFrames * 0.6], [0, text.length], {
            extrapolateRight: "clamp",
        })
    );

    const visibleText = text.slice(0, charsToShow);
    const showCursor = frame % 16 < 10;

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    fontSize: fontSize * 0.85,
                    fontFamily: "'Courier New', 'Fira Code', monospace",
                    fontWeight: 700,
                    color: "#00FF88",
                    textShadow: "0 0 10px rgba(0,255,136,0.4), 0 4px 8px rgba(0,0,0,0.5)",
                    textAlign: "left",
                    whiteSpace: "pre-wrap",
                }}
            >
                {visibleText}
                {showCursor && (
                    <span style={{ color: "#00FF88", opacity: 0.8 }}>▌</span>
                )}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// CAPTION STYLE 6: GLITCH
// ===========================================================================
const GlitchCaption: React.FC<CaptionRendererProps> = ({
    text,
    accentColor,
    fontSize,
    width,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const entrance = spring({ frame, fps, config: { stiffness: 400, damping: 15 } });
    const glitchOffset = frame % 8 < 2 ? (Math.random() - 0.5) * 6 : 0;

    return (
        <CaptionWrapper width={width}>
            <div style={{ position: "relative" }}>
                {/* Glitch layers */}
                <div
                    style={{
                        position: "absolute",
                        fontSize,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 900,
                        color: "#FF0040",
                        textTransform: "uppercase",
                        transform: `translate(${glitchOffset}px, ${-glitchOffset}px)`,
                        opacity: frame % 8 < 2 ? 0.7 : 0,
                        clipPath: "inset(10% 0 40% 0)",
                    }}
                >
                    {text}
                </div>
                <div
                    style={{
                        position: "absolute",
                        fontSize,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 900,
                        color: "#00FFFF",
                        textTransform: "uppercase",
                        transform: `translate(${-glitchOffset}px, ${glitchOffset}px)`,
                        opacity: frame % 8 < 2 ? 0.7 : 0,
                        clipPath: "inset(50% 0 10% 0)",
                    }}
                >
                    {text}
                </div>
                {/* Main text */}
                <div
                    style={{
                        fontSize,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 900,
                        color: "#FFFFFF",
                        textTransform: "uppercase",
                        transform: `scale(${entrance})`,
                        textShadow: "0 4px 8px rgba(0,0,0,0.5)",
                    }}
                >
                    {text}
                </div>
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// CAPTION STYLE 7: NEON
// ===========================================================================
const NeonCaption: React.FC<CaptionRendererProps> = ({
    text,
    accentColor,
    fontSize,
    width,
}) => {
    const frame = useCurrentFrame();
    const flicker = frame < 6 ? (frame % 3 === 0 ? 0.3 : 1) : 1;

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    fontSize,
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 300,
                    color: accentColor,
                    opacity: flicker,
                    textShadow: `
            0 0 7px ${accentColor},
            0 0 10px ${accentColor},
            0 0 21px ${accentColor},
            0 0 42px ${accentColor}88,
            0 0 82px ${accentColor}44,
            0 0 92px ${accentColor}22
          `,
                    textTransform: "uppercase",
                    letterSpacing: 4,
                }}
            >
                {text}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// CAPTION STYLE 8: COLORFUL (rainbow word-by-word)
// ===========================================================================
const RAINBOW_COLORS = [
    "#FF6B6B", "#FFA07A", "#FFD93D", "#6BCB77",
    "#4D96FF", "#9B59B6", "#FF6B9D", "#00D2FF",
];

const ColorfulCaption: React.FC<CaptionRendererProps> = ({
    text,
    fontSize,
    width,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const words = text.split(" ");

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 10,
                }}
            >
                {words.map((word, i) => {
                    const delay = i * 3;
                    const entrance = spring({
                        frame: Math.max(0, frame - delay),
                        fps,
                        config: { stiffness: 250, damping: 18 },
                    });

                    return (
                        <span
                            key={i}
                            style={{
                                fontSize,
                                fontFamily: "'Inter', sans-serif",
                                fontWeight: 900,
                                color: RAINBOW_COLORS[i % RAINBOW_COLORS.length],
                                transform: `scale(${entrance}) rotate(${(1 - entrance) * -10}deg)`,
                                display: "inline-block",
                                textShadow: "0 4px 8px rgba(0,0,0,0.4)",
                                WebkitTextStroke: "1px rgba(0,0,0,0.3)",
                                paintOrder: "stroke fill",
                            }}
                        >
                            {word}
                        </span>
                    );
                })}
            </div>
        </CaptionWrapper>
    );
};

// ===========================================================================
// CAPTION STYLE 9: MINIMAL
// ===========================================================================
const MinimalCaption: React.FC<CaptionRendererProps> = ({
    text,
    fontSize,
    width,
}) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    const entrance = spring({ frame, fps, config: { stiffness: 100, damping: 20 } });
    const exit = interpolate(
        frame,
        [durationInFrames - 10, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    return (
        <CaptionWrapper width={width}>
            <div
                style={{
                    backgroundColor: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(8px)",
                    padding: "16px 32px",
                    borderRadius: 12,
                    opacity: entrance * exit,
                    transform: `translateY(${(1 - entrance) * 20}px)`,
                }}
            >
                <div
                    style={{
                        fontSize: fontSize * 0.75,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        color: "#FFFFFF",
                        letterSpacing: 0.5,
                    }}
                >
                    {text}
                </div>
            </div>
        </CaptionWrapper>
    );
};
