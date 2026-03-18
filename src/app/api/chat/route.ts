import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { groq } from '@ai-sdk/groq';

export const maxDuration = 30; // Set a maximum duration of 30 seconds for the response

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
        model: groq('qwen/qwen3-32b'),
        messages: await convertToModelMessages(messages),
        
    });   

    return result.toUIMessageStreamResponse();
}