# 빌드는 저장소의 pulsecare/android에서 (:core를 함께 써서):  ./gradlew :server:installDist
# 그다음 pulsecare/server에서:  docker build -t pulsecare-server .
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY build/install/server /app
ENV PORT=8080
EXPOSE 8080
CMD ["/app/bin/server"]
