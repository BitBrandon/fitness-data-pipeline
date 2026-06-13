import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api_server.auth import router as auth_router
from src.api_server.routes.activity import router as activity_router
from src.api_server.routes.heart_rate import router as heart_rate_router
from src.api_server.routes.sleep import router as sleep_router
from src.api_server.routes.sync import router as sync_router, _run_sync
from src.api_server.routes.webhooks import router as webhooks_router
from src.api_server.routes.weight import router as weight_router
from src.api_server.routes.workouts import router as workouts_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

SYNC_INTERVAL_HOURS = 1


async def _hourly_sync_loop():
    """Sync all users every SYNC_INTERVAL_HOURS hours."""
    await asyncio.sleep(10)  # small delay at startup so the server is fully ready
    while True:
        try:
            from src.storage.user_auth import get_users
            users = get_users()
            logger.info("[auto-sync] Iniciando sync horario para %d usuario(s)...", len(users))
            loop = asyncio.get_event_loop()
            from src.api_server.routes.sync import _status
            for user in users:
                username = user.get("username", "").strip()
                if not username:
                    continue
                if _status.get(username, {}).get("state") == "running":
                    logger.info("[auto-sync] %s ya tiene un sync en curso, omitido.", username)
                    continue
                await loop.run_in_executor(None, _run_sync, username, 2)
            logger.info("[auto-sync] Sync horario completado.")
        except Exception as e:
            logger.warning("[auto-sync] Error en sync horario: %s", e)

        await asyncio.sleep(SYNC_INTERVAL_HOURS * 3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_hourly_sync_loop())
    logger.info("Auto-sync programado cada %dh.", SYNC_INTERVAL_HOURS)
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Fitness API", version="1.0.0", lifespan=lifespan)

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
app.include_router(webhooks_router)


@app.get("/health")
def health():
    return {"status": "ok"}
