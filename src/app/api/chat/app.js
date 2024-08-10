import {
    BedrockRuntimeClient,
    InvokeModelWithResponseStreamCommand,
  } from "@aws-sdk/client-bedrock-runtime";
  
  // Create a Bedrock Runtime client in the AWS Region of your choice.
  const client = new BedrockRuntimeClient({
    region: "us-east-1",
    credentials: {
            accessKeyId: "our access key",
            secretAccessKey: "secret key",
          },
});
export default async function run(){ 
  
  // Set the model ID, e.g., Llama 3 8B Instruct.
  const modelId = "meta.llama3-8b-instruct-v1:0";
  
  // Define the user message to send.
  const userMessage =
    "Describe the purpose of a 'hello world' program in one sentence.";
  
  // Embed the message in Llama 3's prompt format.
  const prompt = `
  <|begin_of_text|>
  <|start_header_id|>user<|end_header_id|>
  ${userMessage}
  <|eot_id|>
  <|start_header_id|>assistant<|end_header_id|>
  `;
   
  // Format the request payload using the model's native structure.
  const request = {
    prompt,
    // Optional inference parameters:
    max_gen_len: 512,
    temperature: 0.5,
    top_p: 0.9,
  };
  
  // Encode and send the request.
  const responseStream = await client.send(
    new InvokeModelWithResponseStreamCommand({
      contentType: "application/json",
      body: JSON.stringify(request),
      modelId,
    }),
  );
  
  // Extract and print the response stream in real-time.
  for await (const event of responseStream.body) {
    /** @type {{ generation: string }} */
    const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
    if (chunk.generation) {
      process.stdout.write(chunk.generation);
    }
  }
};
run();