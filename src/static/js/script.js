// Funcionalidad para el menú lateral y botón flotante
document.addEventListener('DOMContentLoaded', function() {
    // Variables globales para mes y año
    let mesActual = '';
    let añoActual = '';
    
    // Configurar el menú lateral
    const menuToggle = document.querySelector('.menu-toggle');
    const menu = document.querySelector('.menu');
    if (menuToggle && menu) {
        menuToggle.addEventListener('click', function() {
            menu.classList.toggle('active');
        });
    }
    
    // Configurar botones del menú
    const btnVerPagos = document.getElementById('Ver Pagos');
    const btnAnadirInquilinos = document.getElementById('Añadir Inquilinos');
    
    if (btnVerPagos) {
        btnVerPagos.addEventListener('click', function() {
            // Ocultar menú lateral
            if (menu && window.innerWidth < 768) {
                menu.classList.remove('active');
            }
        });
    }
    
    if (btnAnadirInquilinos) {
        btnAnadirInquilinos.addEventListener('click', function() {
            // Mostrar modal de añadir inquilino
            const modal = document.getElementById('modal-inquilino');
            if (modal) {
                modal.style.display = 'block';
            }
        });
    }
    
    // Inicializar selector de mes
    const selectorMes = document.getElementById('mes');
    if (selectorMes) {
        mesActual = selectorMes.value;
        selectorMes.addEventListener('change', function() {
            mesActual = this.value;
            cargarInquilinos();
        });
    }
    
    // Inicializar selector de año
    const selectorAño = document.getElementById('año');
    if (selectorAño) {
        añoActual = selectorAño.value;
        selectorAño.addEventListener('change', function() {
            añoActual = this.value;
            cargarInquilinos();
        });
    }
    
    // Configurar botón de sincronizar (corregido para usar el ID exacto)
    const btnSincronizar = document.querySelector('input[value="Sincronizar Correos"]');
    if (btnSincronizar) {
        btnSincronizar.addEventListener('click', function(e) {
            e.preventDefault();
            sincronizarCorreos(mesActual, añoActual);
        });
    }
    
    // Cargar inquilinos al inicio
    cargarInquilinos();
    
    // Función para cargar inquilinos según mes y año seleccionados
    function cargarInquilinos() {
        // Construir URL con parámetros de mes y año
        let url = '/api/inquilinos';
        const params = new URLSearchParams();
        
        if (mesActual) {
            params.append('mes', mesActual);
        }
        
        if (añoActual) {
            params.append('año', añoActual);
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        // Realizar petición
        fetch(url)
            .then(response => response.json())
            .then(data => {
                actualizarTablaInquilinos(data);
            })
            .catch(error => {
                console.error('Error al cargar inquilinos:', error);
            });
    }
    
    // Función para actualizar la tabla de inquilinos
    function actualizarTablaInquilinos(inquilinos) {
        // Limpiar tabla existente
        const tabla = document.querySelector('table');
        if (!tabla) return;
        
        // Mantener encabezados
        const encabezados = tabla.querySelector('tr');
        tabla.innerHTML = '';
        if (encabezados) {
            tabla.appendChild(encabezados);
        }
        
        // Agregar filas de inquilinos
        let total = 0;
        let totalPagado = 0;
        let totalNoPagado = 0;
        
        inquilinos.forEach(inquilino => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', inquilino.id);
            
            // Determinar estado de pago según mes y año seleccionados
            let estadoPago = 'No pagado';
            if (mesActual && añoActual) {
                const campo = `pago_${mesActual}_${añoActual}`;
                if (inquilino[campo]) {
                    estadoPago = inquilino[campo];
                }
            } else {
                estadoPago = inquilino.estado_pago;
            }
            
            const monto = parseFloat(inquilino.monto);
            total += monto;
            
            if (estadoPago === 'Pagado') {
                totalPagado += monto;
            } else {
                totalNoPagado += monto;
            }
            
            tr.innerHTML = `
                <td>${inquilino.propietario}</td>
                <td>${inquilino.propiedad}</td>
                <td>${inquilino.telefono}</td>
                <td>$${monto}</td>
                <td>${estadoPago}</td>
                <td>
                    <input type="button" value="Eliminar" onclick="eliminarInquilino(${inquilino.id})">
                    <input type="button" value="Editar" onclick="editarInquilino(${inquilino.id})">
                </td>
            `;
            
            tabla.appendChild(tr);
        });
        
        // Actualizar totales
        document.getElementById('total').textContent = `$${total}`;
        document.getElementById('total-pagado').textContent = `$${totalPagado}`;
        document.getElementById('total-no-pagado').textContent = `$${totalNoPagado}`;
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
        const btnSincronizar = document.querySelector('input[value="Sincronizar Correos"]');
        if (btnSincronizar) {
            btnSincronizar.disabled = true;
            btnSincronizar.value = 'Sincronizando...';
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
                    
                    // Recargar inquilinos
                    cargarInquilinos();
                    
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
                    btnSincronizar.value = 'Sincronizar Correos';
                }
            });
    }
});

// Funciones globales para editar y eliminar inquilinos
function editarInquilino(id) {
    // Obtener datos del inquilino
    fetch(`/api/inquilinos/${id}`)
        .then(response => response.json())
        .then(inquilino => {
            // Mostrar formulario de edición
            const modal = document.getElementById('modal-inquilino');
            if (modal) {
                modal.style.display = 'block';
                
                // Llenar formulario con datos del inquilino
                document.getElementById('inquilino-id').value = inquilino.id;
                document.getElementById('propietario').value = inquilino.propietario;
                document.getElementById('propiedad').value = inquilino.propiedad;
                document.getElementById('telefono').value = inquilino.telefono;
                document.getElementById('rut').value = inquilino.rut || '';
                document.getElementById('monto').value = inquilino.monto;
                
                // Cambiar texto del botón
                const btnAgregar = document.getElementById('btn-agregar');
                if (btnAgregar) {
                    btnAgregar.textContent = 'Actualizar';
                }
            }
        })
        .catch(error => {
            console.error('Error al obtener inquilino:', error);
            alert('Error al obtener datos del inquilino');
        });
}

function eliminarInquilino(id) {
    if (confirm('¿Estás seguro de eliminar este inquilino?')) {
        fetch(`/api/inquilinos/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Recargar inquilinos
                location.reload();
            } else {
                alert('Error al eliminar inquilino');
            }
        })
        .catch(error => {
            console.error('Error al eliminar inquilino:', error);
            alert('Error al eliminar inquilino');
        });
    }
}
