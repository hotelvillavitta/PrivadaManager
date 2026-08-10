# Deploy — Grenaché

## Opción recomendada (rápida): Railway / Render / VPS

El proyecto usa **SQLite** + archivos en `public/uploads`. En serverless puro (Vercel) SQLite y uploads locales no persisten bien.

1. Crea un servicio Node con disco persistente.
2. Variables de entorno:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="genera-un-secreto-largo"
AUTH_TRUST_HOST="true"
```

3. Build / start:

```bash
npm ci
npx prisma generate
npx prisma db push
npm run db:seed   # solo la primera vez
npm run build
npm run start
```

Con `output: "standalone"` también puedes usar el `Dockerfile` incluido.

## Opción Vercel + Neon (Postgres)

1. Crea un proyecto en [Neon](https://neon.tech) y copia la connection string.
2. En `prisma/schema.prisma` cambia:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. En Vercel agrega:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
AUTH_TRUST_HOST="true"
```

4. Build command:

```bash
prisma generate && prisma db push && next build
```

5. Para documentos en producción, migra uploads a un storage (Vercel Blob / S3). Localmente siguen en `public/uploads`.

## Dominio

Apunta `residex` o el dominio de tu privada al servicio desplegado y actualiza `AUTH_URL` si Auth.js lo pide en producción.
