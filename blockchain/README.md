# Blockchain Module

Este módulo proporciona una interfaz completa para interactuar con la blockchain de Solana, incluyendo transferencias masivas de tokens SPL y SOL con un nuevo sistema de **transacciones por batches**.

## 🚀 Características Principales

- **🔄 Sistema de Batches**: Transacciones organizadas por tipo de operación
- **✍️ Firma Conjunta**: Todas las transacciones se firman de una vez
- **⚡ Ejecución Separada**: Batches se ejecutan por separado para mejor control
- **🪙 Transferencias masivas de tokens SPL**: Transfiere múltiples tokens eficientemente
- **💰 Transferencias de SOL**: Incluye transferencias de SOL nativo
- **🏗️ Gestión de cuentas**: Creación y cierre automático de cuentas de tokens
- **🎯 Optimización de transacciones**: Agrupa operaciones para máxima eficiencia
- **🛡️ Manejo de errores robusto**: Recuperación automática y logging detallado

## 📁 Estructura del Módulo

```
blockchain/
├── SolanaClient.js              # Cliente principal de Solana
├── TokenManager.js              # Gestión de tokens SPL
├── TransactionBuilder.js        # Construcción de transacciones
├── BulkTransferService.js       # Servicio de transferencias masivas
├── BatchTransactionManager.js   # 🆕 Gestor de transacciones por batches
├── examples/
│   └── BatchTransferExample.js  # 🆕 Ejemplos de uso
├── BATCH_TRANSACTION_GUIDE.md   # 🆕 Guía detallada de batches
├── index.js                     # Exportaciones principales
└── README.md                   # Este archivo
```

## 🎯 Nuevo Sistema de Batches

### ¿Qué son los Batches?

Los batches son grupos lógicos de transacciones que se organizan por tipo de operación:

1. **🪙 Batches Individuales de Tokens**: Cada token tiene su propio batch completo con sus 3 operaciones (crear, transferir, cerrar)
2. **💰 Batch de Transferencia de SOL**: Maneja la transferencia de SOL por separado

### Ventajas del Sistema de Batches

- **🎯 Mejor Organización**: Operaciones agrupadas lógicamente
- **⚡ Mayor Eficiencia**: Firma única, ejecución optimizada
- **🎮 Mayor Control**: Ejecución secuencial o paralela
- **👤 Mejor UX**: Una sola firma para todas las transacciones
- **🐛 Mejor Debugging**: Logging detallado por batch

## 🚀 Uso Básico

### Importación
```javascript
import { SolanaBlockchainManager } from './blockchain/index.js';
```

### Configuración
```javascript
const manager = new SolanaBlockchainManager('https://api.mainnet-beta.solana.com');
```

### Transferencia Masiva con Batches (Recomendado)
```javascript
const result = await manager.performBatchTransfer(
  fromPublicKey,
  destinationAddress,
  signAllTransactions,
  {
    batchSize: 15,
    includeSol: true,
    solReserveAmount: 0.001,
    executeInSequence: false
  }
);
```

### Transferencia Masiva Tradicional (Compatibilidad)
```javascript
const result = await manager.performBulkTransfer(
  fromPublicKey,
  destinationAddress,
  signAllTransactions,
  {
    batchSize: 20,
    includeSol: true,
    solReserveAmount: 0.001
  }
);
```

## 📚 API Principal

### SolanaBlockchainManager

Clase principal que combina todos los servicios blockchain.

#### Métodos Principales

- `getAllTokenData(publicKey)`: Obtiene todos los tokens y balance SOL
- `performBatchTransfer(...)`: 🆕 Ejecuta transferencia masiva con batches
- `performBulkTransfer(...)`: Ejecuta transferencia masiva tradicional
- `createBatchTransferTransactions(...)`: 🆕 Crea batches de transacciones
- `executeBatchTransferTransactions(...)`: 🆕 Ejecuta batches de transacciones

### BatchTransactionManager 🆕

Gestor especializado en transacciones por batches.

#### Métodos Principales

- `createBatchTransactions(...)`: Crea batches organizados por tipo
- `executeBatchTransactions(...)`: Ejecuta batches con opciones flexibles
- `performBatchTransfer(...)`: Proceso completo de transferencia por batches

### BulkTransferService

Servicio especializado en transferencias masivas tradicionales.

#### Métodos Principales

