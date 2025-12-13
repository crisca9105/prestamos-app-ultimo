// ================= UI RENDERING =================

function actualizarEstadisticas() {
    const tp = loans.reduce((s, l) => s + l.monto, 0);
    const tac = loans.reduce((s, l) => s + l.totalPagar, 0);
    const cr = loans.reduce((s, l) => s + calcularStats(l).capitalRestante, 0);
    const ic = loans.reduce((s, l) => s + calcularStats(l).interesesPagados, 0);
    const vencidas = loans.reduce((s, l) => s + calcularStats(l).cuotasVencidas, 0);
    document.getElementById('totalPrestado').textContent = formatMoney(tp);
    document.getElementById('totalACobrar').textContent = formatMoney(tac);
    document.getElementById('capitalRestante').textContent = formatMoney(cr);
    document.getElementById('interesesCobrados').textContent = formatMoney(ic);
    document.getElementById('prestamosActivos').textContent = loans.length;
    document.getElementById('cuotasVencidasGlobal').textContent = vencidas;
}

function renderLoans() {
    const container = document.getElementById('loansContainer');
    if (loans.length === 0) {
        container.innerHTML = `<div class="loan-card">No hay préstamos</div>`;
        return;
    }
    const ordenados = [...loans].sort((a, b) => {
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
                <div style="display:flex;gap:8px;align-items:center">
                    ${botonesExtra}
                    <button class="btn btn-success" onclick="exportarCSV(${loan.id})">CSV</button>
                    <button class="btn btn-danger" onclick="eliminarPrestamo(${loan.id})">Eliminar</button>
                </div>
            </div>
            <div class="loan-info" style="margin-top:10px">
                <div><div class="small">Monto</div><div style="font-weight:800">${formatMoney(loan.monto)}</div></div>
                <div><div class="small">Capital restante</div><div style="font-weight:800;color:#ef4444">${formatMoney(s.capitalRestante)}</div></div>
                <div><div class="small">${esSoloInteres ? 'Interés mensual' : 'Cuota'}</div><div style="font-weight:800">${formatMoney(loan.cuotaFija)}</div></div>
                <div><div class="small">Intereses cobrados</div><div style="font-weight:800;color:#10b981">${formatMoney(s.interesesPagados)}</div></div>
            </div>
            <div style="margin-top:10px;font-size:13px">${s.proximaCuota ? `<div>Próximo: ${formatearFecha(s.proximaCuota.fechaCobro)} ${estaVencida(s.proximaCuota.fechaCobro) ? '<span class="badge badge-vencida">VENCIDA</span>' : ''} ${esProxima(s.proximaCuota.fechaCobro) ? '<span class="badge badge-proxima">PRÓXIMA</span>' : ''}</div>` : ''}${s.cuotasVencidas > 0 ? `<div style="margin-top:6px"><strong style="color:#ef4444">⚠️ ${s.cuotasVencidas} cuota(s) vencida(s)</strong></div>` : ''}</div>
            <div style="margin-top:10px">
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead>
                        <tr style="text-align:left;color:#475569">
                            <th style="padding:6px">✓</th>
                            <th style="padding:6px">#</th>
                            <th style="padding:6px">Fecha</th>
                            <th style="padding:6px">${esSoloInteres ? 'Interés' : 'Cuota'}</th>
                            <th style="padding:6px">Interés</th>
                            ${esSoloInteres ? '' : '<th style="padding:6px">Capital</th>'}
                            <th style="padding:6px">Saldo</th>
                            <th style="padding:6px">Multa 10%</th>
                            <th style="padding:6px">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="loan-table-${loan.id}">
                        ${loan.tabla.slice(0, 3).map((c, i) => {
                            const vencida = !c.pagada && estaVencida(c.fechaCobro);
                            const multa = c.cuotaFija * 0.10;
                            const puedePagarMulta = !c.pagada && !c.multaPagada;
                            const puedePagarConExcedente = !c.pagada;

                            return `<tr style="background:${c.pagada ? '#d1fae5' : vencida ? '#fee2e2' : 'transparent'}">
                                <td style="padding:6px"><button class="btn" onclick="toggleCuota(${loan.id},${i})" style="border-radius:999px;padding:6px 8px">${c.pagada ? '✓' : '○'}</button></td>
                                <td style="padding:6px">${c.cuota}</td>
                                <td style="padding:6px">
                                    <span id="fechaCobro-${loan.id}-${i}">${formatearFecha(c.fechaCobro)}</span>
                                    <button class="btn" onclick="editarFechaCobro(${loan.id}, ${i}, '${c.fechaCobro}')" style="margin-left:6px;padding:2px 6px;font-size:10px">✏️</button>
                                    ${c.pagada ? '<span style="padding:4px 8px;border-radius:6px;background:#d1fae5;margin-left:6px;">Pagada</span>' : ''}
                                </td>
                                <td style="padding:6px">${formatMoney(c.cuotaFija)}</td>
                                <td style="padding:6px">${formatMoney(c.interes)}</td>
                                ${esSoloInteres ? '' : `<td style="padding:6px">${formatMoney(c.abonoCapital)}</td>`}
                                <td style="padding:6px"><strong>${formatMoney(c.saldo)}</strong></td>
                                <td style="padding:6px">
                                    ${c.multaPagada ?
                                        `<span style="color:#10b981;font-weight:bold">✓ ${formatMoney(c.multa)}</span>
                                         <div style="font-size:11px;color:#64748b">Pagada: ${c.fechaPagoMulta ? formatearFecha(c.fechaPagoMulta) : ''}</div>`
                                         :
                                        `<span style="color:#f59e0b">${formatMoney(multa)}</span>`
                                    }
                                </td>
                                <td style="padding:6px">
                                    <div style="display:flex;flex-direction:column;gap:4px">
                                        ${puedePagarMulta ?
                                            `<button class="btn" onclick="pagarMulta10Porciento(${loan.id},${i})" style="background:#f59e0b;color:white;font-size:11px;padding:4px 8px">Pagar multa 10%</button>`
                                            : ''
                                        }
                                        ${puedePagarConExcedente ?
                                            `<button class="btn" onclick="abrirModalPagoExcedente(${loan.id},${i})" style="background:#8b5cf6;color:white;font-size:11px;padding:4px 8px">Pagar + Excedente (Auto-Ajuste)</button>`
                                            : ''
                                        }
                                    </div>
                                </td>
                            </tr>`;
                        }).join('')}
                        ${loan.tabla.length > 3 ? `
                        <tr id="show-more-row-${loan.id}">
                            <td colspan="${esSoloInteres ? '8' : '9'}" style="text-align:center;padding:12px 0">
                                <button class="btn show-more-btn" onclick="toggleMoreInstallments(${loan.id})" style="background:#3b82f6;color:white">
                                    +${loan.tabla.length - 3} más cuotas
                                </button>
                            </td>
                        </tr>
                        <tr id="hidden-installments-${loan.id}" style="display:none">
                            <td colspan="${esSoloInteres ? '8' : '9'}" style="padding:0">
                                <table style="width:100%;border-collapse:collapse;font-size:13px">
                                    <tbody>
                                        ${loan.tabla.slice(3).map((c, i) => {
                                            const actualIndex = i + 3;
                                            const vencida = !c.pagada && estaVencida(c.fechaCobro);
                                            const multa = c.cuotaFija * 0.10;
                                            const puedePagarMulta = !c.pagada && !c.multaPagada;
                                            const puedePagarConExcedente = !c.pagada;

                                            return `<tr style="background:${c.pagada ? '#d1fae5' : vencida ? '#fee2e2' : 'transparent'}">
                                                <td style="padding:6px"><button class="btn" onclick="toggleCuota(${loan.id},${actualIndex})" style="border-radius:999px;padding:6px 8px">${c.pagada ? '✓' : '○'}</button></td>
                                                <td style="padding:6px">${c.cuota}</td>
                                                <td style="padding:6px">
                                                    <span id="fechaCobro-${loan.id}-${actualIndex}">${formatearFecha(c.fechaCobro)}</span>
                                                    <button class="btn" onclick="editarFechaCobro(${loan.id}, ${actualIndex}, '${c.fechaCobro}')" style="margin-left:6px;padding:2px 6px;font-size:10px">✏️</button>
                                                    ${c.pagada ? '<span style="padding:4px 8px;border-radius:6px;background:#d1fae5;margin-left:6px;">Pagada</span>' : ''}
                                                </td>
                                                <td style="padding:6px">${formatMoney(c.cuotaFija)}</td>
                                                <td style="padding:6px">${formatMoney(c.interes)}</td>
                                                ${esSoloInteres ? '' : `<td style="padding:6px">${formatMoney(c.abonoCapital)}</td>`}
                                                <td style="padding:6px"><strong>${formatMoney(c.saldo)}</strong></td>
                                                <td style="padding:6px">
                                                    ${c.multaPagada ?
                                                        `<span style="color:#10b981;font-weight:bold">✓ ${formatMoney(c.multa)}</span>
                                                         <div style="font-size:11px;color:#64748b">Pagada: ${c.fechaPagoMulta ? formatearFecha(c.fechaPagoMulta) : ''}</div>`
                                                         :
                                                        `<span style="color:#f59e0b">${formatMoney(multa)}</span>`
                                                    }
                                                </td>
                                                <td style="padding:6px">
                                                    <div style="display:flex;flex-direction:column;gap:4px">
                                                        ${puedePagarMulta ?
                                                            `<button class="btn" onclick="pagarMulta10Porciento(${loan.id},${actualIndex})" style="background:#f59e0b;color:white;font-size:11px;padding:4px 8px">Pagar multa 10%</button>`
                                                            : ''
                                                        }
                                                        ${puedePagarConExcedente ?
                                                            `<button class="btn" onclick="abrirModalPagoExcedente(${loan.id},${actualIndex})" style="background:#8b5cf6;color:white;font-size:11px;padding:4px 8px">Pagar + Excedente (Auto-Ajuste)</button>`
                                                            : ''
                                                        }
                                                    </div>
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
                        ${loan.comprobantes.map((comp, idx) => `
                            <div style="position:relative">
                                <img src="${comp}" class="receipt-thumbnail" onclick="showReceipt('${comp}')" alt="Comprobante ${idx + 1}">
                                <button class="btn btn-danger" onclick="event.stopPropagation(); deleteReceipt(${loan.id}, ${idx})" style="position:absolute;top:2px;right:2px;padding:2px 4px;font-size:10px">✕</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ${loan.notas ? `<div class="notes-badge" onclick="toggleNotes(${loan.id})">📝 Tiene notas</div>` : ''}
            </div>
       </div>`;
    }).join('');
}

function filtrarClientes() {
    const texto = document.getElementById("searchInput").value.toLowerCase().trim();
    const loanCards = document.querySelectorAll('.loan-card');

    if (texto === '') {
        loanCards.forEach(card => {
            card.style.display = 'block';
        });
        return;
    }

    loanCards.forEach(card => {
        const nombre = card.querySelector('div[style*="font-weight:800;font-size:15px"]').textContent.toLowerCase();
        const loanId = card.getAttribute('data-loan-id');
        const telefono = card.querySelector('.small')?.textContent.toLowerCase() || '';

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
    renderLoans();
    renderCalendar(currentYear, currentMonth);
    initReportSelectors();
}









