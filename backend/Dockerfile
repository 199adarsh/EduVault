# Stage 1: Build Backend
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime with Alpine fonts
FROM eclipse-temurin:17-jre-alpine
RUN apk add --no-cache fontconfig ttf-dejavu
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Dserver.port=${PORT} -jar app.jar"]
