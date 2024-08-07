import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
const prompt = ""

export async function POST(req)
{
    const geminiAI =  new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    const model = geminiAI.getGenerativeModel({ model: "gemini-1.5-flash"});

    const data = await req.json()
    console.log(data)
    const chat = model.startChat(
       {
        history:data.messages
       }
        );
      const result = await chat.sendMessageStream(data.msg);
        console.log(result);

    const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder() // Create a TextEncoder to convert strings to Uint8Array
          try {
            // Iterate over the streamed chunks of the response
            for await (const chunk of result.stream) {
                console.log(chunk.text());
              const content = chunk.text();// Extract the content from the chunk
              if (content) {
                const text = encoder.encode(content) // Encode the content to Uint8Array
                controller.enqueue(text) // Enqueue the encoded text to the stream
              }
            }
          } catch (err) {
            controller.error(err) // Handle any errors that occur during streaming
          } finally {
            controller.close() // Close the stream when done
          }
        },
      })
    
      return new NextResponse(stream)
}