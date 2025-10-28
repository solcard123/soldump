# Guía de Transacciones por Batches

## Descripción General

El nuevo sistema de `BatchTransactionManager` separa las transacciones de envío de tokens en batches lógicos que se firman juntos pero se ejecutan por separado. **Cada token tiene su propio batch individual** con sus 3 operaciones (crear, transferir, cerrar), lo que mejora la eficiencia y organización de las transferencias masivas.

## Características Principales

### 1. Separación por Token Individual
- **Batches Individuales de Tokens**: Cada token tiene su propio batch completo con sus 3 operaciones (crear, transferir, cerrar)
- **Batch de Transferencia de SOL**: Maneja la transferencia de SOL por separado

### 2. Firma Conjunta, Ejecución Separada
- Todas las transacciones se firman de una vez para mejor UX
- Se ejecutan por separado para mejor control y manejo de errores
- Opción de ejecución en secuencia o paralela

### 3. Optimización de Recursos
- Cálculo dinámico de unidades de cómputo
- Validación de tamaño de transacciones
- Manejo inteligente de límites de batch

## Uso Básico

### Importación
```javascript
import { BatchTransactionManager, SolanaBlockchainManager } from './blockchain/index.js';
```

### Crear Instancia
```javascript
const client = new SolanaClient('https://api.mainnet-beta.solana.com');
const batchManager = new BatchTransactionManager(client);
```

### Opción 1: Uso Directo del BatchTransactionManager
```javascript
// Crear batches
const { batches, totalTokens, solToTransfer } = await batchManager.createBatchTransactions(
  fromPublicKey,
  destinationAddress,
  {
    batchSize: 15,
    includeSol: true,
    solReserveAmount: 0.001
  }
);

// Ejecutar batches
const result = await batchManager.executeBatchTransactions(
  batches,
  signAllTransactions,
  {
    executeInSequence: false, // true para ejecutar en secuencia
    confirmTransactions: true
  }
);
```

### Opción 2: Uso a través de BulkTransferService
```javascript
const bulkService = new BulkTransferService(client);

// Método completo
const result = await bulkService.performBatchTransfer(
  fromPublicKey,
  destinationAddress,
  signAllTransactions,
  {
    batchSize: 15,
    includeSol: true,
    executeInSequence: false
  }
);
```

### Opción 3: Uso a través de SolanaBlockchainManager
```javascript
const manager = new SolanaBlockchainManager('https://api.mainnet-beta.solana.com');

const result = await manager.performBatchTransfer(
  fromPublicKey,
  destinationAddress,
  signAllTransactions,
  {
    batchSize: 15,
    includeSol: true
  }
);
```

## Opciones de Configuración

### Opciones de Creación de Batches
```javascript
const options = {
  batchSize: 15,              // Número máximo de operaciones por batch
  includeSol: true,           // Incluir transferencia de SOL
  solReserveAmount: 0.001,    // SOL a reservar para fees
  maxTransactionSize: 1200    // Tamaño máximo de transacción
};
```

### Opciones de Ejecución
```javascript
const executionOptions = {
  executeInSequence: false,   // true = secuencial, false = paralelo
  confirmTransactions: true,  // Confirmar transacciones
  skipPreflight: false,       // Saltar preflight
  preflightCommitment: 'confirmed'
};
```

## Estructura de Resultados

### Resultado de Creación de Batches
```javascript
{
  batches: [
    {
      type: 'individual_token',
      transaction: VersionedTransaction,
      instructions: [...],
      accountsProcessed: 1,
      computeUnits: 15000,
      batchIndex: 0,
      mint: 'Token1',
      description: 'Individual token batch: Token1 (create + transfer + close)'
    },
    {
      type: 'sol_transfer',
      transaction: VersionedTransaction,
      instructions: [],
      solAmount: 0.5,
      description: 'Transferencia de 0.5000 SOL'
    }
  ],
  totalTokens: 25,
  solToTransfer: 0.5,
  message: 'Created 26 batches for 25 tokens and 0.5000 SOL'
}
```

