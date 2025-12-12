// ================= UTILITY FUNCTIONS =================

// Global variables (declared here to be available to all modules)
let loans = [];

function formatearFecha(f) {
    return new Date(f).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMoney(n) {
    return '$' + Math.round(n).toLocaleString('es-CO');
}

function estaVencida(f) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ff = new Date(f);
    ff.setHours(0, 0, 0, 0);
    return ff < hoy;
}

function esProxima(f) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ff = new Date(f);
    ff.setHours(0, 0, 0, 0);
    const dif = (ff - hoy) / 86400000;
    return dif >= 0 && dif <= 7;
}

function calcularFechaCuota(fechaInicio, numeroCuota, diaCobro) {
    const fecha = new Date(fechaInicio);
    fecha.setMonth(fecha.getMonth() + numeroCuota);
    if (diaCobro) {
        const ultimo = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
        fecha.setDate(Math.min(diaCobro, ultimo));
    }
    return fecha;
}

function getNextFechaCobro(fechaBaseISO, mesesSumar, diaCobro) {
    const fechaBase = new Date(fechaBaseISO);
    const res = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + mesesSumar, 1);
    if (diaCobro) {
        const ultimo = new Date(res.getFullYear(), res.getMonth() + 1, 0).getDate();
        res.setDate(Math.min(diaCobro, ultimo));
    } else {
        const d = fechaBase.getDate();
        const ultimo = new Date(res.getFullYear(), res.getMonth() + 1, 0).getDate();
        res.setDate(Math.min(d, ultimo));
    }
    return res;
}

function calcularCuotaFija(monto, tasa, cuotas) {
    const i = tasa / 100;
    return monto * (i * Math.pow(1 + i, cuotas)) / (Math.pow(1 + i, cuotas) - 1);
}

function ymKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabelFromKey(key) {
    const [y, m] = key.split('-');
    const d = new Date(y, parseInt(m) - 1, 1);
    return d.toLocaleString('es-CO', { month: 'short', year: 'numeric' });
}

function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function getWeekRange(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = (d.getDay() + 6) % 7;
    const s = new Date(d);
    s.setDate(d.getDate() - day);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
}

function getMonthRange(year, month) {
    const s = new Date(year, month, 1);
    s.setHours(0, 0, 0, 0);
    const e = new Date(year, month + 1, 0);
    e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
}

