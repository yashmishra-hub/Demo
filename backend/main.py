import os

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag import get_rag


app = FastAPI(
    title="DocuMind RAG API",
    version="2.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str


@app.get("/")
def read_root():
    return {
        "message": "DocuMind RAG backend is running",
        "status": "ok"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }


@app.post("/echo")
async def echo_payload(payload: dict):
    return {
        "data": payload
    }


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file was selected."
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    try:
        file_bytes = await file.read()

        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty."
            )

        # Keep demo uploads reasonably small.
        if len(file_bytes) > 20 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="PDF must be smaller than 20 MB."
            )

        pipeline = get_rag()

        result = pipeline.ingest(
            file_bytes=file_bytes,
            filename=file.filename
        )

        return {
            "success": True,
            "message": "Document processed successfully.",
            **result
        }

    except HTTPException:
        raise

    except Exception as error:
        print("UPLOAD ERROR:", error)

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@app.post("/query")
async def query_document(request: QueryRequest):
    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    try:
        pipeline = get_rag()

        result = pipeline.answer(question)

        return {
            "success": True,
            **result
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        print("QUERY ERROR:", error)

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True
    )
