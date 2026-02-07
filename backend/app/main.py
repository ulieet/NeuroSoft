from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# IMPORTANTE: Importamos todos los módulos de API
from app.api import importaciones, historias, reportes, pacientes 

app = FastAPI(title="NeuroSoft Backend - Grupo 21")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",  
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registramos las rutas
app.include_router(importaciones.router)
app.include_router(historias.router)
app.include_router(reportes.router)  # <-- Nuevo
app.include_router(pacientes.router) # <-- Nuevo (Soluciona el 404)

@app.get("/")
def home():
    return {"message": "Backend funcionando correctamente 🚀"}