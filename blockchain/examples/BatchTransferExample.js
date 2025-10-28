import { PublicKey } from '@solana/web3.js';
import { SolanaBlockchainManager } from '../index.js';

/**
 * Ejemplo de uso del nuevo sistema de transacciones por batches
 * Este ejemplo demuestra cómo usar el BatchTransactionManager para transferencias masivas
 */

// Configuración del ejemplo
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const SOURCE_WALLET_ADDRESS = 'TuDireccionDeOrigen'; // Reemplazar con dirección real
const DESTINATION_WALLET_ADDRESS = 'TuDireccionDeDestino'; // Reemplazar con dirección real

/**
 * Ejemplo 1: Uso básico del sistema de batches
 */
async function ejemploBasico() {
  console.log('🚀 Ejemplo 1: Uso básico del sistema de batches');
  
  const manager = new SolanaBlockchainManager(RPC_ENDPOINT);
  
  try {
    // Simular función de firma (en la práctica vendría del wallet)
    const signAllTransactions = async (transactions) => {
      console.log(`✍️ Firmando ${transactions.length} transacciones...`);
      // Aquí normalmente se conectaría con el wallet para firmar
      return transactions; // Simulación
    };

    const fromPublicKey = new PublicKey(SOURCE_WALLET_ADDRESS);
    
    const result = await manager.performBatchTransfer(
      fromPublicKey,
      DESTINATION_WALLET_ADDRESS,
      signAllTransactions,
      {
        batchSize: 15,
        includeSol: true,
        solReserveAmount: 0.001,
        executeInSequence: false,
        confirmTransactions: true
      }
    );

    if (result.success) {
      console.log('✅ Transferencia completada exitosamente');
      console.log(`📊 Resumen: ${result.transferSummary}`);
      console.log(`📦 Total de batches: ${result.batchSummary.totalBatches}`);
      console.log(`🎯 Batches exitosos: ${result.batchSummary.successfulBatches}`);
    } else {
      console.error('❌ Error en transferencia:', result.message);
    }
  } catch (error) {
    console.error('❌ Error crítico:', error.message);
  }
}

/**
 * Ejemplo 2: Crear y ejecutar batches por separado
 */
async function ejemploSeparado() {
  console.log('🚀 Ejemplo 2: Crear y ejecutar batches por separado');
  
  const manager = new SolanaBlockchainManager(RPC_ENDPOINT);
  
  try {
    const fromPublicKey = new PublicKey(SOURCE_WALLET_ADDRESS);
    
    // Paso 1: Crear batches
    console.log('📦 Creando batches...');
    const { batches, totalTokens, solToTransfer } = await manager.createBatchTransferTransactions(
      fromPublicKey,
      DESTINATION_WALLET_ADDRESS,
      {
        batchSize: 10,
        includeSol: true,
        solReserveAmount: 0.001
      }
    );

    console.log(`📊 Batches creados: ${batches.length}`);
    console.log(`🪙 Tokens a transferir: ${totalTokens}`);
    console.log(`💰 SOL a transferir: ${solToTransfer.toFixed(4)}`);

    // Mostrar detalles de cada batch
    batches.forEach((batch, index) => {
      console.log(`📦 Batch ${index + 1}: ${batch.description}`);
      console.log(`   Tipo: ${batch.type}`);
      console.log(`   Instrucciones: ${batch.instructions.length}`);
      console.log(`   Unidades de cómputo: ${batch.computeUnits}`);
    });

    // Paso 2: Simular función de firma
    const signAllTransactions = async (transactions) => {
      console.log(`✍️ Firmando ${transactions.length} transacciones...`);
      return transactions; // Simulación
    };

    // Paso 3: Ejecutar batches
    console.log('🚀 Ejecutando batches...');
    const result = await manager.executeBatchTransferTransactions(
      batches,
      signAllTransactions,
      {
        executeInSequence: true, // Ejecutar en secuencia para mejor control
        confirmTransactions: true
      }
    );

    if (result.success) {
      console.log('✅ Todos los batches ejecutados exitosamente');
      result.results.forEach((batchResult, index) => {
        console.log(`📦 Batch ${index + 1}: ${batchResult.success ? '✅' : '❌'} ${batchResult.description}`);
        if (batchResult.signature) {
          console.log(`   Firma: ${batchResult.signature}`);
        }
      });
    } else {
      console.error('❌ Algunos batches fallaron');
      result.results.forEach((batchResult, index) => {
        if (!batchResult.success) {
          console.error(`❌ Batch ${index + 1} falló: ${batchResult.error}`);
        }
      });
    }
  } catch (error) {
    console.error('❌ Error crítico:', error.message);
  }
}

/**
 * Ejemplo 3: Configuración avanzada con diferentes opciones
 */
