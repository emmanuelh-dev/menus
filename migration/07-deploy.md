# 07 · Deploy (VPS: Go + PostgreSQL en el mismo servidor)

## Topología final

```
VPS
├── Caddy (:443)  ──►  admin-api (Go, :8080 interno)
├── admin-api     ──►  postgres (red interna Docker, sin puerto público)
└── postgres (postgis/postgis:16) + volumen + backups
Vercel
├── admin-menus (Next)  ──rewrite──►  https://api.<dominio>
└── menus (Astro)       ──fetch────►  https://api.<dominio>/api/public/*
```

## Dockerfile (multistage, binario estático)

```dockerfile
FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /bin/server ./cmd/server

FROM gcr.io/distroless/static-debian12
COPY --from=build /bin/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

## docker-compose.yml

```yaml
services:
  db:
    image: postgis/postgis:16-3.4
    restart: unless-stopped
    environment:
      POSTGRES_DB: menus
      POSTGRES_USER: menus
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - dbdata:/var/lib/postgresql/data
    # SIN ports: solo accesible en la red interna de Docker
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U menus -d menus"]
      interval: 10s
      retries: 5

  admin-api:
    build: .
    restart: unless-stopped
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "127.0.0.1:8080:8080"   # solo loopback; Caddy da la cara
    logging:
      driver: json-file
      options: { max-size: "10m", max-file: "3" }

volumes:
  dbdata:
```

> Durante las Etapas A/B, `DATABASE_URL` apunta al Postgres de Supabase y el servicio `db` puede correr ya como staging. En la Etapa C (doc 10) se hace el restore final y `DATABASE_URL` pasa a `postgres://menus:...@db:5432/menus`.

## Backups (ahora son responsabilidad nuestra — no negociable)

Al salir de Supabase se pierden sus backups automáticos. Mínimo obligatorio desde el día del cutover:

```bash
# /etc/cron.d/menus-backup  (diario 04:00, retención 14 días local + offsite)
0 4 * * * root docker exec $(docker compose ps -q db) pg_dump -U menus -Fc menus \
  > /backups/menus-$(date +\%F).dump \
  && find /backups -name 'menus-*.dump' -mtime +14 -delete \
  && rclone copy /backups/menus-$(date +\%F).dump remote:menus-backups/
```

- Offsite con `rclone` (B2/R2/S3, cuestan centavos). **Un backup que vive solo en el mismo VPS no es backup.**
- Prueba de restore mensual (el script de validación de doc 10 sirve tal cual).
- Opcional recomendado: WAL archiving con `wal-g` si el negocio crece; por ahora dump diario basta (volumen de datos: ~1k places, miles de orders).

## Proxy (Caddy)

```
api.<tu-dominio>.com {
    reverse_proxy 127.0.0.1:8080
}
```

## .env de producción (completo, post-Supabase)

```
PORT=8080
ENV=production
DATABASE_URL=postgres://menus:<DB_PASSWORD>@db:5432/menus   # Etapas A/B: la URL de Supabase
DB_PASSWORD=<password del contenedor>
ADMIN_EMAILS=e805177@gmail.com
GEMINI_API_KEY=<key>
TURNSTILE_SECRET_KEY=<key>            # login/register/reviews se verifican en Go
RESEND_API_KEY=<key>                  # magic links, reset password, formulario contacto
PUBLIC_BASE_URL=https://admin.<dominio>   # para armar links de magic-link/reset en emails
ALLOWED_ORIGINS=https://<sitio-astro>,https://admin.<dominio>   # CORS del namespace público
```

Desaparecen: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`.

> ⚠️ **Pendiente de seguridad detectado durante el análisis:** `menus/scripts/get-schema.js` tiene la **service role key hardcodeada** y commiteada. Rotarla YA (tarea F0) aunque Supabase vaya a morir: seguirá viva durante toda la transición.

## Operación

- `GET /healthz` → ping DB; monitoreo externo (UptimeRobot).
- Deploy: `git pull && docker compose up -d --build`.
- Logs: `docker compose logs -f admin-api`.
- Postgres tuning: los defaults de la imagen están bien para este volumen; si el VPS tiene ≥4 GB, subir `shared_buffers=1GB` vía command args. No optimizar antes de medir.

## Red de seguridad para cada switch

1. **Switch admin (Etapa A):** `GO_API_URL` en Preview de Vercel → QA → Production. Rollback = quitar la variable (~1 min).
2. **Switch Astro (Etapa B):** por secciones, en preview, con diff visual contra producción.
3. **Mudanza de base (Etapa C):** procedimiento y rollback en doc 10. Supabase queda en pausa 2-4 semanas como respaldo frío antes de cancelar.
