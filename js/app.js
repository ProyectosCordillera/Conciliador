// ============================================
// FUNCIONES PARA EXTRAER INFORMACIÓN DEL ARCHIVO
// ============================================
function extraerInformacionArchivo(texto) {
    console.log('🔍 Iniciando extracción de información del archivo...');
    
    const lineas = texto.split(/\r?\n/);
    console.log(`📄 Total de líneas en el archivo: ${lineas.length}`);
    
    if (lineas.length === 0) {
        console.warn('⚠️ El archivo está vacío');
        return;
    }
    
    const primeraLinea = lineas[0].split('\t');
    console.log(`📊 Columnas en la primera línea: ${primeraLinea.length}`);
    console.log('📋 Contenido de la primera línea:', primeraLinea);
    
    // La columna 5 (índice 5) es el número de cuenta
    let cuentaNumero = '';
    if (primeraLinea.length > 5) {
        const valorCuenta = primeraLinea[5].trim();
        console.log(`🔢 Valor en columna 5: "${valorCuenta}"`);
        
        if (/^\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/.test(valorCuenta)) {
            cuentaNumero = valorCuenta;
            console.log(`✅ Cuenta encontrada: ${cuentaNumero}`);
        } else {
            console.warn(`⚠️ El valor "${valorCuenta}" no coincide con el formato de cuenta`);
        }
    }
    
    // La columna 6 (índice 6) es la descripción de la cuenta
    let cuentaDescripcion = '';
    if (primeraLinea.length > 6) {
        cuentaDescripcion = primeraLinea[6].trim();
        console.log(`📝 Descripción de cuenta: ${cuentaDescripcion}`);
    }
    
    // Intentar extraer el nombre de la empresa
    let empresa = 'Empresa No Identificada';
    
    console.log('🔎 Buscando nombre de empresa en las primeras 20 líneas...');
    
    for (let i = 1; i < Math.min(20, lineas.length); i++) {
        const linea = lineas[i];
        
        if (linea.includes('BODEGA URUKA POINT') || linea.includes('URUKA POINT')) {
            empresa = 'Uruka Point';
            console.log(`✅ Empresa encontrada en línea ${i}: ${empresa}`);
            break;
        } else if (linea.includes('CONDOMINIO VERTICAL HORIZONTAL RESIDENCIAL TORRE AZUR') || 
                   linea.includes('TORRE AZUR')) {
            empresa = 'Torre Azur';
            console.log(`✅ Empresa encontrada en línea ${i}: ${empresa}`);
            break;
        } else if (linea.includes('CONDOMINIO VERTICAL  HORIZ. RESID. ALTAMIRA') || 
                   linea.includes('ALTAMIRA')) {
            empresa = 'Condominio Altamira Heredia S.A.';
            console.log(`✅ Empresa encontrada en línea ${i}: ${empresa}`);
            break;
        }
    }
    
    // Si no encontramos la empresa, usar valor por defecto
    if (empresa === 'Empresa No Identificada') {
        console.log('⚠️ No se encontró el nombre de empresa, usando valor por defecto basado en la cuenta');
        if (cuentaNumero.startsWith('12-')) {
            empresa = 'Uruka Point';
        } else if (cuentaNumero.startsWith('06-')) {
            empresa = 'Condominio Altamira Heredia S.A.';
        }
    }
    
    console.log(`🏢 Empresa final: ${empresa}`);
    console.log(`📊 Cuenta final: ${cuentaNumero} - ${cuentaDescripcion}`);
    
    // Verificar que los elementos del DOM existan
    console.log('🔍 Verificando elementos del DOM...');
    console.log('lblEmpresa:', lblEmpresa);
    console.log('lblCuenta:', lblCuenta);
    console.log('footerEmpresa:', footerEmpresa);
    console.log('footerCuenta:', footerCuenta);
    
    // Actualizar elementos del DOM
    if (lblEmpresa) {
        lblEmpresa.textContent = empresa;
        console.log(`✅ lblEmpresa actualizado a: ${empresa}`);
    } else {
        console.error('❌ ERROR: No se encontró el elemento lblEmpresa en el HTML');
    }
    
    if (lblCuenta) {
        lblCuenta.textContent = `Cuenta: ${cuentaNumero} - ${cuentaDescripcion}`;
        console.log(`✅ lblCuenta actualizado a: Cuenta: ${cuentaNumero} - ${cuentaDescripcion}`);
    } else {
        console.error('❌ ERROR: No se encontró el elemento lblCuenta en el HTML');
    }
    
    if (footerEmpresa) {
        footerEmpresa.textContent = empresa;
        console.log(`✅ footerEmpresa actualizado a: ${empresa}`);
    } else {
        console.error('❌ ERROR: No se encontró el elemento footerEmpresa en el HTML');
    }
    
    if (footerCuenta) {
        footerCuenta.textContent = cuentaNumero;
        console.log(`✅ footerCuenta actualizado a: ${cuentaNumero}`);
    } else {
        console.error('❌ ERROR: No se encontró el elemento footerCuenta en el HTML');
    }
}
