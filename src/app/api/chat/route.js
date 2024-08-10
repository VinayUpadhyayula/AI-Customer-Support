import { NextResponse } from "next/server";
import {
    BedrockRuntimeClient,
    ConverseStreamCommand,
    ConverseCommand
  } from "@aws-sdk/client-bedrock-runtime";

export async function POST(req) {
    const client = new BedrockRuntimeClient({
        region: "us-east-1",
        credentials: {
                accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
              },
    });
    const modelId = "meta.llama3-8b-instruct-v1:0";
    const data = await req.json()
    console.log(data);
    const command = new ConverseCommand({
      modelId,
      messages: data,
      inferenceConfig: { maxTokens: 1024, temperature: 0.5, topP: 0.9 },
    });
    const result = await client.send(command);
    const responseText = result.output.message.content[0].text;
    console.log(responseText);
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder() // Create a TextEncoder to convert strings to Uint8Array
            try {
                const text = encoder.encode(responseText) // Encode the content to Uint8Array
                controller.enqueue(text)
            } catch (err) {
                controller.error(err) // Handle any errors that occur during streaming
            } finally {
                controller.close() // Close the stream when done
            }
        },
    })

    return new NextResponse(stream)
}