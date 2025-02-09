from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import httpx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pontsgpt.enpc.org"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/chat"

@app.post("/api/chat")
async def chat(request: Request):
    """
    Endpoint qui reçoit la requête du frontend, la transmet à Ollama
    et renvoie la réponse (en flux ou en une fois).
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON invalide.")

    stream = payload.get("stream", False)

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                OLLAMA_URL,
                json=payload,
                timeout=None,
                stream=stream
            )
        except httpx.RequestError as exc:
            raise HTTPException(status_code=500, detail=f"Erreur lors de la connexion à Ollama : {exc}")

        if stream:
            async def event_generator():
                async for chunk in response.aiter_text():
                    if chunk:
                        yield chunk

            return StreamingResponse(event_generator(), media_type="text/event-stream")
        else:
            try:
                data = response.json()
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Réponse invalide de Ollama : {exc}")
            return JSONResponse(content=data)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
