/** Catálogo de faltas y extractos del Reglamento Interno Grenaché REV 04 (junio 2026). */

export type FineCategory =
  | "Estacionamiento"
  | "Áreas comunes"
  | "Convivencia"
  | "Mascotas"
  | "Seguridad"
  | "Imagen del fraccionamiento"
  | "Mantenimiento";

export type FineCause = {
  id: string;
  category: FineCategory;
  label: string;
  article: string;
  excerpt: string;
};

export const FINE_CATEGORIES: FineCategory[] = [
  "Estacionamiento",
  "Áreas comunes",
  "Convivencia",
  "Mascotas",
  "Seguridad",
  "Imagen del fraccionamiento",
  "Mantenimiento",
];

export const FINE_CAUSES: FineCause[] = [
  {
    id: "est-visitas",
    category: "Estacionamiento",
    label: "Estacionarse en cajones de visitas por tiempo mayor al permitido.",
    article: "Artículo 4",
    excerpt:
      "Artículo 4.- Queda estrictamente prohibido tener carros estacionados por más de 3 días en el área de estacionamiento destinado a visitas, estacionarse en las áreas pintadas de rojo u ocupar el espacio designado para discapacitados sin permiso. Así mismo, se prohíbe tener automóviles, remolques o camiones “yonkeados” en las áreas comunes de la privada. En caso de que algún residente no cumpla con estas normas será notificado por algún miembro del comité o residente de la privada como primer aviso para que remueva su vehículo; en caso de no remover el vehículo una vez notificado se procederá a llamar a una grúa con cargo al infractor para que sea remolcado.",
  },
  {
    id: "est-ajeno",
    category: "Estacionamiento",
    label: "Invadir el cajón de otro residente.",
    article: "Artículo 5",
    excerpt:
      "Artículo 5.- En ningún momento un residente, visita, empleado y/o trabajador deben obstruir la entrada o salida de otras residencias ni del portón de salida. Así mismo, queda prohibido estacionarse en la parte frontal de propiedades ajenas.",
  },
  {
    id: "est-obstruir",
    category: "Estacionamiento",
    label: "Obstruir la entrada o salida de otra vivienda.",
    article: "Artículo 5",
    excerpt:
      "Artículo 5.- En ningún momento un residente, visita, empleado y/o trabajador deben obstruir la entrada o salida de otras residencias ni del portón de salida. Así mismo, queda prohibido estacionarse en la parte frontal de propiedades ajenas.",
  },
  {
    id: "est-areas-comunes",
    category: "Estacionamiento",
    label: "Estacionarse en áreas comunes destinadas a otro uso.",
    article: "Artículo 3",
    excerpt:
      "Artículo 3.- Las visitas deben dejar sus vehículos en el estacionamiento destinado para visitas dentro de la privada. En caso de tener cupo lleno el estacionamiento, podrán dejar su vehículo si el residente tiene espacio disponible en su propiedad siempre y cuando no obstruya la circulación o el acceso a otro residente, de lo contrario deberá de estacionar su vehículo fuera de la privada en lugares pertinentes.",
  },
  {
    id: "est-abandonados",
    category: "Estacionamiento",
    label: "Dejar vehículos abandonados en áreas comunes.",
    article: "Artículo 4",
    excerpt:
      "Artículo 4.- Queda estrictamente prohibido tener carros estacionados por más de 3 días en el área de estacionamiento destinado a visitas… Así mismo, se prohíbe tener automóviles, remolques o camiones “yonkeados” en las áreas comunes de la privada. En caso de que algún residente no cumpla con estas normas será notificado…; en caso de no remover el vehículo una vez notificado se procederá a llamar a una grúa con cargo al infractor para que sea remolcado.",
  },
  {
    id: "ac-jardines",
    category: "Áreas comunes",
    label: "Dañar jardines, parques o áreas verdes.",
    article: "Artículo 13",
    excerpt:
      "Artículo 13.- Padres de familia y/o tutores legales serán responsables de cualquier daño ocasionado por sus hijos a las áreas verdes y/o comunes de la privada, así como a la propiedad de algún residente, por lo que deberá de cubrir los gastos que se originen para la reparación del daño ocasionado. De igual manera se exige la supervisión por parte de un adulto para evitar contratiempos y malentendidos.",
  },
  {
    id: "ac-mobiliario",
    category: "Áreas comunes",
    label: "Dañar juegos infantiles, mobiliario o instalaciones comunes.",
    article: "Artículo 7",
    excerpt:
      "Artículo 7.- … Todos los residentes y visitas deberán colaborar con la limpieza y conservación de la privada, evitando daño o destrucción de los espacios públicos.",
  },
  {
    id: "ac-basura",
    category: "Áreas comunes",
    label: "Tirar basura en áreas comunes.",
    article: "Artículos 7 y 16",
    excerpt:
      "Artículo 7.- La basura de cada vivienda debe estar colocada a la mitad de esta y en la banqueta… Todos los residentes y visitas deberán colaborar con la limpieza y conservación de la privada, evitando daño o destrucción de los espacios públicos.\n\nArtículo 16.- Queda prohibido tirar bolsas de basura, residuos residenciales y/o escombro, en los depósitos ubicados en los diferentes espacios públicos (botes de basura dentro de la palapa es exclusivamente para uso de esta).",
  },
  {
    id: "ac-objetos",
    category: "Áreas comunes",
    label:
      "Dejar objetos personales obstruyendo pasillos, banquetas o áreas comunes.",
    article: "Artículo 8",
    excerpt:
      "Artículo 8.- Queda prohibido lavar carros, mezclar cemento o almacenamiento de materiales de construcción sobre las banquetas públicas, calles o áreas comunes de la privada. En caso de ser así se les pedirá remover y colocarlo dentro de su vivienda… Sanciones: Primera vez Multa económica de $100.00… Toda multa económica debe ser pagada dentro de las primeras 24 hrs.",
  },
  {
    id: "ac-almacenamiento",
    category: "Áreas comunes",
    label: "Utilizar áreas comunes para almacenamiento.",
    article: "Artículo 8",
    excerpt:
      "Artículo 8.- Queda prohibido lavar carros, mezclar cemento o almacenamiento de materiales de construcción sobre las banquetas públicas, calles o áreas comunes de la privada. En caso de ser así se les pedirá remover y colocarlo dentro de su vivienda… Toda multa económica debe ser pagada dentro de las primeras 24 hrs.",
  },
  {
    id: "conv-horarios",
    category: "Convivencia",
    label: "Realizar fiestas o reuniones que excedan los horarios permitidos.",
    article: "Artículos 14 y 15",
    excerpt:
      "Artículo 14.- El volumen de la música dentro de una residencia debe de ser moderado, sin ser invasivo para los demás residentes, respetando los horarios establecidos, sin que sobrepase las 02:00 am en los días acordados.\n\nArtículo 15.- … Se deberá respetar los horarios de estadía. El horario de la palapa es de: Domingo a Jueves: 12:00 a las 22:00. Viernes y Sábado: 12:00 a 2:00. Toda multa económica debe ser pagada dentro de las primeras 24 hrs.",
  },
  {
    id: "conv-ruido",
    category: "Convivencia",
    label: "Generar ruido excesivo que afecte a los vecinos.",
    article: "Artículo 14",
    excerpt:
      "Artículo 14.- El volumen de la música dentro de una residencia debe de ser moderado, sin ser invasivo para los demás residentes, respetando los horarios establecidos, sin que sobrepase las 02:00 am en los días acordados. Sanciones: Primera vez una multa de 2 UMAs… Toda multa económica debe ser pagada dentro de las primeras 24 hrs.",
  },
  {
    id: "conv-agresion",
    category: "Convivencia",
    label:
      "Tener conductas agresivas o faltas de respeto hacia otros residentes o personal del fraccionamiento.",
    article: "Artículo 27",
    excerpt:
      "Artículo 27.- Es responsabilidad de todos los residentes cumplir y hacer valer el reglamento, no sólo del comité administrador.\n\nArtículo 29.- Si alguna de las normas anteriormente mencionadas es omitida o violada se cuenta con el apoyo de CONVIVE, la seguridad del Residencial y servicio de grúas necesarios para aplicar la sanción adecuada de acuerdo con la situación.",
  },
  {
    id: "conv-reglas-areas",
    category: "Convivencia",
    label: "Incumplir las reglas para el uso de áreas comunes.",
    article: "Artículo 15",
    excerpt:
      "Artículo 15.- El uso de la palapa previamente se deberá programar con la Administración y apartar la fecha requerida con mínimo una semana de anticipación… Esta deberá entregarse en las mismas condiciones que fue entregada… Únicamente los residentes que estén al corriente con su cuota de mantenimiento podrán hacer uso de la palapa… Toda multa económica debe ser pagada dentro de las primeras 24 hrs.",
  },
  {
    id: "mas-heces",
    category: "Mascotas",
    label: "No recoger las heces de las mascotas.",
    article: "Artículo 20",
    excerpt:
      "Artículo 20.- En todo momento las mascotas deben ser supervisadas y portar correa dentro de la privada. El residente tiene la obligación de limpiar y/o recoger las heces que sus mascotas realicen y son responsables por los daños que puedan ocasionar en las áreas verdes y/o comunes de la privada o a la propiedad de algún residente. Sanciones: Primera llamada levantar desechos biológicos y evidenciar… Toda multa económica debe ser pagada dentro de las primeras 24 hrs.",
  },
  {
    id: "mas-correa",
    category: "Mascotas",
    label:
      "Llevar mascotas sin correa en áreas comunes cuando el reglamento así lo establezca.",
    article: "Artículo 20",
    excerpt:
      "Artículo 20.- En todo momento las mascotas deben ser supervisadas y portar correa dentro de la privada. El residente tiene la obligación de limpiar y/o recoger las heces que sus mascotas realicen y son responsables por los daños que puedan ocasionar en las áreas verdes y/o comunes de la privada o a la propiedad de algún residente.",
  },
  {
    id: "mas-danos",
    category: "Mascotas",
    label: "Permitir que las mascotas dañen áreas verdes o mobiliario.",
    article: "Artículo 20",
    excerpt:
      "Artículo 20.- En todo momento las mascotas deben ser supervisadas y portar correa dentro de la privada. El residente tiene la obligación de limpiar y/o recoger las heces que sus mascotas realicen y son responsables por los daños que puedan ocasionar en las áreas verdes y/o comunes de la privada o a la propiedad de algún residente.",
  },
  {
    id: "seg-porton",
    category: "Seguridad",
    label: "Dañar el portón eléctrico o los sistemas de acceso.",
    article: "Artículo 1",
    excerpt:
      "Artículo 1.- El portón eléctrico y la puerta peatonal que da acceso a la privada deben permanecer cerrados en todo momento. Los residentes, visitas/invitados y empleados deben procurar su buen uso y en caso de que ocasionen daños a cualquier componente del portón y puerta peatonal deberán cubrir en su totalidad los gastos que se originen para reparar los daños ocasionados.",
  },
  {
    id: "seg-controles",
    category: "Seguridad",
    label: "Hacer mal uso de controles de acceso o tarjetas.",
    article: "Artículos 1 y 2",
    excerpt:
      "Artículo 1.- El portón eléctrico y la puerta peatonal que da acceso a la privada deben permanecer cerrados en todo momento…\n\nArtículo 2.- Queda restringido el acceso a personas ajenas a la privada, salvo con la autorización de algún residente quien deberá de darle el acceso y será responsable por las acciones de éste.",
  },
  {
    id: "seg-ingreso",
    category: "Seguridad",
    label:
      "Permitir el ingreso de personas incumpliendo los procedimientos establecidos por el reglamento.",
    article: "Artículo 2",
    excerpt:
      "Artículo 2.- Queda restringido el acceso a personas ajenas a la privada, salvo con la autorización de algún residente quien deberá de darle el acceso y será responsable por las acciones de éste. Las visitas, trabajadores, paqueterías, entre otras, deben de esperar a que los residentes abran y cierren el portón. El residente que requiera los servicios externos… tiene la obligación de darle acceso a la privada y hacerse responsable de ellos.",
  },
  {
    id: "seg-camaras",
    category: "Seguridad",
    label: "Dañar cámaras o equipo de vigilancia.",
    article: "Artículo 29",
    excerpt:
      "Artículo 29.- Si alguna de las normas anteriormente mencionadas es omitida o violada se cuenta con el apoyo de CONVIVE, la seguridad del Residencial y servicio de grúas necesarios para aplicar la sanción adecuada de acuerdo con la situación. Los residentes, visitas/invitados y empleados deben procurar el buen uso de las instalaciones de acceso y vigilancia; quien ocasione daños deberá cubrir los gastos de reparación.",
  },
  {
    id: "img-fachadas",
    category: "Imagen del fraccionamiento",
    label:
      "Modificar fachadas o elementos visibles sin la autorización requerida por el reglamento.",
    article: "Artículos 17 y 18",
    excerpt:
      "Artículo 17.- Queda estrictamente prohibido tirar basura al talud, así como alguna modificación al mismo.\n\nArtículo 18.- Queda prohibido realizar alguna modificación al cerco eléctrico; si necesita alguna modificación por reparación y/o construcción de su vivienda, favor de comunicarse al comité para su desactivación segura y adecuada.",
  },
  {
    id: "img-anuncios",
    category: "Imagen del fraccionamiento",
    label: "Colocar anuncios o publicidad donde esté prohibido.",
    article: "Artículo 7",
    excerpt:
      "Artículo 7.- … Todos los residentes y visitas deberán colaborar con la limpieza y conservación de la privada, evitando daño o destrucción de los espacios públicos. Este reglamento sirve de complemento a las normas establecidas por CONVIVE y por el “Régimen de Propiedad en Condominio”.",
  },
  {
    id: "mant-limpieza",
    category: "Mantenimiento",
    label:
      "No mantener limpia la parte que corresponda al propietario cuando el reglamento así lo establezca.",
    article: "Artículo 6",
    excerpt:
      "Artículo 6.- El residente tiene la obligación de mantener limpio el frente de su casa (banqueta y calle) en óptimas condiciones, evitando la acumulación de basura y artículos que provocan la proliferación de plagas (cucarachas, ratones, mosquitos, pulgas, etc.).",
  },
  {
    id: "mant-danos",
    category: "Mantenimiento",
    label: "Provocar daños a bienes comunes y negarse a repararlos.",
    article: "Artículos 1 y 13",
    excerpt:
      "Artículo 1.- … en caso de que ocasionen daños a cualquier componente del portón y puerta peatonal deberán cubrir en su totalidad los gastos que se originen para reparar los daños ocasionados.\n\nArtículo 13.- … serán responsables de cualquier daño ocasionado… a las áreas verdes y/o comunes de la privada, así como a la propiedad de algún residente, por lo que deberá de cubrir los gastos que se originen para la reparación del daño ocasionado.",
  },
];

export function getFineCauseById(id: string): FineCause | undefined {
  return FINE_CAUSES.find((c) => c.id === id);
}

export function getFineCausesByCategory(category: FineCategory): FineCause[] {
  return FINE_CAUSES.filter((c) => c.category === category);
}
