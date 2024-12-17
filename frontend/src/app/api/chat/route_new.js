import { NextResponse } from "next/server";
import fs from "fs";
import mime from "mime";
import csv from "csv-parser";
import cosineSimilarity from "cosine-similarity";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Dynamically loads the Hugging Face pipeline to extract embeddings.
 * @returns {Promise<{documents: string[], embeddings: number[][]}>}
 */
async function vectorizeCSV() {
    const { pipeline } = await import("@xenova/transformers"); // Dynamic import
    const model = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

    const csvFilePath = "public/nike_dataset.csv";
    const documents = [];
    const embeddings = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on("data", async (row) => {
                const document = Object.values(row).join(" | ");
                documents.push(document);

                const embedding = await model(document, { pooling: "mean", normalize: true });
                embeddings.push(embedding.data);
            })
            .on("end", () => resolve({ documents, embeddings }))
            .on("error", (error) => reject(error));
    });
}

/**
 * Finds the most similar document using cosine similarity.
 * @param {string} query - User query string.
 * @param {string[]} documents - Array of CSV rows as strings.
 * @param {number[][]} embeddings - Vector embeddings for the CSV rows.
 * @returns {Promise<string>} - The most similar document.
 */
async function findMostSimilarDocument(query, documents, embeddings) {
    const { pipeline } = await import("@xenova/transformers");
    const model = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

    const queryEmbedding = await model(query, { pooling: "mean", normalize: true });

    let maxSimilarity = -1;
    let mostSimilarDocument = "";

    embeddings.forEach((embedding, index) => {
        const similarity = cosineSimilarity(queryEmbedding.data, embedding);
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            mostSimilarDocument = documents[index];
        }
    });

    return mostSimilarDocument;
}

/**
 * Utility to convert an image file to Base64.
 */
const convertImageToBase64 = async (imagePath) => {
    const fileBuffer = await fs.promises.readFile(imagePath);
    return fileBuffer.toString("base64");
};

export async function POST(req) {
    try {
        // Initialize Gemini AI API
        const geminiAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
        const model = geminiAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Extract user query and image data
        const data = await req.json();
        const userQuery = data.text;

        // Convert image to Base64
        const imagePath = "public/images/image.png";
        const base64Image = await convertImageToBase64(imagePath);

        // Step 1: Vectorize CSV file
        const { documents, embeddings } = await vectorizeCSV();

        // Step 2: Find the most similar document
        const relevantDocument = await findMostSimilarDocument(userQuery, documents, embeddings);

        // Step 3: Start Gemini AI conversation with relevant data and image
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [
                        {
                            text: `You are analyzing a Tableau report and related CSV data. The most relevant CSV data is:\n\n"${relevantDocument}"\n\nAnalyze this along with the image and respond to the user's question.`,
                        },
                        {
                            inlineData: {
                                mimeType: mime.getType(imagePath),
                                data: base64Image,
                            },
                        },
                    ],
                },
            ],
        });

        const result = await chat.sendMessageStream(userQuery);

        // Step 4: Stream the response back to the client
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                for await (const chunk of result.stream) {
                    controller.enqueue(encoder.encode(chunk.text()));
                }
                controller.close();
            },
        });

        return new NextResponse(stream);
    } catch (error) {
        console.error("Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
