import './globals.css';
import { Inter } from 'next/font/google';
import { InitializationLoader } from './components/InitializationLoader';
import { metadata, viewport } from './metadata';

const inter = Inter({ subsets: ['latin'] });

export { metadata, viewport };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 text-white`}>
        <InitializationLoader />
        {children}
      </body>
    </html>
  );
}
