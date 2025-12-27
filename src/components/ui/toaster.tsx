'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        className: 'bg-gray-900 border-gray-800 text-white',
        descriptionClassName: 'text-gray-400',
      }}
      theme="dark"
    />
  );
}
