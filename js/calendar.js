// ================= CALENDAR MANAGEMENT =================
// Note: currentDate, currentMonth, currentYear are defined in main.js

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear -= 1;
    }
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear += 1;
    }
    renderCalendar(currentYear, currentMonth);
}

function getEventsInRange(startDate, endDate) {
    const events = {};
    loans.forEach(loan => {
        loan.tabla.forEach(c => {
            if (c.pagada) return;
            const f = new Date(c.fechaCobro);
            f.setHours(0, 0, 0, 0);
            if (f >= startDate && f <= endDate) {
                const key = f.toISOString().slice(0, 10);
                if (!events[key]) events[key] = [];
                events[key].push({
                    loanId: loan.id,
                    nombre: loan.nombre,
                    telefono: loan.telefono,
                    cuota: c.cuota,
                    fecha: c.fechaCobro,
                    valor: c.cuotaFija,
                    pagada: c.pagada,
                    estado: (estaVencida(c.fechaCobro) ? 'vencida' : (new Date().toISOString().slice(0, 10) === key ? 'hoy' : (esProxima(c.fechaCobro) ? 'proxima' : 'normal')))
                });
            }
        });
    });
    return events;
}

function renderCalendar(year, month) {
    const monthLabel = document.getElementById('monthLabel');
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const monthName = firstOfMonth.toLocaleString('es-CO', { month: 'long', year: 'numeric' });
    monthLabel.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const startDay = new Date(firstOfMonth);
    const dayOfWeek = (startDay.getDay() + 6) % 7;
    startDay.setDate(startDay.getDate() - dayOfWeek);

    const endDay = new Date(startDay);
    endDay.setDate(startDay.getDate() + (7 * 6 - 1));

    const events = getEventsInRange(startDay, endDay);

    let cur = new Date(startDay);
    for (let i = 0; i < 42; i++) {
        const dayKey = cur.toISOString().slice(0, 10);
        const isOther = cur.getMonth() !== month;
        const cell = document.createElement('div');
        cell.className = 'day-cell' + (isOther ? ' other-month' : '');
        const dayNum = document.createElement('div');
        dayNum.className = 'day-num';
        dayNum.textContent = cur.getDate();
        cell.appendChild(dayNum);
        const evWrap = document.createElement('div');
        evWrap.className = 'events';
        const todays = events[dayKey] || [];
        
        // Group events by loan to limit to 3 installments per loan
        const eventsByLoan = {};
        todays.forEach(ev => {
            if (!eventsByLoan[ev.loanId]) {
                eventsByLoan[ev.loanId] = [];
            }
            eventsByLoan[ev.loanId].push(ev);
        });
        
        // Sort loans by status (overdue first, then today, then upcoming)
        const sortedLoans = Object.values(eventsByLoan).sort((a, b) => {
            const getPriority = (events) => {
                const hasVencida = events.some(e => e.estado === 'vencida');
                const hasHoy = events.some(e => e.estado === 'hoy');
                const hasProxima = events.some(e => e.estado === 'proxima');
                
                if (hasVencida) return 0;
                if (hasHoy) return 1;
                if (hasProxima) return 2;
                return 3;
            };
            
            return getPriority(a) - getPriority(b);
        });
        
        // Render limited installments per loan
        sortedLoans.forEach(loanEvents => {
            const loanId = loanEvents[0].loanId;
            const loanName = loanEvents[0].nombre;
            
            // Show first 3 installments
            const visibleEvents = loanEvents.slice(0, 3);
            const hiddenEvents = loanEvents.slice(3);
            
            visibleEvents.forEach(ev => {
                const pill = document.createElement('div');
                pill.className = 'event-pill';
                const dot = document.createElement('div');
                dot.className = 'event-dot';
                if (ev.estado === 'vencida') dot.classList.add('dot-vencida');
                else if (ev.estado === 'hoy') dot.classList.add('dot-hoy');
                else dot.classList.add('dot-proxima');
                const txt = document.createElement('div');
                const phoneDisplay = ev.telefono ? ` • ${ev.telefono}` : '';
                txt.innerHTML = `<strong style="font-size:13px">${ev.nombre}</strong> <div style="font-size:12px;color:#475569">#${ev.cuota} • ${formatMoney(ev.valor)}${phoneDisplay}</div>`;
                pill.appendChild(dot);
                pill.appendChild(txt);
                pill.onclick = () => { scrollToLoan(ev.loanId); };
                evWrap.appendChild(pill);
            });
            
            // Add "show more" button if there are hidden events
            if (hiddenEvents.length > 0) {
                const moreButton = document.createElement('div');
                moreButton.className = 'event-pill show-more';
                moreButton.style.justifyContent = 'center';
                moreButton.style.fontSize = '11px';
                moreButton.style.fontWeight = '600';
                moreButton.style.color = 'var(--primary-color)';
                moreButton.style.cursor = 'pointer';
                moreButton.textContent = `+${hiddenEvents.length} más de ${loanName}`;
                moreButton.onclick = (e) => {
                    e.stopPropagation();
                    // Show all events for this loan
                    hiddenEvents.forEach(ev => {
                        const pill = document.createElement('div');
                        pill.className = 'event-pill';
                        const dot = document.createElement('div');
                        dot.className = 'event-dot';
                        if (ev.estado === 'vencida') dot.classList.add('dot-vencida');
                        else if (ev.estado === 'hoy') dot.classList.add('dot-hoy');
                        else dot.classList.add('dot-proxima');
                        const txt = document.createElement('div');
                        const phoneDisplay = ev.telefono ? ` • ${ev.telefono}` : '';
                        txt.innerHTML = `<strong style="font-size:13px">${ev.nombre}</strong> <div style="font-size:12px;color:#475569">#${ev.cuota} • ${formatMoney(ev.valor)}${phoneDisplay}</div>`;
                        pill.appendChild(dot);
                        pill.appendChild(txt);
                        pill.onclick = () => { scrollToLoan(ev.loanId); };
                        evWrap.insertBefore(pill, moreButton);
                    });
                    moreButton.remove();
                };
                evWrap.appendChild(moreButton);
            }
        });
        
        cell.appendChild(evWrap);
        if (todays.length > 0) {
            const total = todays.reduce((s, e) => s + e.valor, 0);
            const tot = document.createElement('div');
            tot.className = 'day-total';
            tot.textContent = formatMoney(total);
            cell.appendChild(tot);
        }
        calendarGrid.appendChild(cell);
        cur.setDate(cur.getDate() + 1);
    }
    renderGroupings();
}

