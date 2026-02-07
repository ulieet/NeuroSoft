# backend/Dockerfile

FROM python:3.9-slim

WORKDIR /app

# --- AGREGAR ESTO ---
# Instalar antiword (para .doc) y poppler-utils (para PDFs si usas pdf2image)
RUN apt-get update && apt-get install -y \
    antiword \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*
# --------------------

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]