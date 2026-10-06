export type GuideAction = {
  action: string;
  effect: string;
};

export type GuideSection = {
  id: string;
  title: string;
  summary: string;
  points?: string[];
  actions?: GuideAction[];
};

export const adminGuide: GuideSection[] = [
  {
    id: "organizacion",
    title: "Cómo está organizada",
    summary:
      "Hay dos capas: lo que ve el residente en la barra de arriba, y el panel de Administración, solo para cuentas con rol Admin.",
    points: [
      "La barra de arriba es la app de los vecinos: Inicio, Noticias, Reservaciones, Reportes, Directorio, Cuotas y Finanzas.",
      "El botón Admin abre el panel del comité. Ahí se cobra, se valida el dinero, se publican avisos y se atienden reportes.",
      "Un movimiento puede verse en más de un lugar. Cobrar una cuota la marca pagada en Cuotas, crea un ingreso pendiente en Tesorería y manda el comprobante por correo.",
    ],
  },
  {
    id: "quien-ve-que",
    title: "Qué ve cada tipo de usuario",
    summary:
      "El rol y el tipo de ocupación cambian el menú. El correo y las notificaciones de la app no llegan a las mismas personas.",
    actions: [
      {
        action: "Administrador",
        effect:
          "Ve todo el panel Admin y también Finanzas. Puede cobrar, publicar, aprobar reservaciones y validar ingresos.",
      },
      {
        action: "Propietario",
        effect:
          "Ve Cuotas de su casa y el resumen de Finanzas de la privada. No entra al panel Admin.",
      },
      {
        action: "Inquilino",
        effect:
          "Usa noticias, reservaciones, reportes, directorio y sus cuotas. No ve la sección Finanzas.",
      },
    ],
    points: [
      "Los correos de cobros y multas van a los propietarios de esa casa. Si la casa no tiene propietario registrado, se envían a todos los residentes de la casa.",
      "Las noticias avisan dentro de la app a los colonos. No se manda correo.",
    ],
  },
  {
    id: "avisos",
    title: "Correos y notificaciones",
    summary:
      "La campana de la app avisa de varias cosas. El correo solo sale en cuatro casos.",
    actions: [
      {
        action: "Registrar un cobro",
        effect:
          "Correo con el comprobante al propietario, y una notificación en la app. El correo sale al registrar el cobro, aunque Tesorería todavía no lo valide.",
      },
      {
        action: "Aplicar una multa",
        effect:
          "Correo con el motivo, el artículo del reglamento y el monto, más una notificación en la app.",
      },
      {
        action: "Crear un residente o generarle contraseña",
        effect:
          "Correo con una contraseña temporal y un enlace de 24 horas para elegir la suya.",
      },
      {
        action: "Olvidé mi contraseña",
        effect:
          "Si el correo está registrado, llega un enlace para cambiarla. Dura 24 horas.",
      },
      {
        action: "Publicar una noticia, aprobar una reservación o validar un ingreso",
        effect:
          "Solo notificación dentro de la app. No se envía correo.",
      },
    ],
  },
  {
    id: "dinero",
    title: "Cómo se mueve el dinero",
    summary:
      "El saldo público solo cuenta ingresos y gastos ya validados. La fecha del movimiento decide en qué mes aparece.",
    points: [
      "Cuota de mantenimiento: $200. Si se paga después del día 10 del mes de esa cuota, se suman $50 de recargo. El monto se puede ajustar al cobrar.",
      "Uso de palapa: $250 por defecto, también editable al cobrar.",
      "Ingresos del mes y Gastos del mes son del mes calendario en curso, según la fecha del movimiento. Un pago del 18 de septiembre no aparece en octubre, aunque se consulte en octubre. Sí está en Ingresos totales y en la liquidez.",
      "Ingresos publicados cuenta un movimiento por cada mes cobrado a cada casa. Un pago de todo el año son 12 ingresos aquí, aunque en otro sistema sea un solo recibo. El dinero total puede coincidir aunque el número de movimientos no.",
      "Lo importado de años anteriores entró ya validado. Por eso no aparece en Por aprobar.",
    ],
    actions: [
      {
        action: "Cobrar en Cobranza",
        effect:
          "La cuota queda pagada en el calendario de la casa. Se crea un ingreso pendiente. Todavía no suma al saldo público. Se envía el comprobante.",
      },
      {
        action: "Validar en Tesorería",
        effect:
          "El ingreso pasa a aprobado y ya suma en Finanzas, en el mes de su fecha.",
      },
      {
        action: "Descartar un pendiente",
        effect:
          "Se borra ese ingreso y se deshace el cobro: la cuota vuelve a deberse, o se elimina si era un mes futuro que solo existía por ese adelanto.",
      },
      {
        action: "Registrar un gasto o un ingreso manual",
        effect:
          "Queda en el historial. Si se guarda ya aprobado, entra de inmediato al saldo. No manda correo.",
      },
    ],
  },
  {
    id: "cobranza",
    title: "Cobranza",
    summary:
      "Sirve para registrar lo que el comité ya cobró: mantenimiento, recargo, palapa, abonos y adelantos. No deja duplicar un mes que ya está pagado.",
    actions: [
      {
        action: "Cobrar el periodo",
        effect:
          "Marca ese mes como pagado. Si incluye recargo, palapa o multas pendientes de ese mes, salen en el mismo comprobante.",
      },
      {
        action: "Abono",
        effect:
          "Aplica el dinero a los meses más antiguos que se deben. Puede incluir el mes en curso o el siguiente. Un solo comprobante.",
      },
      {
        action: "Adelanto de varios meses",
        effect:
          "Marca pagados los meses elegidos, de una vez. Un solo comprobante y un ingreso pendiente por el total.",
      },
      {
        action: "Anular un pago de cuota o de palapa",
        effect:
          "Quita el pago, devuelve el adeudo y elimina el ingreso ligado si todavía no formaba parte de otro lote.",
      },
    ],
  },
  {
    id: "calendario",
    title: "Calendario de cuotas",
    summary:
      "Matriz de casa por mes. Sirve para ver quién debe, quién pagó y para importar o exportar el concentrado.",
    points: [
      "Una celda pagada no se puede volver a cobrar desde Cobranza.",
      "Importar un concentrado actualiza el estado de las cuotas. No sustituye el paso de Tesorería de los cobros nuevos que se registren después a mano.",
      "Exportar genera el archivo del concentrado para revisarlo fuera de la app.",
    ],
  },
  {
    id: "tesoreria",
    title: "Tesorería y Finanzas",
    summary:
      "Tesorería es el control del comité. Finanzas, en la barra de arriba, es el resumen que ven propietarios y administradores.",
    actions: [
      {
        action: "Por aprobar",
        effect:
          "Lista solo ingresos pendientes. Si está vacía, no falta el historial: esos movimientos ya están validados y viven en Historial y en el saldo.",
      },
      {
        action: "Validar",
        effect: "Publica el ingreso en el saldo. No vuelve a enviar el comprobante.",
      },
      {
        action: "Descartar",
        effect: "Anula el ingreso pendiente y revierte el cobro ligado.",
      },
      {
        action: "Registrar gasto",
        effect:
          "Resta del saldo cuando queda aprobado. Ejemplos: mantenimiento de la privada, agua, luz, recarga del portón.",
      },
      {
        action: "Editar o borrar un movimiento del historial",
        effect:
          "Cambia el saldo de inmediato. Borrar un ingreso ligado a una cuota también puede revertir ese pago en el calendario.",
      },
    ],
  },
  {
    id: "analiticos",
    title: "Analíticos",
    summary:
      "Lectura de cobranza: cuánto se ha cobrado, cuánto se debe y qué casas están atrasadas. No registra pagos ni cambia el saldo.",
  },
  {
    id: "residentes",
    title: "Residentes y casas",
    summary:
      "Altas, cambios y accesos. Cada persona tiene casa, rol y tipo de ocupación.",
    actions: [
      {
        action: "Crear residente",
        effect:
          "Crea la cuenta y envía el correo de acceso con contraseña temporal.",
      },
      {
        action: "Generar contraseña",
        effect:
          "Reemplaza la contraseña anterior y vuelve a enviar el correo de acceso.",
      },
      {
        action: "Marcar como inquilino",
        effect: "Esa persona deja de ver Finanzas.",
      },
      {
        action: "Convenio de pago",
        effect:
          "La casa puede reservar la palapa aunque tenga cuotas pendientes. Sin convenio, el adeudo bloquea la reservación.",
      },
      {
        action: "Eliminar residente",
        effect: "Quita el acceso de esa persona. No borra el historial de cuotas de la casa.",
      },
    ],
  },
  {
    id: "noticias",
    title: "Noticias",
    summary:
      "Avisos del comité. Al publicar, los colonos reciben una notificación en la app. Abrir la noticia la marca como leída. No se envía correo.",
  },
  {
    id: "reservaciones",
    title: "Reservaciones",
    summary:
      "Solicitudes de palapa. Aprobar la fecha no cobra los $250 ni crea un ingreso. El cobro se registra aparte, en Cobranza.",
    points: [
      "El residente debe pedirla con al menos 7 días de anticipación. El admin puede reservar a nombre de una casa desde el día siguiente.",
      "Si la casa debe cuotas y no tiene convenio, no puede reservar.",
      "Solo puede haber una solicitud o reservación activa por fecha.",
      "Aprobar o rechazar avisa al residente en la app. El rechazo pide un motivo. No se envía correo.",
      "El aviso de la reservación pide confirmar el pago con el contacto de palapa. Hasta que alguien lo registre en Cobranza, ese dinero no está en Finanzas.",
    ],
  },
  {
    id: "directorio",
    title: "Directorio",
    summary:
      "Contactos y proveedores que ven los residentes. Crear, editar o borrar un contacto no mueve dinero ni envía correo.",
  },
  {
    id: "reportes",
    title: "Reportes",
    summary:
      "Desperfectos que reporta un vecino, con foto. El comité cambia el estado: Abierto, En revisión, Resuelto o Cerrado. Es un aviso interno; no genera cobro ni correo.",
    actions: [
      {
        action: "Cambiar estado o notas",
        effect:
          "Actualiza el seguimiento. Si pasa a Resuelto o Cerrado, el residente recibe un aviso en la app. No se envía correo.",
      },
      {
        action: "Eliminar reporte resuelto o cerrado",
        effect:
          "Borra el reporte y sus fotos del almacenamiento para liberar espacio. Los abiertos o en revisión no se pueden eliminar.",
      },
    ],
  },
  {
    id: "multas",
    title: "Multas",
    summary:
      "Sanciones del reglamento. Al emitirla se avisa por correo y en la app, y el monto se suma a la cuota del mes si ese mes ya se puede cobrar.",
    actions: [
      {
        action: "Emitir multa",
        effect:
          "Queda pendiente. Si el mes de cobro es el actual o uno anterior, se suma al adeudo de esa cuota. En un mes futuro solo queda registrada hasta que el mes sea exigible.",
      },
      {
        action: "Cobrar la cuota que incluye la multa",
        effect:
          "Si el mes queda liquidado, la multa pasa a pagada y entra en el mismo comprobante.",
      },
      {
        action: "Cobrar solo la multa",
        effect:
          "En Cobranza, junto a mantenimiento, recargo y palapa, aparece una casilla de multa cuando ese mes ya está pagado o todavía no se cobra. Al marcarla se registra solo la multa, pendiente de validar en Tesorería.",
      },
      {
        action: "Anular multa",
        effect:
          "La deja sin efecto y, si todavía no estaba pagada, resta ese monto de la cuota.",
      },
    ],
  },
  {
    id: "configuracion",
    title: "Información y personalización",
    summary:
      "Datos generales de la privada. No cambian saldos ni envían avisos.",
    points: [
      "Información: nombre de contacto, dirección, teléfono, correo, capacidad de la palapa, horarios y reglamento. La capacidad limita los invitados de una reservación.",
      "Personalización: nombre visible, logo y color de la app.",
    ],
  },
];
