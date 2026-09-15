// ================= PAYMENT MANAGEMENT =================

let currentPaymentData = {};

function abrirModalPagoExcedente(loanId, cuotaIndex) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const cuota = loan.tabla[cuotaIndex];
    if (cuota.pagada) {
        alert("Esta cuota ya está marcada como pagada");
        return;
    }

    currentPaymentData = { loanId, cuotaIndex, loan, cuota };

    document.getElementById('modalClientName').value = loan.nombre;
    document.getElementById('modalCuotaNumber').value = cuota.cuota;
    document.getElementById('modalCuotaValue').value = formatMoney(cuota.cuotaFija);
    document.getElementById('modalPagoRecibido').value = '';
    document.getElementById('modalExcedente').value = '$0';
    document.getElementById('modalRecalculoMode').value = 'A';

    document.getElementById('paymentModal').style.display = 'flex';

    document.getElementById('modalPagoRecibido').oninput = function () {
        const pagoRecibido = parseFloat(this.value) || 0;
        const excedente = pagoRecibido - cuota.cuotaFija;
        document.getElementById('modalExcedente').value = excedente > 0 ? formatMoney(excedente) : '$0';
    };
}

function cerrarModalPago() {
    document.getElementById('paymentModal').style.display = 'none';
    currentPaymentData = {};
}

function confirmarPagoExcedente() {
    const pagoRecibido = parseFloat(document.getElementById('modalPagoRecibido').value);
    const recalculoMode = document.getElementById('modalRecalculoMode').value;

    if (!pagoRecibido || pagoRecibido <= 0) {
        alert("Ingrese un monto válido");
        return;
    }

    if (pagoRecibido < currentPaymentData.cuota.cuotaFija) {
        alert("El pago debe ser mayor o igual al valor de la cuota");
        return;
    }

    pagarCuotaConExcedente(currentPaymentData.loanId, currentPaymentData.cuota.cuota, pagoRecibido, recalculoMode);
    cerrarModalPago();
}

function pagarCuotaConExcedente(idPrestamo, numeroCuota, pagoReal, modoRecalculo) {
    const loan = loans.find(l => l.id === idPrestamo);
    if (!loan) return;

    const cuota = loan.tabla.find(c => c.cuota === numeroCuota);
    if (!cuota) return;
    if (cuota.pagada) {
        alert('La cuota ya está pagada.');
        return;
    }

    const excedente = Math.max(0, pagoReal - cuota.cuotaFija);
    const hoyISO = new Date().toISOString();

    const capitalPagadoAntes = loan.tabla
        .filter(c => c.pagada && c.cuota !== cuota.cuota)
        .reduce((s, c) => s + (c.abonoCapital || 0), 0);

    const abonoOriginal = cuota.abonoCapital || 0;
    const maxAplicable = Math.max(0, loan.monto - capitalPagadoAntes - abonoOriginal);
    const aplicacionExcedente = Math.min(excedente, maxAplicable);

    cuota.abonoCapital = abonoOriginal + aplicacionExcedente;
    const capitalPagadoDespues = capitalPagadoAntes + cuota.abonoCapital;
    cuota.saldo = Math.max(0, loan.monto - capitalPagadoDespues);

    cuota.pagada = true;
    cuota.fechaPago = hoyISO;

    const capitalPagadoTotal = loan.tabla.filter(c => c.pagada).reduce((s, c) => s + (c.abonoCapital || 0), 0);
    const totalAbonosCapital = (loan.abonosCapital || []).reduce((s, a) => s + a.monto, 0);
    loan.capitalPendiente = Math.max(0, loan.monto - capitalPagadoTotal - totalAbonosCapital);

    recalcularCuotas(loan, modoRecalculo);
    const fueArchivado = typeof verificarAutoArchivo === 'function' && verificarAutoArchivo(loan);

    guardarDatos();
    renderAll();

    let mensaje = aplicacionExcedente > 0 ?
        `Cuota pagada. Se aplicaron ${formatMoney(aplicacionExcedente)} al capital. Cuotas futuras recalculadas.` :
        'Cuota pagada correctamente (sin excedente aplicable al capital).';

    if (fueArchivado) {
        mensaje += '\n\n¡El préstamo ha sido pagado completamente y se archivó automáticamente!';
    }

    alert(mensaje);
}

