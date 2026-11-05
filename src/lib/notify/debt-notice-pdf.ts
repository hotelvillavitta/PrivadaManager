import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { DEBT_NOTICE_CONSEQUENCES } from "@/lib/fees/debt-notice-shared";
import type { DebtNoticeHouse } from "@/lib/fees/debt-notice-shared";
import { formatCurrency } from "@/lib/utils";

const PAGE_W = 612;
const PAGE_H = 792;
const LEFT = 52;
const RIGHT = 560;
const WIDTH = RIGHT - LEFT;
const TOP = 742;
const BOTTOM = 78;

const CREAM = rgb(0.957, 0.937, 0.91);
const WHITE = rgb(1, 1, 1);
const PLUM = rgb(0.31, 0.2, 0.29);
const INK = rgb(0.165, 0.11, 0.157);
const MUTED = rgb(0.353, 0.29, 0.341);
const SOFT = rgb(0.541, 0.478, 0.525);
const GOLD = rgb(0.69, 0.541, 0.353);
const BLUSH = rgb(0.973, 0.957, 0.937);
const MAUVE = rgb(0.937, 0.894, 0.925);
const LINE = rgb(0.91, 0.875, 0.839);
const WINE = rgb(0.545, 0.227, 0.227);

export type DebtNoticePdfInput = {
  houses: DebtNoticeHouse[];
  issuedOnLabel: string;
  privadaName: string;
  privadaAddress?: string | null;
  privadaEmail?: string | null;
  privadaPhone?: string | null;
};

type DrawCtx = {
  doc: PDFDocument;
  page: PDFPage;
  pages: PDFPage[];
  y: number;
  body: PDFFont;
  bodyBold: PDFFont;
  serifBold: PDFFont;
  logo: PDFImage | null;
  footer: string;
  houseNumber: string;
};

function pdfText(value: string) {
  return value
    .replaceAll("\u00A0", " ")
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("’", "'");
}

function monthsPhrase(months: number) {
  return months === 1 ? "1 mes" : `${months} meses`;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = pdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function drawRight(
  page: PDFPage,
  text: string,
  right: number,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: right - width, y, size, font, color });
}

function addPage(ctx: DrawCtx, continued: boolean) {
  const page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: CREAM,
  });
  page.drawRectangle({
    x: 28,
    y: 56,
    width: PAGE_W - 56,
    height: PAGE_H - 76,
    color: WHITE,
  });
  ctx.pages.push(page);
  ctx.page = page;
  ctx.y = TOP;
  if (continued) {
    ctx.page.drawText(
      pdfText(`Casa ${ctx.houseNumber} · aviso de adeudo`),
      { x: LEFT, y: ctx.y - 4, size: 10, font: ctx.serifBold, color: PLUM },
    );
    ctx.page.drawLine({
      start: { x: LEFT, y: ctx.y - 14 },
      end: { x: RIGHT, y: ctx.y - 14 },
      thickness: 0.6,
      color: LINE,
    });
    ctx.y -= 32;
  }
}

function need(ctx: DrawCtx, height: number) {
  if (ctx.y - height >= BOTTOM) return;
  addPage(ctx, true);
}

function drawParagraph(
  ctx: DrawCtx,
  text: string,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
  lineGap = 4,
) {
  const lines = wrap(text, font, size, WIDTH);
  for (const line of lines) {
    need(ctx, size + lineGap);
    ctx.page.drawText(line, {
      x: LEFT,
      y: ctx.y - size,
      size,
      font,
      color,
    });
    ctx.y -= size + lineGap;
  }
}

function drawHeader(ctx: DrawCtx, input: DebtNoticePdfInput) {
  const headerH = 92;
  need(ctx, headerH);
  const top = ctx.y;
  ctx.page.drawRectangle({
    x: 28,
    y: top - 8,
    width: PAGE_W - 56,
    height: 6,
    color: PLUM,
  });
  ctx.page.drawRectangle({
    x: LEFT - 8,
    y: top - headerH,
    width: WIDTH + 16,
    height: headerH - 10,
    color: BLUSH,
  });
  if (ctx.logo) {
    ctx.page.drawImage(ctx.logo, {
      x: LEFT,
      y: top - headerH + 18,
      width: 52,
      height: 52,
    });
  }
  const textX = ctx.logo ? LEFT + 66 : LEFT;
  ctx.page.drawText(pdfText(input.privadaName), {
    x: textX,
    y: top - 36,
    size: 20,
    font: ctx.serifBold,
    color: PLUM,
  });
  ctx.page.drawText("App Residencial", {
    x: textX,
    y: top - 52,
    size: 9,
    font: ctx.body,
    color: SOFT,
  });
  ctx.page.drawText("AVISO DE ADEUDO", {
    x: textX,
    y: top - 70,
    size: 8,
    font: ctx.bodyBold,
    color: GOLD,
  });
  drawRight(
    ctx.page,
    pdfText(input.issuedOnLabel),
    RIGHT,
    top - 36,
    9,
    ctx.body,
    MUTED,
  );
  ctx.y = top - headerH - 16;
}

