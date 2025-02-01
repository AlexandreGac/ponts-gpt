# Utilise une image Python allégée
FROM python:3.10-slim

# Définir le répertoire de travail dans le container
WORKDIR /api

# Copier le fichier des dépendances et les installer
COPY api /api
RUN pip install --no-cache-dir -r requirements.txt

# Exposer le port sur lequel l'application sera disponible
EXPOSE 8000

# Démarrer l'application avec Uvicorn en production
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
