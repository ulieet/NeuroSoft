# backend/app/models/models.py
from sqlalchemy import Column, Integer, String, Float, Boolean, Date, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Paciente(Base):
    __tablename__ = "pacientes"

    id = Column(Integer, primary_key=True, index=True)
    dni = Column(String, unique=True, index=True)  # Clave única para no repetir
    nombre = Column(String)
    apellido = Column(String)
    fecha_nacimiento = Column(Date, nullable=True)
    obra_social = Column(String, nullable=True)
    nro_afiliado = Column(String, nullable=True)
    sexo = Column(String, nullable=True)
    
    # Relación: Un paciente tiene muchas historias
    historias = relationship("HistoriaClinica", back_populates="paciente", cascade="all, delete-orphan")

class HistoriaClinica(Base):
    __tablename__ = "historias_clinicas"

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"))
    
    # Metadatos
    fecha_consulta = Column(Date)
    nombre_archivo = Column(String) # Para saber de qué DOCX vino
    
    # Datos Clínicos
    diagnostico = Column(String)
    edss = Column(Float, nullable=True)
    
    # Lógica NEDA (Calculada al guardar)
    es_neda = Column(Boolean, default=False)
    tiene_brote = Column(Boolean, default=False)
    rmn_activa = Column(Boolean, default=False)
    
    # Tratamiento
    dmt_droga = Column(String, nullable=True)
    dmt_categoria = Column(String, nullable=True) # Alta Eficacia / Moderada
    motivo_cambio = Column(String, nullable=True)
    
    # Datos crudos por si necesitamos buscar texto
    evolucion_texto = Column(Text, nullable=True)
    rmn_json = Column(JSON, nullable=True) 
    
    # Relación inversa
    paciente = relationship("Paciente", back_populates="historias")