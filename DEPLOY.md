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
| `GMAIL_USER` | Correo Gmail del comité (comprobantes) |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación de Google (16 caracteres) |
| `EMAIL_FROM` | Opcional: `Privada Manager <tu@gmail.com>` |
| `EMAIL_REPLY_TO` | Opcional |
| `RESEND_API_KEY` | Alternativa a Gmail (ver §2c) |

4. Deploy. El `buildCommand` ya hace `prisma generate && prisma db push && next build`.

5. Si el seed no corrió en el build, ejecuta una vez en local apuntando a la misma `DATABASE_URL`:

```bash
npm run db:seed
```

## 2b. Correo desde Gmail (lo más simple, gratis)

Sirve muy bien para una privada: al registrar una cobranza, cada colono recibe el comprobante **desde tu Gmail del comité**.

**Límites orientativos de Gmail:** ~100–500 correos/día (cuenta personal). Con decenas de casas y un cobro al mes, alcanza.

Sin estas variables, el pago **igual se guarda**; solo se omite el correo.

### Paso 1 — Activar verificación en 2 pasos

1. Entra a la cuenta de Gmail del comité (ej. `comitegrenache@gmail.com`).
2. [Cuenta de Google → Seguridad](https://myaccount.google.com/security)
3. Activa **Verificación en 2 pasos** (obligatorio para app passwords).

### Paso 2 — Crear contraseña de aplicación

1. Ve a [Contraseñas de aplicaciones](https://myaccount.google.com/apppasswords)  
   (si no aparece: Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones).
2. App: **Correo** · Dispositivo: **Otro** → nombre `Privada Manager`.
3. Google te da **16 caracteres** (con espacios). Cópialos.

### Paso 3 — Variables en Vercel

Project → **Settings** → **Environment Variables** (Production + Preview):

| Variable | Ejemplo |
|---|---|
| `GMAIL_USER` | `comitegrenache@gmail.com` |
| `GMAIL_APP_PASSWORD` | `abcd efgh ijkl mnop` (pega tal cual; la app quita espacios) |
| `EMAIL_FROM` | `Privada Manager <comitegrenache@gmail.com>` (opcional) |

> **Importante:** no uses tu contraseña normal de Gmail. Solo la **contraseña de aplicación**.  
> El remitente debe ser **ese mismo Gmail** (o un alias ya configurado en Gmail).

Redeploy. Registra un cobro de prueba y revisa la bandeja del residente (y spam la primera vez).

### Checklist Gmail

- [ ] 2 pasos activado
- [ ] App password creada
- [ ] `GMAIL_USER` + `GMAIL_APP_PASSWORD` en Vercel
- [ ] Cobro de prueba → llega el correo
- [ ] Si falla el correo, la cobranza no debe romperse

## 2c. Alternativa: Resend (si creces o quieres dominio propio)

Plan **Free**: 3 000 correos/mes. Útil si Gmail te marca spam o mandas mucho volumen.

1. [resend.com](https://resend.com) → API Key (`re_...`).
2. Pruebas: `EMAIL_FROM="Privada Manager <onboarding@resend.dev>"` (solo a tu propio correo).
3. Producción: **Domains** → agregar dominio → DNS (SPF/DKIM) → Verified →  
   `EMAIL_FROM="Privada Manager <noreply@tudominio.com>"`.

Si existen **ambas** configs, la app usa **Gmail primero**.

WhatsApp para recibos, reservaciones y noticias se habilitará después (`WHATSAPP_ENABLED`).

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
