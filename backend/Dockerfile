FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY scripts ./scripts
COPY entrypoint.sh ./entrypoint.sh

RUN mkdir -p /data

EXPOSE 8000

CMD ["sh", "./entrypoint.sh"]
