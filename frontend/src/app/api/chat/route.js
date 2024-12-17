import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import mime from 'mime';


/**
 * Utility to format response into a cleaner Markdown layout.
 * @param responseText Raw response text from the LLM.
 * @returns {string} Formatted Markdown string.
 */
function formatResponseToMarkdown(responseText) {
    const lines = responseText.split("\n");
    const formattedLines = lines.map((line) => {
        const trimmed = line.trim();
        if (/^\*\*.+\*\*:/.test(trimmed)) {
            return `### ${trimmed.replace(/^\*\*(.+?)\*\*:$/, '$1')}\n`; 
        }
        if (/^\*\*.+\*\*.*$/.test(trimmed)) {
            return `\n->> ${trimmed.replace(/^\*\*(.+?)\*\*/, '**$1**')}\n`;
        }

        // Handling standard bullet points
        if (/^(\*|-|\d+\.) /.test(trimmed)) {
            return `\n->> ${trimmed.replace(/^(\*|-|\d+\.) /, ' ')}\n`; 
        }
        if (trimmed === "") {
            return "";
        }
        return trimmed;
    });
    const formattedText = formattedLines.filter(line => line !== "").join("\n\n");
    return formattedText.replace(/(\n\n)+/g, "\n\n");
}



export async function POST(req) {
    const convertImageToBase64 = async (imagePath) => {
        try {
            const fileBuffer = await fs.promises.readFile(imagePath); // Read file as a buffer
            return fileBuffer.toString("base64"); // Convert buffer to Base64
        } catch (err) {
            console.error("Error converting image to Base64:", err);
            throw err;
        }
    };

    const geminiAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    const model = geminiAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const imageFile = "public/images/image.png";

    if (imageFile) {
        const base64Image = await convertImageToBase64(imageFile);
        const data = await req.json();

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [
                        {
                            text: `You are a Tableau report assistant that can analyze images, find patterns, draw insights, and answer questions.  **Always** respond using Markdown formatting with headings, 
                            bullet points, and clear paragraphs. Analyze the provided image and answer the user's question.`,
                        },
                        {
                            inlineData: {
                                mimeType: mime.getType(imageFile),
                                data: data.image,
                            },
                        },
                        {
                            text: 'what are you supposed to be?'
                        }
                    ],
                },
            ],
        });

        const result = await chat.sendMessageStream(data.text);
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                let accumulatedText = ""; // Buffer to store incomplete lines
        
                try {
                    for await (const chunk of result.stream) {
                        const content = chunk.text();
        
                        if (content) {
                            accumulatedText += content; 
                            const lines = accumulatedText.split("\n");
                            accumulatedText = lines.pop(); 
                            const formatted = lines.map(formatResponseToMarkdown).join("\n");
                            const encodedText = encoder.encode(formatted);
                            controller.enqueue(encodedText);
                        }
                    }
                    // Handle any remaining text
                    if (accumulatedText) {
                        const formatted = formatResponseToMarkdown(accumulatedText);
                        controller.enqueue(encoder.encode(formatted));
                    }
                } catch (err) {
                    controller.error(err);
                } finally {
                    controller.close();
                }
            },
        });
    
        return new NextResponse(stream)
    }
    }