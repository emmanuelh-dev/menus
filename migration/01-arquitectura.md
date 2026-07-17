# 01 · Arquitectura del servicio Go

## Stack

| Pieza | Elección | Justificación |
|---|---|---|
| Go | 1.24+ | stdlib `net/http` moderno (`ServeMux` con métodos y wildcards) |
| Router | `net/http` stdlib (`ServeMux`) | Los patrones `GET /api/places/{id}` ya son nativos; cero dependencias. Si se necesita middleware chaining más cómodo, `chi/v5` es el único upgrade permitido |
| Postgres | `jackc/pgx/v5` + `pgxpool` | Sin ORM: las queries actuales son simples y el shape JSON manda. Etapas A/B: apunta al Postgres de Supabase; Etapa C: al Postgres del VPS (doc 10) |
| Auth | `golang.org/x/crypto/bcrypt` + sesiones opacas en tabla | Auth propia (doc 04); sin JWT, sin dependencia externa |
| Gemini | REST directo a `generativelanguage.googleapis.com` | `generateContent` con `responseSchema` (structured output). No hace falta SDK |
| Logs | `log/slog` stdlib | JSON en producción |
| Config | Variables de entorno, sin librería | Ver tabla abajo; falla al arrancar si falta algo requerido |

**Prohibido:** ORMs (gorm), frameworks web (gin, echo, fiber), librerías de config (viper). El objetivo es un binario aburrido y auditable.

## Layout del proyecto

Repo nuevo: `admin-menus-go` (hermano de `admin-menus`).

```
admin-menus-go/
├── cmd/server/main.go        # wiring: config, pool, routes, listen
├── internal/
│   ├── config/config.go      # carga y validación de env
│   ├── httpx/                # helpers: respondJSON, respondError, decode
│   ├── auth/
│   │   ├── middleware.go     # sesión desde Bearer o cookie bm_session
│   │   ├── sessions.go       # crear/validar/revocar sesiones (tokens hasheados)
│   │   ├── passwords.go      # bcrypt hash/compare
│   │   ├── tokens.go         # magic links y reset (auth_tokens)
│   │   ├── admin.go          # ADMIN_EMAILS (port de lib/admin.ts)
│   │   └── emails.go         # Resend: magic link, reset, notificaciones
│   ├── store/                # acceso a datos, un archivo por agregado
│   │   ├── places.go
│   │   ├── orders.go
│   │   ├── customers.go
│   │   ├── shippingzones.go
│   │   ├── contactnotes.go
│   │   ├── history.go        # place_content_history
│   │   ├── insights.go       # place_menu_visits + reviews
│   │   └── geo.go            # states, municipalities
│   ├── model/                # structs (doc 02)
│   │   ├── place.go          # Place + Content/Block/SemanticData
│   │   ├── order.go
│   │   └── ...
│   ├── api/                  # handlers HTTP, un archivo por recurso
│   │   ├── routes.go         # registro de todas las rutas
│   │   ├── places.go
│   │   ├── orders.go
│   │   ├── customers.go
│   │   ├── shippingzones.go
│   │   ├── contacts.go
│   │   ├── users.go
│   │   ├── authme.go
│   │   ├── insights.go
│   │   └── ai.go
│   └── ai/
│       ├── gemini.go         # cliente REST + responseSchema
│       ├── prompt.go         # SYSTEM_PROMPT + preprocesado (port de lib/ai/gemini.ts)
│       └── sanitize.go       # strip/restore imágenes, sanitización
├── Dockerfile
├── docker-compose.yml
└── go.mod
```

Regla de capas: `api → store/auth/ai → model`. Los handlers no tocan `pgx` directo; el store no conoce `http`.

## Conexión a base de datos

- **Etapas A/B (transición):** `DATABASE_URL` apunta al Postgres de Supabase — session pooler `aws-0-<region>.pooler.supabase.com:5432` o directa (la directa es IPv6; desde un VPS IPv4-only usar el pooler). Evitar el transaction pooler `:6543` (rompe prepared statements).
- **Etapa C (final):** `DATABASE_URL=postgres://menus:...@db:5432/menus` — el contenedor Postgres del mismo compose, red interna.
- La conexión es de rol pleno (**RLS no aplica**): la autorización se aplica en código (doc 04, matriz por tabla).
- Pool: `MaxConns=10` basta.

## Middleware pipeline

```
request → logger → recover → auth (opcional por ruta) → handler
```

- `auth.Required`: 401 si no hay usuario válido.
- `auth.Optional`: inyecta usuario si existe (lo usa `GET /api/orders/{id}`, que es público para tracking).
- No hay CORS en producción si el switch es vía rewrite de Next (mismo origen). Añadir CORS configurable por env (`ALLOWED_ORIGINS`) solo para desarrollo local del frontend contra Go directo.

## Variables de entorno

| Variable | Requerida | Uso |
|---|---|---|
| `PORT` | no (default 8080) | puerto HTTP |
| `DATABASE_URL` | sí | Postgres (Supabase en A/B, VPS en C) |
| `ADMIN_EMAILS` | no | CSV; default `e805177@gmail.com` (paridad con `lib/admin.ts`) |
| `GEMINI_API_KEY` | sí | asistente IA (hoy `PUBLIC_GEMINI_API_KEY` en Next) |
| `TURNSTILE_SECRET_KEY` | no | verificación en login/register/reviews; sin configurar = pasa (dev) |
| `RESEND_API_KEY` | sí | magic links, reset password, formulario de contacto |
| `PUBLIC_BASE_URL` | sí | para armar los links de magic-link/reset en emails |
| `ALLOWED_ORIGINS` | sí | CORS del namespace público (sitio Astro) y dev |
| `ENV` | no | `production` activa logs JSON |

## Endpoints de sistema

- `GET /healthz` → `{"ok":true}` + ping a DB. Lo usa Docker healthcheck y el proxy.
