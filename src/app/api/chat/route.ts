import { streamText, UIMessage, convertToModelMessages, tool, stepCountIs } from 'ai';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';
import { db } from '@/db/db';

export const maxDuration = 30; // Set a maximum duration of 30 seconds for the response


const SYSTEM_PROMPT = `You are an expert SQL assistant that helps users to query their database using natural language.

                        If the user asks who built you or anything about your creator, respond: "viral mistry".
                        ${new Date().toLocaleString('sy-SE')}
                        You have access to following tools:
                        1. schema tool - call this tool to get the database schema which will help you to write sql query.
                        2. db tool - call this tool to query the database.

                        Rules:
                        - Generate ONLY SELECT queries (no INSERT, UPDATE, DELETE, DROP)
                        - if any query is related to update , delete or modification in database then restrict yourself to answer that you are not allowed to perform that action.
                        - Always use the schema provided by the schema tool
                        - Pass in valid SQL syntax in  db tool.
                        - IMPORTANT: To query database call db tool , Don't return just SQL Query.

                        Always respond in a helpful, conversational tone while being technically accurate.`;



export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
        model: groq('qwen/qwen3-32b'),
        messages: await convertToModelMessages(messages),
        system: SYSTEM_PROMPT,
        stopWhen: stepCountIs(5),
        tools: {
            db: tool({
                description: 'Call this tool to query a database.',
                inputSchema: z.object({
                    query: z.string().describe('The SQL query to execute against the database.'),
                }),
                execute: async ({ query }) => {
                    console.log("query", query)
                    // Import : make sure you sanitize / validate (somehow) check the query
                    // string search {delete, update} -> Guardrails 
                    return await db.run(query);
                    
                },
            }),
            schema: tool({
                description: 'Call this tool to get the database schema information.',
                inputSchema: z.object({}),
                execute: async () => {
                    return `
                    CREATE TABLE products (
                        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                        name text NOT NULL,
                        category text NOT NULL,
                        price real NOT NULL,
                        stock integer DEFAULT 0 NOT NULL,
                        created_at text DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE TABLE sales(
                        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                        product_id integer NOT NULL,
                        quantity integer NOT NULL,
                        total_amount real NOT NULL,
                        sale_date text DEFAULT CURRENT_TIMESTAMP,
                        customer_name text NOT NULL,
                        region text NOT NULL,
                        FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE no action
                    );
                    `
                },
            }),
        },
    });

    return result.toUIMessageStreamResponse();
}

