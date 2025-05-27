// Variables globales
let inquilinos = [];
let mesActual = '01'; // Mes actual en formato MM
let añoActual = new Date().getFullYear(); // Año actual

// Función para cargar los datos de los inquilinos desde la API
function cargarInquilinos() {
    return new Promise((resolve, reject) => {
        fetch('/api/inquilinos/')
            .then(response => response.json())
            .then(data => {
                inquilinos = data;
                renderizarTablaInquilinos();
                calcularTotales();
                resolve(); // Resolver la promesa cuando se completa la carga
            })
            .catch(error => {
                console.error('Error al cargar socios:', error);
                // Si no hay conexión con el backend, usar datos de ejemplo para demostración
                cargarDatosEjemplo();
                resolve(); // Resolver la promesa incluso en caso de error
            });
    });
}

// Función para cargar datos de ejemplo (solo para demostración)
function cargarDatosEjemplo() {
    inquilinos = [
        {
            id: 1,
            propietario: "Diego Alfredo Tapia",
            numero_socio: "122124545",
            telefono: "963978767",
            monto: 36000,
            [`pago_${mesActual}_${añoActual}`]: "No pagado"
        }
    ];
    renderizarTablaInquilinos();
    calcularTotales();
}

// Función para renderizar la tabla de inquilinos
function renderizarTablaInquilinos() {
    const tabla = document.querySelector('table');
    const tbody = tabla.querySelector('tbody') || document.createElement('tbody');
    
    // Limpiar el contenido actual
    tbody.innerHTML = '';
    
    // Añadir filas para cada inquilino
    inquilinos.forEach(inquilino => {
        const fila = document.createElement('tr');
        
        // Columna: Nombre del Socio
        const colNombre = document.createElement('td');
        colNombre.textContent = inquilino.propietario;
        colNombre.style.color = 'red'; // Estilo para destacar
        fila.appendChild(colNombre);
        
        // Columna: Número de Socio
        const colNumero = document.createElement('td');
        colNumero.textContent = inquilino.numero_socio;
        fila.appendChild(colNumero);
        
        // Columna: Número de Teléfono
        const colTelefono = document.createElement('td');
        colTelefono.textContent = inquilino.telefono;
        fila.appendChild(colTelefono);
        
        // Columna: Monto a Pagar
        const colMonto = document.createElement('td');
        colMonto.textContent = `$${inquilino.monto}`;
        fila.appendChild(colMonto);
        
        // Columna: Estado de pago
        const colEstado = document.createElement('td');
        const estadoPago = inquilino[`pago_${mesActual}_${añoActual}`] || "No pagado";
        colEstado.textContent = estadoPago;
        colEstado.style.color = estadoPago === "Pagado" ? 'green' : 'red';
        fila.appendChild(colEstado);
        
        // Columna: Acciones
        const colAcciones = document.createElement('td');
        
        // Botón Eliminar
        const btnEliminar = document.createElement('button');
        btnEliminar.textContent = 'Eliminar';
        btnEliminar.className = 'btn-eliminar';
        btnEliminar.onclick = () => eliminarInquilino(inquilino.id);
        btnEliminar.style.backgroundColor = '#dc3545';
        btnEliminar.style.color = 'white';
        btnEliminar.style.border = 'none';
        btnEliminar.style.padding = '5px 10px';
        btnEliminar.style.borderRadius = '3px';
        btnEliminar.style.marginRight = '5px';
        colAcciones.appendChild(btnEliminar);
        
        // Botón Editar
        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.className = 'btn-editar';
        btnEditar.onclick = () => editarInquilino(inquilino.id);
        btnEditar.style.backgroundColor = '#007bff';
        btnEditar.style.color = 'white';
        btnEditar.style.border = 'none';
        btnEditar.style.padding = '5px 10px';
        btnEditar.style.borderRadius = '3px';
        colAcciones.appendChild(btnEditar);
        
        fila.appendChild(colAcciones);
        
        tbody.appendChild(fila);
    });
    
    // Asegurarse de que el tbody esté en la tabla
    if (!tabla.contains(tbody)) {
        tabla.appendChild(tbody);
    }
}

// Función para calcular los totales
function calcularTotales() {
    let totalMonto = 0;
    let totalPagado = 0;
    let totalNoPagado = 0;
    
    inquilinos.forEach(inquilino => {
        const monto = inquilino.monto || 0;
        totalMonto += monto;
        
        const estadoPago = inquilino[`pago_${mesActual}_${añoActual}`] || "No pagado";
        if (estadoPago === "Pagado") {
            totalPagado += monto;
        } else {
            totalNoPagado += monto;
        }
    });
    
    // Actualizar los elementos en el DOM
    document.getElementById('total-monto').textContent = `$${totalMonto}`;
    document.getElementById('total-pagado').textContent = `$${totalPagado}`;
    document.getElementById('total-no-pagado').textContent = `$${totalNoPagado}`;
}