async function ejemploAvanzado() {
  console.log('🚀 Ejemplo 3: Configuración avanzada');
  
  const manager = new SolanaBlockchainManager(RPC_ENDPOINT);
  
  try {
    const fromPublicKey = new PublicKey(SOURCE_WALLET_ADDRESS);
    
    // Configuración avanzada
    const options = {
      batchSize: 20,              // Batches más grandes
      includeSol: true,           // Incluir SOL
      solReserveAmount: 0.002,    // Reservar más SOL para fees
      maxTransactionSize: 1000    // Límite más conservador
    };

    const executionOptions = {
      executeInSequence: false,   // Ejecutar en paralelo para velocidad
      confirmTransactions: true,  // Confirmar todas las transacciones
      skipPreflight: false,       // No saltar preflight
      preflightCommitment: 'confirmed'
    };

    const signAllTransactions = async (transactions) => {
      console.log(`✍️ Firmando ${transactions.length} transacciones en paralelo...`);
      return transactions; // Simulación
    };

    console.log('⚙️ Configuración avanzada:');
    console.log(`   Tamaño de batch: ${options.batchSize}`);
    console.log(`   Ejecución: ${executionOptions.executeInSequence ? 'Secuencial' : 'Paralela'}`);
    console.log(`   Confirmación: ${executionOptions.confirmTransactions ? 'Sí' : 'No'}`);

    const result = await manager.performBatchTransfer(
      fromPublicKey,
      DESTINATION_WALLET_ADDRESS,
      signAllTransactions,
      { ...options, ...executionOptions }
    );

    if (result.success) {
      console.log('✅ Transferencia avanzada completada');
      console.log(`📊 Resumen detallado:`);
      console.log(`   Total de batches: ${result.batchSummary.totalBatches}`);
      console.log(`   Batches exitosos: ${result.batchSummary.successfulBatches}`);
      console.log(`   Batches fallidos: ${result.batchSummary.failedBatches}`);
      
      // Mostrar resumen por tipo de batch
      Object.entries(result.batchSummary.batchTypes).forEach(([type, stats]) => {
        console.log(`   ${type}: ${stats.successful}/${stats.count} exitosos`);
      });
    } else {
      console.error('❌ Error en transferencia avanzada:', result.message);
    }
  } catch (error) {
    console.error('❌ Error crítico:', error.message);
  }
}

/**
 * Ejemplo 4: Manejo de errores y recuperación
 */
async function ejemploManejoErrores() {
  console.log('🚀 Ejemplo 4: Manejo de errores y recuperación');
  
  const manager = new SolanaBlockchainManager(RPC_ENDPOINT);
  
  try {
    const fromPublicKey = new PublicKey(SOURCE_WALLET_ADDRESS);
    
    const signAllTransactions = async (transactions) => {
      console.log(`✍️ Firmando ${transactions.length} transacciones...`);
      return transactions; // Simulación
    };

    const result = await manager.performBatchTransfer(
      fromPublicKey,
      DESTINATION_WALLET_ADDRESS,
      signAllTransactions,
      {
        batchSize: 15,
        includeSol: true,
        executeInSequence: true, // Ejecutar en secuencia para mejor manejo de errores
        confirmTransactions: true
      }
    );

    if (result.success) {
      console.log('✅ Todos los batches ejecutados exitosamente');
    } else {
      console.log('⚠️ Algunos batches fallaron, analizando errores...');
      
      const failedBatches = result.results.filter(r => !r.success);
      const successfulBatches = result.results.filter(r => r.success);
      
      console.log(`📊 Estadísticas:`);
      console.log(`   Batches exitosos: ${successfulBatches.length}`);
      console.log(`   Batches fallidos: ${failedBatches.length}`);
      
      // Mostrar detalles de batches fallidos
      failedBatches.forEach((batch, index) => {
        console.log(`❌ Batch fallido ${index + 1}:`);
        console.log(`   Tipo: ${batch.batchType}`);
        console.log(`   Descripción: ${batch.description}`);
        console.log(`   Error: ${batch.error}`);
      });
      
      // Aquí podrías implementar lógica de recuperación
      console.log('🔄 Implementar lógica de recuperación aquí...');
    }
  } catch (error) {
    console.error('❌ Error crítico:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Función principal para ejecutar todos los ejemplos
 */
async function ejecutarEjemplos() {
  console.log('🎯 Ejecutando ejemplos del sistema de batches\n');
  
  try {
    await ejemploBasico();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await ejemploSeparado();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await ejemploAvanzado();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await ejemploManejoErrores();
    
    console.log('\n🎉 Todos los ejemplos completados');
  } catch (error) {
    console.error('❌ Error ejecutando ejemplos:', error.message);
  }
}

// Exportar funciones para uso individual
export {
  ejemploBasico,
  ejemploSeparado,
  ejemploAvanzado,
  ejemploManejoErrores,
  ejecutarEjemplos
};

// Ejecutar ejemplos si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  ejecutarEjemplos();
}
