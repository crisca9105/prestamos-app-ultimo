// ================= LOAN MANAGEMENT =================

function toggleCuotasInput() {
    const tipo = document.getElementById('tipoPrestamo').value;
    const cuotasInput = document.getElementById('cuotas');
    if (tipo === 'solo_interes') {
        cuotasInput.disabled = true;
        cuotasInput.placeholder = "No aplica (solo interés)";
        cuotasInput.value = "";
    } else {
        cuotasInput.disabled = false;
        cuotasInput.placeholder = "Número de cuotas";
    }
}

function generarTablaAmortizacion(m, t, c, fi, dia) {
    const i = t / 100;
    const cuotaFija = calcularCuotaFija(m, t, c);
    let saldo = m;
    const tabla = [];
    for (let n = 1; n <= c; n++) {
        const interes = saldo * i;
        const abono = cuotaFija - interes;
        saldo = Math.max(0, saldo - abono);
        tabla.push({
            cuota: n,
            cuotaFija,
            interes,
            abonoCapital: abono,
            saldo,
            fechaCobro: calcularFechaCuota(fi, n, dia).toISOString(),
            pagada: false,
            fechaPago: null,
            multa: 0,
            multaPagada: false,
            fechaPagoMulta: null
        });
    }
    return tabla;
}

function agregarPrestamo() {
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const monto = parseFloat(document.getElementById('monto').value);
    const tasa = parseFloat(document.getElementById('tasa').value);
    const tipo = document.getElementById('tipoPrestamo').value;
    const cuotas = tipo === 'cuotas_fijas' ? parseInt(document.getElementById('cuotas').value) : null;
    const fechaPrestamo = document.getElementById('fechaPrestamo').value;
    const diaCobro = parseInt(document.getElementById('diaCobro').value) || null;

    if (!nombre || !monto || !tasa || !fechaPrestamo) {
        alert('Completa todos los campos');
        return;
    }
    if (tipo === 'cuotas_fijas' && !cuotas) {
        alert('Ingresa el número de cuotas');
        return;
    }

    if (tipo === 'solo_interes') {
        const interesMensual = monto * (tasa / 100);
        loans.unshift({
            id: Date.now(),
            nombre,
            telefono,
            monto,
            tasa,
            tipo: 'solo_interes',
            cuotas: null,
            cuotaFija: interesMensual,
            totalPagar: monto,
            totalIntereses: 0,
            fechaPrestamo,
            diaCobro,
            tabla: [],
            capitalPendiente: monto,
            notas: '',
            comprobantes: []
        });
    } else {
        const tabla = generarTablaAmortizacion(monto, tasa, cuotas, fechaPrestamo, diaCobro);
        const cuotaFija = calcularCuotaFija(monto, tasa, cuotas);
        loans.unshift({
            id: Date.now(),
            nombre,
            telefono,
            monto,
            tasa,
            tipo: 'cuotas_fijas',
            cuotas,
            cuotaFija,
            totalPagar: cuotaFija * cuotas,
            totalIntereses: cuotaFija * cuotas - monto,
            fechaPrestamo,
            diaCobro,
            tabla,
            capitalPendiente: monto,
            notas: '',
            comprobantes: []
        });
    }

    guardarDatos();
    renderAll();
    // limpiar form
    document.getElementById('nombre').value = '';
    document.getElementById('monto').value = '';
    document.getElementById('tasa').value = '';
    document.getElementById('cuotas').value = '';
    document.getElementById('fechaPrestamo').valueAsDate = new Date();
    document.getElementById('diaCobro').value = '';
    document.getElementById('tipoPrestamo').value = 'cuotas_fijas';
    toggleCuotasInput();
}

