import './globals.css';

export const metadata = {
  title: 'PDF to Question Paper Generator',
  description: 'Generate customizable school question papers and answer keys directly from PDF textbook chapters using Gemini Flash.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-slate-50" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
