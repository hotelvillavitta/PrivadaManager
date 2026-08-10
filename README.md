# Grenaché — Portal Residencial

App funcional de gestión para la privada **Grenaché**: autenticación, base de datos SQLite, noticias, reservaciones, directorio, cuotas y finanzas.

## Arranque

```bash
npm install
cp .env.example .env
npm run db:reset
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Cuentas demo

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Colono | `juan@grenache.mx` | `demo1234` |
| Admin | `admin@grenache.mx` | `demo1234` |

También puedes registrarte como nuevo colono desde `/login`.

## Qué puede hacer cada rol

**Colono**
- Ver noticias y reaccionar
- Solicitar reservación de palapa
- Consultar directorio, cuotas de su casa y finanzas
- Ver y marcar notificaciones

**Administrador**
- Publicar comunicados
- Aprobar / rechazar reservaciones
- Agregar proveedores
- Registrar cuotas y movimientos financieros

## Scripts

- `npm run db:push` — aplica el schema
- `npm run db:seed` — carga datos demo
- `npm run db:reset` — reinicia la base y siembra de nuevo

## Stack

Next.js 16 · Auth.js · Prisma · SQLite · Tailwind · TypeScript
