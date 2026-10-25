# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
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

# Stage 3: Optimized Container Runtime
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN mkdir -p /app/data
COPY --from=backend-build /app/target/*.jar app.jar

ENV PORT=10000
EXPOSE 10000 8080
ENTRYPOINT ["sh", "-c", "java -Xmx320m -Xms128m -Xss512k -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -jar app.jar --server.port=${PORT}"]
