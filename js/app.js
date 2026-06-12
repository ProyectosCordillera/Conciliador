// js/app.js - Analizador de Cuenta Puente
// Formato enfocado: altamira.txt (tabulado con encabezados repetidos)

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const btnAnalizar = document.getElementById('btnAnalizar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const alertContainer = document.getElementById('alertContainer');
    const resultadosDiv = document.getElementById('resultados');
    const tbodyParejas = document.getElementById('tbodyParejas');

    const lblEmpresa = document.getElementById('lblEmpresa');
    const lblCuenta = document.getElementById('lblCuenta');
    const footerEmpresa = document.getElementById('footerEmpresa');
    const footerCuenta = document.getElementById('footerCuenta');

    const lblDebitos = document.getElementById('lblDebitos');
    const lblCreditos = document.getElementById('lblCreditos');
    const lblDiferencia = document.getElementById('lblDiferencia');
    const lblTotalParejas = document.getElementById('lblTotalParejas');
    const cardDiferencia = document.getElementById('cardDiferencia');

    // ============================================
    // EVENTOS
    // ============================================
    fileInput.addEventListener('change', () => {
        btnAnalizar.disabled = !fileInput.files.length;
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                extraerInfoEmpresa(e.target.result);
                mostrarAlerta(`✅ Archivo cargado: <strong>${file.name}</strong>. Presiona "Analizar".`, 'info');
            };
            reader.readAsText(file);
        }
    });

    btnAnalizar.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const texto = e.target.result;
                
                // Detectar formato
                const formato = detectarFormato(texto);
                console.log('🔍 Formato detectado:', formato);
                
                if (formato === 'altamira') {
                    const movimientos = parsearFormatoAltamira(texto);
                    
                    if (movimientos.length === 0) {
                        mostrarAlerta('⚠️ No se encontraron movimientos válidos.', 'warning');
                        return;
                    }

                    const parejas = emparejarDebitosCreditos(movimientos);
                    renderizarResultados(movimientos, parejas);
                    btnLimpiar.style.display = 'block';
                    mostrarAlerta(`✅ Análisis completado. Se procesaron ${movimientos.length} movimientos.`, 'success');
                } else {
                    mostrarAlerta('⚠️ Formato no reconocido. Solo se acepta el formato tabulado (tipo altamira.txt) por ahora.', 'warning');
                }
            } catch (error) {
                console.error(error);
                mostrarAlerta(`❌ Error: ${error.message}`, 'danger');
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
        lblEmpresa.textContent = 'Sin archivo cargado';
        lblCuenta.textContent = 'Cuenta: -';
        footerEmpresa.textContent = 'Esperando archivo...';
        footerCuenta.textContent = '-';
    });

    // ============================================
    // 🕵️ DETECTAR FORMATO
    // ============================================
    function detectarFormato(texto) {
        const lineas = texto.split(/\r?\n/);
        
        for (let linea of lineas) {
            if (!linea.trim()) continue;
            
            const cols = linea.split('\t');
            
            // Si tiene "Cuenta Contable" al inicio y tiene tabs → Formato Altamira
            if (cols[0] && cols[0].trim() === 'Cuenta Contable' && cols.length >= 11) {
                return 'altamira';
            }
        }
        
        return 'desconocido';
    }

    // ============================================
    // 📄 PARSEAR FORMATO ALTAMIRA
    // ============================================
    function parsearFormatoAltamira(texto) {
        const lineas = texto.split(/\r?\n/);
        const movimientos = [];

        lineas.forEach((linea, index) => {
            if (!linea.trim()) return;

            const cols = linea.split('\t');
            
            // Necesitamos al menos 12 columnas
            if (cols.length < 12) return;
            
            // La columna 5 puede ser:
            // - Número de cuenta: 06-02-01-04-07 (ignorar, es resumen)
            // - Fecha: 06-04-2026 (procesar, es movimiento)
            const posibleFecha = cols[5].trim();
            
            // Solo procesar si es una fecha válida (DD-MM-YYYY)
            if (!/^\d{2}-\d{2}-\d{4}$/.test(posibleFecha)) return;
            
            const fecha = posibleFecha;
            const asiento = cols[6].trim();
            const descripcion = cols[7].trim();
            const debito = parsearMonto(cols[9]);
            const credito = parsearMonto(cols[10]);
            
            // Solo agregar si tiene débito O crédito mayor a 0
            if (debito > 0 || credito > 0) {
                movimientos.push({
                    lineaOriginal: index + 1,
                    fecha,
                    asiento,
                    descripcion,
                    debito,
                    credito
                });
            }
        });

        console.log(`✅ Formato Altamira: ${movimientos.length} movimientos procesados`);
        return movimientos;
    }

    // ============================================
    // 🔧 FUNCIÓN AUXILIAR: Parsear montos
    // ============================================
    function parsearMonto(valor) {
        if (!valor) return 0;
        const limpio = valor.toString().replace(/,/g, '').trim();
        const num = parseFloat(limpio);
        return isNaN(num) ? 0 : num;
    }

    // ============================================
    // 🏢 EXTRAER INFO DE EMPRESA
    // ============================================
    function extraerInfoEmpresa(texto) {
        const matchCuenta = texto.match(/(\d{2}-\d{2}-\d{2}-\d{2}-\d{2})/);
        if (matchCuenta) {
            footerCuenta.textContent = matchCuenta[1];
            lblCuenta.textContent = `Cuenta: ${matchCuenta[1]}`;
        }

        if (texto.includes('URUKA')) {
            lblEmpresa.textContent = 'Uruka Point';
            footerEmpresa.textContent = 'Uruka Point';
        } else if (texto.includes('ALTAMIRA')) {
            lblEmpresa.textContent = 'Condominio Altamira';
            footerEmpresa.textContent = 'Condominio Altamira';
        } else if (texto.includes('TORRE AZUR')) {
            lblEmpresa.textContent = 'Torre Azur';
            footerEmpresa.textContent = 'Torre Azur';
        }
    }

    // ============================================
    // 🔗 MOTOR DE EMPAREJAMIENTO
    // ============================================
    function emparejarDebitosCreditos(movimientos) {
        let debitos = movimientos.filter(m => m.debito > 0).map(m => ({...m, emparejado: false}));
        let creditos = movimientos.filter(m => m.credito > 0).map(m => ({...m, emparejado: false}));
        let parejas = [];

        // Nivel 1: Exactas
        debitos.forEach(d => {
            if (d.emparejado) return;
            const c = creditos.find(c => !c.emparejado && c.credito === d.debito);
            if (c) {
                parejas.push({ d, c, diff: 0, estado: '✅ Conciliado', color: 'verde' });
                d.emparejado = true; c.emparejado = true;
            }
        });

        // Nivel 2: Cercanas (< 100)
        debitos.forEach(d => {
            if (d.emparejado) return;
            let mejorC = null, minDiff = Infinity;
            creditos.forEach(c => {
                if (!c.emparejado) {
                    const diff = Math.abs(c.credito - d.debito);
                    if (diff < minDiff) { minDiff = diff; mejorC = c; }
                }
            });
            if (mejorC && minDiff > 0 && minDiff < 100) {
                parejas.push({ 
                    d, c: mejorC, diff: d.debito - mejorC.credito, 
                    estado: '⚠️ Posible coincidencia', color: 'amarilla' 
                });
                d.emparejado = true; mejorC.emparejado = true;
            }
        });

        // Nivel 3: Sin pareja
        debitos.filter(d => !d.emparejado).forEach(d => {
            parejas.push({ d, c: null, diff: d.debito, estado: '❌ Sin pareja (Débito)', color: 'roja' });
        });
        creditos.filter(c => !c.emparejado).forEach(c => {
            parejas.push({ d: null, c, diff: -c.credito, estado: '❌ Sin pareja (Crédito)', color: 'roja' });
        });

        parejas.sort((a, b) => {
            const montoA = Math.max(a.d?.debito || 0, a.c?.credito || 0);
            const montoB = Math.max(b.d?.debito || 0, b.c?.credito || 0);
            return montoA - montoB;
        });

        return parejas;
    }

    // ============================================
    // 📊 RENDERIZAR
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

            tr.innerHTML = `
                <td>${p.d ? p.d.fecha : '-'}</td>
                <td><strong>${p.d ? p.d.asiento : '-'}</strong></td>
                <td><small>${p.d ? p.d.descripcion : '-'}</small></td>
                <td class="text-end monto-debito">${fmtDebito}</td>
                <td class="text-end"><strong>${fmtDiff}</strong></td>
                <td class="text-end monto-credito">${fmtCredito}</td>
                <td><small>${p.c ? p.c.descripcion : '-'}</small></td>
                <td><strong>${p.c ? p.c.asiento : '-'}</strong></td>
                <td>${p.c ? p.c.fecha : '-'}</td>
                <td class="text-center">
                    <span class="badge ${p.color === 'verde' ? 'bg-success' : (p.color === 'amarilla' ? 'bg-warning text-dark' : 'bg-danger')}">
                        ${p.estado}
                    </span>
                </td>
            `;
            tbodyParejas.appendChild(tr);
        });

        const errores = parejas.filter(p => p.color === 'roja').length;
        const posibles = parejas.filter(p => p.color === 'amarilla').length;
        
        if (errores === 0 && posibles === 0) {
            mostrarAlerta(`✅ ¡CUENTA CUADRADA! Todas las ${parejas.length} parejas conciliadas.`, 'success');
        } else {
            mostrarAlerta(`❌ HAY DESCUADRES. ${errores} sin conciliar, ${posibles} posibles coincidencias.`, 'danger');
        }
    }

    function mostrarAlerta(mensaje, tipo) {
        alertContainer.innerHTML = `<div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`;
    }
});