- `createBulkTransferTransactions(...)`: Crea transacciones para transferencia masiva
- `executeBulkTransfer(...)`: Ejecuta transferencias masivas
- `performBulkTransfer(...)`: Proceso completo de transferencia masiva

### TokenManager

Gestión de tokens SPL.

#### Métodos Principales

- `getTokenAccounts(publicKey)`: Obtiene cuentas de tokens
- `getAllTokenData(publicKey)`: Obtiene todos los datos de tokens
- `createTransferInstruction(...)`: Crea instrucción de transferencia
- `closeTokenAccount(...)`: Cierra cuenta de token

### TransactionBuilder

Construcción y validación de transacciones.

#### Métodos Principales

- `buildTransaction(...)`: Construye transacción
- `validateTransactionSize(...)`: Valida tamaño de transacción
- `createComputeBudgetInstructions(...)`: Crea instrucciones de presupuesto

## ⚙️ Opciones de Configuración

### Opciones de Batches 🆕
```javascript
const batchOptions = {
  batchSize: 15,              // Número máximo de operaciones por batch
  includeSol: true,           // Incluir transferencia de SOL
  solReserveAmount: 0.001,    // SOL a reservar para fees
  maxTransactionSize: 1200    // Tamaño máximo de transacción
};
```

### Opciones de Ejecución de Batches 🆕
```javascript
const executionOptions = {
  executeInSequence: false,   // true = secuencial, false = paralelo
  confirmTransactions: true,  // Confirmar transacciones
  skipPreflight: false,       // Saltar preflight
  preflightCommitment: 'confirmed'
};
```

### Opciones de Transferencia Tradicional
```javascript
const options = {
  batchSize: 20,              // Número máximo de transferencias por transacción
  includeSol: true,           // Incluir transferencia de SOL
  solReserveAmount: 0.001,    // SOL a reservar para fees
  maxTransactionSize: 2000    // Tamaño máximo de transacción
};
```

## 📊 Estructura de Resultados

### Resultado de Batches 🆕
```javascript
{
  success: true,
  message: 'Ejecutados 3/3 batches exitosamente',
  batches: [
    {
      type: 'individual_token',
      description: 'Individual token batch: Token1 (create + transfer + close)',
      accountsProcessed: 1,
      batchIndex: 0,
      mint: 'Token1'
    },
    {
      type: 'sol_transfer',
      description: 'Transferencia de 0.5000 SOL',
      solAmount: 0.5
    }
  ],
  batchSummary: {
    totalBatches: 26,
    successfulBatches: 26,
    failedBatches: 0,
    batchTypes: {
      individual_token: { count: 25, successful: 25, failed: 0 },
      sol_transfer: { count: 1, successful: 1, failed: 0 }
    }
  },
  totalTokens: 25,
  solToTransfer: 0.5,
  transferSummary: '25 tokens and 0.5000 SOL'
}
```

## 🛡️ Manejo de Errores

### Manejo de Errores con Batches 🆕
```javascript
try {
  const result = await manager.performBatchTransfer(...);
  
  if (result.success) {
    console.log('✅ Todos los batches ejecutados exitosamente');
    console.log(`📊 Resumen: ${result.transferSummary}`);
  } else {
    console.log('⚠️ Algunos batches fallaron');
    
    const failedBatches = result.results.filter(r => !r.success);
    failedBatches.forEach((batch, index) => {
      console.error(`❌ Batch ${index + 1} falló: ${batch.error}`);
    });
  }
} catch (error) {
  console.error('❌ Error crítico:', error.message);
}
```

### Manejo de Errores Tradicional
```javascript
try {
  const result = await manager.performBulkTransfer(...);
  if (result.success) {
    console.log('Transferencia exitosa:', result.message);
  } else {
    console.error('Error en transferencia:', result.message);
  }
} catch (error) {
  console.error('Error crítico:', error.message);
}
```

## 📝 Logging

El módulo incluye logging detallado para debugging:

```javascript
// Los logs incluyen:
// - Información de batches creados
// - Detalles de cada tipo de batch
// - Progreso de ejecución por batch
// - Métricas de rendimiento
// - Información de tokens procesados
// - Resultados de ejecución
```

## 🎯 Ejemplos de Uso

