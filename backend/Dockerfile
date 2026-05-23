FROM python:3.10-slim

WORKDIR /app

# Instalar herramientas de Linux para leer documentos
RUN apt-get update && apt-get install -y \
    build-essential \
    antiword \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar librerías (esto ahora sí funcionará sin los #)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del proyecto
COPY . .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]