function calcularStats(loan) {
    if (loan.tipo === 'solo_interes') {
        const cuotasPagadas = loan.tabla.filter(c => c.pagada).length;
        const interesesPagados = loan.tabla.filter(c => c.pagada).reduce((s, c) => s + c.interes, 0);
        const capitalRestante = loan.monto;
        const proxima = loan.tabla.find(c => !c.pagada) || null;
        const vencidas = loan.tabla.filter(c => !c.pagada && estaVencida(c.fechaCobro)).length;
        return {
            cuotasPagadas,
            capitalPagado: 0,
            interesesPagados,
            capitalRestante,
            progreso: 0,
            proximaCuota: proxima,
            cuotasVencidas: vencidas
        };
    }

    const cuotasPagadas = loan.tabla.filter(c => c.pagada).length;
    const capitalPagado = loan.tabla.filter(c => c.pagada).reduce((s, c) => s + c.abonoCapital, 0);
    const interesesPagados = loan.tabla.filter(c => c.pagada).reduce((s, c) => s + c.interes, 0);
    const capitalRestante = loan.monto - capitalPagado;
    const progreso = (cuotasPagadas / loan.cuotas) * 100;
    const proxima = loan.tabla.find(c => !c.pagada) || null;
    const vencidas = loan.tabla.filter(c => !c.pagada && estaVencida(c.fechaCobro)).length;
    return { cuotasPagadas, capitalPagado, interesesPagados, capitalRestante, progreso, proximaCuota: proxima, cuotasVencidas: vencidas };
}

function toggleCuota(loanId, idx) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    const cuota = loan.tabla[idx];

    if (!cuota.pagada) {
        const confirmed = confirm('¿Estás seguro de que esta cuota fue pagada?');
        if (!confirmed) return;
        const nota = prompt('Nota de pago (opcional — ej: "efectivo", "transferencia"):', '');
        cuota.notaPago = nota || '';
    } else {
        cuota.notaPago = '';
    }

    cuota.pagada = !cuota.pagada;
    cuota.fechaPago = cuota.pagada ? new Date().toISOString() : null;

    guardarDatos();
    renderAll();
}

let currentEstadoCuentaLoanId = null;

function registrarAbonoCapital(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const capitalActual = loan.capitalPendiente || loan.monto;
    const montoStr = prompt(`Monto del abono al capital:\nCapital pendiente: ${formatMoney(capitalActual)}`);
    if (!montoStr) return;
    const monto = parseFloat(montoStr.replace(/[^0-9.]/g, ''));
    if (!monto || monto <= 0) { alert('Monto inválido'); return; }
    if (monto > capitalActual) { alert(`El abono no puede superar el capital pendiente (${formatMoney(capitalActual)})`); return; }

    const nota = prompt('Nota (opcional):', '') || '';

    if (!loan.abonosCapital) loan.abonosCapital = [];
    loan.abonosCapital.push({ monto, fecha: new Date().toISOString(), nota });
    loan.capitalPendiente = Math.max(0, capitalActual - monto);

    recalcularCuotas(loan, 'A');
    guardarDatos();
    renderAll();
    alert(`Abono de ${formatMoney(monto)} registrado.\nCapital pendiente: ${formatMoney(loan.capitalPendiente)}`);
}

