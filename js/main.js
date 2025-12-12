// ================= MAIN INITIALIZATION =================

// Global variables (loans is declared in utils.js)
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set default form values
    document.getElementById('fechaPrestamo').valueAsDate = new Date();
    document.getElementById('tipoPrestamo').value = 'cuotas_fijas';
    toggleCuotasInput();

    // Calendar event listeners
    document.getElementById('prevMonth').addEventListener('click', () => { changeMonth(-1); });
    document.getElementById('nextMonth').addEventListener('click', () => { changeMonth(1); });
    document.getElementById('todayBtn').addEventListener('click', () => {
        currentDate = new Date();
        currentMonth = currentDate.getMonth();
        currentYear = currentDate.getFullYear();
        renderCalendar(currentYear, currentMonth);
    });

    // Load data and render
    cargarDatos();
    renderCalendar(currentYear, currentMonth);
});

