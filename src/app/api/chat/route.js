import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
// import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
// import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
// // import { pull } from "langchain/hub";
// import * as hub from "langchain/hub";
// import { ChatPromptTemplate } from "@langchain/core/prompts";
// import { StringOutputParser } from "@langchain/core/output_parsers";
// import { formatDocumentsAsString } from "langchain/util/document";
// import {
//   RunnableSequence,
//   RunnablePassthrough,
// } from "@langchain/core/runnables";
// import { GoogleGenerativeAI } from "@google/generative-ai";


import { NextResponse } from "next/server";
// import {
//     BedrockRuntimeClient,
//     ConverseStreamCommand,
//     ConverseCommand,
//     InvokeModelCommand
//   } from "@aws-sdk/client-bedrock-runtime";


//   import { createStuffDocumentsChain } from "langchain/chains/combine_documents";





import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { CohereEmbeddings } from "@langchain/community/embeddings/cohere";
import {Bedrock} from "@langchain/community/llms/bedrock";
import {LLMChain} from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";




export async function POST(req) {
    // const client = new BedrockRuntimeClient({
    //     region: "us-east-1",
    //     credentials: {
    //             accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    //             secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
    //           },
    // });
    // const modelId = "meta.llama3-8b-instruct-v1:0";


    // const loader = new CheerioWebBaseLoader(
    //     "https://lilianweng.github.io/posts/2023-06-23-agent/"
    // );
    
    // const docs = await loader.load();
    // // console.log(docs)
    
    // const textSplitter = new RecursiveCharacterTextSplitter({
    //     chunkSize: 1000,
    //     chunkOverlap: 200,
    // });
    // const splits = await textSplitter.splitDocuments(docs);
    // const vectorStore = await MemoryVectorStore.fromDocuments(
    //     splits,
    //     new HuggingFaceInferenceEmbeddings({
    //         'apiKey': process.env.NEXT_PUBLIC_HUGGINGFACEHUB_API_KEY
    //     })
    // );
    
    // Retrieve and generate using the relevant snippets of the blog.
    // const retriever = vectorStore.asRetriever();

    // const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");
    // const prompt = await hub.pull("rlm/rag-prompt");
    // console.log(prompt.promptMessages.map((msg) => msg.prompt.template).join("\n"));
    // const exampleMessages = await prompt.invoke({
    //     context: "filler context",
    //     question: "filler question",
    //   });
    //   exampleMessages;
    //   console.log(exampleMessages.messages[0].content);
    // const llm = new InvokeModelCommand({
    //     contentType: "application/json",
    //     // body: JSON.stringify({
    //     //     maxTokens: 1024, temperature: 0.5, topP: 0.9, prompt
    //     // }),
    //     modelId
    // })


    // const geminiAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    // const llm = geminiAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // console.log('here 1');

    // const ragChain = await createStuffDocumentsChain({
    //     llm: llm,
    //     prompt: prompt,
    //     outputParser: new StringOutputParser(),
    // });
    // console.log('here 2');
    // const retrievedDocs = await retriever.invoke("what is task decomposition");
    // await ragChain.invoke({
    //     question: "What is task decomposition?",
    //     context: retrievedDocs,
    // });
    // console.log(prompt.promptMessages.map((msg) => msg.prompt.template).join("\n"));
     

    // const declarativeRagChain = RunnableSequence.from([
    //     {
    //     context: retriever.pipe(formatDocumentsAsString),
    //     question: new RunnablePassthrough(),
    //     },
    //     prompt,
    //     llm,
    //     new StringOutputParser(),
    // ]);
    // await declarativeRagChain.invoke("What is task decomposition?");


    const data = await req.json()
    console.log(data[data.length - 1]["content"][0]["text"]);
    const query = data[data.length - 1]["content"][0]["text"]
    // const command = new ConverseCommand({
    //   modelId,
    //   messages: data,
    //   inferenceConfig: { maxTokens: 1024, temperature: 0.5, topP: 0.9 },
    // });
    // const result = await client.send(command);
    // const responseText = result.output.message.content[0].text;
    // console.log(responseText);




    // const txtLoader = new TextLoader("https://lilianweng.github.io/posts/2023-06-23-agent/");
    // const loadedDoc = await txtLoader.load();

    const loader = new CheerioWebBaseLoader(
        "https://en.wikipedia.org/wiki/Olympic_Games"
    );
    
    const loadedDoc = await loader.load();
    const docSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000, // The size of the chunk that should be split.
        chunkOverlap: 200, // Adding overalap so that if a text is broken inbetween, next document may have part of the previous document 
        separators: ["/n/n","."] // In this case we are assuming that /n/n would mean one whole sentence. In case there is no nearing /n/n then "." will be used instead. This can be anything that helps derive a complete sentence .
    });
    const docs = await docSplitter.splitDocuments(loadedDoc);

    const vectorStore = await MemoryVectorStore.fromDocuments(
        docs,
        new HuggingFaceInferenceEmbeddings({
            'apiKey': process.env.NEXT_PUBLIC_HUGGINGFACEHUB_API_KEY
        })
    );
    
    // Retrieve and generate using the relevant snippets of the blog.
    // const retriever = vectorStore.asRetriever();

    // const cohereEmbedding = new CohereEmbeddings({
    //     apiKey: "TfucyvQagqD9vjE33wTj6Zm3r0MjebBUYsr69EFl"
    // })
    // const vectorStore = await FaissStore.fromDocuments(docs, cohereEmbedding);

    const bedrock = new Bedrock({
        region: "us-east-1",
        model: "meta.llama3-8b-instruct-v1:0",
        temperature: 0,
        maxTokens: 2048,
      });
    //   const query = "Can you summarize the document ?"
      const promptText = `
      You are an assistant that helps summarize long documents. 
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
                controller.error(err) // Handle any errors that occur during streaming
            } finally {
                controller.close() // Close the stream when done
            }
        },
    })

    return new NextResponse(stream)
}