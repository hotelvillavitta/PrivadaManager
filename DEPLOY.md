# Deploy — Grenaché en Vercel

La app está preparada para **Vercel + Postgres (Neon)** + **Vercel Blob** (documentos).

## 1. Base de datos (Neon)

1. Crea un proyecto gratis en [neon.tech](https://neon.tech).
2. Copia la connection string (**pooled** o direct) con `?sslmode=require`.
3. En local, ponla en `.env`:

```env
DATABASE_URL="postgresql://...@.../neondb?sslmode=require"
AUTH_SECRET="un-secreto-largo-aleatorio"
AUTH_TRUST_HOST="true"
```

4. Inicializa datos:

```bash
npx prisma db push
npm run db:seed
```

## 2. Vercel

1. Sube el repo a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New Project** → importa el repo.
3. Variables de entorno (Production + Preview):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Connection string de Neon |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_URL` | `https://tu-proyecto.vercel.app` (o tu dominio) |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob (Storage → Blob) |

4. Deploy. El `buildCommand` ya hace `prisma generate && prisma db push && next build`.

5. Si el seed no corrió en el build, ejecuta una vez en local apuntando a la misma `DATABASE_URL`:

```bash
npm run db:seed
```

## Actualizaciones sin reinstalar

La app está configurada para que **cada deploy nuevo llegue a todos los usuarios** sin borrar/reinstalar:

- HTML y datos: `Cache-Control` / `Vercel-CDN-Cache-Control: no-store`
- Rutas dinámicas (`force-dynamic`)
- El cliente consulta `/api/version` y **recarga solo** cuando hay un deploy distinto
- Se desregistran service workers/cachés viejos si existían

Los archivos de `/_next/static/*` sí se cachean (tienen hash en el nombre); al desplegar, el HTML apunta a los hashes nuevos.
## 3. Cuentas demo (cambiar en producción)

| Rol | Email | Password |
|---|---|---|
| Colono | `juan@grenache.mx` | `demo1234` |
| Admin | `admin@grenache.mx` | `demo1234` |

## 4. Desarrollo local

- Usa la misma Neon DB o una rama/branch de Neon.
- Sin `BLOB_READ_WRITE_TOKEN`, los archivos van a `public/uploads/` (solo local).

## Alternativa: Railway / Docker

Si prefieres SQLite + disco, revierte `provider` a `sqlite` y usa el `Dockerfile`. En Vercel no se recomienda SQLite.
