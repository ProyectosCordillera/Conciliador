// js/app.js - Lógica del Analizador de Cuenta Puente (Versión Universal)

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const btnAnalizar = document.getElementById('btnAnalizar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const alertContainer = document.getElementById('alertContainer');
    const resultadosDiv = document.getElementById('resultados');
    const tbodyParejas = document.getElementById('tbodyParejas');

    // Elementos de información
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
    // EVENTOS DE BOTONES
    // ============================================
    fileInput.addEventListener('change', () => {
        btnAnalizar.disabled = !fileInput.files.length;
    });

    btnAnalizar.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const texto = e.target.result;
                
                // 1. Extraer información de la empresa/cuenta (si existe)
                extraerInfoEmpresa(texto);
                
                // 2. Parsear movimientos (Detecta formato Altamira o 852 automáticamente)
                const movimientos = parsearArchivoUniversal(texto);
                
                if (movimientos.length === 0) {
                    mostrarAlerta('⚠️ No se encontraron movimientos válidos. Verifica el formato del archivo.', 'warning');
                    return;
                }

                // 3. Emparejar y Renderizar
                const parejas = emparejarDebitosCreditos(movimientos);
                renderizarResultados(movimientos, parejas);
                
                btnLimpiar.style.display = 'block';
                mostrarAlerta(`✅ Análisis completado. Se procesaron ${movimientos.length} movimientos.`, 'success');
            } catch (error) {
                console.error(error);
                mostrarAlerta(`❌ Error al procesar: ${error.message}`, 'danger');
            }
        };
        reader.readAsText(file);
    });

    btnLimpiar.addEventListener('click', () => {
        fileInput.value = '';
        resultadosDiv.style.display = 'none';
        tbodyParejas.innerHTML = '';
        alertContainer.innerHTML = '';
        lblDebitos.textContent = '0.00';
        lblCreditos.textContent = '0.00';
        lblDiferencia.textContent = '0.00';
        lblTotalParejas.textContent = '0';
        cardDiferencia.className = 'card text-white bg-secondary card-shadow text-center py-3';
        btnAnalizar.disabled = true;
        btnLimpiar.style.display = 'none';
        
        // Resetear info empresa
        lblEmpresa.textContent = 'Sin archivo cargado';
        lblCuenta.textContent = 'Cuenta: -';
        footerEmpresa.textContent = 'Esperando archivo...';
        footerCuenta.textContent = '-';
    });

    // ============================================
    // FUNCIONES DE PARSEO INTELIGENTE
    // ============================================
    
    function extraerInfoEmpresa(texto) {
        // Buscar número de cuenta (formato XX-XX-XX-XX-XX)
        const matchCuenta = texto.match(/(\d{2}-\d{2}-\d{2}-\d{2}-\d{2})/);
        if (matchCuenta) {
            const cuenta = matchCuenta[1];
            footerCuenta.textContent = cuenta;
            lblCuenta.textContent = `Cuenta: ${cuenta}`;
        }

        // Buscar nombre de empresa (ej: URUKA POINT S.A. o CONDOMINIO ALTAMIRA)
        if (texto.includes('URUKA')) {
            lblEmpresa.textContent = 'Uruka Point S.A.';
            footerEmpresa.textContent = 'Uruka Point S.A.';
        } else if (texto.includes('ALTAMIRA')) {
            lblEmpresa.textContent = 'Condominio Altamira';
            footerEmpresa.textContent = 'Condominio Altamira';
        } else {
            lblEmpresa.textContent = 'Empresa No Identificada';
            footerEmpresa.textContent = 'Empresa No Identificada';
        }
    }

    function parsearArchivoUniversal(texto) {
        const lineas = texto.split(/\r?\n/);
        const movimientos = [];

        lineas.forEach(linea => {
            if (!linea.trim()) return;

            const cols = linea.split('\t');
            let fecha = '', asiento = '', descripcion = '', debito = 0, credito = 0;
            let formatoDetectado = null;

            // --- INTENTO 1: Formato Altamira (Tabulado con totales al final) ---
            // Tiene muchas columnas y la fecha está en el índice 5
            if (cols.length >= 11) {
                const posibleFecha = cols[5].trim();
                // Validar que sea fecha (dd-mm-yyyy) y no número de cuenta (06-02-01-04-07)
                if (/^\d{2}-\d{2}-\d{4}$/.test(posibleFecha)) {
                    formatoDetectado = 'altamira';
                    fecha = posibleFecha;
                    asiento = cols[6].trim();
                    descripcion = cols[7].trim();
                    // En Altamira, los montos suelen estar en las columnas 9 y 10
                    debito = parsearMonto(cols[9]);
                    credito = parsearMonto(cols[10]);
                }
            }

            // --- INTENTO 2: Formato 852 (Tabulado limpio) ---
            // Fecha en columna 0
            if (!formatoDetectado && cols.length >= 6) {
                const posibleFecha = cols[0].trim();
                if (/^\d{2}-\d{2}-\d{4}$/.test(posibleFecha)) {
                    formatoDetectado = '852-tabs';
                    fecha = posibleFecha;
                    asiento = cols[1].trim();
                    descripcion = cols[2].trim();
                    // Asumimos: Fecha(0), Asiento(1), Desc(2), Grupo(3), Debito(4), Credito(5)
                    debito = parsearMonto(cols[4]);
                    credito = parsearMonto(cols[5]);
                }
            }

            // --- INTENTO 3: Formato 852 (Separado por espacios) ---
            // Si los tabs fallaron, usamos Regex para buscar el patrón al inicio de la línea
            if (!formatoDetectado) {
                const regex = /^(\d{2}-\d{2}-\d{4})\s+(\d+)\s+(.*?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,-]+\.\d{2})/;
                const match = linea.match(regex);
                if (match) {
                    formatoDetectado = '852-espacios';
                    fecha = match[1];
                    asiento = match[2];
                    descripcion = match[3].trim();
                    debito = parsearMonto(match[4]);
                    credito = parsearMonto(match[5]);
                }
            }

            // Si se detectó un formato válido y hay montos, agregar a la lista
            if (formatoDetectado && (debito > 0 || credito > 0)) {
                movimientos.push({
                    fecha, asiento, descripcion, debito, credito
                });
            }
        });

        return movimientos;
    }

    function parsearMonto(valor) {
        if (!valor) return 0;
        const limpio = valor.toString().replace(/,/g, '').trim();
        const num = parseFloat(limpio);
        return isNaN(num) ? 0 : num;
    }

    // ============================================
    // LÓGICA DE EMPAREJAMIENTO
    // ============================================
    function emparejarDebitosCreditos(movimientos) {
        let debitos = movimientos.filter(m => m.debito > 0).map(m => ({...m, emparejado: false}));
        let creditos = movimientos.filter(m => m.credito > 0).map(m => ({...m, emparejado: false}));
        let parejas = [];

        // Nivel 1: Coincidencias exactas
        debitos.forEach(d => {
            if (d.emparejado) return;
            const c = creditos.find(c => !c.emparejado && c.credito === d.debito);
            if (c) {
                parejas.push({ d, c, diff: 0, estado: '✅ Conciliado', color: 'verde' });
                d.emparejado = true; c.emparejado = true;
            }
        });

        // Nivel 2: Débitos sin pareja
        debitos.filter(d => !d.emparejado).forEach(d => {
            parejas.push({ d, c: null, diff: d.debito, estado: '❌ Sin pareja (Débito)', color: 'roja' });
        });

        // Nivel 3: Créditos sin pareja
        creditos.filter(c => !c.emparejado).forEach(c => {
            parejas.push({ d: null, c, diff: -c.credito, estado: '❌ Sin pareja (Crédito)', color: 'roja' });
        });

        // Ordenar por monto
        parejas.sort((a, b) => {
            const montoA = Math.max(a.d?.debito || 0, a.c?.credito || 0);
            const montoB = Math.max(b.d?.debito || 0, b.c?.credito || 0);
            return montoA - montoB;
        });

        return parejas;
    }

    // ============================================
    // RENDERIZADO
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
                    <span class="badge ${p.color === 'verde' ? 'bg-success' : 'bg-danger'}">
                        ${p.estado}
                    </span>
                </td>
            `;
            tbodyParejas.appendChild(tr);
        });
    }

    function mostrarAlerta(mensaje, tipo) {
        alertContainer.innerHTML = `<div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
    }
});
