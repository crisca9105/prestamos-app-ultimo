// ================= REPORTS MANAGEMENT =================

function calcularInteresCobradoEnRango(c, s, e) {
    let total = 0;
    const pi = c.pagosInteres || [];
    pi.forEach(p => {
        const pd = new Date(p.fecha);
        if (pd >= s && pd <= e) {
            total += p.monto || 0;
        }
    });
    if (c.pagada) {
        const fp = c.fechaPago ? new Date(c.fechaPago) : new Date(c.fechaCobro);
        if (fp >= s && fp <= e) {
            const totalPagadoInteres = pi.reduce((sum, p) => sum + (p.monto || 0), 0);
            const interesRestante = Math.max(0, (c.interes || 0) - totalPagadoInteres);
            total += interesRestante;
        }
    }
    return total;
}

function computeMonthlyReport(year, month) {
    const start = new Date(year, month, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, month + 1, 0);
    end.setHours(23, 59, 59, 999);
    const prevStart = new Date(year, month - 1, 1);
    prevStart.setHours(0, 0, 0, 0);
    const prevEnd = new Date(year, month, 0);
    prevEnd.setHours(23, 59, 59, 999);

    let totalThis = 0, interestThis = 0;
    let totalPrev = 0, interestPrev = 0;

    // Calcular montos esperados/programados (solo de préstamos activos)
    loans.filter(l => !l.archivado).forEach(loan => {
        loan.tabla.forEach(c => {
            const f = new Date(c.fechaCobro);
            if (f >= start && f <= end) {
                totalThis += c.cuotaFija;
            }
            if (f >= prevStart && f <= prevEnd) {
                totalPrev += c.cuotaFija;
            }
        });
    });

    // Calcular cobros reales de intereses (de TODOS los préstamos, activos y archivados)
    loans.forEach(loan => {
        loan.tabla.forEach(c => {
            interestThis += calcularInteresCobradoEnRango(c, start, end);
            interestPrev += calcularInteresCobradoEnRango(c, prevStart, prevEnd);
        });
    });

    return { totalThis, interestThis, totalPrev, interestPrev };
}

function populateMonthYearSelectors() {
    const now = new Date();
    const monthSel = document.getElementById('reportMonthSelector');
    const yearSel = document.getElementById('reportYearSelector');
    monthSel.innerHTML = '';
    yearSel.innerHTML = '';
    for (let m = 0; m < 12; m++) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = new Date(0, m, 1).toLocaleString('es-CO', { month: 'long' });
        if (m === now.getMonth()) opt.selected = true;
        monthSel.appendChild(opt);
    }
    const startYear = now.getFullYear() - 3;
    for (let y = startYear; y <= now.getFullYear() + 1; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === now.getFullYear()) opt.selected = true;
        yearSel.appendChild(opt);
    }
}

function renderMonthlyReport() {
    const month = parseInt(document.getElementById('reportMonthSelector').value);
    const year = parseInt(document.getElementById('reportYearSelector').value);
    const res = computeMonthlyReport(year, month);
    document.getElementById('r_total_current').textContent = formatMoney(res.totalThis);
    document.getElementById('r_total_prev').textContent = formatMoney(res.totalPrev);
    document.getElementById('r_interest_current').textContent = formatMoney(res.interestThis);
    document.getElementById('r_interest_prev').textContent = formatMoney(res.interestPrev);
    const varPct = res.totalPrev === 0 ? '—' : (((res.totalThis - res.totalPrev) / res.totalPrev) * 100).toFixed(1) + '%';
    document.getElementById('r_variation').textContent = varPct;
    renderInteresesEsperados(res);
}

function computeInteresesEsperados(year, month) {
    const start = new Date(year, month, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, month + 1, 0);
    end.setHours(23, 59, 59, 999);

    let esperados = 0;
    loans.filter(l => !l.archivado).forEach(loan => {
        loan.tabla.forEach(c => {
            const f = new Date(c.fechaCobro);
            if (f >= start && f <= end) esperados += c.interes;
        });
    });
    return esperados;
}

