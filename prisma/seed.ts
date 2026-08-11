import { PrismaClient, FeeStatus, NewsCategory, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.newsReaction.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.newsPost.deleteMany();
  await prisma.monthlyFee.deleteMany();
  await prisma.financeEntry.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.user.deleteMany();
  await prisma.privadaSettings.deleteMany();

  await prisma.privadaSettings.create({
    data: {
      id: 1,
      name: "Grenaché",
      address: "Priv. Grenache 4176, Fracc. Viñas del Mar",
      phone: "+52 (664) 356-4100",
      email: "comitegrenche@gmail.com",
      tagline:
        "Comunidad residencial comprometida con la excelencia y el bienestar de todos sus residentes.",
    },
  });

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const juan = await prisma.user.create({
    data: {
      email: "juan@grenache.mx",
      passwordHash,
      firstName: "Juan Carlos",
      lastName: "Narvaez",
      role: Role.COLONO,
      houseNumber: "48",
      accessCode: "PEATONAL 4875# PORTON 4800#",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@grenache.mx",
      passwordHash,
      firstName: "Comité",
      lastName: "Grenaché",
      role: Role.ADMIN,
      houseNumber: "21",
      accessCode: "PEATONAL 2100# PORTON 2101#",
    },
  });

  const news = [
    {
      title: "PAGO MTTO. AGOSTO",
      body: "Respetar fechas y horarios, pago en casa 21.",
      category: NewsCategory.AVISO,
      hasDocument: true,
      publishedAt: new Date("2026-07-29"),
    },
    {
      title: "App ELDES Gates",
      body: "Ya disponible la app para apertura de portones. Solicita tu acceso en caseta.",
      category: NewsCategory.IMPORTANTE,
      hasDocument: true,
      publishedAt: new Date("2026-07-22"),
    },
    {
      title: "RESERVACION DE PALAPA",
      body: "Consulta disponibilidad y reserva el área común desde el portal.",
      category: NewsCategory.COMUNIDAD,
      hasDocument: false,
      publishedAt: new Date("2026-07-15"),
    },
    {
      title: "REGLAMENTO INTERNO",
      body: "Actualización del reglamento interno vigente para todos los residentes.",
      category: NewsCategory.REGLAMENTO,
      hasDocument: true,
      publishedAt: new Date("2026-07-01"),
    },
    {
      title: "RECOLECCION DE BASURA",
      body: "Horarios de recolección: martes y viernes de 7:00 a 10:00 am.",
      category: NewsCategory.MANTENIMIENTO,
      hasDocument: false,
      publishedAt: new Date("2026-06-28"),
    },
  ];

  for (const item of news) {
    await prisma.newsPost.create({
      data: { ...item, authorId: admin.id },
    });
  }

  await prisma.provider.createMany({
    data: [
      {
        name: "Carlo Gameros",
        role: "Secretario Casa 12",
        phone: "6647935533",
        category: "Comité",
      },
      {
        name: "Casa Club",
        role: "Administradora Casa 18",
        phone: "6643564100",
        category: "Servicios",
      },
      {
        name: "Caseta de Vigilancia",
        role: "Seguridad 24 hrs",
        phone: "6641234567",
        category: "Seguridad",
      },
      {
        name: "Oficina Convive",
        role: "Tesorera Casa 21",
        phone: "6649876543",
        email: "admon_vinasmar@outlook.com",
        category: "Otro",
      },
      {
        name: "Jardinería Verde",
        role: "Mantenimiento de áreas verdes",
        phone: "6645551212",
        category: "Servicios",
      },
      {
        name: "Plomería Rápida",
        role: "Proveedor recomendado",
        phone: "6644443322",
        category: "Proveedores",
      },
    ],
  });

  await prisma.reservation.createMany({
    data: [
      {
        date: "2026-08-09",
        eventName: "Reunión familiar",
        guests: 30,
        status: "APPROVED",
        userId: juan.id,
        notes: "Celebración familiar",
      },
      {
        date: "2026-08-29",
        eventName: "Evento del comité",
        guests: 40,
        status: "APPROVED",
        userId: admin.id,
      },
      {
        date: "2026-08-15",
        eventName: "Cumpleaños",
        guests: 25,
        status: "PENDING",
        userId: juan.id,
      },
    ],
  });

  // Fees for house 48: paid from Aug 2021 through Aug 2026
  const feeRows: {
    houseNumber: string;
    year: number;
    month: number;
    status: FeeStatus;
    amount: number;
    paidAt: Date | null;
  }[] = [];

  for (let year = 2021; year <= 2026; year++) {
    const start = year === 2021 ? 8 : 1;
    const end = year === 2026 ? 8 : 12;
    for (let month = start; month <= end; month++) {
      feeRows.push({
        houseNumber: "48",
        year,
        month,
        status: FeeStatus.PAGADO,
        amount: 200,
        paidAt: new Date(year, month - 1, 5),
      });
    }
  }

  await prisma.monthlyFee.createMany({ data: feeRows });

  const now = new Date();
  await prisma.financeEntry.createMany({
    data: [
      {
        type: "INGRESO",
        category: "Cuotas",
        description: "Cobranza mensual",
        amount: 17810,
        date: now,
      },
      {
        type: "INGRESO",
        category: "Cuotas",
        description: "Ingresos históricos acumulados",
        amount: 968035,
        date: new Date("2025-12-31"),
      },
      {
        type: "GASTO",
        category: "Mantenimiento",
        description: "Gastos del mes",
        amount: 3850,
        date: now,
      },
      {
        type: "GASTO",
        category: "Operación",
        description: "Gastos históricos acumulados",
        amount: 873777,
        date: new Date("2025-12-31"),
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: juan.id,
        title: "Bienvenido al portal",
        body: "Ya puedes consultar cuotas, noticias y reservar la palapa.",
      },
      {
        userId: juan.id,
        title: "Pago registrado",
        body: "Tu cuota de agosto 2026 quedó marcada como pagada.",
      },
      {
        userId: juan.id,
        title: "Reservación pendiente",
        body: "Tu solicitud del 15 de agosto está en revisión.",
      },
    ],
  });

  console.log("Seed OK");
  console.log("Colono: juan@grenache.mx / demo1234");
  console.log("Admin:  admin@grenache.mx / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
