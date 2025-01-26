# Stage 1: Build the backend
FROM python:3.10-alpine AS backend
WORKDIR /backend
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Stage 2: Setup Nginx
FROM nginx:alpine AS nginx
COPY --from=backend /backend /backend
COPY nginx.conf /etc/nginx/conf.d/default.conf.template
COPY certs/certificate.crt /etc/nginx/ssl/certificate.crt
COPY certs/private.key /etc/nginx/ssl/private.key

# Install envsubst
RUN apk add --no-cache gettext

# Expose the port Nginx will listen on
EXPOSE 80 443

# Start Nginx with envsubst
CMD ["/bin/sh", "-c", "envsubst '${SERVER_NAME}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]