function drawMeta(ctx: DrawCtx, input: DebtNoticePdfInput, house: DebtNoticeHouse) {
  const rows: [string, string][] = [
    ["Casa", house.houseNumber],
    ["Meses pendientes", monthsPhrase(house.months)],
    ["Fecha del aviso", input.issuedOnLabel],
  ];
  const rowH = 22;
  const boxH = rows.length * rowH + 14;
  need(ctx, boxH + 46);
  const top = ctx.y;
  ctx.page.drawRectangle({
    x: LEFT,
    y: top - boxH,
    width: WIDTH,
    height: boxH,
    color: BLUSH,
    borderColor: LINE,
    borderWidth: 0.8,
  });
  rows.forEach(([label, value], index) => {
    const baseline = top - 20 - index * rowH;
    ctx.page.drawText(label, {
      x: LEFT + 14,
      y: baseline,
      size: 10,
      font: ctx.body,
      color: MUTED,
    });
    drawRight(ctx.page, pdfText(value), RIGHT - 14, baseline, 11, ctx.bodyBold, PLUM);
  });
  ctx.y = top - boxH - 10;

  const totalH = 36;
  need(ctx, totalH);
  const totalTop = ctx.y;
  ctx.page.drawRectangle({
    x: LEFT,
    y: totalTop - totalH,
    width: WIDTH,
    height: totalH,
    color: MAUVE,
  });
  ctx.page.drawText("Adeudo total", {
    x: LEFT + 14,
    y: totalTop - 23,
    size: 11,
    font: ctx.bodyBold,
    color: PLUM,
  });
  drawRight(
    ctx.page,
    pdfText(formatCurrency(house.total)),
    RIGHT - 14,
    totalTop - 24,
    14,
    ctx.serifBold,
    WINE,
  );
  ctx.y = totalTop - totalH - 18;
}

function drawTable(ctx: DrawCtx, house: DebtNoticeHouse) {
  const rowH = 22;
  const drawHead = () => {
    need(ctx, rowH + 4);
    const top = ctx.y;
    ctx.page.drawRectangle({
      x: LEFT,
      y: top - rowH,
      width: WIDTH,
      height: rowH,
      color: MAUVE,
    });
    const baseline = top - 15;
    ctx.page.drawText("MES", {
      x: LEFT + 12,
      y: baseline,
      size: 8,
      font: ctx.bodyBold,
      color: PLUM,
    });
    drawRight(ctx.page, "MONTO", RIGHT - 92, baseline, 8, ctx.bodyBold, PLUM);
    drawRight(ctx.page, "ESTADO", RIGHT - 12, baseline, 8, ctx.bodyBold, PLUM);
    ctx.y = top - rowH;
  };

  drawHead();
  house.lines.forEach((line, index) => {
    if (ctx.y - rowH < BOTTOM) {
      addPage(ctx, true);
      drawHead();
    }
    const top = ctx.y;
    if (index % 2 === 1) {
      ctx.page.drawRectangle({
        x: LEFT,
        y: top - rowH,
        width: WIDTH,
        height: rowH,
        color: BLUSH,
      });
    }
    const baseline = top - 15;
    ctx.page.drawText(pdfText(line.label), {
      x: LEFT + 12,
      y: baseline,
      size: 10,
      font: ctx.body,
      color: INK,
    });
    drawRight(
      ctx.page,
      pdfText(line.amountLabel),
      RIGHT - 92,
      baseline,
      10,
      ctx.body,
      INK,
    );
    drawRight(ctx.page, "Pendiente", RIGHT - 12, baseline, 10, ctx.bodyBold, WINE);
    ctx.page.drawLine({
      start: { x: LEFT, y: top - rowH },
      end: { x: RIGHT, y: top - rowH },
      thickness: 0.4,
      color: LINE,
    });
    ctx.y = top - rowH;
  });

  const totalH = 28;
  if (ctx.y - totalH < BOTTOM) addPage(ctx, true);
  const top = ctx.y;
  ctx.page.drawRectangle({
    x: LEFT,
    y: top - totalH,
    width: WIDTH,
    height: totalH,
    color: BLUSH,
  });
  ctx.page.drawText("Total", {
    x: LEFT + 12,
    y: top - 18,
    size: 11,
    font: ctx.bodyBold,
    color: INK,
  });
  drawRight(
    ctx.page,
    pdfText(formatCurrency(house.total)),
    RIGHT - 12,
    top - 19,
    12,
    ctx.serifBold,
    WINE,
  );
  ctx.y = top - totalH - 20;
}

