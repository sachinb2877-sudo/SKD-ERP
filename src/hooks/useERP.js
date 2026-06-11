import { useContext } from 'react';
import { ERPContext } from '../context/ERPContext.jsx';

export function useERP() {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an <ERPProvider>. Wrap your app in <ERPProvider>.');
  }
  return context;
}