### Ejemplo 1: Transferencia con Batches (Recomendado) 🆕
```javascript
import { SolanaBlockchainManager } from './blockchain/index.js';

const manager = new SolanaBlockchainManager('https://api.mainnet-beta.solana.com');

const result = await manager.performBatchTransfer(
  fromPublicKey,
  destinationAddress,
  signAllTransactions,
  {
    batchSize: 15,
    includeSol: true,
    executeInSequence: false
  }
);

console.log('Resultado:', result);
```

### Ejemplo 2: Crear y Ejecutar Batches por Separado 🆕
```javascript
// Crear batches
const { batches, totalTokens, solToTransfer } = await manager.createBatchTransferTransactions(
  fromPublicKey,
  destinationAddress,
  { batchSize: 10, includeSol: true }
);

console.log(`Batches creados: ${batches.length}`);

// Ejecutar batches
const result = await manager.executeBatchTransferTransactions(
  batches,
  signAllTransactions,
  { executeInSequence: true }
);
```

### Ejemplo 3: Transferencia Tradicional (Compatibilidad)
```javascript
const result = await manager.performBulkTransfer(
  fromPublicKey,
  destinationAddress,
  signAllTransactions,
  {
    batchSize: 20,
    includeSol: true
  }
);
```

### Ejemplo 4: Configuración Avanzada de Batches 🆕
```javascript
const result = await manager.performBatchTransfer(
  fromPublicKey,
  destinationAddress,
  signAllTransactions,
  {
    batchSize: 20,
    includeSol: true,
    solReserveAmount: 0.002,
    executeInSequence: false,  // Paralelo para velocidad
    confirmTransactions: true,
    skipPreflight: false
  }
);
```

## 📈 Consideraciones de Rendimiento

### Sistema de Batches 🆕
- **Tamaño de batch**: Usar 10-20 operaciones por batch para balance óptimo
- **Ejecución**: Paralela para velocidad, secuencial para control
- **Confirmación**: Confirmar transacciones para operaciones críticas
- **Fees**: Cálculo dinámico de unidades de cómputo

### Sistema Tradicional
- **Tamaño de batch**: Usar 15-25 transferencias por transacción para balance óptimo
- **Confirmación**: Confirmar transacciones para operaciones críticas
- **Fees**: El sistema calcula automáticamente los fees necesarios
- **Timeout**: Las transacciones tienen timeouts apropiados para la red

## 🔒 Seguridad

- **Validación**: Todas las direcciones y cantidades se validan
- **Firmas**: Requiere función de firma del wallet
- **Confirmación**: Opción de confirmar transacciones antes de considerarlas exitosas
- **Batches**: Firma única reduce exposición de claves privadas

## 🔄 Compatibilidad

- **Solana Web3.js**: Compatible con la última versión
- **SPL Token**: Compatible con tokens SPL estándar
- **Wallets**: Compatible con wallets que soporten `signAllTransactions`
- **API Existente**: Mantiene compatibilidad con código existente

## 🚀 Migración al Sistema de Batches

### Para Nuevos Proyectos
```javascript
// Usar el nuevo sistema de batches
const result = await manager.performBatchTransfer(...);
```

### Para Proyectos Existentes
```javascript
// El código existente sigue funcionando
const result = await manager.performBulkTransfer(...);

// Migrar gradualmente
const result = await manager.performBatchTransfer(...);
```

## 🐛 Troubleshooting

### Error: "Transaction too large"
- Reducir `batchSize` en las opciones
- Reducir `maxTransactionSize`

### Error: "Insufficient SOL for fees"
- Aumentar `solReserveAmount`
- Verificar balance SOL disponible

### Error: "Token account not found"
- Verificar que el token existe
- Verificar que la cuenta de token tiene balance

### Error: "Batch execution failed" 🆕
- Revisar logs de cada batch individual
- Considerar ejecutar en secuencia (`executeInSequence: true`)
- Verificar conectividad de red

## 📚 Documentación Adicional

- **[Guía de Batches](./BATCH_TRANSACTION_GUIDE.md)**: Guía detallada del sistema de batches
- **[Ejemplos](./examples/BatchTransferExample.js)**: Ejemplos completos de uso
- **[API Reference](./index.js)**: Referencia completa de la API

## 🤝 Contribución

Para contribuir al módulo:

1. Mantener compatibilidad con la API existente
2. Agregar tests para nuevas funcionalidades
3. Actualizar documentación
4. Seguir las convenciones de código existentes
5. Probar tanto el sistema de batches como el tradicional