FROM python:3.13-alpine
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PORT=10000
RUN addgroup -S salon && adduser -S salon -G salon
COPY --chown=salon:salon index.html server.py ./
USER salon
EXPOSE 10000
CMD ["python", "server.py"]
