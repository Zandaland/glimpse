# Dockerfile for transcript_server
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY transcript_server.py .

EXPOSE 10000

CMD ["python", "transcript_server.py"]
