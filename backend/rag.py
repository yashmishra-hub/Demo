import os
import re
from typing import List, Dict

import numpy as np
from pypdf import PdfReader
from google import genai
from google.genai import types


EMBEDDING_MODEL = "gemini-embedding-001"
LLM_MODEL = "gemini-3.8-flash"

CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200
TOP_K = 5


class RAGPipeline:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not configured on the backend."
            )

        self.client = genai.Client(api_key=api_key)

        self.chunks: List[str] = []
        self.embeddings = None
        self.document_name = None

    def extract_pdf_text(self, file_bytes: bytes) -> str:
        import io

        reader = PdfReader(io.BytesIO(file_bytes))

        pages = []

        for page in reader.pages:
            text = page.extract_text() or ""

            if text.strip():
                pages.append(text)

        return "\n\n".join(pages)

    def clean_text(self, text: str) -> str:
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def split_text(self, text: str) -> List[str]:
        text = self.clean_text(text)

        chunks = []

        start = 0

        while start < len(text):
            end = start + CHUNK_SIZE

            chunk = text[start:end]

            if end < len(text):
                last_space = chunk.rfind(" ")

                if last_space > CHUNK_SIZE * 0.7:
                    chunk = chunk[:last_space]
                    end = start + last_space

            chunk = chunk.strip()

            if chunk:
                chunks.append(chunk)

            if end >= len(text):
                break

            start = max(end - CHUNK_OVERLAP, start + 1)

        return chunks

    def create_embeddings(self, texts: List[str]):
        all_embeddings = []

        # Gemini can embed multiple text inputs in one call.
        # Keep batches moderate for reliability.
        batch_size = 50

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]

            result = self.client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=batch,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT"
                )
            )

            for embedding in result.embeddings:
                all_embeddings.append(embedding.values)

        return np.array(all_embeddings, dtype=np.float32)

    def normalize(self, vectors):
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1
        return vectors / norms

    def ingest(self, file_bytes: bytes, filename: str):
        text = self.extract_pdf_text(file_bytes)

        if not text.strip():
            raise ValueError(
                "No readable text was found in this PDF."
            )

        chunks = self.split_text(text)

        if not chunks:
            raise ValueError(
                "The document could not be divided into chunks."
            )

        embeddings = self.create_embeddings(chunks)

        self.chunks = chunks
        self.embeddings = self.normalize(embeddings)
        self.document_name = filename

        return {
            "filename": filename,
            "characters": len(text),
            "chunks": len(chunks)
        }

    def retrieve(self, question: str, top_k: int = TOP_K):
        if not self.chunks or self.embeddings is None:
            raise ValueError(
                "No document has been uploaded yet."
            )

        result = self.client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=question,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY"
            )
        )

        query_embedding = np.array(
            result.embeddings[0].values,
            dtype=np.float32
        )

        query_embedding = query_embedding / max(
            np.linalg.norm(query_embedding),
            1e-12
        )

        scores = np.dot(self.embeddings, query_embedding)

        top_indices = np.argsort(scores)[::-1][:top_k]

        results = []

        for index in top_indices:
            results.append({
                "text": self.chunks[index],
                "score": float(scores[index]),
                "chunk_index": int(index)
            })

        return results

    def answer(self, question: str):
        retrieved = self.retrieve(question)

        context_parts = []

        for item in retrieved:
            context_parts.append(
                f"[Source chunk {item['chunk_index'] + 1}]\n"
                f"{item['text']}"
            )

        context = "\n\n".join(context_parts)

        prompt = f"""
You are DocuMind, a document question-answering assistant.

Answer the user's question using ONLY the supplied document context.

Rules:
1. Do not invent information.
2. If the answer is not present in the context, say:
   "I couldn't find that information in the uploaded document."
3. Give a clear and concise answer.
4. When possible, mention the relevant section or source chunk.
5. Do not use outside knowledge to fill missing information.

DOCUMENT CONTEXT:
{context}

USER QUESTION:
{question}

ANSWER:
"""

        response = self.client.models.generate_content(
            model=LLM_MODEL,
            contents=prompt
        )

        return {
            "question": question,
            "answer": response.text,
            "document": self.document_name,
            "sources": retrieved
        }


rag = None


def get_rag():
    global rag

    if rag is None:
        rag = RAGPipeline()

    return rag