// Función para cambiar el mes seleccionado
function cambiarMes() {
    const selectMes = document.getElementById('mes');
    mesActual = selectMes.value;
    
    // Actualizar la tabla con el nuevo mes
    renderizarTablaInquilinos();
    calcularTotales();
}

// Función para sincronizar correos
function sincronizarCorreos() {
    // Guardar el mes seleccionado en localStorage antes de la redirección
    const mesSeleccionado = document.getElementById('mes').value;
    localStorage.setItem('mesSeleccionado', mesSeleccionado);
    
    // Mostrar modal de autenticación de Google
    const modal = document.getElementById('modal-google-auth');
    modal.style.display = 'block';

    // Iniciar el proceso de autenticación con Google
    fetch('/api/auth/url')
        .then(response => response.json())
        .then(data => {
            if (data.auth_url) {
                // Redirigir a la URL de autenticación de Google
                window.location.href = data.auth_url;
            } else {
                alert('Error al obtener URL de autenticación');
                modal.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al iniciar autenticación');
            modal.style.display = 'none';
        });
}

// Función para procesar la autenticación y sincronizar correos
function sincronizarCorreosAutenticado(credentials) {
    // Mostrar indicador de carga
    document.getElementById('sincronizar-correos-btn').textContent = 'Sincronizando...';
    document.getElementById('sincronizar-correos-btn').disabled = true;

    // AÑADIR: Asegurarse de que la tabla esté cargada antes de sincronizar
    cargarInquilinos().then(() => {
        // Recuperar el mes seleccionado de localStorage
        const mesSeleccionado = localStorage.getItem('mesSeleccionado') || document.getElementById('mes').value;
        
        // Actualizar el selector de mes para mostrar el valor correcto
        document.getElementById('mes').value = mesSeleccionado;
        
        // Actualizar la variable global
        mesActual = mesSeleccionado;

        // Llamar a la API para sincronizar correos
        fetch('/api/sync/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                credentials: credentials,
                mes: mesSeleccionado !== 'todos' ? mesSeleccionado : null,
                año: añoActual.toString() // Incluir el año actual
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Sincronización completada:', data);
            
            // Actualizar la fecha de sincronización con la fecha real de la API
            if (data.fecha_sincronizacion) {
                // Usar la función de formateo para hora chilena
                const fechaFormateada = formatearFechaChilena(data.fecha_sincronizacion);
                document.getElementById('fecha-sincronizacion').textContent = fechaFormateada;
            }
            
            // Mostrar mensaje de resultado
            alert(data.mensaje || 'Sincronización completada');
            
            // Restaurar botón
            document.getElementById('sincronizar-correos-btn').textContent = 'Sincronizar Correos';
            document.getElementById('sincronizar-correos-btn').disabled = false;
            
            // Recargar inquilinos para reflejar cambios
            cargarInquilinos();
        })
        .catch(error => {
            console.error('Error en sincronización:', error);
            alert('Error en sincronización. Por favor, intenta de nuevo más tarde.');
            
            // Restaurar botón
            document.getElementById('sincronizar-correos-btn').textContent = 'Sincronizar Correos';
            document.getElementById('sincronizar-correos-btn').disabled = false;
        });
    });
}

// Función para formatear fecha en formato chileno
function formatearFechaChilena(fechaISO) {
    const fecha = new Date(fechaISO);
    // Ajustar a zona horaria de Chile (UTC-4 o UTC-3 según horario de verano)
    const fechaChile = new Date(fecha.getTime() - (4 * 60 * 60 * 1000)); // UTC-4
    
    const dia = fechaChile.getDate();
    const mes = fechaChile.getMonth() + 1;
    const año = fechaChile.getFullYear();
    const hora = fechaChile.getHours();
    const minutos = fechaChile.getMinutes();
    
    return `${dia} de ${obtenerNombreMes(mes)} de ${año}, ${hora}:${minutos < 10 ? '0' + minutos : minutos}`;
}

// Función para obtener el nombre del mes
function obtenerNombreMes(mes) {
    const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return meses[mes - 1];
}

