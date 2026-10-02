'use client';

import React from 'react';
import { User, CreditCard, Phone, Package, Wrench, Boxes } from 'lucide-react';
import { formatMotorModelAndCylinders } from '@/lib/utils';
import { Order, Client } from '@/lib/store';

interface OSPrintReportProps {
  order: Order;
  client: Client | null;
  motors: Array<{ model: string; cylinders: string; displacement: string }>;
  getEntries: () => any[];
  formatDate: (dateStr: string) => string;
}

export function OSPrintReport({
  order,
  client,
  motors,
  getEntries,
  formatDate,
}: OSPrintReportProps) {
  const getFormattedEmissionDate = () => {
    if (order.arrivalDate) {
      try {
        const parts = order.arrivalDate.split('-');
        if (parts.length === 3) {
          const year = parts[0];
          const month = parts[1];
          const day = parts[2];
          return `${day}/${month}/${year}`;
        }
      } catch (e) {}
    }
    if (!order.createdAt) return '';
    try {
      const d = new Date(order.createdAt);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return '';
    }
  };

  const cleanObservations = order.observations
    ? order.observations.replace(/\[ENTRADAS_JSON:\[[\s\S]*?\]\]/i, '').trim()
    : '';

  const activeEntries = getEntries().filter((e: any) => (parseFloat(e.amount) || 0) > 0);

  const getMotorDisplayList = (): string[] => {
    if (!order.motorModel) return [];
    const models = order.motorModel.split(', ');
    const displacements = order.displacement ? order.displacement.split(', ') : [];

    return models.map((m, idx) => {
      const cylindersMatch = m.match(/\((\d+)\s*(?:CIL|cil|Cil|Cilindros|cilindros)?\)/i);
      const cylinders = cylindersMatch ? `${cylindersMatch[1]} CIL` : '';
      const model = m.replace(/\s*\(.*\)/, '').trim().toUpperCase();
      const disp = displacements[idx]?.trim() || '';

      let res = model;
      if (disp) {
        res += ` ${disp}`;
      }
      if (cylinders) {
        res += ` ${cylinders}`;
      }
      return res;
    });
  };
  const motorDisplayList = getMotorDisplayList();

  const partsLeftDisplay = order.partsLeft && order.partsLeft.length > 0
    ? order.partsLeft.map((p: string) => {
      const [name, qtyStr] = p.includes('|') ? p.split('|') : [p, '1'];
      const qty = parseInt(qtyStr, 10) || 1;
      const nameUpper = name.toUpperCase().trim();
      return qty > 1 ? `${nameUpper} X${qty}` : nameUpper;
    }).join(' / ')
    : '';

  const additionalPartsList = order.additionalParts && order.additionalParts.length > 0
    ? order.additionalParts.map((p: string) => {
      const [name] = p.includes('|') ? p.split('|') : [p];
      return name.toUpperCase();
    })
    : [];

  const totalServicos = order.totalValue || 0;
  const discount = Number(order.discount) || 0;
  const netValue = order.netValue || (totalServicos - discount);
  const hasDiscount = discount > 0;
  const valorAVista = netValue;

  const isQuitado = order.paymentStatus === 'Pago';

  let clearingEntry: any = null;
  if (isQuitado) {
    let runningSum = 0;
    for (const entry of activeEntries) {
      runningSum += (parseFloat(entry.amount) || 0);
      if (runningSum >= netValue) {
        clearingEntry = entry;
        break;
      }
    }
    if (!clearingEntry && activeEntries.length > 0) {
      clearingEntry = activeEntries[activeEntries.length - 1];
    }
  }

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getQuitadoDetails = () => {
    if (activeEntries.length === 0) {
      return `Forma de Pagamento: ${clearingEntry?.method || '—'} | Data: ${clearingEntry?.date ? formatDate(clearingEntry.date) : '—'}`;
    }
    if (activeEntries.length === 1) {
      const entry = activeEntries[0];
      return `Forma de Pagamento: ${(entry.method || '—').toUpperCase()} | Data: ${entry.date ? formatDate(entry.date) : '—'}`;
    }

    const firstDate = activeEntries[0].date;
    const allSameDate = activeEntries.every((e: any) => e.date === firstDate);

    if (allSameDate) {
      const methodsStr = activeEntries.map((e: any) => {
        return (e.method || '—').toUpperCase();
      }).join(' e ');
      const dateStr = firstDate ? formatDate(firstDate) : '—';
      return `Forma de Pagamento: ${methodsStr} | Data: ${dateStr}`;
    } else {
      const details = activeEntries.map((e: any) => {
        const method = (e.method || '—').toUpperCase();
        const dateStr = e.date ? formatDate(e.date) : '—';
        return `${method} em ${dateStr}`;
      }).join(' e ');
      return `Forma de Pagamento: ${details}`;
    }
  };

  const rawOsNum = String(order.osNumber || order.id || '0');
  const formattedOsNum = rawOsNum.padStart(5, '0');

  const commonServices = (order.services || []).filter(
    (s: any) => s.motorId === 'all' || s.motorId === null
  );
  const commonSubtotal = commonServices.reduce(
    (acc: number, s: any) => acc + ((s.value || 0) * (s.quantity || 1)),
    0
  );

  const hasMultipleMotors = motors && motors.length >= 2;
  const hasAssignedMotorServices = (order.services || []).some(
    (s: any) => s.motorId !== undefined && s.motorId !== null && s.motorId !== ''
  );
  const shouldGroupServices = hasMultipleMotors && (hasAssignedMotorServices || commonServices.length > 0);

  return (
    <div className="os-classic-print">
      <style dangerouslySetInnerHTML={{
        __html: `
          @page {
            size: A4 portrait;
            margin: 0;
          }

          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              width: 210mm !important;
              height: 297mm !important;
              overflow: visible !important;
            }
            
            body > *:not(#print-os-report) {
              display: none !important;
            }

            #print-os-report {
              display: block !important;
              position: relative !important;
              left: auto !important;
              top: auto !important;
              width: 210mm !important;
              min-height: 297mm !important;
              height: auto !important;
              z-index: 99999 !important;
              pointer-events: auto !important;
              background: #ffffff !important;
            }

            .os-classic-print {
              width: 210mm !important;
              min-height: 297mm !important;
              padding: 10mm 12mm !important;
            }
          }

          .os-classic-print {
            width: 210mm;
            min-height: 297mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            color: #000000;
            padding: 10mm 12mm;
            box-sizing: border-box;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9pt;
            line-height: 1.3;
          }

          .os-classic-print * {
            color: #000000 !important;
            border-color: #aaaaaa !important;
            box-sizing: border-box;
            color-scheme: light !important;
          }

          /* ─── HEADER ─── */
          .osc-header {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 12pt;
          }

          .osc-header-left {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            gap: 12pt;
          }

          .osc-logo {
            width: 60pt;
            height: 65pt;
            flex-shrink: 0;
            object-fit: contain;
          }

          .osc-company-info {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 1pt;
          }

          .osc-company-name {
            font-size: 17pt;
            font-weight: 900;
            letter-spacing: 0.02em;
            margin: 0 0 1pt 0;
            text-transform: uppercase;
            line-height: 1.1;
          }

          .osc-company-slogan {
            font-size: 9.5pt;
            font-weight: 900;
            color: #cc1111 !important;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin: 0 0 4pt 0;
          }

          .osc-company-detail {
            font-size: 8.5pt;
            font-weight: 700;
            margin: 0;
            line-height: 1.4;
            text-transform: uppercase;
          }

          .osc-company-detail span.label {
            font-weight: 900;
          }

          .osc-company-phone {
            font-size: 10.5pt;
            font-weight: 900;
            margin: 3pt 0 0 0;
            line-height: 1.3;
            text-transform: uppercase;
          }

          .osc-company-phone span.label {
            font-weight: 900;
          }

          .osc-os-box {
            border: 1px solid #aaaaaa !important;
            border-radius: 4pt;
            padding: 6pt 10pt;
            min-width: 120pt;
            text-align: left;
            flex-shrink: 0;
            background: #ffffff;
          }

          .osc-os-title {
            font-size: 11pt;
            font-weight: 900;
            text-transform: uppercase;
            margin-bottom: 2pt;
          }

          .osc-os-number {
            font-size: 17pt;
            font-weight: 900;
            color: #cc1111 !important;
            margin-bottom: 6pt;
            letter-spacing: 0.02em;
            line-height: 1;
          }

          .osc-os-date-row {
            display: flex;
            flex-direction: column;
            gap: 1pt;
          }

          .osc-os-date-label {
            font-size: 7.5pt;
            font-weight: 900;
            text-transform: uppercase;
            display: flex;
            align-items: center;
            gap: 2pt;
          }

          .osc-os-date-value {
            font-size: 9pt;
            font-weight: 700;
          }

          /* ─── DADOS DO CLIENTE CONTAINER ─── */
          .osc-client-container {
            border: 1px solid #aaaaaa;
            border-radius: 4pt;
            padding: 6pt 8pt 8pt 8pt;
            margin-bottom: 10pt;
            background: #ffffff;
          }

          .osc-client-container-header {
            font-size: 9.5pt;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin-bottom: 6pt;
          }

          .osc-client-cards-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 6pt;
            width: 100%;
          }

          .osc-client-card {
            border: 1px solid #d0d0d0 !important;
            border-radius: 4pt;
            padding: 5pt 7pt;
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            gap: 6pt;
            background: #ffffff;
            min-width: 0;
          }

          .osc-client-card-icon {
            width: 16pt;
            height: 16pt;
            border-radius: 3.5pt;
            background: #f1f5f9 !important;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border: none !important;
            margin-top: 1pt;
          }

          .osc-client-card-icon svg {
            width: 9.5pt;
            height: 9.5pt;
            color: #1e293b !important;
            stroke-width: 2.2;
          }

          .osc-client-card-info {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            min-width: 0;
            flex: 1;
          }

          .osc-client-card-label {
            font-size: 7.5pt;
            font-weight: 700;
            color: #64748b !important;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            line-height: 1.1;
            margin-bottom: 2pt;
          }

          .osc-client-card-value {
            font-size: 9pt;
            font-weight: 900;
            color: #000000 !important;
            text-transform: uppercase;
            line-height: 1.15;
            word-break: break-word;
          }

          /* ─── SERVICES BOX & TABLE ─── */
          .osc-services-box {
            border: 1px solid #aaaaaa;
            border-radius: 4pt;
            margin-bottom: 10pt;
            overflow: hidden;
            background: #ffffff;
          }

          .osc-section-header {
            background: #f5f5f5;
            border-bottom: 1px solid #aaaaaa;
            padding: 5pt 8pt;
            font-size: 9.5pt;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }

          .osc-services-table {
            width: 100%;
            border-collapse: collapse;
          }

          .osc-services-table th {
            background: #f5f5f5;
            border-bottom: 1px solid #aaaaaa;
            padding: 5pt 8pt;
            font-size: 8.5pt;
            font-weight: 900;
            text-transform: uppercase;
            text-align: left;
            letter-spacing: 0.03em;
          }

          .osc-services-table th.right {
            text-align: right;
          }

          .osc-services-table td {
            padding: 6pt 8pt;
            font-size: 9pt;
            font-weight: 600;
            border-bottom: 1px solid #e0e0e0;
            vertical-align: middle;
          }

          .osc-services-table td.right {
            text-align: right;
            font-family: Arial, Helvetica, monospace;
            font-weight: 700;
          }

          .osc-services-table td.name-col {
            text-transform: uppercase;
            font-weight: 700;
          }

          .osc-services-table tr:last-child td {
            border-bottom: none;
          }

          /* ─── FINANCIAL SUMMARY ─── */
          .osc-summary {
            width: 220pt;
            margin-left: auto;
            margin-bottom: 10pt;
            border: 1px solid #aaaaaa;
            border-radius: 4pt;
            overflow: hidden;
            background: #ffffff;
          }

          .osc-summary-table {
            width: 100%;
            border-collapse: collapse;
          }

          .osc-summary-table td {
            padding: 5pt 8pt;
            white-space: nowrap;
          }

          .osc-summary-table tr {
            border-bottom: 1px solid #e0e0e0;
          }

          .osc-services-total-row td {
            background: #f5f5f5 !important;
            font-weight: 900 !important;
            font-size: 8.5pt !important;
            border-top: 1px solid #aaaaaa !important;
            padding: 4pt 8pt;
          }

          .osc-summary-table tr:last-child {
            border-bottom: none;
          }

          .osc-summary-table td.s-label {
            font-size: 9pt;
            font-weight: 900;
            text-transform: uppercase;
            text-align: left;
            width: 55%;
            border-right: 1px solid #e0e0e0;
          }

          .osc-summary-table td.s-value {
            font-size: 9.5pt;
            font-weight: 700;
            text-align: right;
            width: 45%;
          }

          .osc-summary-table tr.total-row {
            background: #f8f8f8;
            border-top: 1px solid #aaaaaa !important;
          }

          .osc-summary-table tr.total-row td.s-label {
            font-size: 10pt;
            font-weight: 900;
          }

          .osc-summary-table tr.total-row td.s-value {
            font-size: 13pt;
            font-weight: 900;
          }

          /* ─── PAYMENT ─── */
          .osc-payment-row {
            display: flex;
            flex-direction: row;
            gap: 0;
            margin-bottom: 10pt;
          }

          .osc-payment-box {
            flex: 1 1 50%;
            border: 1px solid #aaaaaa;
            border-radius: 4pt;
          }

          .osc-payment-box + .osc-payment-box {
            margin-left: 6pt;
          }

          .osc-payment-quitado-box {
            width: 100%;
            border: 1px solid #2e7d32 !important;
            background-color: #f5f5f5;
            padding: 8pt;
            text-align: center;
            margin-bottom: 10pt;
            border-radius: 4pt;
          }

          .osc-payment-quitado-title {
            font-size: 9.5pt;
            font-weight: 900;
            color: #2e7d32 !important;
            text-transform: uppercase;
            margin-bottom: 3pt;
          }

          .osc-payment-quitado-details {
            font-size: 9pt;
            font-weight: 700;
            color: #424242 !important;
          }

          .osc-payment-header {
            background: #f5f5f5;
            border-bottom: 1px solid #aaaaaa;
            padding: 4pt 6pt;
            font-size: 8.5pt;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }

          .osc-payment-field {
            display: flex;
            flex-direction: row;
            align-items: center;
            border-bottom: 1px solid #e0e0e0;
            padding: 4pt 6pt;
          }

          .osc-payment-field:last-child {
            border-bottom: none;
          }

          .osc-payment-field-label {
            font-size: 8.5pt;
            font-weight: 900;
            text-transform: uppercase;
            width: 55pt;
            flex-shrink: 0;
          }

          .osc-payment-field-value {
            font-size: 9pt;
            font-weight: 600;
            flex: 1;
          }

          /* ─── OBSERVATIONS (if any) ─── */
          .osc-obs-section {
            border: 1px solid #aaaaaa;
            border-radius: 4pt;
            margin-bottom: 10pt;
            overflow: hidden;
            background: #ffffff;
          }

          .osc-obs-body {
            padding: 6pt 8pt;
            font-size: 8.5pt;
            font-style: italic;
            font-weight: 500;
            line-height: 1.4;
          }

          /* ─── FOOTER SECTION ─── */
          .osc-footer-section {
            margin-top: auto;
            display: flex;
            flex-direction: column;
            width: 100%;
          }

          /* ─── SIGNATURE ─── */
          .osc-signature {
            margin-bottom: 14pt;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0;
            width: 100%;
          }

          .osc-signature-line {
            width: 220pt;
            border-bottom: 1px solid #000000;
            margin-bottom: 4pt;
          }

          .osc-signature-label {
            font-size: 9pt;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            text-align: center;
          }

          /* ─── TERMS ─── */
          .osc-terms {
            border: 1px solid #aaaaaa;
            border-radius: 4pt;
            padding: 6pt 8pt;
            font-size: 7.5pt;
            line-height: 1.35;
            text-align: justify;
            margin-bottom: 0;
            background: #ffffff;
          }

          .osc-terms-title {
            font-size: 8pt;
            font-weight: 900;
            text-transform: uppercase;
            border-bottom: 1px solid #aaaaaa;
            margin-bottom: 5pt;
            padding-bottom: 3pt;
            letter-spacing: 0.02em;
          }

          .osc-terms-text {
            font-weight: 500;
          }

          .osc-terms-item {
            margin-bottom: 4pt;
          }

          .osc-terms-item:last-child {
            margin-bottom: 0;
          }

          .osc-terms-item-title {
            font-weight: 900;
            text-transform: uppercase;
          }
        `
      }} />

      {/* ═══ TOP CONTENT WRAPPER ═══ */}
      <div className="osc-top-content">
        {/* ═══ HEADER ═══ */}
        <div className="osc-header">
          {/* Left: Logo + Company Info */}
          <div className="osc-header-left">
            <img src="/logo.png" className="osc-logo" alt="Logo" />

            <div className="osc-company-info">
              <h1 className="osc-company-name">RETÍFICA MENDONÇA</h1>
              <p className="osc-company-slogan">FORÇA TOTAL EM MOTORES</p>
              <p className="osc-company-detail">
                <span className="label">ENDEREÇO:</span> RUA LEOPOLDO MACHADO, 316
              </p>
              <p className="osc-company-detail">
                <span className="label">BAIRRO:</span> JESUS DE NAZARÉ &nbsp;–&nbsp; <span className="label">CEP:</span> 68908-320
              </p>
              <p className="osc-company-phone">
                <span className="label">TELEFONE:</span> (96) 99173-2557
              </p>
            </div>
          </div>

          {/* Right: OS Number Box */}
          <div className="osc-os-box">
            <div className="osc-os-title">O.S. Nº</div>
            <div className="osc-os-number">{formattedOsNum}</div>
            <div className="osc-os-date-row">
              <span className="osc-os-date-label">📅 DATA DE EMISSÃO:</span>
              <span className="osc-os-date-value">{getFormattedEmissionDate()}</span>
            </div>
          </div>
        </div>

        {/* ═══ DADOS DO CLIENTE ═══ */}
        <div className="osc-client-container">
          <div className="osc-client-container-header">DADOS DO CLIENTE</div>
          <div className="osc-client-cards-grid">
            {/* Card 1: Nome */}
            <div className="osc-client-card">
              <div className="osc-client-card-icon">
                <User />
              </div>
              <div className="osc-client-card-info">
                <span className="osc-client-card-label">NOME</span>
                <span className="osc-client-card-value">
                  {client?.name || ''}
                </span>
              </div>
            </div>

            {/* Card 2: CPF */}
            <div className="osc-client-card">
              <div className="osc-client-card-icon">
                <CreditCard />
              </div>
              <div className="osc-client-card-info">
                <span className="osc-client-card-label">CPF</span>
                <span className="osc-client-card-value">
                  {client?.document?.trim() || ''}
                </span>
              </div>
            </div>

            {/* Card 3: Telefone */}
            <div className="osc-client-card">
              <div className="osc-client-card-icon">
                <Phone />
              </div>
              <div className="osc-client-card-info">
                <span className="osc-client-card-label">TELEFONE</span>
                <span className="osc-client-card-value">
                  {client?.phone || ''}
                </span>
              </div>
            </div>

            {/* Card 4: Material Deixado */}
            <div className="osc-client-card">
              <div className="osc-client-card-icon">
                <Package />
              </div>
              <div className="osc-client-card-info">
                <span className="osc-client-card-label">MATERIAL DEIXADO</span>
                <span className="osc-client-card-value">
                  {partsLeftDisplay || ''}
                </span>
              </div>
            </div>

            {/* Card 5: Motor */}
            <div className="osc-client-card">
              <div className="osc-client-card-icon">
                <Wrench />
              </div>
              <div className="osc-client-card-info">
                <span className="osc-client-card-label">MOTOR</span>
                <span className="osc-client-card-value">
                  {motorDisplayList.length > 0 ? (
                    motorDisplayList.map((m, idx) => (
                      <div key={idx}>{m}</div>
                    ))
                  ) : (
                    ''
                  )}
                </span>
              </div>
            </div>

            {/* Card 6: Peças Adicionais */}
            <div className="osc-client-card">
              <div className="osc-client-card-icon">
                <Boxes />
              </div>
              <div className="osc-client-card-info">
                <span className="osc-client-card-label">PEÇAS ADICIONAIS</span>
                <span className="osc-client-card-value">
                  {additionalPartsList.length > 0 ? additionalPartsList.join(' - ') : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ OBSERVAÇÕES (se houver) ═══ */}
        {cleanObservations ? (
          <div className="osc-obs-section">
            <div className="osc-section-header">OBSERVAÇÕES</div>
            <div className="osc-obs-body">{cleanObservations}</div>
          </div>
        ) : null}

        {/* ═══ SERVIÇOS ═══ */}
        {shouldGroupServices ? (
          <>
            {/* ── SERVIÇOS COMUNS — TODOS OS MOTORES ── */}
            {commonServices.length > 0 && (
              <div className="osc-services-box" style={{ marginBottom: '10pt' }}>
                <div className="osc-section-header">
                  SERVIÇOS COMUNS — TODOS OS MOTORES
                </div>
                <table className="osc-services-table">
                  <thead>
                    <tr>
                      <th style={{ width: '35pt' }}>QTD.</th>
                      <th>NOME</th>
                      <th className="right" style={{ width: '75pt' }}>VR. UNIT.</th>
                      <th className="right" style={{ width: '75pt' }}>SUBTOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commonServices.map((s: any) => {
                      const qty = s.quantity || 1;
                      const unitVal = s.value || 0;
                      const subtotal = unitVal * qty;
                      const displayName = s.id === 'eix-retificar' && s.measure
                        ? `Retificar Eixo — ${s.measure}`
                        : s.name;
                      const measureSuffix = s.measure && s.id !== 'eix-retificar' ? ` (${s.measure})` : '';
                      return (
                        <tr key={s.id}>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{qty}</td>
                          <td className="name-col">{displayName}{measureSuffix}</td>
                          <td className="right">{formatBRL(unitVal)}</td>
                          <td className="right">{formatBRL(subtotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="osc-services-total-row">
                      <td colSpan={3} style={{ fontWeight: 900, textTransform: 'uppercase' }}>
                        SUBTOTAL SERVIÇOS COMUNS
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'Arial, Helvetica, monospace', fontWeight: 900 }}>
                        {formatBRL(commonSubtotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* ── SERVIÇOS ESPECÍFICOS DE CADA MOTOR ── */}
            {motors.map((m, mIdx) => {
              const motorServices = order.services.filter(
                (s: any) => s.motorId !== 'all' && s.motorId !== null && String(s.motorId ?? '0') === String(mIdx)
              );
              if (motorServices.length === 0) return null;
              const motorSubtotal = motorServices.reduce((acc: number, s: any) => acc + ((s.value || 0) * (s.quantity || 1)), 0);
              
              const modelStr = m.model ? m.model.replace(/\s*\(.*\)/, '').trim().toUpperCase() : '';
              const dispStr = m.displacement ? m.displacement.trim() : '';
              const cylStr = m.cylinders ? `${m.cylinders.replace(/\D/g, '')} CIL` : '';
              let motorTitle = modelStr;
              if (dispStr) motorTitle += ` ${dispStr}`;
              if (cylStr) motorTitle += ` ${cylStr}`;

              return (
                <div key={mIdx} className="osc-services-box" style={{ marginBottom: '10pt' }}>
                  <div className="osc-section-header">
                    SERVIÇOS — MOTOR {mIdx + 1}: {motorTitle}
                  </div>
                  <table className="osc-services-table">
                    <thead>
                      <tr>
                        <th style={{ width: '35pt' }}>QTD.</th>
                        <th>NOME</th>
                        <th className="right" style={{ width: '75pt' }}>VR. UNIT.</th>
                        <th className="right" style={{ width: '75pt' }}>SUBTOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {motorServices.map((s: any) => {
                        const qty = s.quantity || 1;
                        const unitVal = s.value || 0;
                        const subtotal = unitVal * qty;
                        const displayName = s.id === 'eix-retificar' && s.measure
                          ? `Retificar Eixo — ${s.measure}`
                          : s.name;
                        const measureSuffix = s.measure && s.id !== 'eix-retificar' ? ` (${s.measure})` : '';
                        return (
                          <tr key={s.id}>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{qty}</td>
                            <td className="name-col">{displayName}{measureSuffix}</td>
                            <td className="right">{formatBRL(unitVal)}</td>
                            <td className="right">{formatBRL(subtotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="osc-services-total-row">
                        <td colSpan={3} style={{ fontWeight: 900, textTransform: 'uppercase' }}>
                          SUBTOTAL MOTOR {mIdx + 1} ({motorTitle})
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'Arial, Helvetica, monospace', fontWeight: 900 }}>
                          {formatBRL(motorSubtotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </>
        ) : (
          <div className="osc-services-box">
            <div className="osc-section-header">SERVIÇOS</div>
            <table className="osc-services-table">
              <thead>
                <tr>
                  <th style={{ width: '35pt' }}>QTD.</th>
                  <th>NOME</th>
                  <th className="right" style={{ width: '75pt' }}>VR. UNIT.</th>
                  <th className="right" style={{ width: '75pt' }}>SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                {order.services.map((s: any) => {
                  const qty = s.quantity || 1;
                  const unitVal = s.value || 0;
                  const subtotal = unitVal * qty;
                  const displayName = s.id === 'eix-retificar' && s.measure
                    ? `Retificar Eixo — ${s.measure}`
                    : s.name;
                  const measureSuffix = s.measure && s.id !== 'eix-retificar' ? ` (${s.measure})` : '';
                  return (
                    <tr key={s.id}>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{qty}</td>
                      <td className="name-col">{displayName}{measureSuffix}</td>
                      <td className="right">{formatBRL(unitVal)}</td>
                      <td className="right">{formatBRL(subtotal)}</td>
                    </tr>
                  );
                })}
                {order.services.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', fontStyle: 'italic', padding: '36pt 8pt' }}>
                      Nenhum serviço registrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ RESUMO FINANCEIRO ═══ */}
        <div className="osc-summary">
          <table className="osc-summary-table">
            <tbody>
              <tr>
                <td className="s-label">SERVIÇOS:</td>
                <td className="s-value">{formatBRL(totalServicos)}</td>
              </tr>
              {hasDiscount && (
                <tr>
                  <td className="s-label">VALOR À VISTA:</td>
                  <td className="s-value">{formatBRL(valorAVista)}</td>
                </tr>
              )}
              <tr className="total-row">
                <td className="s-label">TOTAL:</td>
                <td className="s-value">R$&nbsp;{formatBRL(netValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ═══ PAGAMENTO ═══ */}
        {isQuitado ? (
          <div className="osc-payment-quitado-box">
            <div className="osc-payment-quitado-title">STATUS DO PAGAMENTO: TOTALMENTE QUITADO</div>
            <div className="osc-payment-quitado-details">
              {getQuitadoDetails()}
            </div>
          </div>
        ) : (
          activeEntries.length > 0 && (
            <div className="osc-payment-row">
              {activeEntries.map((entry: any, index: number) => {
                const valor = parseFloat(entry.amount) || 0;
                const forma = entry.method || '';
                const data = entry.date ? formatDate(entry.date) : '';
                const label = activeEntries.length > 1
                  ? `DADOS DE ENTRADA ${index + 1}`
                  : 'DADOS DE ENTRADA';
                return (
                  <div key={index} className="osc-payment-box">
                    <div className="osc-payment-header">{label}</div>
                    <div className="osc-payment-field">
                      <span className="osc-payment-field-label">ENTRADA:</span>
                      <span className="osc-payment-field-value">
                        R$ {formatBRL(valor)}
                      </span>
                    </div>
                    <div className="osc-payment-field">
                      <span className="osc-payment-field-label">FORMA:</span>
                      <span className="osc-payment-field-value">{forma}</span>
                    </div>
                    <div className="osc-payment-field">
                      <span className="osc-payment-field-label">DATA:</span>
                      <span className="osc-payment-field-value">{data}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ═══ FLEX SPACER ═══ */}
      <div className="osc-flex-spacer" style={{ flex: '1 1 auto', minHeight: '16pt' }} />

      {/* ═══ RODAPÉ (TERMOS + ASSINATURA) ═══ */}
      <div className="osc-footer-section">
        {/* ═══ ASSINATURA ═══ */}
        <div className="osc-signature">
          <div className="osc-signature-line" />
          <div className="osc-signature-label">ASSINATURA</div>
        </div>

        {/* ═══ TERMOS E CONDIÇÕES ═══ */}
        <div className="osc-terms">
          <div className="osc-terms-title">TERMOS E CONDIÇÕES / RESPONSABILIDADE E GARANTIA</div>
          <div className="osc-terms-text">
            <div className="osc-terms-item">
              <span className="osc-terms-item-title">RESPONSABILIDADE SOBRE COMPONENTES PERIFÉRICOS:</span> A empresa NÃO se responsabiliza por sensores, jetcoolers ou quaisquer outras peças e componentes que não sejam estritamente necessários para a execução dos serviços de retífica. É dever do mecânico remover todas as peças acessórias antes de entregar o material na retífica. Se houver peças para desmontar, será cobrado o valor correspondente ao serviço.
            </div>
            <div className="osc-terms-item">
              <span className="osc-terms-item-title">PRAZO DE RETIRADA (ABANDONO):</span> O material que não for retirado e permanecer na empresa por mais de 90 (noventa) dias será considerado abandonado (Artigo 1.275 do Código Civil brasileiro), ficando a retífica autorizada a dar o destino legal para cobrir custos de armazenamento e mão de obra.
            </div>
            <div className="osc-terms-item">
              <span className="osc-terms-item-title">GARANTIA DE 90 DIAS E EXCLUSÕES:</span> A garantia é de 90 (noventa) dias e aplica-se única e exclusivamente aos serviços executados e discriminados nesta Ordem de Serviço. A empresa NÃO cobre defeitos decorrentes de má montagem por parte do mecânico ou uso inadequado. O encaminhamento do material para outra retífica sem autorização prévia causará a PERDA IMEDIATA da garantia.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
