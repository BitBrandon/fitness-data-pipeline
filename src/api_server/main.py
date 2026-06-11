from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api_server.auth import router as auth_router
from src.api_server.routes.activity import router as activity_router
from src.api_server.routes.heart_rate import router as heart_rate_router
from src.api_server.routes.sleep import router as sleep_router
from src.api_server.routes.sync import router as sync_router
from src.api_server.routes.weight import router as weight_router
from src.api_server.routes.workouts import router as workouts_router

app = FastAPI(title="Fitness API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://192.168.1.15:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(activity_router)
app.include_router(heart_rate_router)
app.include_router(sleep_router)
app.include_router(weight_router)
app.include_router(workouts_router)
app.include_router(sync_router)


@app.get("/health")
def health():
    return {"status": "ok"}