// Función para agregar un nuevo inquilino
function agregarInquilino() {
    const nombre = document.getElementById('nuevo-nombre').value;
    const numero = document.getElementById('nuevo-numero').value;
    const telefono = document.getElementById('nuevo-telefono').value;
    const monto = parseInt(document.getElementById('nuevo-monto').value);
    
    if (!nombre || !numero || !telefono || isNaN(monto)) {
        alert('Por favor, completa todos los campos correctamente');
        return;
    }
    
    // Crear objeto con los datos del nuevo inquilino
    const nuevoInquilino = {
        propietario: nombre,
        numero_socio: numero,
        telefono: telefono,
        monto: monto
    };
    
    // Enviar datos al backend
    fetch('/api/inquilinos/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(nuevoInquilino)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Inquilino agregado:', data);
        
        // Limpiar formulario
        document.getElementById('nuevo-nombre').value = '';
        document.getElementById('nuevo-numero').value = '';
        document.getElementById('nuevo-telefono').value = '';
        document.getElementById('nuevo-monto').value = '';
        
        // Cerrar modal
        document.getElementById('modal-agregar').style.display = 'none';
        
        // Recargar inquilinos
        cargarInquilinos();
    })
    .catch(error => {
        console.error('Error al agregar inquilino:', error);
        alert('Error al agregar inquilino. Por favor, intenta de nuevo.');
    });
}

// Función para eliminar un inquilino
function eliminarInquilino(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este socio?')) {
        return;
    }
    
    // Enviar solicitud de eliminación al backend
    fetch(`/api/inquilinos/${id}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            console.log('Inquilino eliminado');
            
            // Actualizar lista de inquilinos
            cargarInquilinos();
        } else {
            throw new Error('Error al eliminar inquilino');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al eliminar socio. Por favor, intenta de nuevo.');
        
        // Si no hay conexión con el backend, simular eliminación (solo para demostración)
        inquilinos = inquilinos.filter(i => i.id !== id);
        cambiarMes(); // Esto actualizará la tabla
    });
}

// Función para editar un inquilino
function editarInquilino(id) {
    // Buscar el inquilino por ID
    const inquilino = inquilinos.find(i => i.id === id);
    if (!inquilino) {
        alert('Socio no encontrado');
        return;
    }
    
    // Abrir modal de edición
    const modal = document.getElementById('modal-editar');
    modal.style.display = 'block';
    
    // Llenar formulario con datos actuales
    document.getElementById('editar-id').value = inquilino.id;
    document.getElementById('editar-nombre').value = inquilino.propietario;
    document.getElementById('editar-numero').value = inquilino.numero_socio;
    document.getElementById('editar-telefono').value = inquilino.telefono;
    document.getElementById('editar-monto').value = inquilino.monto;
}

// Función para guardar cambios de un inquilino editado
function guardarEdicion() {
    const id = document.getElementById('editar-id').value;
    const nombre = document.getElementById('editar-nombre').value;
    const numero = document.getElementById('editar-numero').value;
    const telefono = document.getElementById('editar-telefono').value;
    const monto = parseInt(document.getElementById('editar-monto').value);
    
    if (!nombre || !numero || !telefono || isNaN(monto)) {
        alert('Por favor, completa todos los campos correctamente');
        return;
    }
    
    // Crear objeto con los datos actualizados
    const inquilinoActualizado = {
        id: id,
        propietario: nombre,
        numero_socio: numero,
        telefono: telefono,
        monto: monto
    };
    
    // Enviar datos actualizados al backend
    fetch(`/api/inquilinos/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(inquilinoActualizado)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Inquilino actualizado:', data);
        
        // Cerrar modal
        document.getElementById('modal-editar').style.display = 'none';
        
        // Recargar inquilinos
        cargarInquilinos();
    })
    .catch(error => {
        console.error('Error al actualizar inquilino:', error);
        alert('Error al actualizar socio. Por favor, intenta de nuevo.');
        
        // Si no hay conexión con el backend, simular actualización (solo para demostración)
        const index = inquilinos.findIndex(i => i.id === parseInt(id));
        if (index !== -1) {
            inquilinos[index] = inquilinoActualizado;
            cambiarMes(); // Esto actualizará la tabla
        }
    });
}

// Función para abrir el modal de agregar inquilino
function abrirModalAgregar() {
    document.getElementById('modal-agregar').style.display = 'block';
}

// Función para cerrar modales
function cerrarModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Inicializar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    // Cargar inquilinos al iniciar
    cargarInquilinos();
    
    // Configurar evento para cambio de mes
    document.getElementById('mes').addEventListener('change', cambiarMes);
    
    // Verificar si hay credenciales en la URL (callback de OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
        // Procesar el código de autorización
        fetch('/api/auth/callback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: code })
        })
        .then(response => response.json())
        .then(data => {
            if (data.credentials) {
                // Sincronizar correos con las credenciales obtenidas
                sincronizarCorreosAutenticado(data.credentials);
            } else {
                alert('Error en autenticación');
            }
        })
        .catch(error => {
            console.error('Error en callback:', error);
            alert('Error en autenticación. Por favor, intenta de nuevo.');
        });
    }
});
