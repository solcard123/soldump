import React, { createContext, useContext } from 'react';
import { useAppKit } from '@reown/appkit/react';

// Simplified context that only exposes the function to open the AppKit modal
const WalletModalContext = createContext({
  openWalletModal: () => {},
});

export const useWalletModal = () => {
  const { open } = useAppKit();
  
  return {
    setVisible: (visible) => {
      if (visible) {
        open();
      }
    }
  };
};

/**
 * Provider de wallet basado en AppKit/Reown
 * Usa directamente el modal nativo de AppKit sin modal personalizado
 */
export const AppKitWalletProvider = ({ children }) => {
  const { open } = useAppKit();

  return (
    <WalletModalContext.Provider value={{ openWalletModal: open }}>
      {children}
    </WalletModalContext.Provider>
  );
};
