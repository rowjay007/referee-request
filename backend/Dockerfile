FROM golang:1.26-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/referee-request-api ./cmd/api

FROM alpine:3.21

RUN adduser -D -H -s /sbin/nologin app
WORKDIR /app
COPY --from=build /out/referee-request-api /app/referee-request-api
USER app
EXPOSE 8080
ENTRYPOINT ["/app/referee-request-api"]