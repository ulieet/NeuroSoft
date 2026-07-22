from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import importaciones, historias, reportes, pacientes, medicos 

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


app.include_router(importaciones.router, tags=["Importaciones"])
app.include_router(historias.router, tags=["Historias"])
app.include_router(pacientes.router, tags=["Pacientes"])
app.include_router(reportes.router, prefix="/reportes", tags=["Reportes"])
app.include_router(medicos.router, tags=["Médicos"])

@app.get("/")
def home():
    return {"message": "Backend funcionando correctamente 🚀"}