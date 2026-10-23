# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend with packaged static frontend
FROM maven:3.9.6-eclipse-temurin-17-alpine AS backend-build
WORKDIR /app
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B
COPY backend/src ./src
COPY --from=frontend-build /frontend/dist ./src/main/resources/static
RUN mvn clean package -DskipTests

# Stage 3: Optimized Container Runtime for Hugging Face Spaces (UID 1000, Port 7860)
FROM eclipse-temurin:17-jre-alpine
RUN apk add --no-cache fontconfig ttf-dejavu

# Hugging Face Spaces guidelines require a non-root user with UID 1000
RUN adduser -u 1000 -D appuser
WORKDIR /app
COPY --from=backend-build /app/target/*.jar app.jar
RUN chown -R appuser:appuser /app
USER appuser

ENV PORT=7860
EXPOSE 7860
ENTRYPOINT ["sh", "-c", "java -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Dserver.port=${PORT} -jar app.jar"]
