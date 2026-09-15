import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import ToastContainer from '@/components/ToastContainer';

export const metadata: Metadata = {
  title: 'RideShare — Urban Mobility & Ride Pooling',
  description: 'Full-stack ride-booking and carpooling web application.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-blue-600 selection:text-white"
        suppressHydrationWarning
      >
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <ToastContainer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
