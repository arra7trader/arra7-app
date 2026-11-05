FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/model-cache \
    KRONOS_MAX_CONTEXT=512

WORKDIR /srv/kronos
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt
COPY model ./model
COPY app.py ./app.py

EXPOSE 8010
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8010", "--workers", "1"]
