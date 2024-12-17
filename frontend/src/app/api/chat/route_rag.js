import "cheerio";
import { createWorker } from 'tesseract.js';
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { NextResponse } from "next/server";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { CohereEmbeddings } from "@langchain/community/embeddings/cohere";
import {Bedrock} from "@langchain/community/llms/bedrock";
import {LLMChain} from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";




export async function POST(req) {
    try{
    const data = await req.json()
    console.log(data[data.length - 1]["content"][0]["text"]);
    const query = data[data.length - 1]["content"][0]["text"]

    // const loader = new CheerioWebBaseLoader(
    //     "https://en.wikipedia.org/wiki/Olympic_Games"
    // );
    const imageFile = "/Users/vinayupadhyayula/Documents/git_projects/ai-customer-support/public/images/charts.jpeg"
    //const loadedDoc = await loader.load();
    
    const readImageText = async () => {
        console.log('entered');
        const worker = await createWorker("eng", 1, {workerPath: "./node_modules/tesseract.js/src/worker-script/node/index.js"});
    
        try {
          const {
            data: { text },
          } = await worker.recognize(imageFile);
          console.log('here',text);
          return text;
        } catch (error) {
        } finally {
          await worker.terminate();
        }
      };
     const extractedText = await readImageText();
     console.log(extractedText);
    const docSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000, // The size of the chunk that should be split.
        chunkOverlap: 200, // Adding overalap so that if a text is broken inbetween, next document may have part of the previous document 
        separators: ["/n/n","."] // In this case we are assuming that /n/n would mean one whole sentence. In case there is no nearing /n/n then "." will be used instead. This can be anything that helps derive a complete sentence .
    });
    //const docs = await docSplitter.splitDocuments(loadedDoc);
    const docs = await docSplitter.createDocuments([extractedText]);
    const vectorStore = await MemoryVectorStore.fromDocuments(
        docs,
        new HuggingFaceInferenceEmbeddings({
            'apiKey': process.env.NEXT_PUBLIC_HUGGINGFACEHUB_API_KEY
        })
    );

    const bedrock = new Bedrock({
        region: "us-east-1",
        model: "meta.llama3-8b-instruct-v1:0",
        temperature: 0,
        maxTokens: 2048,
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
      });

      const promptText = `
      You are my tableau report analyzing agent, you need to find the patterns, parameters, mapping of the parameters in the report 
      Here is the document data:
      {document_data}
      Read the above document and answer the users question below:
      {query}
      `
      // creates a langchain prompt which can accept multiple variables at runtime
      const multiPromptTemplate = new PromptTemplate({
        inputVariables: ["document_data", "query"],
        template: promptText,
      });
      const chain = new LLMChain({ llm: bedrock, prompt: multiPromptTemplate });

      const texts = await vectorStore.similaritySearchWithScore(`${query}`, 10); // do similarity search on vectorstore. The second parameter is the number of responses.

const content = texts.map(([doc, score]) => `${doc["pageContent"]}`);
// use the llm chain to update the muli prompt at runtime
const responseText = await chain.call({
  document_data: content.join('\n\n'),
  query: query, // whatever you want to searh in the document
});

console.log(responseText) // Print response 



    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder() // Create a TextEncoder to convert strings to Uint8Array
            try {
                const text = encoder.encode(responseText["text"]) // Encode the content to Uint8Array
                controller.enqueue(text)
            } catch (err) {
                console.log(err);
                controller.error(err) // Handle any errors that occur during streaming
            } finally {
                controller.close() // Close the stream when done
            }
        },
    })

    return new NextResponse(stream)
}catch(err){
    console.log(err);
}
}