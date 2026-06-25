// ================= UI RENDERING =================

let filtroActivo = 'todos';

function setFiltro(filtro) {
    filtroActivo = filtro;
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('filtro-' + filtro);
    if (btn) btn.classList.add('active');
    renderLoans();
}

function renderResumenDia() {
    const banner = document.getElementById('dailySummary');
    if (!banner) return;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const finHoy = new Date(hoy); finHoy.setHours(23,59,59,999);
    const finSemana = new Date(hoy); finSemana.setDate(hoy.getDate() + 7);
    const activos = loans.filter(l => !l.archivado);
    let cobrosHoy = 0, montoHoy = 0, cobrosVencidos = 0, montoVencido = 0, cobrosSemana = 0, montoSemana = 0;
    activos.forEach(loan => {
        loan.tabla.forEach(c => {
            if (c.pagada || c.prorrogada || (c.pagosInteres && c.pagosInteres.length > 0)) return;
            const f = new Date(c.fechaCobro); f.setHours(0,0,0,0);
            if (f.getTime() === hoy.getTime()) { cobrosHoy++; montoHoy += c.cuotaFija; }
            if (f < hoy) { cobrosVencidos++; montoVencido += c.cuotaFija; }
            if (f > hoy && f <= finSemana) { cobrosSemana++; montoSemana += c.cuotaFija; }
        });
    });
    const parts = [];
    if (cobrosVencidos > 0) parts.push(`<span style="color:#ef4444;font-weight:700">⚠️ ${cobrosVencidos} cuota(s) vencida(s) — ${formatMoney(montoVencido)}</span>`);
    if (cobrosHoy > 0) parts.push(`<span style="color:#f59e0b;font-weight:700">📅 Hoy: ${cobrosHoy} cobro(s) — ${formatMoney(montoHoy)}</span>`);
    if (cobrosSemana > 0) parts.push(`<span style="color:#3b82f6">📆 Próximos 7 días: ${cobrosSemana} cobro(s) — ${formatMoney(montoSemana)}</span>`);
    if (parts.length === 0) { banner.style.display = 'none'; return; }
    banner.style.display = 'flex';
    banner.innerHTML = parts.join('<span style="color:#cbd5e1;margin:0 10px">|</span>');
}

function actualizarEstadisticas() {
    const activos = loans.filter(l => !l.archivado);
    const tp = activos.reduce((s, l) => s + l.monto, 0);
    const tac = activos.reduce((s, l) => s + l.totalPagar, 0);
    const cr = activos.reduce((s, l) => s + calcularStats(l).capitalRestante, 0);
    const ic = activos.reduce((s, l) => s + calcularStats(l).interesesPagados, 0);
    const vencidas = activos.reduce((s, l) => s + calcularStats(l).cuotasVencidas, 0);
document.getElementById('totalACobrar').textContent = formatMoney(tac);
    document.getElementById('capitalRestante').textContent = formatMoney(cr);
    document.getElementById('interesesCobrados').textContent = formatMoney(ic);
    const tasaPromedio = activos.length === 0 ? 0 :
        (activos.reduce((s, l) => s + l.tasa * l.monto, 0) / activos.reduce((s, l) => s + l.monto, 0)).toFixed(1);
    document.getElementById('prestamosActivos').textContent = activos.length;
    document.getElementById('cuotasVencidasGlobal').textContent = vencidas;
    document.getElementById('tasaPromedio').textContent = tasaPromedio + '%';
}

