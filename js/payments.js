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
    loan.capitalPendiente = Math.max(0, loan.monto - capitalPagadoTotal);

    recalcularCuotas(loan, modoRecalculo);

    guardarDatos();
    renderAll();

    const mensaje = aplicacionExcedente > 0 ?
        `Cuota pagada. Se aplicaron ${formatMoney(aplicacionExcedente)} al capital. Cuotas futuras recalculadas.` :
        'Cuota pagada correctamente (sin excedente aplicable al capital).';

    alert(mensaje);
}

function recalcularCuotas(loan, modo) {
    if (loan.tipo === 'solo_interes') {
        const tasaMensual = loan.tasa / 100;
        let saldoActual = loan.capitalPendiente;
        loan.tabla = loan.tabla.map(c => {
            if (c.pagada) return c;
            const nuevaCuota = Math.round(saldoActual * tasaMensual);
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

    if (pendientes.length === 0) {
        const capitalPagado = pagadas.reduce((s, c) => s + (c.abonoCapital || 0), 0);
        loan.capitalPendiente = Math.max(0, loan.monto - capitalPagado);
        guardarDatos();
        return;
    }

    const tasaMensual = loan.tasa / 100;
    const capitalPagado = pagadas.reduce((s, c) => s + (c.abonoCapital || 0), 0);
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

    const capitalPagadoFinal = loan.tabla.filter(c => c.pagada).reduce((s, c) => s + (c.abonoCapital || 0), 0);
    loan.capitalPendiente = Math.max(0, loan.monto - capitalPagadoFinal);

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






