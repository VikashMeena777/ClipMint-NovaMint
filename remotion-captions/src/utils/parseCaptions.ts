/**
 * SRT Parser for ClipMint
 *
 * Parses raw SRT subtitle content into structured entries with
 * start/end timestamps in milliseconds.
 */

export interface SrtEntry {
    index: number;
    startMs: number;
    endMs: number;
    text: string;
}

/**
 * Parse a timestamp string from SRT format to milliseconds.
 * Supports both comma and dot as decimal separator.
 *
 * @example "00:01:23,456" → 83456
 * @example "00:01:23.456" → 83456
 */
function parseTimestamp(raw: string): number {
    // Normalize: replace comma with dot
    const normalized = raw.trim().replace(",", ".");
    const parts = normalized.split(":");

    if (parts.length !== 3) return 0;

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const secondsParts = parts[2].split(".");
    const seconds = parseInt(secondsParts[0], 10);
    const milliseconds = secondsParts[1]
        ? parseInt(secondsParts[1].padEnd(3, "0").slice(0, 3), 10)
        : 0;

    return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
}

/**
 * Parse raw SRT content string into an array of SrtEntry objects.
 *
 * SRT format:
 * ```
 * 1
 * 00:00:00,500 --> 00:00:02,000
 * Hello world
 *
 * 2
 * 00:00:02,500 --> 00:00:05,000
 * This is a subtitle
 * ```
 */
export function parseSrtContent(srtContent: string): SrtEntry[] {
    if (!srtContent || !srtContent.trim()) return [];

    const entries: SrtEntry[] = [];

    // Split by double newline (handles \r\n and \n)
    const blocks = srtContent
        .trim()
        .replace(/\r\n/g, "\n")
        .split(/\n\n+/);

    for (const block of blocks) {
        const lines = block.trim().split("\n");

        if (lines.length < 3) continue;

        // Line 1: index number
        const index = parseInt(lines[0].trim(), 10);
        if (isNaN(index)) continue;

        // Line 2: timestamp range "00:00:00,500 --> 00:00:02,000"
        const timeLine = lines[1].trim();
        const timeMatch = timeLine.split("-->");

        if (timeMatch.length !== 2) continue;

        const startMs = parseTimestamp(timeMatch[0]);
        const endMs = parseTimestamp(timeMatch[1]);

        // Lines 3+: subtitle text (may span multiple lines)
        const text = lines
            .slice(2)
            .join(" ")
            .trim();

        if (text) {
            entries.push({ index, startMs, endMs, text });
        }
    }

    return entries;
}

/**
 * Convert milliseconds to SRT timestamp format.
 * @example 83456 → "00:01:23,456"
 */
export function msToSrtTimestamp(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;

    return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0"),
    ].join(":") + "," + String(millis).padStart(3, "0");
}

/**
 * Serialize SrtEntry array back to SRT format string.
 */
export function serializeSrt(entries: SrtEntry[]): string {
    return entries
        .map(
            (entry, i) =>
                `${i + 1}\n${msToSrtTimestamp(entry.startMs)} --> ${msToSrtTimestamp(entry.endMs)}\n${entry.text}`
        )
        .join("\n\n");
}