function computeInteresesCobradosMes(year, month) {
    const start = new Date(year, month, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, month + 1, 0);
    end.setHours(23, 59, 59, 999);
    let total = 0;
    loans.forEach(loan => {
        loan.tabla.forEach(c => {
            if (c.pagada) {
                const f = new Date(c.fechaPago || c.fechaCobro);
                if (f >= start && f <= end) total += c.interes;
            }
            if (!c.pagada && c.pagosInteres) {
                c.pagosInteres.forEach(p => {
                    const fp = new Date(p.fecha);
                    if (fp >= start && fp <= end) total += p.monto;
                });
            }
        });
    });
    return total;
}

function renderInteresesEsperados(monthlyResult) {
    const month = parseInt(document.getElementById('reportMonthSelector').value);
    const year = parseInt(document.getElementById('reportYearSelector').value);
    const start = new Date(year, month, 1); start.setHours(0, 0, 0, 0);
    const end = new Date(year, month + 1, 0); end.setHours(23, 59, 59, 999);

    let totalEsperado = 0;

    loans.filter(l => !l.archivado).forEach(loan => {
        loan.tabla.forEach(c => {
            const f = new Date(c.fechaCobro);
            if (f < start || f > end) return;
            totalEsperado += c.interes;
        });
    });

    // Calcular lo cobrado en el mes correspondiente únicamente a cuotas de este mes
    let cobradoEnMesParaEsperados = 0;
    loans.filter(l => !l.archivado).forEach(loan => {
        loan.tabla.forEach(c => {
            const f = new Date(c.fechaCobro);
            if (f < start || f > end) return; // solo cuotas programadas para este mes
            cobradoEnMesParaEsperados += calcularInteresCobradoEnRango(c, start, end);
        });
    });

    // Cuotas del mes cubiertas: intereses de cuotas de este mes que fueron cobrados en cualquier fecha (antes, durante o después)
    let cuotasCubiertas = 0;
    loans.filter(l => !l.archivado).forEach(loan => {
        loan.tabla.forEach(c => {
            const f = new Date(c.fechaCobro);
            if (f < start || f > end) return;
            const pi = c.pagosInteres || [];
            const sumPi = pi.reduce((sum, p) => sum + (p.monto || 0), 0);
            if (c.pagada) {
                cuotasCubiertas += Math.max(c.interes || 0, sumPi);
            } else {
                cuotasCubiertas += sumPi;
            }
        });
    });

    const pendientes = Math.max(0, totalEsperado - cuotasCubiertas);
    const mesLabel = new Date(year, month, 1).toLocaleString('es-CO', { month: 'long' });

    const container = document.getElementById('interesesEsperadosContent');
    if (!container) return;
    container.style.gridTemplateColumns = 'repeat(4, 1fr)';
    container.innerHTML = `
        <div>
            <div class="small" style="text-transform:uppercase;font-weight:700;letter-spacing:.4px;margin-bottom:4px">Esperados</div>
            <div style="color:#e2e8f0;font-size:24px;font-weight:700">${formatMoney(totalEsperado)}</div>
            <div class="small">Si todos pagan este mes</div>
        </div>
        <div>
            <div class="small" style="text-transform:uppercase;font-weight:700;letter-spacing:.4px;margin-bottom:4px">💰 Cobrado en ${mesLabel}</div>
            <div style="font-size:24px;font-weight:800;color:#34d399">${formatMoney(cobradoEnMesParaEsperados)}</div>
            <div class="small">De cuotas de este mes recibidas en el mes</div>
        </div>
        <div>
            <div class="small" style="text-transform:uppercase;font-weight:700;letter-spacing:.4px;margin-bottom:4px">✅ Cuotas del mes cubiertas</div>
            <div style="font-size:24px;font-weight:800;color:#60a5fa">${formatMoney(cuotasCubiertas)}</div>
            <div class="small">Cuotas programadas para este mes ya resueltas (en cualquier fecha)</div>
        </div>
        <div>
            <div class="small" style="text-transform:uppercase;font-weight:700;letter-spacing:.4px;margin-bottom:4px">⏳ Pendientes del mes</div>
            <div style="font-size:24px;font-weight:800;color:#f87171">${formatMoney(pendientes)}</div>
            <div class="small">Cuotas de este mes que aún no han pagado</div>
        </div>`;
}


function computeCapitalPrestadoPorMes(monthsBack = 12) {
    const map = {};
    const now = new Date();
    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        map[ymKey(d)] = 0;
    }
    loans.forEach(loan => {
        const f = new Date(loan.fechaPrestamo);
        const key = ymKey(f);
        if (map.hasOwnProperty(key)) map[key] += loan.monto;
    });
    return map;
}

