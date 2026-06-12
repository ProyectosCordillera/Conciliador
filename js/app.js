// js/app.js - Lógica del Analizador de Cuenta Puente

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
    
    // Elementos de totales
    const lblDebitos = document.getElementById('lblDebitos');
    const lblCreditos = document.getElementById('lblCreditos');
    const lblDiferencia = document.getElementById('lblDiferencia');
    const lblTotalParejas = document.getElementById('lblTotalParejas');
    const cardDiferencia = document.getElementById('cardDiferencia');

    // ============================================
    // FUNCIÓN DE RESETEO COMPLETO
    // ============================================
    function resetearTodo() {
        tbodyParejas.innerHTML = '';
        lblDebitos.textContent = '0.00';
        lblCreditos.textContent = '0.00';
        lblDiferencia.textContent = '0.00';
        lblTotalParejas.textContent = '0';
        cardDiferencia.className = 'card text-white bg-secondary card-shadow text-center py-3';
        alertContainer.innerHTML = '';
        resultadosDiv.style.display = 'none';
        
        lblEmpresa.textContent = 'Sin archivo cargado';
        lblCuenta.textContent = 'Cuenta: -';
        footerEmpresa.textContent = 'Esperando archivo...';
        footerCuenta.textContent = '-';
        
        console.log('✅ Sistema reseteado completamente');
    }

    // ============================================
    // ⭐ NUEVO: EVENTO - Al seleccionar archivo, precargar info
    // ============================================
    fileInput.addEventListener('change', () => {
        btnAnalizar.disabled = !fileInput.files.length;
        
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const texto = e.target.result;
                
                // 🎯 PRECARGAR información del archivo INMEDIATAMENTE
                extraerInformacionArchivo(texto);
                
                // Mostrar mensaje de confirmación
                mostrarAlerta(`✅ Archivo cargado: <strong>${file.name}</strong>. Ya puedes presionar "Analizar".`, 'info');
            };
            
            reader.readAsText(file);
        } else {
            resetearTodo();
        }
    });

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
                
                // Parsear movimientos
                const movimientos = parsearArchivo(texto);
                
                if (movimientos.length === 0) {
                    mostrarAlerta('⚠️ No se encontraron movimientos válidos.', 'warning');
                    return;
                }

                // Emparejar
                const parejas = emparejarDebitosCreditos(movimientos);
                
                // Renderizar
                renderizarResultados(movimientos, parejas);
                
                // Mostrar botón de limpiar
                btnLimpiar.style.display = 'block';
                
                console.log(`✅ Análisis completado: ${movimientos.length} movimientos`);
            } catch (error) {
                console.error('❌ Error:', error);
                mostrarAlerta(`❌ Error al procesar: ${error.message}`, 'danger');
            }
        };
        reader.readAsText(file);
    });

    // ============================================
    // EVENTO: Botón Limpiar
    // ============================================
    btnLimpiar.addEventListener('click', () => {
        fileInput.value = '';
        resetearTodo();
        btnAnalizar.disabled = true;
        btnLimpiar.style.display = 'none';
        console.log('🧹 Limpieza completada');
    });

    // ============================================
    // ⭐ FUNCIÓN: EXTRAER INFORMACIÓN DEL ARCHIVO
    // (Se ejecuta al SUBIR el archivo, no al analizar)
    // ============================================
    function extraerInformacionArchivo(texto) {
        const lineas = texto.split(/\r?\n/);
        
        if (lineas.length === 0) return;
        
        const primeraLinea = lineas[0].split('\t');
        
        // La columna 5 es el número de cuenta (ej: 06-02-01-04-07)
        let cuentaNumero = '';
        if (primeraLinea.length > 5) {
            const valorCuenta = primeraLinea[5].trim();
            if (/^\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/.test(valorCuenta)) {
                cuentaNumero = valorCuenta;
            }
        }
        
        // La columna 6 es la descripción (ej: INVENTARIO CUENTA PUENTE)
        let cuentaDescripcion = '';
        if (primeraLinea.length > 6) {
            cuentaDescripcion = primeraLinea[6].trim();
        }
        
        // Buscar el nombre de la empresa en las primeras 20 líneas
        let empresa = 'Empresa No Identificada';
        
        for (let i = 1; i < Math.min(20, lineas.length); i++) {
            const linea = lineas[i];
            
            if (linea.includes('BODEGA URUKA POINT') || linea.includes('URUKA POINT')) {
                empresa = 'Uruka Point';
                break;
            } else if (linea.includes('TORRE AZUR')) {
                empresa = 'Torre Azur';
                break;
            } else if (linea.includes('ALTAMIRA')) {
                empresa = 'Condominio Altamira Heredia S.A.';
                break;
            }
        }
        
        // Si no se encuentra, usar valor por defecto basado en la cuenta
        if (empresa === 'Empresa No Identificada') {
            if (cuentaNumero.startsWith('12-')) {
                empresa = 'Uruka Point';
            } else if (cuentaNumero.startsWith('06-')) {
                empresa = 'Condominio Altamira Heredia S.A.';
            }
        }
        
        // 🎯 Actualizar encabezado Y footer
        lblEmpresa.textContent = empresa;
        lblCuenta.textContent = `Cuenta: ${cuentaNumero} - ${cuentaDescripcion}`;
        footerEmpresa.textContent = empresa;
        footerCuenta.textContent = cuentaNumero;
        
        console.log(`🏢 Empresa: ${empresa} | 📊 Cuenta: ${cuentaNumero}`);
    }

    // ============================================
    // FUNCIÓN: PARSEAR ARCHIVO TXT
    // ============================================
  // ============================================