function recalcularCuotas(loan, modo) {
    if (loan.tipo === 'solo_interes') {
        const tasaMensual = loan.tasa / 100;
        const saldoActual = loan.capitalPendiente !== undefined ? loan.capitalPendiente : loan.monto;
        const nuevaCuota = Math.round(saldoActual * tasaMensual);
        loan.cuotaFija = nuevaCuota;
        loan.tabla = loan.tabla.map(c => {
            if (c.pagada) return c;
            return {
                ...c,
                cuotaFija: nuevaCuota,
                interes: nuevaCuota,
                abonoCapital: 0,
                saldo: saldoActual
            };
        });
        guardarDatos();
        return;
    }

    const pagadas = loan.tabla.filter(c => c.pagada).sort((a, b) => a.cuota - b.cuota);
    const pendientes = loan.tabla.filter(c => !c.pagada).sort((a, b) => a.cuota - b.cuota);

    const totalAbonosCapital = (loan.abonosCapital || []).reduce((s, a) => s + a.monto, 0);

    if (pendientes.length === 0) {
        const capitalPagado = pagadas.reduce((s, c) => s + (c.abonoCapital || 0), 0) + totalAbonosCapital;
        loan.capitalPendiente = Math.max(0, loan.monto - capitalPagado);
        guardarDatos();
        return;
    }

    const tasaMensual = loan.tasa / 100;
    const capitalPagado = pagadas.reduce((s, c) => s + (c.abonoCapital || 0), 0) + totalAbonosCapital;
    let saldo = Math.max(0, loan.monto - capitalPagado);
    loan.capitalPendiente = saldo;

    if (modo === 'A') {
        const cuotasRestantes = pendientes.length;
        if (saldo <= 0) {
            pendientes.forEach((c) => {
                c.cuotaFija = 0;
                c.interes = 0;
                c.abonoCapital = 0;
                c.saldo = 0;
            });
            loan.tabla = [...pagadas, ...pendientes];
            guardarDatos();
            return;
        }

        const nuevaCuota = calcularCuotaFija(saldo, loan.tasa, cuotasRestantes);

        let saldoAux = saldo;
        for (let i = 0; i < cuotasRestantes; i++) {
            const c = pendientes[i];
            const interes = saldoAux * tasaMensual;
            const abono = nuevaCuota - interes;
            const abonoReal = Math.max(0, abono);
            saldoAux = Math.max(0, saldoAux - abonoReal);

            c.cuotaFija = nuevaCuota;
            c.interes = interes;
            c.abonoCapital = abonoReal;
            c.saldo = saldoAux;
        }

        const pendientesMap = Object.fromEntries(pendientes.map(p => [p.cuota, p]));
        loan.tabla = loan.tabla.map(c => c.pagada ? c : pendientesMap[c.cuota]);

    } else if (modo === 'B') {
        const valorCuotaTarget = loan.cuotaFija || pendientes[0].cuotaFija || calcularCuotaFija(saldo, loan.tasa, pendientes.length);

        const primeraPendiente = pendientes[0];
        let fechaBase = new Date(primeraPendiente.fechaCobro);
        const nuevasPendientes = [];
        let saldoAux = saldo;
        let contadorMes = 0;
        let numeroBase = primeraPendiente.cuota;
        while (saldoAux > 0) {
            const interes = saldoAux * tasaMensual;
            let abono = valorCuotaTarget - interes;
            if (abono < 0) {
                const nuevaCuotaMin = Math.ceil(interes + 1);
                abono = Math.max(0, nuevaCuotaMin - interes);
            }

            if (abono >= saldoAux) {
                abono = saldoAux;
            }

            const nuevoSaldo = Math.max(0, saldoAux - abono);

            const fechaCobro = getNextFechaCobro(fechaBase.toISOString(), contadorMes, loan.diaCobro).toISOString();

            nuevasPendientes.push({
                cuota: numeroBase + contadorMes,
                cuotaFija: valorCuotaTarget,
                interes: interes,
                abonoCapital: abono,
                saldo: nuevoSaldo,
                fechaCobro: fechaCobro,
                pagada: false,
                fechaPago: null,
                multa: 0,
                multaPagada: false,
                fechaPagoMulta: null
            });

            saldoAux = nuevoSaldo;
            contadorMes++;
            if (contadorMes > 500) {
                console.warn('recalcularCuotas: tope de 500 meses alcanzado, saliendo.');
                break;
            }
        }

        loan.tabla = [
            ...pagadas,
            ...nuevasPendientes
        ];
    }

    loan.tabla.sort((a, b) => a.cuota - b.cuota);

    const capitalPagadoFinalTabla = loan.tabla.filter(c => c.pagada).reduce((s, c) => s + (c.abonoCapital || 0), 0);
    const totalAbonosCapitalFinal = (loan.abonosCapital || []).reduce((s, a) => s + a.monto, 0);
    const capitalPagadoFinal = capitalPagadoFinalTabla + totalAbonosCapitalFinal;
    loan.capitalPendiente = Math.max(0, loan.monto - capitalPagadoFinal);
    if (typeof verificarAutoArchivo === 'function') verificarAutoArchivo(loan);

    guardarDatos();
}

