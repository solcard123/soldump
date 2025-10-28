'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// Simplified context that only exposes the function to open the AppKit modal
const WalletModalContext = createContext({
  openWalletModal: () => {},
});

// Variable global para rastrear si AppKit ya fue inicializado
let appKitInstance = null;

export const useWalletModal = () => {
  return {
    setVisible: (visible) => {
      if (visible && appKitInstance) {
        appKitInstance.open();
      }
    }
  };
};

/**
 * Provider de wallet basado en AppKit/Reown
 * Inicializa AppKit solo en el cliente y usa el modal nativo
 */
export const AppKitWalletProvider = ({ children }) => {
  const [appKitInitialized, setAppKitInitialized] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Marcar que estamos en el cliente
    setIsClient(true);
    
    // Inicializar AppKit solo en el cliente
    if (!appKitInitialized && !appKitInstance) {
      // Importar dinámicamente el archivo de configuración de AppKit
      import('@/blockchain/config/appkit.js')
        .then(() => {
          // Pequeño delay para asegurar que AppKit esté completamente inicializado
          setTimeout(() => {
            setAppKitInitialized(true);
          }, 100);
        })
        .catch(error => {
          console.error('Error initializing AppKit:', error);
        });
    } else if (appKitInstance) {
      setAppKitInitialized(true);
    }
  }, []);

  // Para SSR, renderizar children sin el wrapper
  if (!isClient) {
    return <>{children}</>;
  }

  // Para el cliente, esperar a que AppKit esté listo
  if (!appKitInitialized) {
    return <>{children}</>;
  }

  return (
    <WalletModalContextWrapper>
      {children}
    </WalletModalContextWrapper>
  );
};

// Componente separado que usa useAppKit después de la inicialización
const WalletModalContextWrapper = ({ children }) => {
  const [appKit, setAppKit] = useState(null);

  useEffect(() => {
    // Importar useAppKit dinámicamente después de que AppKit esté inicializado
    import('@reown/appkit/react')
      .then((module) => {
        try {
          const { useAppKit } = module;
          // Guardar la referencia al hook
          setAppKit({ useHook: useAppKit });
        } catch (error) {
          console.error('Error loading AppKit hook:', error);
        }
      })
      .catch(error => {
        console.error('Error importing AppKit:', error);
      });
  }, []);

  // Función para abrir el modal
  const openWalletModal = () => {
    if (typeof window !== 'undefined') {
      // Intentar abrir el modal directamente
      try {
        const modal = document.querySelector('w3m-modal') || document.querySelector('wcm-modal');
        if (modal && modal.open) {
          modal.open();
        }
      } catch (error) {
        console.error('Error opening wallet modal:', error);
      }
    }
  };

  return (
    <WalletModalContext.Provider value={{ openWalletModal }}>
      {children}
    </WalletModalContext.Provider>
  );
};
