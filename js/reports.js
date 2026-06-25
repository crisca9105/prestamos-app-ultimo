// ================= REPORTS MANAGEMENT =================

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

    loans.forEach(loan => {
        loan.tabla.forEach(c => {
            const f = new Date(c.fechaCobro);
            if (f >= start && f <= end) {
                totalThis += c.cuotaFija;
                if (c.pagada) interestThis += c.interes;
            }
            if (f >= prevStart && f <= prevEnd) {
                totalPrev += c.cuotaFija;
                if (c.pagada) interestPrev += c.interes;
            }
            // Historial de pagos de solo interés
            if (!c.pagada && c.pagosInteres) {
                c.pagosInteres.forEach(p => {
                    const fp = new Date(p.fecha);
                    if (fp >= start && fp <= end) interestThis += p.monto;
                    if (fp >= prevStart && fp <= prevEnd) interestPrev += p.monto;
                });
            }
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
    renderInteresesEsperados();
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

function renderInteresesEsperados() {
    const month = parseInt(document.getElementById('reportMonthSelector').value);
    const year = parseInt(document.getElementById('reportYearSelector').value);
    const esperados = computeInteresesEsperados(year, month);
    const cobrados = computeInteresesCobradosMes(year, month);
    const pendientes = Math.max(0, esperados - cobrados);
    const pctCobrado = esperados === 0 ? 0 : Math.round((cobrados / esperados) * 100);
    const container = document.getElementById('interesesEsperadosContent');
    if (!container) return;
    container.innerHTML = `
        <div>
            <div class="small" style="text-transform:uppercase;font-weight:700;letter-spacing:.4px;margin-bottom:4px">Esperados</div>
            <div style="font-size:28px;font-weight:800;color:#1e293b">${formatMoney(esperados)}</div>
            <div class="small">Si todos pagan este mes</div>
        </div>
        <div>
            <div class="small" style="text-transform:uppercase;font-weight:700;letter-spacing:.4px;margin-bottom:4px">Ya cobrados</div>
            <div style="font-size:28px;font-weight:800;color:#10b981">${formatMoney(cobrados)}</div>
            <div class="small">${pctCobrado}% del total esperado</div>
        </div>
        <div>
            <div class="small" style="text-transform:uppercase;font-weight:700;letter-spacing:.4px;margin-bottom:4px">Pendientes</div>
            <div style="font-size:28px;font-weight:800;color:${pendientes > 0 ? '#ef4444' : '#10b981'}">${formatMoney(pendientes)}</div>
            <div class="small">${pendientes > 0 ? 'Por cobrar este mes' : 'Todo cobrado'}</div>
        </div>`;
}

function computeProjectedCashflow(startYear, startMonth, months = 12) {
    const res = {};
    for (let i = 0; i < months; i++) {
        const d = new Date(startYear, startMonth + i, 1);
        const key = ymKey(d);
        res[key] = 0;
    }
    loans.forEach(loan => {
        loan.tabla.forEach(c => {
            const f = new Date(c.fechaCobro);
            const key = ymKey(f);
            if (res.hasOwnProperty(key)) res[key] += c.cuotaFija;
        });
    });
    return res;
}

function renderProjectedMountain() {
    const start = new Date(currentYear, currentMonth, 1);
    const data = computeProjectedCashflow(start.getFullYear(), start.getMonth(), 12);
    const container = document.getElementById('projectedMountain');
    container.innerHTML = '';
    const labels = document.getElementById('projLabels');
    labels.innerHTML = '';
    const values = Object.values(data);
    const max = Math.max(...values, 1);
    Object.keys(data).forEach(key => {
        const val = data[key];
        const heightPct = Math.round((val / max) * 100);
        const barWrap = document.createElement('div');
        barWrap.className = 'bar';
        const bar = document.createElement('div');
        bar.style.height = heightPct + '%';
        bar.title = `${monthLabelFromKey(key)}: ${formatMoney(val)}`;
        barWrap.appendChild(bar);
        container.appendChild(barWrap);
        const lbl = document.createElement('div');
        lbl.style.width = '100%';
        lbl.style.textAlign = 'center';
        lbl.style.fontSize = '11px';
        lbl.style.color = '#475569';
        lbl.textContent = monthLabelFromKey(key).split(' ')[0];
        labels.appendChild(lbl);
    });
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
            if (c.pagada) {
                const f = new Date(c.fechaPago || c.fechaCobro);
                const key = ymKey(f);
                if (map.hasOwnProperty(key)) map[key] += c.interes;
            }
            if (!c.pagada && c.pagosInteres) {
                c.pagosInteres.forEach(p => {
                    const f = new Date(p.fecha);
                    const key = ymKey(f);
                    if (map.hasOwnProperty(key)) map[key] += p.monto;
                });
            }
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
        const pagados = l.tabla.filter(c => c.pagada).reduce((si, c) => si + c.interes, 0);
        const soloInteres = l.tabla.reduce((si, c) => si + (c.pagosInteres || []).reduce((sp, p) => sp + p.monto, 0), 0);
        return s + pagados + soloInteres;
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
    const snaps = (efectivoSnapshots || []).slice(-24);

    el.innerHTML = `
        <div style="margin-bottom:20px">
            <div class="small" style="text-transform:uppercase;font-weight:700;letter-spacing:.4px;color:#94a3b8;margin-bottom:4px">Capital activo hoy</div>
            <div style="font-size:28px;font-weight:700;color:#e2e8f0">${formatMoney(capitalHoy)}</div>
        </div>
        <div style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:12px">Historial real de capital</div>`;

    if (snaps.length < 2) {
        el.innerHTML += `<div class="small" style="color:#94a3b8;padding:8px 0">El historial se irá construyendo automáticamente cada mes al abrir la app.</div>`;
        return;
    }

    const filas = snaps.map((s, i) => {
        const variacion = i === 0 ? null : s.capital - snaps[i - 1].capital;
        const colorVar = variacion === null ? '#94a3b8' : variacion >= 0 ? '#10b981' : '#ef4444';
        const signVar = variacion === null ? '' : variacion >= 0 ? '+' : '';
        const [y, m, d] = s.fecha.split('-').map(Number);
        const labelFecha = new Date(y, m - 1, d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
        return `<tr>
            <td style="padding:8px 12px;color:#e2e8f0;font-size:13px">${labelFecha}</td>
            <td style="padding:8px 12px;color:#e2e8f0;font-weight:600;font-size:13px">${formatMoney(s.capital)}</td>
            <td style="padding:8px 12px;color:${colorVar};font-weight:600;font-size:13px">${variacion === null ? '—' : signVar + formatMoney(variacion)}</td>
        </tr>`;
    }).reverse().join('');

    el.innerHTML += `<div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
                <tr style="border-bottom:1px solid #1e3a5f">
                    <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.4px">Fecha</th>
                    <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.4px">Capital registrado</th>
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
    renderProjectedMountain();
    renderInterestsTable();
    renderMorosidadYRentabilidad();
    renderCapitalPrestadoPorMes();
    renderHistorialSnapshots();
}