function drawHouse(ctx: DrawCtx, input: DebtNoticePdfInput, house: DebtNoticeHouse) {
  ctx.houseNumber = house.houseNumber;
  drawHeader(ctx, input);
  drawMeta(ctx, input, house);

  const names = house.recipients.map((item) => item.name).filter(Boolean);
  const hello = names.length
    ? `Hola ${names.join(", ")},`
    : `Estimado(a) residente de la Casa ${house.houseNumber}:`;
  drawParagraph(ctx, hello, 12, ctx.bodyBold, INK, 6);
  ctx.y -= 4;
  drawParagraph(
    ctx,
    `El comité registra un adeudo de ${monthsPhrase(house.months)} en las cuotas de mantenimiento de la Casa ${house.houseNumber}. Este documento es el aviso oficial. A continuación está el detalle:`,
    10,
    ctx.body,
    MUTED,
    4,
  );
  ctx.y -= 12;
  drawTable(ctx, house);

  need(ctx, 24);
  ctx.page.drawText("Consecuencias por falta de pago", {
    x: LEFT,
    y: ctx.y - 14,
    size: 13,
    font: ctx.serifBold,
    color: PLUM,
  });
  ctx.y -= 24;

  for (const item of DEBT_NOTICE_CONSEQUENCES) {
    const lines = wrap(item, ctx.body, 10, WIDTH - 18);
    const blockH = lines.length * 14 + 6;
    need(ctx, blockH);
    ctx.page.drawRectangle({
      x: LEFT,
      y: ctx.y - 10,
      width: 4,
      height: 4,
      color: GOLD,
    });
    lines.forEach((line, index) => {
      ctx.page.drawText(line, {
        x: LEFT + 14,
        y: ctx.y - 12 - index * 14,
        size: 10,
        font: ctx.body,
        color: INK,
      });
    });
    ctx.y -= blockH;
  }

  ctx.y -= 8;
  drawParagraph(
    ctx,
    "Para ponerse al corriente, contacta al tesorero o al Comité Vecinal y acuerda un plan de regularización. Tu cooperación mantiene la privada.",
    10,
    ctx.body,
    MUTED,
    4,
  );
  ctx.y -= 14;
  need(ctx, 36);
  ctx.page.drawText("Comité Vecinal", {
    x: LEFT,
    y: ctx.y - 12,
    size: 12,
    font: ctx.serifBold,
    color: PLUM,
  });
  ctx.page.drawText(pdfText(input.privadaName), {
    x: LEFT,
    y: ctx.y - 28,
    size: 10,
    font: ctx.body,
    color: MUTED,
  });
  ctx.y -= 36;
}

function stampFooters(ctx: DrawCtx) {
  const total = ctx.pages.length;
  const labelWidth = ctx.body.widthOfTextAtSize(`Página ${total} de ${total}`, 8);
  const maxFooter = PAGE_W - 80 - labelWidth;
  let footer = ctx.footer;
  if (ctx.body.widthOfTextAtSize(footer, 8) > maxFooter) {
    while (
      footer.length > 12 &&
      ctx.body.widthOfTextAtSize(`${footer}...`, 8) > maxFooter
    ) {
      footer = footer.slice(0, -1);
    }
    footer = `${footer.trimEnd()}...`;
  }
  ctx.pages.forEach((page, index) => {
    const label = `Página ${index + 1} de ${total}`;
    page.drawText(footer, {
      x: 40,
      y: 34,
      size: 8,
      font: ctx.body,
      color: SOFT,
    });
    drawRight(page, label, PAGE_W - 40, 34, 8, ctx.body, SOFT);
  });
}

export async function buildDebtNoticesPdf(input: DebtNoticePdfInput) {
  const doc = await PDFDocument.create();
  const [body, bodyBold, serifBold] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedFont(StandardFonts.TimesRomanBold),
  ]);

  let logo: PDFImage | null = null;
  try {
    const bytes = await readFile(
      path.join(process.cwd(), "public/brand/grenache-logo.png"),
    );
    logo = await doc.embedPng(bytes);
  } catch {
    logo = null;
  }

  const footer = [input.privadaName, input.privadaAddress, input.privadaPhone, input.privadaEmail]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join("  ·  ");

  const ctx: DrawCtx = {
    doc,
    page: null as unknown as PDFPage,
    pages: [],
    y: TOP,
    body,
    bodyBold,
    serifBold,
    logo,
    footer: pdfText(footer),
    houseNumber: input.houses[0]?.houseNumber ?? "",
  };

  for (const house of input.houses) {
    addPage(ctx, false);
    drawHouse(ctx, input, house);
  }

  stampFooters(ctx);
  doc.setTitle(`${input.privadaName} · Aviso de adeudo`);
  doc.setAuthor(input.privadaName);
  return doc.save();
}

export function debtNoticePdfFilename(houseNumbers: string[]) {
  if (houseNumbers.length === 1) {
    return `aviso-adeudo-casa-${houseNumbers[0]}.pdf`;
  }
  return "avisos-adeudo.pdf";
}
