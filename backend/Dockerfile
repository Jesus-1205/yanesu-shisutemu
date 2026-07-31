FROM python:3.14-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV POSTGRES_HOST=db
ENV POSTGRES_PORT=5432

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && python seed.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
