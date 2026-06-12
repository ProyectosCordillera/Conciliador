// js/app.js - Lógica del Analizador de Cuenta Puente
// Estructura fija del TXT de Open 4 Business:
// Col 5: Fecha | Col 6: Asiento | Col 7: Descripción | Col 9: Débito | Col 10: Crédito

document.addEventListener('DOMContentLoaded', () => {
    // ============================================
    // DECLARACIÓN DE ELEMENTOS DEL DOM
    // ============================================
    const fileInput = document.getElementById('fileInput');
    const btnAnalizar = document.getElementById('btnAnalizar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const alertContainer = document.getElementById('alertContainer');
    const resultadosDiv = document.getElementById('resultados');
    const tbodyParejas = document.getElementById('tbodyParejas');
    
    // Elementos de información del archivo
    const lblEmpresa = document.getElementById('lblEmpresa');
    const lblCuenta = document.getElementById('lblCuenta');
    const footerEmpresa = document.getElementById('footerEmpresa');
    const footerCuenta = document.getElementById('footerCuenta');

    // ============================================
    // EVENTO: Seleccionar archivo
    // ============================================
    fileInput.addEventListener('change', () => {
        btnAnalizar.disabled = !fileInput.files.length;
        alertContainer.innerHTML = '';
        resultadosDiv.style.display = 'none';
        
        // Si hay archivo, leer la primera línea para extraer información
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const texto = e.target.result;
                extraerInformacionArchivo(texto);
            };
            reader.readAsText(file);
        } else {
            // Si no hay archivo, limpiar información
            limpiarInformacionArchivo();
        }
    });

    // ============================================
    // FUNCIONES PARA EXTRAER INFORMACIÓN DEL ARCHIVO
    // ============================================
    function extraerInformacionArchivo(texto) {
        const lineas = texto.split(/\r?\n/);
        
        // Buscar la primera línea con datos de cuenta
        // Formato: Cuenta Contable | Descripción | Débitos | Créditos | Saldo | 06-02-01-04-07 | INVENTARIO CUENTA PUENTE | ...
        for (let linea of lineas) {
            const cols = linea.split('\t');
            
            // Buscar línea que tenga al menos 7 columnas y la columna 5 sea una cuenta (formato XX-XX-XX-XX-XX)
            if (cols.length >= 7 && /^\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/.test(cols[5])) {
                const cuentaNumero = cols[5];
                const cuentaDescripcion = cols[6] || 'Sin descripción';
                
                // La empresa normalmente viene en el PDF pero no en TXT
                // Por defecto usamos "Condominio Altamira Heredia S.A." pero se puede extraer de otras fuentes
                const empresa = "Condominio Altamira Heredia S.A.";
                
                // Actualizar elementos del DOM
                lblEmpresa.textContent = empresa;
                lblCuenta.textContent = `Cuenta: ${cuentaNumero} - ${cuentaDescripcion}`;
                footerEmpresa.textContent = empresa;
                footerCuenta.textContent = cuentaNumero;
                
                break;
            }
        }
    }

    function limpiarInformacionArchivo() {
        lblEmpresa.textContent = 'Sin archivo cargado';
        lblCuenta.textContent = 'Cuenta: -';
        footerEmpresa.textContent = 'Condominio Altamira Heredia S.A.';
        footerCuenta.textContent = '06-02-01-04-07';
    }

    // ============================================
    // EVENTO: Botón Analizar
    // ============================================
    btnAnalizar.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const texto = e.target.result;
                const movimientos = parsearArchivo(texto);
                
                if (movimientos.length === 0) {
                    mostrarAlerta('⚠️ No se encontraron movimientos válidos. Asegúrate de subir el TXT de Open 4 Business.', 'warning');
                    return;
                }

                const parejas = emparejarDebitosCreditos(movimientos);
                renderizarResultados(movimientos, parejas);
                
                // Mostrar botón de limpiar DESPUÉS de analizar
                btnLimpiar.style.display = 'block';
            } catch (error) {
                mostrarAlerta(`❌ Error al procesar: ${error.message}`, 'danger');
            }
        };
        reader.readAsText(file);
    });

    // ============================================
    // EVENTO: Botón Limpiar
    // ============================================
    btnLimpiar.addEventListener('click', () => {
        // Resetear el input de archivo
        fileInput.value = '';
        
        // Ocultar resultados
        resultadosDiv.style.display = 'none';
        
        // Limpiar tabla
        tbodyParejas.innerHTML = '';
        
        // Limpiar alertas
        alertContainer.innerHTML = '';
        
        // Resetear contadores
        document.getElementById('lblDebitos').textContent = '0.00';
        document.getElementById('lblCreditos').textContent = '0.00';
        document.getElementById('lblDiferencia').textContent = '0.00';
        document.getElementById('lblTotalParejas').textContent = '0';
        
        // Resetear color de tarjeta de diferencia
        const cardDif = document.getElementById('cardDiferencia');
        cardDif.className = 'card text-white bg-secondary card-shadow text-center py-3';
        
        // Deshabilitar botón de analizar
        btnAnalizar.disabled = true;
        
        // Ocultar botón de limpiar
        btnLimpiar.style.display = 'none';
        
        // Limpiar información del archivo
        limpiarInformacionArchivo();
    });

    // ============================================
    // 1. PARSEAR ARCHIVO TXT DE OPEN 4 BUSINESS
    // ============================================
    function parsearArchivo(texto) {
        const lineas = texto.split(/\r?\n/);
        const movimientos = [];

        lineas.forEach((linea, index) => {
            const cols = linea.split('\t');
            
            // Necesitamos al menos 11 columnas para tener todos los datos
            if (cols.length < 11) return;
            
            // La fecha SIEMPRE está en la columna 5 (formato dd-mm-yyyy)
            const fechaStr = cols[5] ? cols[5].trim() : '';
            if (!/^\d{2}-\d{2}-\d{4}$/.test(fechaStr)) return;
            
            // El asiento SIEMPRE está en la columna 6
            const asiento = cols[6] ? cols[6].trim() : '';
            
            // La descripción SIEMPRE está en la columna 7
            const descripcion = cols[7] ? cols[7].trim() : '';
            
            // El monto débito SIEMPRE está en la columna 9
            const debito = parsearMonto(cols[9]);
            
            // El monto crédito SIEMPRE está en la columna 10
            const credito = parsearMonto(cols[10]);
            
            // Solo agregar si tiene débito O crédito mayor a 0
            if (debito > 0 || credito > 0) {
                movimientos.push({
                    lineaOriginal: index + 1,
                    fecha: fechaStr,
                    asiento: asiento,
                    descripcion: descripcion,
                    debito: debito,
                    credito: credito
                });
            }
        });
        
        return movimientos;
    }

    // Función auxiliar para parsear montos con formato de miles (ej: 7,034,198.96)
    function parsearMonto(valor) {
        if (!valor) return 0;
        // Quitar comas de miles y convertir a número
        const limpio = valor.trim().replace(/,/g, '');
        const num = parseFloat(limpio);
        return isNaN(num) ? 0 : num;
    }

    // ============================================
    // 2. MOTOR DE EMPAREJAMIENTO (3 NIVELES)
    // ============================================
    function emparejarDebitosCreditos(movimientos) {
        let debitos = movimientos.filter(m => m.debito > 0).map(m => ({...m, emparejado: false}));
        let creditos = movimientos.filter(m => m.credito > 0).map(m => ({...m, emparejado: false}));
        let parejas = [];

        // NIVEL 1: Coincidencias EXACTAS (Verde)
        debitos.forEach(d => {
            if (d.emparejado) return;
            const c = creditos.find(c => !c.emparejado && c.credito === d.debito);
            
            if (c) {
                parejas.push({ 
                    d, c, diff: 0, 
                    estado: '✅ Conciliado', 
                    color: 'verde',
                    tooltip: `Montos idénticos: ${d.debito.toFixed(2)}`
                });
                d.emparejado = true; 
                c.emparejado = true;
            }
        });

        // NIVEL 2: Coincidencias CERCANAS (Amarillo) - Diferencia < 100
        debitos.forEach(d => {
            if (d.emparejado) return;
            
            let mejorC = null;
            let minDiff = Infinity;
            
            creditos.forEach(c => {
                if (!c.emparejado) {
                    const diff = Math.abs(c.credito - d.debito);
                    if (diff < minDiff) {
                        minDiff = diff;
                        mejorC = c;
                    }
                }
            });
            
            if (mejorC && minDiff > 0 && minDiff < 100) {
                parejas.push({ 
                    d, c: mejorC, diff: d.debito - mejorC.credito, 
                    estado: '⚠️ Posible coincidencia', 
                    color: 'amarilla',
                    tooltip: `Diferencia: ${(d.debito - mejorC.credito).toFixed(2)}<br>Débito: ${d.debito.toFixed(2)}<br>Crédito: ${mejorC.credito.toFixed(2)}`
                });
                d.emparejado = true;
                mejorC.emparejado = true;
            }
        });

        // NIVEL 3: Sin pareja (Rojo) - Débitos sin pareja
        debitos.filter(d => !d.emparejado).forEach(d => {
            parejas.push({ 
                d, c: null, diff: d.debito, 
                estado: '❌ Sin pareja (Débito)', 
                color: 'roja',
                tooltip: `Débito huérfano: ${d.debito.toFixed(2)}<br>Asiento: ${d.asiento}<br>Descripción: ${d.descripcion}<br>Acción: Buscar crédito por este monto`
            });
        });

        // NIVEL 3: Sin pareja (Rojo) - Créditos sin pareja
        creditos.filter(c => !c.emparejado).forEach(c => {
            parejas.push({ 
                d: null, c, diff: -c.credito, 
                estado: '❌ Sin pareja (Crédito)', 
                color: 'roja',
                tooltip: `Crédito huérfano: ${c.credito.toFixed(2)}<br>Asiento: ${c.asiento}<br>Descripción: ${c.descripcion}<br>Acción: Buscar débito por este monto`
            });
        });

        // Ordenar de menor a mayor por monto
        parejas.sort((a, b) => {
            const montoA = Math.max(a.d?.debito || 0, a.c?.credito || 0);
            const montoB = Math.max(b.d?.debito || 0, b.c?.credito || 0);
            return montoA - montoB;
        });

        return parejas;
    }

    // ============================================
    // 3. RENDERIZAR RESULTADOS EN LA TABLA
    // ============================================
    function renderizarResultados(movimientos, parejas) {
        resultadosDiv.style.display = 'block';
        
        const totalDebitos = movimientos.reduce((sum, m) => sum + m.debito, 0);
        const totalCreditos = movimientos.reduce((sum, m) => sum + m.credito, 0);
        const diferencia = totalDebitos - totalCreditos;

        document.getElementById('lblDebitos').textContent = totalDebitos.toLocaleString('en-US', {minimumFractionDigits: 2});
        document.getElementById('lblCreditos').textContent = totalCreditos.toLocaleString('en-US', {minimumFractionDigits: 2});
        document.getElementById('lblDiferencia').textContent = diferencia.toLocaleString('en-US', {minimumFractionDigits: 2});
        document.getElementById('lblTotalParejas').textContent = parejas.length;

        // Color de la tarjeta de diferencia
        const cardDif = document.getElementById('cardDiferencia');
        cardDif.className = `card text-white card-shadow text-center py-3 ${Math.abs(diferencia) < 0.01 ? 'bg-success' : 'bg-danger'}`;

        // Generar filas de la tabla
        tbodyParejas.innerHTML = '';
        parejas.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = `fila-${p.color}`;
            
            // Formatear montos con separadores de miles
            const fmtDebito = p.d ? p.d.debito.toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00';
            const fmtCredito = p.c ? p.c.credito.toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00';
            const fmtDiff = p.diff.toLocaleString('en-US', {minimumFractionDigits: 2});

            // Escapar HTML para evitar problemas con caracteres especiales
            const escapeHtml = (str) => {
                if (!str) return '-';
                return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            };

            tr.innerHTML = `
                <td>${p.d ? escapeHtml(p.d.fecha) : '-'}</td>
                <td><strong>${p.d ? escapeHtml(p.d.asiento) : '-'}</strong></td>
                <td><small>${p.d ? escapeHtml(p.d.descripcion) : '-'}</small></td>
                <td class="text-end monto-debito">${fmtDebito}</td>
                <td class="text-end"><strong>${fmtDiff}</strong></td>
                <td class="text-end monto-credito">${fmtCredito}</td>
                <td><small>${p.c ? escapeHtml(p.c.descripcion) : '-'}</small></td>
                <td><strong>${p.c ? escapeHtml(p.c.asiento) : '-'}</strong></td>
                <td>${p.c ? escapeHtml(p.c.fecha) : '-'}</td>
                <td class="text-center">
                    <span class="badge ${p.color === 'verde' ? 'bg-success' : (p.color === 'amarilla' ? 'bg-warning text-dark' : 'bg-danger')}" 
                          data-bs-toggle="tooltip" data-bs-placement="top" data-bs-html="true" 
                          title="${p.tooltip}">
                        ${p.estado}
                    </span>
                </td>
            `;
            tbodyParejas.appendChild(tr);
        });

        // Activar tooltips de Bootstrap
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(el => new bootstrap.Tooltip(el));

        // Mensaje de éxito/error general
        const errores = parejas.filter(p => p.color === 'roja').length;
        const posibles = parejas.filter(p => p.color === 'amarilla').length;
        
        if (errores === 0 && posibles === 0) {
            mostrarAlerta(`✅ ¡CUENTA CUADRADA! Todas las ${parejas.length} parejas están conciliadas. Diferencia: 0.00`, 'success');
        } else {
            mostrarAlerta(`❌ HAY DESCUADRES. ${errores} líneas sin conciliar y ${posibles} posibles coincidencias. Pasa el mouse sobre las etiquetas para ver detalles.`, 'danger');
        }
    }

    // ============================================
    // 4. MOSTRAR ALERTAS
    // ============================================
    function mostrarAlerta(mensaje, tipo) {
        alertContainer.innerHTML = `<div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
    }
});
