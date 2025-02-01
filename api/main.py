from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import httpx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pontsgpt.enpc.org"],  # ou ["*"] pour tout autoriser en développement
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# URL du service Ollama (à adapter si besoin)
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

    # Récupérer le paramètre 'stream' s'il est présent dans le payload.
    stream = payload.get("stream", False)

    async with httpx.AsyncClient() as client:
        try:
            # On transmet la requête à Ollama en passant le JSON du payload.
            # Le timeout est désactivé (timeout=None) pour des requêtes potentiellement longues.
            response = await client.post(
                OLLAMA_URL,
                json=payload,
                timeout=None,
                stream=stream
            )
        except httpx.RequestError as exc:
            raise HTTPException(status_code=500, detail=f"Erreur lors de la connexion à Ollama : {exc}")

        if stream:
            # Si le mode streaming est demandé, on renvoie une réponse en flux
            async def event_generator():
                async for chunk in response.aiter_text():
                    if chunk:
                        # Vous pouvez adapter le format (ex: JSONL, text/event-stream, etc.)
                        yield chunk

            # Ici, nous utilisons "text/event-stream" pour envoyer les données en streaming.
            return StreamingResponse(event_generator(), media_type="text/event-stream")
        else:
            try:
                data = response.json()
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Réponse invalide de Ollama : {exc}")
            return JSONResponse(content=data)

# Pour lancer l'application directement en mode développement :
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