function renderCapitalPrestadoPorMes() {
    const data = computeCapitalPrestadoPorMes(12);
    const tbody = document.getElementById('capitalPrestadoBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    Object.keys(data).forEach(k => {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td'); td1.textContent = monthLabelFromKey(k);
        const td2 = document.createElement('td');
        td2.textContent = data[k] > 0 ? formatMoney(data[k]) : '—';
        if (data[k] > 0) td2.style.fontWeight = '700';
        tr.appendChild(td1); tr.appendChild(td2);
        tbody.appendChild(tr);
    });
}

function computeInterestsByMonth(monthsBack = 12) {
    const map = {};
    const now = new Date();
    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        map[ymKey(d)] = 0;
    }
    
    loans.forEach(loan => {
        loan.tabla.forEach(c => {
            Object.keys(map).forEach(k => {
                const [y, m] = k.split('-');
                const s = new Date(y, parseInt(m) - 1, 1);
                s.setHours(0, 0, 0, 0);
                const e = new Date(y, parseInt(m), 0);
                e.setHours(23, 59, 59, 999);
                
                map[k] += calcularInteresCobradoEnRango(c, s, e);
            });
        });
    });
    return map;
}

function renderInterestsTable() {
    const data = computeInterestsByMonth(12);
    const tbody = document.getElementById('interestsBody');
    tbody.innerHTML = '';
    Object.keys(data).forEach(k => {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.textContent = monthLabelFromKey(k);
        const td2 = document.createElement('td');
        td2.textContent = formatMoney(data[k]);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tbody.appendChild(tr);
    });
}


function computeMorosidadYRentabilidad() {
    const activos = loans.filter(l => !l.archivado);
    const totalClientes = activos.length;
    const clientesMorosos = activos.filter(l => l.tabla.some(c => !c.pagada && estaVencida(c.fechaCobro))).length;
    const tasaMorosidad = totalClientes === 0 ? 0 : Math.round((clientesMorosos / totalClientes) * 100);

    const interesesTotales = loans.reduce((s, l) => {
        return s + l.tabla.reduce((sum, c) => {
            const pi = c.pagosInteres || [];
            const sumPi = pi.reduce((sp, p) => sp + (p.monto || 0), 0);
            if (c.pagada) {
                return sum + Math.max(c.interes || 0, sumPi);
            } else {
                return sum + sumPi;
            }
        }, 0);
    }, 0);
    const capitalTotal = loans.reduce((s, l) => s + l.monto, 0);
    const roi = capitalTotal === 0 ? 0 : ((interesesTotales / capitalTotal) * 100).toFixed(1);

    return { tasaMorosidad, clientesMorosos, totalClientes, interesesTotales, roi, capitalTotal };
}