function scrollToLoan(loanId) {
    const el = document.querySelector(`[data-loan-id='${loanId}']`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.18)';
        setTimeout(() => { el.style.boxShadow = ''; }, 1600);
    }
}

function renderGroupings() {
    const today = startOfToday();
    const week = getWeekRange(today);
    const thisMonth = getMonthRange(today.getFullYear(), today.getMonth());
    const nmDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonth = getMonthRange(nmDate.getFullYear(), nmDate.getMonth());
    const futureStart = new Date(nextMonth.end);
    futureStart.setDate(futureStart.getDate() + 1);
    futureStart.setHours(0, 0, 0, 0);

    const groups = { week: [], thisMonth: [], nextMonth: [], future: [] };
    loans.forEach(loan => {
        loan.tabla.forEach(c => {
            if (c.pagada) return;
            const f = new Date(c.fechaCobro);
            f.setHours(0, 0, 0, 0);
            if (f >= week.start && f <= week.end) groups.week.push({ loan, c });
            if (f >= thisMonth.start && f <= thisMonth.end) groups.thisMonth.push({ loan, c });
            if (f >= nextMonth.start && f <= nextMonth.end) groups.nextMonth.push({ loan, c });
            if (f >= futureStart) groups.future.push({ loan, c });
        });
    });

    renderGroupList('groupThisWeek', groups.week);
    renderGroupList('groupThisMonth', groups.thisMonth);
    renderGroupList('groupNextMonth', groups.nextMonth);
}

function renderGroupList(id, items) {
    const container = document.getElementById(id);
    if (items.length === 0) {
        container.innerHTML = `<div class="small">Sin cobros</div>`;
        return;
    }
    items.sort((a, b) => new Date(a.c.fechaCobro) - new Date(b.c.fechaCobro));
    container.innerHTML = items.map(it => {
        const estado = (estaVencida(it.c.fechaCobro) ? 'vencida' : (new Date().toISOString().slice(0, 10) === it.c.fechaCobro.slice(0, 10) ? 'hoy' : (esProxima(it.c.fechaCobro) ? 'proxima' : 'normal')));
        const badge = estado === 'vencida' ? `<span class="badge badge-vencida">VENCIDA</span>` : estado === 'hoy' ? `<span class="badge badge-hoy">HOY</span>` : estado === 'proxima' ? `<span class="badge badge-proxima">PRÓXIMA</span>` : '';
        return `<div class="group-item" onclick="scrollToLoan(${it.loan.id})"><div style="display:flex;flex-direction:column"><div style="font-weight:800">${it.loan.nombre} — Cuota ${it.c.cuota}</div><div class="small">${formatearFecha(it.c.fechaCobro)}</div></div><div style="text-align:right"><div style="font-weight:800">${formatMoney(it.c.cuotaFija)}</div><div style="margin-top:6px">${badge}</div></div></div>`;
    }).join('');
}

