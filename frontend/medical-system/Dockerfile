# 1. Usar una imagen ligera de Node.js (versión 18 o 20)
FROM node:18-alpine

# 2. Crear directorio de trabajo en el contenedor
WORKDIR /app

# 3. Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# 4. Instalar dependencias (usando 'npm ci' que es más limpio para entornos automatizados)
RUN npm install

# 5. Copiar el resto del código fuente
COPY . .

# 6. Construir la aplicación para producción (optimizado)
# Esto crea la carpeta .next con todo listo
RUN npm run build

# 7. Exponer el puerto 3000 (estándar de Next.js)
EXPOSE 3000

# 8. Comando para iniciar la app
CMD ["npm", "start"]