### Resultado de Ejecución
```javascript
{
  success: true,
  message: 'Ejecutados 3/3 batches exitosamente',
  results: [
    {
      batchIndex: 0,
      batchType: 'account_creation',
      success: true,
      signature: '5J7...',
      confirmationResult: {...},
      description: 'Creación de 10 cuentas asociadas de tokens'
    },
    // ... más resultados
  ],
  batchSummary: {
    totalBatches: 26,
    successfulBatches: 26,
    failedBatches: 0,
    batchTypes: {
      individual_token: { count: 25, successful: 25, failed: 0 },
      sol_transfer: { count: 1, successful: 1, failed: 0 }
    }
  }
}
```

## Ventajas del Sistema de Batches

### 1. Mejor Organización
- Operaciones agrupadas lógicamente
- Fácil identificación de problemas
- Mejor logging y debugging

### 2. Mayor Eficiencia
- Firma única de todas las transacciones
- Ejecución optimizada (secuencial o paralela)
- Mejor manejo de recursos

### 3. Mayor Control
- Posibilidad de ejecutar batches por separado
- Mejor manejo de errores
- Opciones de configuración flexibles

### 4. Mejor UX
- Una sola firma para todas las transacciones
- Progreso visible por batch
- Información detallada de resultados

## Manejo de Errores

### Errores de Creación de Batches
```javascript
try {
  const { batches } = await batchManager.createBatchTransactions(...);
} catch (error) {
  console.error('Error creando batches:', error.message);
}
```

### Errores de Ejecución
```javascript
const result = await batchManager.executeBatchTransactions(...);

if (!result.success) {
  console.error('Algunos batches fallaron:', result.results.filter(r => !r.success));
}
```

## Comparación con Sistema Anterior

| Característica | Sistema Anterior | Sistema de Batches |
|----------------|------------------|-------------------|
| Organización | Transacciones mixtas | Batches por tipo |
| Firma | Múltiples firmas | Una sola firma |
| Ejecución | Todo junto | Separada por batch |
| Control de Errores | Limitado | Granular por batch |
| Logging | Básico | Detallado por batch |
| Flexibilidad | Baja | Alta |

## Migración

Para migrar del sistema anterior al nuevo sistema de batches:

1. **Reemplazar llamadas existentes**:
   ```javascript
   // Antes
   const result = await bulkService.performBulkTransfer(...);
   
   // Después
   const result = await bulkService.performBatchTransfer(...);
   ```

2. **Actualizar manejo de resultados**:
   ```javascript
   // El resultado ahora incluye información de batches
   console.log('Batches ejecutados:', result.batchSummary.totalBatches);
   ```

3. **Configurar opciones según necesidades**:
   ```javascript
   const options = {
     batchSize: 15,           // Ajustar según necesidades
     executeInSequence: false // true para mayor control, false para velocidad
   };
   ```

## Mejores Prácticas

1. **Tamaño de Batch**: Usar 10-20 operaciones por batch para balance óptimo
2. **Ejecución**: Usar paralela para velocidad, secuencial para control
3. **Confirmación**: Siempre confirmar transacciones importantes
4. **Manejo de Errores**: Revisar resultados de cada batch
5. **Logging**: Usar el sistema de logging integrado para debugging

## Ejemplo Completo

```javascript
import { SolanaBlockchainManager } from './blockchain/index.js';

async function performBatchTransfer() {
  const manager = new SolanaBlockchainManager('https://api.mainnet-beta.solana.com');
  
  try {
    const result = await manager.performBatchTransfer(
      fromPublicKey,
      destinationAddress,
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
      console.log(`📦 Batches: ${result.batchSummary.totalBatches}`);
    } else {
      console.error('❌ Error en transferencia:', result.message);
    }
  } catch (error) {
    console.error('❌ Error crítico:', error.message);
  }
}
```