// ================= DATE EDITING FUNCTIONALITY =================

let currentDateEdit = {};

function editarFechaPrestamo(loanId, fechaActual) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    currentDateEdit = {
        type: 'prestamo',
        loanId: loanId,
        loan: loan,
        fechaActual: fechaActual
    };

    document.getElementById('dateEditTitle').textContent = 'Editar Fecha de Préstamo';
    document.getElementById('dateEditLabel').textContent = 'Nueva fecha de préstamo:';
    document.getElementById('dateEditInput').value = fechaActual;
    document.getElementById('dateEditModal').style.display = 'flex';
    document.getElementById('recalcularCuotas').checked = true;
    document.getElementById('recalcularCuotas').disabled = false;
}

function editarFechaCobro(loanId, cuotaIndex, fechaActual) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const cuota = loan.tabla[cuotaIndex];
    if (!cuota) return;

    currentDateEdit = {
        type: 'cobro',
        loanId: loanId,
        loan: loan,
        cuotaIndex: cuotaIndex,
        cuota: cuota,
        fechaActual: fechaActual
    };

    document.getElementById('dateEditTitle').textContent = `Editar Fecha de Cobro - Cuota #${cuota.cuota}`;
    document.getElementById('dateEditLabel').textContent = 'Nueva fecha de cobro:';
    document.getElementById('dateEditInput').value = fechaActual.slice(0, 10);
    document.getElementById('dateEditModal').style.display = 'flex';
    document.getElementById('recalcularCuotas').checked = false;
    document.getElementById('recalcularCuotas').disabled = true;
}

function cerrarModalEdicionFecha() {
    document.getElementById('dateEditModal').style.display = 'none';
    currentDateEdit = {};
}

function confirmarEdicionFecha() {
    const nuevaFecha = document.getElementById('dateEditInput').value;
    const recalcular = document.getElementById('recalcularCuotas').checked;

    if (!nuevaFecha) {
        alert('Por favor seleccione una fecha válida');
        return;
    }

    if (currentDateEdit.type === 'prestamo') {
        currentDateEdit.loan.fechaPrestamo = nuevaFecha;

        if (recalcular && currentDateEdit.loan.tipo === 'cuotas_fijas') {
            recalcularTablaAmortizacion(currentDateEdit.loan);
        }

        document.getElementById(`fechaPrestamo-${currentDateEdit.loanId}`).textContent =
            `Prestado: ${formatearFecha(nuevaFecha)}`;

    } else if (currentDateEdit.type === 'cobro') {
        currentDateEdit.cuota.fechaCobro = new Date(nuevaFecha).toISOString();

        document.getElementById(`fechaCobro-${currentDateEdit.loanId}-${currentDateEdit.cuotaIndex}`).textContent =
            formatearFecha(nuevaFecha);
    }

    guardarDatos();
    renderAll();
    cerrarModalEdicionFecha();

    alert('Fecha actualizada correctamente');
}

// ================= LOAN LIQUIDATION (PAGAR TODO DE GOLPE) =================

let currentLiquidationData = {};

