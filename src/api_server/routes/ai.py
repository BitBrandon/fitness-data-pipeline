"""AI wellness agent endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from src.api_server.deps import get_current_user
from src.ai.wellness_agent import get_insights, answer_question

router = APIRouter(prefix="/ai", tags=["ai"])


class QuestionRequest(BaseModel):
    question: str


@router.get("/insights")
def insights(username: str = Depends(get_current_user)):
    try:
        return {"response": get_insights(username)}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al contactar con el agente: {e}")


@router.post("/chat")
def chat(body: QuestionRequest, username: str = Depends(get_current_user)):
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía")
    try:
        return {"response": answer_question(username, body.question)}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al contactar con el agente: {e}")