// FUNCIÓN: PARSEAR ARCHIVO TXT (VERSIÓN INTELIGENTE)
// ============================================
// ============================================
// FUNCIÓN: PARSEAR ARCHIVO TXT (AUTO-DETECCIÓN)
// Funciona con ambos formatos sin configuración manual
// ============================================
function parsearArchivo(texto) {
    const lineas = texto.split(/\r?\n/);
    const movimientos = [];

    // 1. DETECCIÓN AUTOMÁTICA DE FORMATO
    let formato = 'desconocido';
    for (let linea of lineas) {
        if (!linea.trim()) continue;
        
        // Si tiene tabs y muchas columnas -> Formato Estándar (Altamira/Uruka clásico)
        if (linea.includes('\t') && linea.split('\t').length > 8) {
            formato = 'estandar';
            break;
        }
        // Si empieza con fecha -> Formato Compacto (getjobid139852)
        if (/^\d{2}-\d{2}-\d{4}/.test(linea.trim().substring(0, 10))) {
            formato = 'compacto';
            break;
        }
    }

    // 2. PROCESAMIENTO LÍNEA POR LÍNEA
    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i].trim();
        if (!linea) continue;

        // Ignorar líneas de resumen, encabezados repetidos y totales
        if (linea.includes('Total Saldo Anterior') ||
            linea.includes('Total Acumulado') ||
            linea.includes('Saldo Anterior:') ||
            linea.includes('Cuenta Contable') ||
            linea.includes('Fecha Asiento Descripción') ||
            linea.includes('Total:')) {
            continue;
        }

        let fecha, asiento, descripcion, debito, credito;

        if (formato === 'estandar') {
            // Formato Tabulado Largo: Cuenta | Desc | Deb | Cred | Saldo | FECHA | ASIENTO | DESC_MOV | ... | MONTO_DEB | MONTO_CRED | ...
            const cols = linea.split('\t');
            if (cols.length < 10) continue;

            fecha = cols[5]?.trim();
            asiento = cols[6]?.trim();
            descripcion = cols[7]?.trim();
            debito = parsearMonto(cols[9]);
            credito = parsearMonto(cols[10]);
        }
        else if (formato === 'compacto') {
            // Formato Compacto (Espaciado): FECHA | ASIENTO | DESCRIPCIÓN... | GRUPO | DÉBITO | CRÉDITO | SALDO
            const partes = linea.split(/\s+/);
            if (partes.length < 6) continue;

            fecha = partes[0];
            asiento = partes[1];
            // Los últimos 3 valores son: Débito, Crédito, Saldo
            debito = parsearMonto(partes[partes.length - 3]);
            credito = parsearMonto(partes[partes.length - 2]);
            // La descripción es todo lo que está entre el Asiento y los montos
            descripcion = partes.slice(2, -3).join(' ');
        }
        else {
            continue; // Formato no reconocido, saltar línea
        }

        // Validar que sea una fecha real
        if (!fecha || !/^\d{2}-\d{2}-\d{4}$/.test(fecha)) continue;

        // Solo guardar si tiene movimiento real (débito o crédito > 0)
        if (debito > 0 || credito > 0) {
            movimientos.push({
                lineaOriginal: i + 1,
                fecha,
                asiento: asiento || '-',
                descripcion: descripcion || '-',
                debito,
                credito
            });
        }
    }

    return movimientos;
}

