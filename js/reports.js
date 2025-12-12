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

function computeInterestsByMonth(monthsBack = 12) {
    const map = {};
    const now = new Date();
    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        map[ymKey(d)] = 0;
    }
    loans.forEach(loan => {
        loan.tabla.forEach(c => {
            if (!c.pagada) return;
            const f = new Date(c.fechaPago || c.fechaCobro);
            const key = ymKey(f);
            if (map.hasOwnProperty(key)) map[key] += c.interes;
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

function computeClientHistory() {
    const clients = {};
    loans.forEach(loan => {
        const name = loan.nombre;
        if (!clients[name]) clients[name] = { total: 0, paid: 0, onTime: 0, lateDaysSum: 0, lateCount: 0, vencidas: 0 };
        loan.tabla.forEach(c => {
            clients[name].total += 1;
            if (c.pagada) {
                clients[name].paid += 1;
                const due = new Date(c.fechaCobro);
                due.setHours(0, 0, 0, 0);
                const paid = new Date(c.fechaPago);
                paid.setHours(0, 0, 0, 0);
                const diffDays = Math.round((paid - due) / 86400000);
                if (diffDays <= 0) clients[name].onTime += 1;
                else {
                    clients[name].lateDaysSum += diffDays;
                    clients[name].lateCount += 1;
                }
            } else {
                if (estaVencida(c.fechaCobro)) clients[name].vencidas += 1;
            }
        });
    });
    const arr = Object.keys(clients).map(name => {
        const c = clients[name];
        const pctOnTime = c.paid === 0 ? 0 : Math.round((c.onTime / c.paid) * 100);
        const avgLate = c.lateCount === 0 ? 0 : Math.round(c.lateDaysSum / c.lateCount);
        return { name, total: c.total, paid: c.paid, pctOnTime, avgLate, vencidas: c.vencidas };
    });
    arr.sort((a, b) => a.pctOnTime - b.pctOnTime);
    return arr;
}

function renderClientHistory() {
    const list = computeClientHistory();
    const container = document.getElementById('clientHistoryList');
    container.innerHTML = '';
    if (list.length === 0) {
        container.innerHTML = '<div class="small">Sin datos</div>';
        return;
    }
    list.forEach(c => {
        let tag = '';
        if (c.pctOnTime >= 90) tag = `<span class="badge badge-hoy">CUMPLIDO ${c.pctOnTime}%</span>`;
        else if (c.pctOnTime >= 60) tag = `<span class="badge badge-proxima">REGULAR ${c.pctOnTime}%</span>`;
        else tag = `<span class="badge badge-vencida">ATRASADO ${c.pctOnTime}%</span>`;
        const item = document.createElement('div');
        item.className = 'client-item';
        item.innerHTML = `<div style="display:flex;flex-direction:column"><div style="font-weight:800">${c.name}</div><div class="small">Pagadas: ${c.paid}/${c.total} • Días atraso prom.: ${c.avgLate} • Vencidas: ${c.vencidas}</div></div><div>${tag}</div>`;
        container.appendChild(item);
    });
}

function initReportSelectors() {
    populateMonthYearSelectors();
    renderMonthlyReport();
    renderProjectedMountain();
    renderInterestsTable();
    renderClientHistory();
}






