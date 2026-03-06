import React from "react";
import { Composition } from "remotion";
import { CaptionedClip, captionedClipSchema } from "./CaptionedClip";

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="CaptionedClip"
                component={CaptionedClip}
                durationInFrames={300}
                fps={30}
                width={1080}
                height={1920}
                schema={captionedClipSchema}
                defaultProps={{
                    srtContent: `1
00:00:00,500 --> 00:00:02,000
Welcome to ClipMint

2
00:00:02,500 --> 00:00:05,000
The AI Content Repurposer

3
00:00:05,500 --> 00:00:08,000
Turn one video into ten clips

4
00:00:08,500 --> 00:00:11,000
With professional animated captions

5
00:00:11,500 --> 00:00:14,000
Powered by Remotion

6
00:00:14,500 --> 00:00:17,000
Choose from multiple caption styles

7
00:00:17,500 --> 00:00:20,000
Hormozi style word highlights

8
00:00:20,500 --> 00:00:23,000
Bouncing text animations

9
00:00:23,500 --> 00:00:26,000
Glitch and neon effects

10
00:00:26,500 --> 00:00:29,000
Start repurposing your content today`,
                    captionStyle: "hormozi",
                    backgroundColor: "#000000",
                    accentColor: "#39E508",
                    fontSize: 68,
                }}
            />

            <Composition
                id="CaptionPreview"
                component={CaptionedClip}
                durationInFrames={150}
                fps={30}
                width={1080}
                height={1920}
                schema={captionedClipSchema}
                defaultProps={{
                    srtContent: `1
00:00:00,500 --> 00:00:02,500
This is a preview of animated captions

2
00:00:03,000 --> 00:00:05,000
Each word highlights as it plays`,
                    captionStyle: "hormozi",
                    backgroundColor: "#0a0a0a",
                    accentColor: "#FF6B35",
                    fontSize: 72,
                }}
            />
        </>
    );
};