function abrirModalLiquidar(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const stats = calcularStats(loan);
    const capitalRestante = loan.capitalPendiente !== undefined ? loan.capitalPendiente : stats.capitalRestante;
    const pendientes = loan.tabla.filter(c => !c.pagada);
    const interesTotalPendiente = pendientes.reduce((sum, c) => sum + (c.interes || 0), 0);
    const interesMesActual = pendientes.length > 0 ? pendientes[0].interes : Math.round(capitalRestante * loan.tasa / 100);

    currentLiquidationData = {
        loanId,
        loan,
        capitalRestante,
        pendientes,
        interesTotalPendiente,
        interesMesActual
    };

    document.getElementById('liqClientName').value = loan.nombre;
    document.getElementById('liqCapital').value = formatMoney(capitalRestante);
    document.getElementById('liqModo').value = 'completo';
    document.getElementById('liqNota').value = 'Liquidación total de préstamo';

    calcularLiquidarTotales();

    document.getElementById('liquidarModal').style.display = 'flex';
}

function cerrarModalLiquidar() {
    document.getElementById('liquidarModal').style.display = 'none';
    currentLiquidationData = {};
}

function calcularLiquidarTotales() {
    if (!currentLiquidationData.loan) return;

    const modo = document.getElementById('liqModo').value;
    const cap = currentLiquidationData.capitalRestante;
    let inte = 0;

    if (modo === 'completo') {
        inte = currentLiquidationData.interesTotalPendiente;
    } else if (modo === 'anticipado') {
        inte = currentLiquidationData.interesMesActual;
    } else if (modo === 'personalizado') {
        const actualInput = parseFloat(document.getElementById('liqMontoTotal').value) || (cap + currentLiquidationData.interesMesActual);
        inte = Math.max(0, actualInput - cap);
    }

    const total = cap + inte;

    document.getElementById('liqDetalleCapital').textContent = formatMoney(cap);
    document.getElementById('liqDetalleInteres').textContent = formatMoney(inte);

    if (modo !== 'personalizado') {
        document.getElementById('liqMontoTotal').value = Math.round(total);
    }
}

function onInputLiquidarMontoTotal() {
    if (!currentLiquidationData.loan) return;
    const modoSelect = document.getElementById('liqModo');
    if (modoSelect.value !== 'personalizado') {
        modoSelect.value = 'personalizado';
    }
    const cap = currentLiquidationData.capitalRestante;
    const totalInput = parseFloat(document.getElementById('liqMontoTotal').value) || 0;
    const inte = Math.max(0, totalInput - cap);
    document.getElementById('liqDetalleCapital').textContent = formatMoney(cap);
    document.getElementById('liqDetalleInteres').textContent = formatMoney(inte);
}

function confirmarLiquidarTotal() {
    const data = currentLiquidationData;
    if (!data || !data.loan) return;

    const totalRecibido = parseFloat(document.getElementById('liqMontoTotal').value);
    if (!totalRecibido || totalRecibido <= 0) {
        alert('Por favor ingrese un monto válido');
        return;
    }

    const nota = document.getElementById('liqNota').value.trim() || 'Liquidación total';
    const hoyISO = new Date().toISOString();
    const loan = data.loan;

    const capRestante = data.capitalRestante;
    const interesRecibido = Math.max(0, totalRecibido - capRestante);
    const pendientes = loan.tabla.filter(c => !c.pagada);

    if (pendientes.length > 0) {
        const interesPorCuota = Math.round(interesRecibido / pendientes.length);
        pendientes.forEach((c, idx) => {
            c.pagada = true;
            c.fechaPago = hoyISO;
            c.notaPago = nota;
            c.interes = (idx === pendientes.length - 1) ?
                Math.max(0, interesRecibido - (interesPorCuota * (pendientes.length - 1))) :
                interesPorCuota;
            c.saldo = 0;
        });
    }

    loan.capitalPendiente = 0;

    const fueArchivado = typeof verificarAutoArchivo === 'function' && verificarAutoArchivo(loan);

    guardarDatos();
    renderAll();
    cerrarModalLiquidar();

    mostrarNotificacion(`¡El préstamo de ${loan.nombre} ha sido liquidado por ${formatMoney(totalRecibido)} y archivado automáticamente!`, 'success');
}









