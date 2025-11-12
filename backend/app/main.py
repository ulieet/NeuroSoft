from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import importaciones, historias

app = FastAPI(title="NeuroSoft Backend - Grupo 21")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(importaciones.router)
app.include_router(historias.router)

@app.get("/")
def home():
    return {"message": "Backend funcionando correctamente 🚀"}
