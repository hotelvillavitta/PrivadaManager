# Grenaché — Portal Residencial

App de gestión para la privada **Grenaché**: auth, noticias (con documentos), reservaciones, directorio, cuotas, finanzas y panel admin.

> **Importante:** trabaja desde `~/Projects/Gestion-de-Privadas`  
> No uses la copia del Desktop (iCloud rompe `npm run dev`).

## Arranque local

```bash
cd ~/Projects/Gestion-de-Privadas
npm install
cp .env.example .env   # si no existe .env
npm run db:reset       # primera vez
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Cuentas demo

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Colono | `juan@grenache.mx` | `demo1234` |
| Admin | `admin@grenache.mx` | `demo1234` |

## Módulos

- `/` Inicio
- `/noticias` Comunicados + reacciones + **subida de PDF/imagen**
- `/comunidad` Notificaciones
- `/reservaciones` Calendario palapa
- `/directorio` Proveedores
- `/cuotas` Historial por casa
- `/finanzas` Resumen
- `/admin` Panel del comité

## Deploy

Ver [DEPLOY.md](./DEPLOY.md).

## Stack

Next.js 16 · Auth.js · Prisma · SQLite · Tailwind · TypeScript
