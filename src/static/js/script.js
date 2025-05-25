// Funcionalidad para el menú lateral y botón flotante
document.addEventListener('DOMContentLoaded', function() {
    // Variables globales para mes y año
    let mesActual = '';
    let añoActual = '';
    
    // Configurar el menú lateral
    const menuToggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('menu');
    if (menuToggle && menu) {
        menuToggle.addEventListener('click', function() {
            menu.classList.toggle('active');
        });
    }
    
    // Configurar botones del menú
    const btnVerPagos = document.getElementById('btn-ver-pagos');
    const btnAnadirInquilinos = document.getElementById('btn-anadir-inquilinos');
    
    if (btnVerPagos) {
        btnVerPagos.addEventListener('click', function() {
            // Mostrar sección de pagos (ya visible por defecto)
            // Puedes agregar lógica adicional si es necesario
            
            // Ocultar menú en móviles si es necesario
            if (menu && window.innerWidth < 768) {
                menu.classList.remove('active');
            }
        });
    }
    
    if (btnAnadirInquilinos) {
        btnAnadirInquilinos.addEventListener('click', function() {
            // Mostrar modal de añadir inquilino o enfocar el formulario
            const formulario = document.getElementById('form-inquilino');
            if (formulario) {
                const propietarioInput = document.getElementById('propietario');
                if (propietarioInput) {
                    propietarioInput.focus();
                }
            }
            
            // Mostrar modal si existe
            const modal = document.getElementById('modal-inquilino');
            if (modal) {
                modal.style.display = 'block';
            }
        });
    }
    
    // Configurar botón de cancelar en modal
    const btnCancelar = document.getElementById('btn-cancelar');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            const modal = document.getElementById('modal-inquilino');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Inicializar selector de mes
    const selectorMes = document.getElementById('mes');
    if (selectorMes) {
        mesActual = selectorMes.value;
        selectorMes.addEventListener('change', function() {
            mesActual = this.value;
            actualizarEstadosPago();
        });
    }
    
    // Inicializar selector de año
    const selectorAño = document.getElementById('año');
    if (selectorAño) {
        añoActual = selectorAño.value;
        selectorAño.addEventListener('change', function() {
            añoActual = this.value;
            actualizarEstadosPago();
        });
    }
    
    // Configurar botón de sincronizar
    const btnSincronizar = document.getElementById('sincronizar-correos');
    if (btnSincronizar) {
        btnSincronizar.addEventListener('click', function() {
            sincronizarCorreos(mesActual, añoActual);
        });
    }
    
    // Función para actualizar estados de pago según mes y año seleccionados
    function actualizarEstadosPago() {
        // Obtener todas las filas de inquilinos
        const filas = document.querySelectorAll('table tr');
        
        filas.forEach(fila => {
            // Verificar si es una fila de inquilino (no encabezado)
            const celdas = fila.querySelectorAll('td');
            if (celdas.length > 0) {
                // Obtener datos del inquilino
                const propietario = celdas[0].textContent;
                const propiedad = celdas[1].textContent;
                
                // Hacer una petición para obtener el estado de pago actual
                fetch(`/api/estado_pago?propietario=${encodeURIComponent(propietario)}&propiedad=${encodeURIComponent(propiedad)}&mes=${mesActual}&año=${añoActual}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Actualizar el estado de pago en la fila
                            const celdaEstado = celdas[4]; // Columna de estado de pago
                            if (celdaEstado) {
                                celdaEstado.textContent = data.estado_pago;
                                celdaEstado.className = data.estado_pago === 'Pagado' ? 'pagado' : 'no-pagado';
                            }
                        }
                    })
                    .catch(error => {
                        console.error('Error al obtener estado de pago:', error);
                    });
            }
        });
        
        // Actualizar totales
        actualizarTotales();
    }
    
    // Función para sincronizar correos
    function sincronizarCorreos(mes, año) {
        // Construir URL con parámetros de mes y año
        let url = '/api/sync';
        const params = new URLSearchParams();
        
        if (mes) {
            params.append('mes', mes);
        }
        
        if (año) {
            params.append('año', año);
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        // Mostrar indicador de carga
        const btnSincronizar = document.getElementById('sincronizar-correos');
        if (btnSincronizar) {
            btnSincronizar.disabled = true;
            btnSincronizar.textContent = 'Sincronizando...';
        }
        
        // Realizar sincronización
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Actualizar última sincronización
                    const ultimaSincronizacion = document.getElementById('ultima-sincronizacion');
                    if (ultimaSincronizacion) {
                        ultimaSincronizacion.textContent = new Date().toLocaleString();
                    }
                    
                    // Actualizar estados de pago
                    actualizarEstadosPago();
                    
                    // Mostrar mensaje de éxito
                    alert('Sincronización completada con éxito');
                } else {
                    alert('Error en sincronización: ' + (data.mensaje || 'Error desconocido'));
                }
            })
            .catch(error => {
                console.error('Error en sincronización:', error);
                alert('Error en sincronización');
            })
            .finally(() => {
                // Restaurar botón
                if (btnSincronizar) {
                    btnSincronizar.disabled = false;
                    btnSincronizar.textContent = 'Sincronizar Correos';
                }
            });
    }
    
    // Función para actualizar totales
    function actualizarTotales() {
        let total = 0;
        let totalPagado = 0;
        let totalNoPagado = 0;
        
        // Obtener todas las filas de inquilinos
        const filas = document.querySelectorAll('table tr');
        
        filas.forEach(fila => {
            // Verificar si es una fila de inquilino (no encabezado)
            const celdas = fila.querySelectorAll('td');
            if (celdas.length > 0) {
                // Obtener monto
                const montoTexto = celdas[3].textContent;
                const monto = parseFloat(montoTexto.replace('$', '').replace(',', ''));
                
                if (!isNaN(monto)) {
                    total += monto;
                    
                    // Verificar estado de pago
                    const estadoPago = celdas[4].textContent;
                    if (estadoPago === 'Pagado') {
                        totalPagado += monto;
                    } else {
                        totalNoPagado += monto;
                    }
                }
            }
        });
        
        // Actualizar elementos de totales
        const elementoTotal = document.getElementById('total');
        const elementoTotalPagado = document.getElementById('total-pagado');
        const elementoTotalNoPagado = document.getElementById('total-no-pagado');
        
        if (elementoTotal) {
            elementoTotal.textContent = `$${total}`;
        }
        
        if (elementoTotalPagado) {
            elementoTotalPagado.textContent = `$${totalPagado}`;
        }
        
        if (elementoTotalNoPagado) {
            elementoTotalNoPagado.textContent = `$${totalNoPagado}`;
        }
    }
});