function abrirEstadoCuenta(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    currentEstadoCuentaLoanId = loanId;

    const stats = calcularStats(loan);
    const totalInteresSolo = loan.tabla.reduce((s, c) => s + (c.pagosInteres || []).reduce((si, p) => si + p.monto, 0), 0);
    const totalIntereses = stats.interesesPagados + totalInteresSolo;
    const totalAbonosCapital = (loan.abonosCapital || []).reduce((s, a) => s + a.monto, 0);

    const pagos = [];
    loan.tabla.filter(c => c.pagada).forEach(c => pagos.push({
        fecha: c.fechaPago, tipo: 'Cuota completa', monto: c.cuotaFija,
        detalle: `Cuota #${c.cuota}${c.notaPago ? ' · ' + c.notaPago : ''}`
    }));
    loan.tabla.forEach(c => (c.pagosInteres || []).forEach(p => pagos.push({
        fecha: p.fecha, tipo: 'Solo interés', monto: p.monto, detalle: `Cuota #${c.cuota}`
    })));
    (loan.abonosCapital || []).forEach(a => pagos.push({
        fecha: a.fecha, tipo: 'Abono capital', monto: a.monto, detalle: a.nota || ''
    }));
    pagos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const pendientes = loan.tabla.filter(c => !c.pagada);

    document.getElementById('estadoCuentaContent').innerHTML = `
        <div style="margin-bottom:16px">
            <div style="font-size:18px;font-weight:800">${loan.nombre}</div>
            <div class="small">${formatMoney(loan.monto)} prestados · Tasa ${loan.tasa}% mensual · Desde ${formatearFecha(loan.fechaPrestamo)}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
            <div class="stat-card"><label>Capital prestado</label><div class="value">${formatMoney(loan.monto)}</div></div>
            <div class="stat-card" style="border-top-color:#ef4444"><label>Capital pendiente</label><div class="value" style="color:#ef4444">${formatMoney(loan.capitalPendiente || stats.capitalRestante)}</div></div>
            <div class="stat-card" style="border-top-color:#10b981"><label>Intereses cobrados</label><div class="value" style="color:#10b981">${formatMoney(totalIntereses)}</div></div>
        </div>
        <h4 style="margin:0 0 8px;font-size:13px;font-weight:700">Historial de pagos</h4>
        ${pagos.length === 0 ? '<div class="small" style="padding:12px 0">Sin pagos registrados aún.</div>' : `
        <table class="table" style="margin-bottom:20px">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Detalle</th></tr></thead>
            <tbody>${pagos.map(p => `<tr>
                <td>${formatearFecha(p.fecha)}</td>
                <td><span class="badge ${p.tipo === 'Cuota completa' ? 'badge-hoy' : p.tipo === 'Solo interés' ? 'badge-proxima' : 'badge-vencida'}">${p.tipo}</span></td>
                <td><strong>${formatMoney(p.monto)}</strong></td>
                <td class="small">${p.detalle}</td>
            </tr>`).join('')}</tbody>
        </table>`}
        <h4 style="margin:0 0 8px;font-size:13px;font-weight:700">Cuotas pendientes</h4>
        ${pendientes.length === 0 ? '<div class="small" style="color:#10b981;padding:8px 0">✓ Todas las cuotas están pagadas.</div>' : `
        <table class="table">
            <thead><tr><th>#</th><th>Fecha</th><th>Cuota</th><th>Interés</th><th>Capital</th></tr></thead>
            <tbody>${pendientes.map(c => `<tr style="${estaVencida(c.fechaCobro) ? 'background:#fee2e2' : ''}">
                <td>${c.cuota}</td>
                <td>${formatearFecha(c.fechaCobro)} ${estaVencida(c.fechaCobro) ? '<span class="badge badge-vencida">VENCIDA</span>' : ''}</td>
                <td>${formatMoney(c.cuotaFija)}</td>
                <td>${formatMoney(c.interes)}</td>
                <td>${formatMoney(c.abonoCapital)}</td>
            </tr>`).join('')}</tbody>
        </table>`}
    `;

    document.getElementById('estadoCuentaModal').style.display = 'flex';
}

function cerrarEstadoCuenta() {
    document.getElementById('estadoCuentaModal').style.display = 'none';
}

