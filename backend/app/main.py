from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

# --- REGISTRO DE RUTAS ---

# 1. IMPORTACIONES: Quitamos el prefix porque el router interno ya dice "/importaciones/historias"
app.include_router(importaciones.router, tags=["Importaciones"])

# 2. HISTORIAS Y PACIENTES: Sin prefix porque ya lo definen ellos mismos
app.include_router(historias.router, tags=["Historias"])
app.include_router(pacientes.router, tags=["Pacientes"])

# 3. REPORTES: Aquí SI dejamos el prefix porque el service solo define "/general"
app.include_router(reportes.router, prefix="/reportes", tags=["Reportes"])

@app.get("/")
def home():
    return {"message": "Backend funcionando correctamente 🚀"}