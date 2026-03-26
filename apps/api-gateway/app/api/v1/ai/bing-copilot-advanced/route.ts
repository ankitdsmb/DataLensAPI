import { withScrapingHandler } from '@forensic/scraping-core';

export const POST = withScrapingHandler(async (req: Request) => {
    const { prompt, session_id } = await req.json();
    if (!prompt) throw new Error('prompt is required');

    if (!session_id) {
        return {
             prompt,
             reply: "Creating new session for multi-turn capability...",
             session_id: "conv_" + Math.random().toString(36).substr(2, 9)
        };
    }

    return {
         prompt,
         reply: "Here is the response based on previous context for session " + session_id,
         session_id: session_id
    };
});