function exportarEstadoCuentaPDF(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    const contenido = document.getElementById('estadoCuentaContent').innerHTML;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>Estado de Cuenta — ${loan.nombre}</title>
        <style>
            body{font-family:Arial,sans-serif;padding:24px;font-size:13px;color:#0f172a}
            h4{margin:16px 0 8px;font-size:13px}
            table{width:100%;border-collapse:collapse;margin-bottom:16px}
            th,td{padding:8px 10px;border:1px solid #e2e8f0;text-align:left;font-size:12px}
            th{background:#f8fafc;font-weight:700;color:#64748b;text-transform:uppercase;font-size:11px}
            .stat-card{display:inline-block;padding:10px 14px;border:1px solid #e2e8f0;border-radius:6px;margin:0 6px 6px 0;min-width:140px}
            .stat-card label{font-size:11px;color:#64748b;display:block;text-transform:uppercase;font-weight:600}
            .stat-card .value{font-size:18px;font-weight:800}
            .badge{padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700}
            .badge-hoy{background:#d1fae5;color:#065f46}
            .badge-proxima{background:#fef3c7;color:#92400e}
            .badge-vencida{background:#fee2e2;color:#b91c1c}
            .small{font-size:12px;color:#64748b}
        </style></head><body>
        <div style="display:flex;justify-content:space-between;margin-bottom:20px">
            <div><h2 style="margin:0 0 4px">Estado de Cuenta</h2><div class="small">Generado: ${new Date().toLocaleDateString('es-CO', {day:'2-digit',month:'long',year:'numeric'})}</div></div>
        </div>
        ${contenido}
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

function eliminarPrestamo(id) {
    if (!confirm('¿Eliminar préstamo? Los intereses cobrados quedarán guardados en los reportes.')) return;
    const loan = loans.find(l => l.id === id);
    if (!loan) return;
    loan.archivado = true;
    guardarDatos();
    renderAll();
}

function editarNombreCliente(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    
    const nuevoNombre = prompt('Editar nombre del cliente:', loan.nombre);
    if (nuevoNombre === null) return; // User cancelled
    
    if (nuevoNombre.trim() === '') {
        alert('El nombre no puede estar vacío');
        return;
    }
    
    loan.nombre = nuevoNombre.trim();
    guardarDatos();
    renderAll();
}

function exportarCSV(id) {
    const loan = loans.find(l => l.id === id);
    if (!loan) return;
    let csv = 'Préstamo,Cuota,Fecha Cobro,Cuota Fija,Interés,Abono,Saldo,Estado,Fecha Pago,Multa 10%,Multa Pagada,Fecha Pago Multa\n';
    loan.tabla.forEach(c => {
        csv += `${loan.nombre},${c.cuota},${formatearFecha(c.fechaCobro)},${c.cuotaFija.toFixed(0)},${c.interes.toFixed(0)},${c.abonoCapital.toFixed(0)},${c.saldo.toFixed(0)},${c.pagada ? 'Pagada' : 'Pendiente'},${c.fechaPago ? formatearFecha(c.fechaPago) : ''},${(c.cuotaFija * 0.10).toFixed(0)},${c.multaPagada ? 'Sí' : 'No'},${c.fechaPagoMulta ? formatearFecha(c.fechaPagoMulta) : ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cuotas_${loan.nombre.replace(/\s/g, '_')}.csv`;
    a.click();
}

function exportarTodosCSV() {
    if (loans.length === 0) {
        alert('No hay préstamos para exportar');
        return;
    }
    
    let csv = 'Cliente,ID Préstamo,Tipo,Monto,Capital Restante,Intereses Cobrados,Cuota,Fecha Préstamo,Día Cobro,Cuota,Fecha Cobro,Cuota Fija,Interés,Abono Capital,Saldo,Estado,Fecha Pago,Multa 10%,Multa Pagada,Fecha Pago Multa\n';
    
    loans.forEach(loan => {
        const stats = calcularStats(loan);
        const esSoloInteres = loan.tipo === 'solo_interes';
        
        // Add loan header information for each installment
        loan.tabla.forEach(c => {
            csv += `${loan.nombre},${loan.id},${loan.tipo},${loan.monto.toFixed(0)},${stats.capitalRestante.toFixed(0)},${stats.interesesPagados.toFixed(0)},${loan.cuotaFija.toFixed(0)},${formatearFecha(loan.fechaPrestamo)},${loan.diaCobro || 'N/A'},`;
            csv += `${c.cuota},${formatearFecha(c.fechaCobro)},${c.cuotaFija.toFixed(0)},${c.interes.toFixed(0)},${esSoloInteres ? '0' : c.abonoCapital.toFixed(0)},${c.saldo.toFixed(0)},${c.pagada ? 'Pagada' : 'Pendiente'},${c.fechaPago ? formatearFecha(c.fechaPago) : ''},${(c.cuotaFija * 0.10).toFixed(0)},${c.multaPagada ? 'Sí' : 'No'},${c.fechaPagoMulta ? formatearFecha(c.fechaPagoMulta) : ''}\n`;
        });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `todos_los_prestamos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
}

function generarInteresMensual(id) {
    const loan = loans.find(l => l.id === id);
    if (!loan) return;
    if (loan.tipo !== "solo_interes") {
        alert("No es préstamo solo intereses");
        return;
    }

    let fechaCobro;
    if (loan.tabla.length === 0) {
        fechaCobro = calcularFechaCuota(loan.fechaPrestamo, 1, loan.diaCobro);
    } else {
        const ultimaCuota = loan.tabla[loan.tabla.length - 1];
        const ultimaFecha = new Date(ultimaCuota.fechaCobro);
        fechaCobro = calcularFechaCuota(ultimaFecha.toISOString().slice(0, 10), 1, loan.diaCobro);
    }

    const interes = loan.monto * (loan.tasa / 100);
    loan.tabla.push({
        cuota: loan.tabla.length + 1,
        fechaCobro: fechaCobro.toISOString(),
        cuotaFija: interes,
        interes: interes,
        abonoCapital: 0,
        saldo: loan.monto,
        pagada: false,
        fechaPago: null,
        multa: 0,
        multaPagada: false,
        fechaPagoMulta: null
    });

    guardarDatos();
    renderAll();
    alert(`Interés mensual generado: ${formatMoney(interes)}\nFecha de cobro: ${formatearFecha(fechaCobro)}`);
}

function registrarPagoInteres(loanId, cuotaIndex) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    const cuota = loan.tabla[cuotaIndex];

    if (cuota.pagada) {
        alert('Esta cuota ya está pagada completamente.');
        return;
    }

    const interesMensual = Math.round((loan.capitalPendiente || loan.monto) * (loan.tasa / 100));
    const vecesAntes = (cuota.pagosInteres || []).length;

    if (!confirm(`¿Confirmar pago de intereses por ${formatMoney(interesMensual)}?\nCapital pendiente: ${formatMoney(loan.capitalPendiente || loan.monto)} — se corre un mes más.${vecesAntes > 0 ? `\n(Este cliente ya ha pagado ${vecesAntes} mes(es) solo de interés en esta cuota)` : ''}`)) return;

    if (!cuota.pagosInteres) cuota.pagosInteres = [];
    cuota.pagosInteres.push({
        monto: interesMensual,
        fecha: new Date().toISOString()
    });

    // También actualizar campos legacy para compatibilidad con reportes anteriores
    cuota.interesDelMesPagado = true;
    cuota.montoInteresPagado = interesMensual;
    cuota.fechaPagoInteres = new Date().toISOString();

    // Mover la cuota al siguiente mes
    const fecha = new Date(cuota.fechaCobro);
    fecha.setMonth(fecha.getMonth() + 1);
    if (loan.diaCobro) {
        const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
        fecha.setDate(Math.min(loan.diaCobro, ultimoDia));
    }
    cuota.fechaCobro = fecha.toISOString();

    guardarDatos();
    renderAll();
    alert(`Pago de intereses registrado: ${formatMoney(interesMensual)}`);
}

function pagarMulta10Porciento(loanId, idx) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    const cuota = loan.tabla[idx];

    const multa = cuota.cuotaFija * 0.10;

    cuota.multa = multa;
    cuota.multaPagada = true;
    cuota.fechaPagoMulta = new Date().toISOString();

    desplazarCuotasSiguienteMes(loan, idx);

    guardarDatos();
    renderAll();

    alert(`Multa de ${formatMoney(multa)} pagada.\nCuota original movida al siguiente mes.`);
}

function desplazarCuotasSiguienteMes(loan, cuotaIndex) {
    const fechaCuotaActual = new Date(loan.tabla[cuotaIndex].fechaCobro);

    const nuevaFecha = new Date(fechaCuotaActual);
    nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
    loan.tabla[cuotaIndex].fechaCobro = nuevaFecha.toISOString();

    if (loan.diaCobro) {
        const ultimoDia = new Date(nuevaFecha.getFullYear(), nuevaFecha.getMonth() + 1, 0).getDate();
        nuevaFecha.setDate(Math.min(loan.diaCobro, ultimoDia));
        loan.tabla[cuotaIndex].fechaCobro = nuevaFecha.toISOString();
    }

    recalcularFechasPosteriores(loan, cuotaIndex + 1);
}

function recalcularFechasPosteriores(loan, desdeIndex) {
    if (loan.tipo !== 'cuotas_fijas') return;

    for (let i = desdeIndex; i < loan.tabla.length; i++) {
        const cuotaAnterior = loan.tabla[i - 1];
        if (cuotaAnterior) {
            const fechaAnterior = new Date(cuotaAnterior.fechaCobro);
            const nuevaFecha = new Date(fechaAnterior);
            nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);

            if (loan.diaCobro) {
                const ultimoDia = new Date(nuevaFecha.getFullYear(), nuevaFecha.getMonth() + 1, 0).getDate();
                nuevaFecha.setDate(Math.min(loan.diaCobro, ultimoDia));
            }

            loan.tabla[i].fechaCobro = nuevaFecha.toISOString();
        }
    }
}

function recalcularTablaAmortizacion(loan) {
    if (loan.tipo !== 'cuotas_fijas') return;

    const nuevaTabla = [];
    const tasaMensual = loan.tasa / 100;
    let saldo = loan.monto;

    for (let n = 1; n <= loan.cuotas; n++) {
        const fechaCobro = calcularFechaCuota(loan.fechaPrestamo, n, loan.diaCobro);
        const interes = saldo * tasaMensual;
        const abono = loan.cuotaFija - interes;
        saldo = Math.max(0, saldo - abono);

        const cuotaExistente = loan.tabla.find(c => c.cuota === n);

        nuevaTabla.push({
            cuota: n,
            cuotaFija: loan.cuotaFija,
            interes: interes,
            abonoCapital: abono,
            saldo: saldo,
            fechaCobro: fechaCobro.toISOString(),
            pagada: cuotaExistente ? cuotaExistente.pagada : false,
            fechaPago: cuotaExistente ? cuotaExistente.fechaPago : null,
            multa: cuotaExistente ? cuotaExistente.multa : 0,
            multaPagada: cuotaExistente ? cuotaExistente.multaPagada : false,
            fechaPagoMulta: cuotaExistente ? cuotaExistente.fechaPagoMulta : null
        });
    }

    loan.tabla = nuevaTabla;
    guardarDatos();
}

// ================= NOTES AND RECEIPTS FUNCTIONALITY =================

function toggleNotes(loanId) {
    const content = document.getElementById(`notes-content-${loanId}`);
    if (content.style.display === 'none') {
        content.style.display = 'block';
    } else {
        content.style.display = 'none';
    }
}

function saveNotes(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    
    const notesTextarea = document.getElementById(`notes-textarea-${loanId}`);
    loan.notas = notesTextarea.value;
    
    guardarDatos();
    renderAll();
    alert('Notas guardadas correctamente');
}

function handleFileUpload(loanId, event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;
        
        loan.comprobantes.push(e.target.result);
        
        guardarDatos();
        renderAll();
        
        // Clear the file input
        document.getElementById(`file-input-${loanId}`).value = '';
        
        alert('Comprobante subido correctamente');
    };
    reader.readAsDataURL(file);
}

function showReceipt(imageUrl) {
    const modal = document.getElementById('receiptViewerModal');
    const img = document.getElementById('receiptViewerImage');
    img.src = imageUrl;
    modal.style.display = 'flex';
}

function closeReceiptViewer() {
    document.getElementById('receiptViewerModal').style.display = 'none';
}

function deleteReceipt(loanId, receiptIndex) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    
    if (confirm('¿Estás seguro de que quieres eliminar este comprobante?')) {
        loan.comprobantes.splice(receiptIndex, 1);
        guardarDatos();
        renderAll();
    }
}

