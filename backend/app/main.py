from fastapi import FastAPI, WebSocket
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.route import router
from app.utils import create_courses, init_db
from app.database import get_db
from contextlib import asynccontextmanager
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    async with get_db() as db:
        await create_courses(db)
    yield

app = FastAPI(lifespan=lifespan)
app.include_router(router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("media")

app.mount("/dp", StaticFiles(directory="media"), name="Dp")

@app.get("/")
def docs():
    return RedirectResponse(url="/docs")