function renderMorosidadYRentabilidad() {
    const el = document.getElementById('morosidadRentabilidad');
    if (!el) return;
    const d = computeMorosidadYRentabilidad();
    const colorMorosidad = d.tasaMorosidad > 30 ? '#ef4444' : d.tasaMorosidad > 10 ? '#f59e0b' : '#10b981';
    el.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div>
                <div class="small" style="margin-bottom:4px;text-transform:uppercase;font-weight:700;letter-spacing:.4px">Tasa de morosidad</div>
                <div style="font-size:32px;font-weight:800;color:${colorMorosidad}">${d.tasaMorosidad}%</div>
                <div class="small">${d.clientesMorosos} de ${d.totalClientes} clientes con cuotas vencidas</div>
            </div>
            <div>
                <div class="small" style="margin-bottom:4px;text-transform:uppercase;font-weight:700;letter-spacing:.4px">Rentabilidad acumulada</div>
                <div style="font-size:32px;font-weight:800;color:#10b981">${d.roi}%</div>
                <div class="small">${formatMoney(d.interesesTotales)} en intereses sobre ${formatMoney(d.capitalTotal)} prestados</div>
            </div>
        </div>`;
}

function computeCapitalHoy() {
    return loans
        .filter(l => !l.archivado)
        .reduce((s, l) => s + calcularStats(l).capitalRestante, 0);
}

function computeCapitalAtDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const targetEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    let total = 0;
    loans.forEach(loan => {
        const fp = new Date(loan.fechaPrestamo + 'T00:00:00');
        if (fp > targetEnd) return;
        if (loan.tipo === 'solo_interes') {
            total += loan.monto;
        } else {
            const capitalPagado = loan.tabla
                .filter(c => c.pagada && c.fechaPago && new Date(c.fechaPago) <= targetEnd)
                .reduce((s, c) => s + (c.abonoCapital || 0), 0);
            total += Math.max(0, loan.monto - capitalPagado);
        }
    });
    return total;
}

function renderHistorialSnapshots() {
    const el = document.getElementById('evolucionHistorialContent');
    if (!el) return;

    const capitalHoy = computeCapitalHoy();
    const efectivoHoy = efectivoSaldo || 0;
    const totalHoy = capitalHoy + efectivoHoy;
    const snaps = (efectivoSnapshots || []).slice(-24);

    el.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:24px">
            <div>
                <div class="small" style="text-transform:uppercase;font-weight:700;letter-spacing:.4px;color:#94a3b8;margin-bottom:4px">Capital prestado</div>
                <div style="font-size:22px;font-weight:700;color:#60a5fa">${formatMoney(capitalHoy)}</div>
            </div>
            <div>
                <div class="small" style="text-transform:uppercase;font-weight:700;letter-spacing:.4px;color:#94a3b8;margin-bottom:4px">Efectivo disponible</div>
                <div style="font-size:22px;font-weight:700;color:#34d399">${formatMoney(efectivoHoy)}</div>
            </div>
            <div>
                <div class="small" style="text-transform:uppercase;font-weight:700;letter-spacing:.4px;color:#94a3b8;margin-bottom:4px">Total patrimonio</div>
                <div style="font-size:28px;font-weight:800;color:#e2e8f0">${formatMoney(totalHoy)}</div>
            </div>
        </div>
        <div style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:12px">Historial real de capital</div>`;

    if (snaps.length < 2) {
        el.innerHTML += `<div class="small" style="color:#94a3b8;padding:8px 0">El historial se irá construyendo automáticamente cada mes al abrir la app.</div>`;
        return;
    }

    const filas = snaps.map((s, i) => {
        const totalS = s.total ?? s.capital;
        const efectivoS = s.efectivo ?? 0;
        const totalAnterior = i === 0 ? null : (snaps[i - 1].total ?? snaps[i - 1].capital);
        const variacion = totalAnterior === null ? null : totalS - totalAnterior;
        const colorVar = variacion === null ? '#94a3b8' : variacion >= 0 ? '#10b981' : '#ef4444';
        const signVar = variacion === null ? '' : variacion >= 0 ? '+' : '';
        const [y, m, d] = s.fecha.split('-').map(Number);
        const labelFecha = new Date(y, m - 1, d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
        return `<tr>
            <td style="padding:8px 12px;color:#e2e8f0;font-size:13px">${labelFecha}</td>
            <td style="padding:8px 12px;color:#60a5fa;font-weight:600;font-size:13px">${formatMoney(s.capital)}</td>
            <td style="padding:8px 12px;color:#34d399;font-weight:600;font-size:13px">${formatMoney(efectivoS)}</td>
            <td style="padding:8px 12px;color:#e2e8f0;font-weight:700;font-size:13px">${formatMoney(totalS)}</td>
            <td style="padding:8px 12px;color:${colorVar};font-weight:600;font-size:13px">${variacion === null ? '—' : signVar + formatMoney(variacion)}</td>
        </tr>`;
    }).reverse().join('');

    el.innerHTML += `<div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
                <tr style="border-bottom:1px solid #1e3a5f">
                    <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.4px">Fecha</th>
                    <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.4px">Capital prestado</th>
                    <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.4px">Efectivo</th>
                    <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.4px">Total patrimonio</th>
                    <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.4px">Variación vs mes anterior</th>
                </tr>
            </thead>
            <tbody>${filas}</tbody>
        </table>
    </div>`;
}

function initReportSelectors() {
    populateMonthYearSelectors();
    renderMonthlyReport(); // también llama renderInteresesEsperados()
    renderInterestsTable();
    renderMorosidadYRentabilidad();
    renderCapitalPrestadoPorMes();
    renderHistorialSnapshots();
}