// Función auxiliar para limpiar y convertir montos (MANTENER ESTA SI YA LA TIENES)
function parsearMonto(valor) {
    if (!valor) return 0;
    const limpio = valor.toString().trim().replace(/,/g, '');
    const num = parseFloat(limpio);
    return isNaN(num) ? 0 : num;
}

    // ============================================
    // FUNCIÓN: MOTOR DE EMPAREJAMIENTO
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

        // NIVEL 2: Coincidencias CERCANAS (Amarillo)
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

        // NIVEL 3: Sin pareja (Rojo)
        debitos.filter(d => !d.emparejado).forEach(d => {
            parejas.push({ 
                d, c: null, diff: d.debito, 
                estado: '❌ Sin pareja (Débito)', 
                color: 'roja',
                tooltip: `Débito huérfano: ${d.debito.toFixed(2)}<br>Asiento: ${d.asiento}<br>Descripción: ${d.descripcion}`
            });
        });

        creditos.filter(c => !c.emparejado).forEach(c => {
            parejas.push({ 
                d: null, c, diff: -c.credito, 
                estado: '❌ Sin pareja (Crédito)', 
                color: 'roja',
                tooltip: `Crédito huérfano: ${c.credito.toFixed(2)}<br>Asiento: ${c.asiento}<br>Descripción: ${c.descripcion}`
            });
        });

        parejas.sort((a, b) => {
            const montoA = Math.max(a.d?.debito || 0, a.c?.credito || 0);
            const montoB = Math.max(b.d?.debito || 0, b.c?.credito || 0);
            return montoA - montoB;
        });

        return parejas;
    }

    // ============================================
    // FUNCIÓN: RENDERIZAR RESULTADOS
    // ============================================
    function renderizarResultados(movimientos, parejas) {
        resultadosDiv.style.display = 'block';
        
        const totalDebitos = movimientos.reduce((sum, m) => sum + m.debito, 0);
        const totalCreditos = movimientos.reduce((sum, m) => sum + m.credito, 0);
        const diferencia = totalDebitos - totalCreditos;

        lblDebitos.textContent = totalDebitos.toLocaleString('en-US', {minimumFractionDigits: 2});
        lblCreditos.textContent = totalCreditos.toLocaleString('en-US', {minimumFractionDigits: 2});
        lblDiferencia.textContent = diferencia.toLocaleString('en-US', {minimumFractionDigits: 2});
        lblTotalParejas.textContent = parejas.length;

        cardDiferencia.className = `card text-white card-shadow text-center py-3 ${Math.abs(diferencia) < 0.01 ? 'bg-success' : 'bg-danger'}`;

        tbodyParejas.innerHTML = '';
        parejas.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = `fila-${p.color}`;
            
            const fmtDebito = p.d ? p.d.debito.toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00';
            const fmtCredito = p.c ? p.c.credito.toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00';
            const fmtDiff = p.diff.toLocaleString('en-US', {minimumFractionDigits: 2});

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

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(el => new bootstrap.Tooltip(el));

        const errores = parejas.filter(p => p.color === 'roja').length;
        const posibles = parejas.filter(p => p.color === 'amarilla').length;
        
        if (errores === 0 && posibles === 0) {
            mostrarAlerta(`✅ ¡CUENTA CUADRADA! Todas las ${parejas.length} parejas están conciliadas.`, 'success');
        } else {
            mostrarAlerta(`❌ HAY DESCUADRES. ${errores} líneas sin conciliar y ${posibles} posibles coincidencias.`, 'danger');
        }
    }

    // ============================================
    // FUNCIÓN: MOSTRAR ALERTAS
    // ============================================
    function mostrarAlerta(mensaje, tipo) {
        alertContainer.innerHTML = `<div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
    }
});