function renderLoans() {
    const container = document.getElementById('loansContainer');

    if (filtroActivo === 'archivados') {
        const archivados = loans.filter(l => l.archivado);
        if (archivados.length === 0) {
            container.innerHTML = `<div class="loan-card" style="text-align:center;color:#64748b;padding:24px">No hay préstamos archivados.</div>`;
            return;
        }
        container.innerHTML = archivados.map(loan => {
            const s = calcularStats(loan);
            const esSoloInteres = loan.tipo === 'solo_interes';
            const totalInteresSolo = loan.tabla.reduce((sum, c) => sum + (c.pagosInteres || []).reduce((si, p) => si + p.monto, 0), 0);
            return `<div class="loan-card" data-loan-id="${loan.id}" style="opacity:0.75">
                <div class="loan-header">
                    <div>
                        <div class="cliente-nombre" style="font-weight:800;font-size:15px">
                            ${loan.nombre}
                            <span style="padding:2px 8px;border-radius:999px;background:rgba(148,163,184,0.2);color:#94a3b8;font-size:11px;font-weight:700;margin-left:6px;letter-spacing:.4px">ARCHIVADO</span>
                        </div>
                        <div class="small">
                            Prestado: ${formatearFecha(loan.fechaPrestamo)}
                            ${loan.fechaArchivado ? ' · Archivado: ' + formatearFecha(loan.fechaArchivado) : ''}
                            ${loan.telefono ? ' · Tel: ' + loan.telefono : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center">
                        <button class="btn" onclick="abrirEstadoCuenta(${loan.id})" style="background:rgba(96,165,250,0.15);color:#60a5fa;border-color:rgba(96,165,250,0.3)">📋 Ver detalle</button>
                        <button class="btn btn-success" onclick="exportarCSV(${loan.id})">CSV</button>
                        <button class="btn" onclick="desarchivarPrestamo(${loan.id})" style="background:rgba(52,211,153,0.15);color:#34d399;border-color:rgba(52,211,153,0.3)">↩ Desarchivar</button>
                        <button class="btn btn-danger" onclick="eliminarPrestamo(${loan.id})">Eliminar</button>
                    </div>
                </div>
                <div class="loan-info" style="margin-top:10px;grid-template-columns:repeat(5,1fr)">
                    <div><div class="small">Monto</div><div style="font-weight:800">${formatMoney(loan.monto)}</div></div>
                    <div><div class="small">Tasa mensual</div><div style="font-weight:800;color:#8b5cf6">${loan.tasa}%</div></div>
                    <div><div class="small">Capital restante</div><div style="font-weight:800;color:#94a3b8">${formatMoney(s.capitalRestante)}</div></div>
                    <div><div class="small">${esSoloInteres ? 'Interés mensual' : 'Cuota'}</div><div style="font-weight:800">${formatMoney(loan.cuotaFija)}</div></div>
                    <div><div class="small">Intereses cobrados</div><div style="font-weight:800;color:#10b981">${formatMoney(s.interesesPagados + totalInteresSolo)}</div></div>
                </div>
            </div>`;
        }).join('');
        return;
    }

    const activos = loans.filter(l => !l.archivado);
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const finSemana = new Date(hoy); finSemana.setDate(hoy.getDate() + 7);

    let filtrados = activos;
    if (filtroActivo === 'vencidos') {
        filtrados = activos.filter(l => l.tabla.some(c => !c.pagada && estaVencida(c.fechaCobro)));
    } else if (filtroActivo === 'semana') {
        filtrados = activos.filter(l => l.tabla.some(c => {
            if (c.pagada) return false;
            const f = new Date(c.fechaCobro); f.setHours(0,0,0,0);
            return f >= hoy && f <= finSemana;
        }));
    } else if (filtroActivo === 'interes') {
        filtrados = activos.filter(l => l.tabla.some(c => !c.pagada && (c.pagosInteres || []).length > 0));
    }

    if (filtrados.length === 0) {
        container.innerHTML = `<div class="loan-card" style="text-align:center;color:#64748b;padding:24px">No hay préstamos que coincidan con el filtro seleccionado.</div>`;
        return;
    }
    const ordenados = [...filtrados].sort((a, b) => {
        const A = calcularStats(a);
        const B = calcularStats(b);
        if (A.cuotasVencidas !== B.cuotasVencidas) return B.cuotasVencidas - A.cuotasVencidas;
        if (A.proximaCuota && B.proximaCuota) return new Date(A.proximaCuota.fechaCobro) - new Date(B.proximaCuota.fechaCobro);
        return 0;
    });

    container.innerHTML = ordenados.map(loan => {
        const s = calcularStats(loan);
        const esSoloInteres = loan.tipo === 'solo_interes';
        const tipoLabel = esSoloInteres ? '<span class="badge badge-proxima">SOLO INTERÉS</span>' : '';
        const botonesExtra = esSoloInteres ? `<button class="btn" style="background:#7c3aed;color:white" onclick="generarInteresMensual(${loan.id})">+ Generar Interés</button>` : '';

        return `<div class="loan-card" data-loan-id="${loan.id}">
            <div class="loan-header">
                <div>
                    <div class="cliente-nombre" style="font-weight:800;font-size:15px">
                        ${loan.nombre} ${tipoLabel}
                        <button class="btn" onclick="editarNombreCliente(${loan.id})" style="margin-left:6px;padding:2px 6px;font-size:10px">✏️</button>
                    </div>
                    <div class="small">
                        <span id="fechaPrestamo-${loan.id}">Prestado: ${formatearFecha(loan.fechaPrestamo)}</span>
                        <button class="btn" onclick="editarFechaPrestamo(${loan.id}, '${loan.fechaPrestamo}')" style="margin-left:6px;padding:2px 6px;font-size:10px">✏️</button>
                        ${loan.diaCobro ? ' • Día cobro: ' + loan.diaCobro : ''}
                        ${loan.telefono ? ' • Tel: ' + loan.telefono : ''}
                    </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                    ${botonesExtra}
                    <button class="btn" onclick="abrirEstadoCuenta(${loan.id})" style="background:rgba(96,165,250,0.15);color:#60a5fa;border-color:rgba(96,165,250,0.3)">📋 Estado de cuenta</button>
                    <button class="btn" onclick="registrarAbonoCapital(${loan.id})" style="background:rgba(139,92,246,0.15);color:#a78bfa;border-color:rgba(139,92,246,0.3)">↓ Abonar capital</button>
                    <button class="btn btn-success" onclick="exportarCSV(${loan.id})">CSV</button>
                    ${!loan.archivado ? `<button class="btn" onclick="archivarPrestamo(${loan.id})" style="background:rgba(148,163,184,0.15);color:#94a3b8;border-color:rgba(148,163,184,0.3)">📦 Archivar</button>` : ''}
                    <button class="btn btn-danger" onclick="eliminarPrestamo(${loan.id})">Eliminar</button>
                </div>
            </div>
            <div class="loan-info" style="margin-top:10px;grid-template-columns:repeat(5,1fr)">
                <div><div class="small">Monto</div><div style="font-weight:800">${formatMoney(loan.monto)}</div></div>
                <div><div class="small">Tasa mensual</div><div style="font-weight:800;color:#8b5cf6">${loan.tasa}%</div></div>
                <div><div class="small">Capital restante</div><div style="font-weight:800;color:#ef4444">${formatMoney(s.capitalRestante)}</div></div>
                <div><div class="small">${esSoloInteres ? 'Interés mensual' : 'Cuota'}</div><div style="font-weight:800">${formatMoney(loan.cuotaFija)}</div></div>
                <div><div class="small">Intereses cobrados</div><div style="font-weight:800;color:#10b981">${formatMoney(s.interesesPagados)}</div></div>
            </div>
            <div style="margin-top:10px;font-size:13px">${s.proximaCuota ? `<div>Próximo: ${formatearFecha(s.proximaCuota.fechaCobro)} ${estaVencida(s.proximaCuota.fechaCobro) ? '<span class="badge badge-vencida">VENCIDA</span>' : ''} ${esProxima(s.proximaCuota.fechaCobro) ? '<span class="badge badge-proxima">PRÓXIMA</span>' : ''}</div>` : ''}${s.cuotasVencidas > 0 ? `<div style="margin-top:6px"><strong style="color:#ef4444">⚠️ ${s.cuotasVencidas} cuota(s) vencida(s)</strong></div>` : ''}</div>
            <div style="margin-top:10px;overflow-x:auto;-webkit-overflow-scrolling:touch">
                <table class="cuotas-table" style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead>
                        <tr style="text-align:left;color:#475569">
                            <th style="padding:6px">✓</th>
                            <th style="padding:6px">#</th>
                            <th style="padding:6px">Fecha</th>
                            <th style="padding:6px">${esSoloInteres ? 'Interés' : 'Cuota'}</th>
                            <th style="padding:6px">Interés</th>
                            ${esSoloInteres ? '' : '<th style="padding:6px">Capital</th>'}
                            <th style="padding:6px">Saldo</th>
                            <th style="padding:6px">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="loan-table-${loan.id}">
                        ${loan.tabla.slice(0, 3).map((c, i) => {
                            const historialInteres = c.pagosInteres || [];
                            const totalInteresPagado = historialInteres.reduce((s, p) => s + p.monto, 0);
                            const prorrogada = !!c.prorrogada;
                            const vencida = !c.pagada && !prorrogada && estaVencida(c.fechaCobro);
                            const multa = c.cuotaFija * 0.10;
                            const puedePagarConExcedente = !c.pagada && !prorrogada;
                            const puedePagarSoloInteres = !c.pagada && !prorrogada;

                            return `<tr style="background:${c.pagada ? 'rgba(52,211,153,0.10)' : (prorrogada || historialInteres.length > 0) ? 'rgba(251,191,36,0.10)' : vencida ? 'rgba(248,113,113,0.10)' : 'transparent'}">
                                <td style="padding:6px">${prorrogada ? '<span style="display:inline-block;border-radius:999px;padding:6px 8px;font-size:13px;opacity:0.5">⏸</span>' : `<button class="btn" onclick="toggleCuota(${loan.id},${i})" style="border-radius:999px;padding:6px 8px">${c.pagada ? '✓' : '○'}</button>`}</td>
                                <td style="padding:6px">${c.cuota}</td>
                                <td style="padding:6px">
                                    <span id="fechaCobro-${loan.id}-${i}">${formatearFecha(c.fechaCobro)}</span>
                                    <button class="btn" onclick="editarFechaCobro(${loan.id}, ${i}, '${c.fechaCobro}')" style="margin-left:6px;padding:2px 6px;font-size:10px">✏️</button>
                                    ${c.pagada ? `<span style="padding:4px 8px;border-radius:6px;background:rgba(52,211,153,0.15);color:#34d399;margin-left:6px;">Pagada</span>${c.notaPago ? `<div style="font-size:11px;color:#64748b;margin-top:2px">📝 ${c.notaPago}</div>` : ''}` : ''}
                                    ${historialInteres.length > 0 && !c.pagada ? `<div style="font-size:11px;color:#ca8a04;margin-top:3px">💰 ${historialInteres.length} pago(s) de interés — total ${formatMoney(totalInteresPagado)}<br>${historialInteres.map(p => `${formatearFecha(p.fecha)}: ${formatMoney(p.monto)}`).join(' · ')}</div>` : ''}
                                </td>
                                <td style="padding:6px">${formatMoney(c.cuotaFija)}</td>
                                <td style="padding:6px">${formatMoney(c.interes)}</td>
                                ${esSoloInteres ? '' : `<td style="padding:6px">${formatMoney(c.abonoCapital)}</td>`}
                                <td style="padding:6px"><strong>${formatMoney(c.saldo)}</strong></td>
                                <td style="padding:6px">
                                    ${prorrogada ?
                                        `<span style="font-size:11px;color:#fbbf24;font-weight:600">💰 Interés pagado · ${c.fechaPagoInteres ? formatearFecha(c.fechaPagoInteres) : '—'}</span>` :
                                        `<div style="display:flex;flex-direction:column;gap:4px">
                                        ${puedePagarSoloInteres ?
                                            `<button class="btn" onclick="registrarPagoInteres(${loan.id},${i})" style="background:rgba(96,165,250,0.15);color:#60a5fa;border:1px solid rgba(96,165,250,0.3);font-size:11px;padding:4px 8px">Pagar solo interés</button>`
                                            : ''
                                        }
                                        ${puedePagarConExcedente ?
                                            `<button class="btn" onclick="abrirModalPagoExcedente(${loan.id},${i})" style="background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3);font-size:11px;padding:4px 8px">Cuota + excedente</button>`
                                            : ''
                                        }
                                        </div>`
                                    }
                                </td>
                            </tr>`;
                        }).join('')}
                        ${loan.tabla.length > 3 ? `
                        <tr id="show-more-row-${loan.id}">
                            <td colspan="${esSoloInteres ? '7' : '8'}" style="text-align:center;padding:12px 0">
                                <button class="btn show-more-btn" onclick="toggleMoreInstallments(${loan.id})" style="background:#3b82f6;color:white">
                                    +${loan.tabla.length - 3} más cuotas
                                </button>
                            </td>
                        </tr>
                        <tr id="hidden-installments-${loan.id}" style="display:none">
                            <td colspan="${esSoloInteres ? '7' : '8'}" style="padding:0">
                                <table class="cuotas-table" style="width:100%;border-collapse:collapse;font-size:13px">
                                    <tbody>
                                        ${loan.tabla.slice(3).map((c, i) => {
                                            const actualIndex = i + 3;
                                            const historialInteres = c.pagosInteres || [];
                                            const totalInteresPagado = historialInteres.reduce((s, p) => s + p.monto, 0);
                                            const prorrogada = !!c.prorrogada;
                                            const vencida = !c.pagada && !prorrogada && estaVencida(c.fechaCobro);
                                            const multa = c.cuotaFija * 0.10;
                                            const puedePagarConExcedente = !c.pagada && !prorrogada;
                                            const puedePagarSoloInteres = !c.pagada && !prorrogada;

                                            return `<tr style="background:${c.pagada ? 'rgba(52,211,153,0.10)' : (prorrogada || historialInteres.length > 0) ? 'rgba(251,191,36,0.10)' : vencida ? 'rgba(248,113,113,0.10)' : 'transparent'}">
                                                <td style="padding:6px">${prorrogada ? '<span style="display:inline-block;border-radius:999px;padding:6px 8px;font-size:13px;opacity:0.5">⏸</span>' : `<button class="btn" onclick="toggleCuota(${loan.id},${actualIndex})" style="border-radius:999px;padding:6px 8px">${c.pagada ? '✓' : '○'}</button>`}</td>
                                                <td style="padding:6px">${c.cuota}</td>
                                                <td style="padding:6px">
                                                    <span id="fechaCobro-${loan.id}-${actualIndex}">${formatearFecha(c.fechaCobro)}</span>
                                                    <button class="btn" onclick="editarFechaCobro(${loan.id}, ${actualIndex}, '${c.fechaCobro}')" style="margin-left:6px;padding:2px 6px;font-size:10px">✏️</button>
                                                    ${c.pagada ? `<span style="padding:4px 8px;border-radius:6px;background:rgba(52,211,153,0.15);color:#34d399;margin-left:6px;">Pagada</span>${c.notaPago ? `<div style="font-size:11px;color:#64748b;margin-top:2px">📝 ${c.notaPago}</div>` : ''}` : ''}
                                                    ${historialInteres.length > 0 && !c.pagada ? `<div style="font-size:11px;color:#ca8a04;margin-top:3px">💰 ${historialInteres.length} pago(s) de interés — total ${formatMoney(totalInteresPagado)}<br>${historialInteres.map(p => `${formatearFecha(p.fecha)}: ${formatMoney(p.monto)}`).join(' · ')}</div>` : ''}
                                                </td>
                                                <td style="padding:6px">${formatMoney(c.cuotaFija)}</td>
                                                <td style="padding:6px">${formatMoney(c.interes)}</td>
                                                ${esSoloInteres ? '' : `<td style="padding:6px">${formatMoney(c.abonoCapital)}</td>`}
                                                <td style="padding:6px"><strong>${formatMoney(c.saldo)}</strong></td>
                                                <td style="padding:6px">
                                                    ${prorrogada ?
                                                        `<span style="font-size:11px;color:#fbbf24;font-weight:600">💰 Interés pagado · ${c.fechaPagoInteres ? formatearFecha(c.fechaPagoInteres) : '—'}</span>` :
                                                        `<div style="display:flex;flex-direction:column;gap:4px">
                                                        ${puedePagarSoloInteres ?
                                                            `<button class="btn" onclick="registrarPagoInteres(${loan.id},${actualIndex})" style="background:rgba(96,165,250,0.15);color:#60a5fa;border:1px solid rgba(96,165,250,0.3);font-size:11px;padding:4px 8px">Pagar solo interés</button>`
                                                            : ''
                                                        }
                                                        ${puedePagarConExcedente ?
                                                            `<button class="btn" onclick="abrirModalPagoExcedente(${loan.id},${actualIndex})" style="background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3);font-size:11px;padding:4px 8px">Cuota + excedente</button>`
                                                            : ''
                                                        }
                                                        </div>`
                                                    }
                                                </td>
                                            </tr>`;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
            <div class="notes-section">
                <div class="notes-header">
                    <div style="font-weight:600;font-size:13px">📝 Notas y Comprobantes</div>
                    <button class="btn" onclick="toggleNotes(${loan.id})" style="padding:2px 6px;font-size:10px">✏️</button>
                </div>
                <div id="notes-content-${loan.id}" style="display:none">
                    <textarea id="notes-textarea-${loan.id}" class="notes-textarea" placeholder="Agregar notas sobre este cliente...">${loan.notas || ''}</textarea>
                    <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
                        <input type="file" id="file-input-${loan.id}" class="file-input" accept="image/*" onchange="handleFileUpload(${loan.id}, event)">
                        <button class="file-upload-btn" onclick="document.getElementById('file-input-${loan.id}').click()">📷 Subir Comprobante</button>
                        <button class="btn btn-primary" onclick="saveNotes(${loan.id})" style="padding:6px 12px;font-size:12px">Guardar Notas</button>
                    </div>
                    <div id="receipts-grid-${loan.id}" class="receipts-grid">
                        ${(loan.comprobantes || []).map((comp, idx) => `
                            <div style="position:relative">
                                <img src="${comp}" class="receipt-thumbnail" onclick="showReceipt('${comp}')" alt="Comprobante ${idx + 1}">
                                <button class="btn btn-danger" onclick="event.stopPropagation(); deleteReceipt(${loan.id}, ${idx})" style="position:absolute;top:2px;right:2px;padding:2px 4px;font-size:10px">✕</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ${loan.notas && loan.notas.trim() ? `<div class="notes-badge" onclick="toggleNotes(${loan.id})">📝 Tiene notas</div>` : ''}
           </div>
       </div>`;
    }).join('');
}

function normalizar(str) {
    return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function filtrarClientes() {
    const texto = normalizar(document.getElementById("searchInput").value.trim());
    const loanCards = document.querySelectorAll('.loan-card');

    if (texto === '') {
        loanCards.forEach(card => {
            card.style.display = 'block';
        });
        return;
    }

    loanCards.forEach(card => {
        const nombre = normalizar(card.querySelector('div[style*="font-weight:800;font-size:15px"]').textContent);
        const loanId = card.getAttribute('data-loan-id');
        const telefono = normalizar(card.querySelector('.small')?.textContent || '');

        if (nombre.includes(texto)) {
            card.style.display = 'block';
        }
        else if (loanId && loanId.includes(texto)) {
            card.style.display = 'block';
        }
        else if (telefono.includes(texto)) {
            card.style.display = 'block';
        }
        else {
            card.style.display = 'none';
        }
    });
}

function toggleMoreInstallments(loanId) {
    const showMoreRow = document.getElementById(`show-more-row-${loanId}`);
    const hiddenInstallments = document.getElementById(`hidden-installments-${loanId}`);
    const button = showMoreRow.querySelector('.show-more-btn');
    
    if (hiddenInstallments.style.display === 'none') {
        hiddenInstallments.style.display = 'table-row';
        button.textContent = 'Ocultar cuotas';
        button.style.background = '#ef4444';
    } else {
        hiddenInstallments.style.display = 'none';
        button.textContent = `+${hiddenInstallments.querySelectorAll('tr').length} más cuotas`;
        button.style.background = '#3b82f6';
    }
}

function renderAll() {
    actualizarEstadisticas();
    renderResumenDia();
    renderLoans();
    renderCalendar(currentYear, currentMonth);
    initReportSelectors();
}











