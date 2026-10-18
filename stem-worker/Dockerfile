FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libsndfile1 libgomp1 && rm -rf /var/lib/apt/lists/*
WORKDIR /worker
COPY stem-worker/requirements.txt ./
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt
COPY stem-worker/service.py stem-worker/separate.py ./
RUN useradd --uid 1000 --create-home worker && mkdir /data /models && chown worker:worker /data /models
ENV HF_HOME=/models HF_HUB_OFFLINE=1 HF_HUB_DISABLE_TELEMETRY=1 OMP_NUM_THREADS=2
USER worker
CMD ["uvicorn", "service:app", "--host", "0.0.0.0", "--port", "8020", "--workers", "1", "--limit-concurrency", "8"]
