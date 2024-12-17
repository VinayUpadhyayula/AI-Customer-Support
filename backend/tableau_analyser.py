from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import base64
import os
from google.generativeai import GenerativeModel
import re
from dotenv import load_dotenv
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import csv, io


# Path to the .env.local file
env_path = r"C:\Users\manas\OneDrive\Desktop\OCR\ai-customer-support\.env.local"

# Load the environment variables
load_dotenv(env_path)
app = Flask(__name__)

# Configure Google Gemini API Key
genai.configure(api_key=os.getenv("NEXT_PUBLIC_GEMINI_API_KEY"))

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


print(os.getenv("NEXT_PUBLIC_GEMINI_API_KEY"))

# Initialize CORS
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})  # Replace with your frontend URL

def convert_image_to_base64(image_path):
    """
    Convert an image file to Base64.
    """
    try:
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode("utf-8")
    except Exception as e:
        print(f"Error converting image to Base64: {e}")
        raise

def format_response_to_markdown(response_text):
    """
    Format raw response text into clean Markdown.
    """
    lines = response_text.split("\n")
    formatted_lines = []
    
    for line in lines:
        trimmed = line.strip()
        if re.match(r"^\*\*.+\*\*:", trimmed):  # Headings
            formatted_lines.append(f"### {re.sub(r'^\*\*(.+?)\*\*:', r'\\1', trimmed)}\n")
        elif re.match(r"^\*\*.+\*\*.*$", trimmed):  # Inline bold formatting
            formatted_lines.append(f"\n->> {re.sub(r'^\*\*(.+?)\*\*', r'**\\1**', trimmed)}\n")
        elif re.match(r"^(\*|-|\d+\.) ", trimmed):  # Bullet points
            formatted_lines.append(f"\n->> {re.sub(r'^(\*|-|\d+\.) ', ' ', trimmed)}\n")
        elif trimmed == "":  # Skip empty lines
            continue
        else:
            formatted_lines.append(trimmed)
    
    formatted_text = "\n\n".join(formatted_lines)
    return re.sub(r"(\n\n)+", "\n\n", formatted_text)  # Remove excessive newlines


index = None
csv_data = []


def create_faiss_index(embeddings):
    """Create a Faiss index for similarity search."""
    global index
    dimension = embeddings.shape[1]  # Dimension of the embeddings
    index = faiss.IndexFlatL2(dimension)  # L2 distance for similarity search
    index.add(embeddings)



def read_csv(file_path):
    """Reads CSV file and converts it to text."""
    global csv_data
    csv_data = []
    with open(file_path, mode="r", encoding="utf-8") as file:
        csv_reader = csv.reader(file)
        for row in csv_reader:
            csv_data.append(" ".join(row))  # Combine each row into a string
    return csv_data


def chunk_document(text, chunk_size=2000):
    """Split document into chunks based on word count."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = ' '.join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks

def vectorize_and_create_index(file_path):
    """Read CSV, vectorize, and create the Faiss index."""
    text_data = read_csv(file_path)
    chunks = []
    
    # Chunk and vectorize the CSV data
    for doc in text_data:
        # Directly chunk the document into smaller parts
        chunks.extend(chunk_document(doc))  
    
    # Vectorize the chunks using the SentenceTransformer model
    embeddings = embedding_model.encode(chunks)
    
    # Create the Faiss index with the vectorized embeddings
    create_faiss_index(np.array(embeddings))



def get_similar_text(user_query):
    """Perform similarity search for user query in the Faiss index."""
    query_embedding = embedding_model.encode([user_query])
    D, I = index.search(np.array(query_embedding), k=1)  # Find most similar text
    print("***********************88", D, I)
    return csv_data[I[0][0]]  # Return the closest document (text) match



@app.route("/analyze", methods=["POST", "OPTIONS"])
def analyze_report():
    """
    API Endpoint to analyze an image and respond using Google Gemini.
    """
    if request.method == "OPTIONS":
        return Response(status=200)
    
    try:
        # Load input data
        data = request.get_json()
        user_text = data.get("text", "")
        user_doc = data.get("image", None)
        image_path = "image.png"

        if not user_text or not user_doc:
            return jsonify({"error": "Image or user input not provided"}), 400

        # Convert image to Base64
        base64_image = base64.b64decode(user_doc)
        mime_type = data.get("mimeType", "")

        # Initialize Gemini Model
        model = GenerativeModel("gemini-1.5-flash")

        relevant_text = get_similar_text(user_text)
        print(relevant_text)

        prompt = (
            "You are an expert Tableau report assistant with access to historical data from March 11 2020 and image analysis capabilities. "
            "Your task is to analyze the given image and compare its data with the provided historical data below. "
            "Based on this analysis, identify patterns, insights, and differences, and answer the user's query effectively.\n\n"
            "### Instructions:\n"
            "1. Carefully **compare the data** in the image with the historical data provided below. Identify similarities, differences, and trends.\n"
            "2. Look for **patterns** in the data, such as growth, decline, or anomalies, and highlight key findings.\n"
            "3. Ensure your response is accurate, detailed, and well-structured using the provided historical data as a knowledge base.\n"
            "4. Always format your response in **Markdown**:\n"
            "   - Use headings (`###`) for key sections.\n"
            "   - Use bullet points for key comparisons or findings.\n"
            "   - Provide clear explanations in paragraphs.\n"
            "   - Use tables where needed for better comparisons.\n\n"
            "---\n\n"
            "### Historical Data for Reference:\n"
            "```csv\n"
            f"{relevant_text}\n"
            "```\n\n"
            "### Your Analysis:\n"
            "1. Compare the data in the provided image with the historical data above.\n"
            "2. Clearly highlight:\n"
            "   - **Differences** (e.g., numerical discrepancies, missing data, or updates).\n"
            "   - **Similarities** or overlaps.\n"
            "   - **Trends** or insights observed across both datasets.\n"
            "3. Address the user's specific query and summarize your findings.\n\n"
            "Please provide your response below in **Markdown** format."
        )


        # Start chat with Gemini
        chat = model.start_chat(history=[{
            "role": "user",
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime_type, "data": base64_image}},
            ],
        }])

        # Stream Gemini's response
        response_stream = chat.send_message(user_text)

        def stream_response():
            accumulated_text = ""
            for chunk in response_stream:
                content = chunk.text
                if content:
                    accumulated_text += content
                    lines = accumulated_text.split("\n")
                    accumulated_text = lines.pop()
                    formatted = "\n".join(format_response_to_markdown(line) for line in lines)
                    yield formatted + "\n"

            # Handle remaining text
            if accumulated_text:
                yield format_response_to_markdown(accumulated_text) + "\n"

        return Response(stream_response(), content_type="text/plain")
    
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "Internal Server Error"}), 500


if __name__ == "__main__":
    vectorize_and_create_index("worldometer_data.csv")
    app.run(debug=True)
