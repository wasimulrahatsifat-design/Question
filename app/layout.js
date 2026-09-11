import './globals.css';

export const metadata = {
  title: 'PDF to Question Paper Generator',
  description: 'Generate customizable school question papers and answer keys directly from PDF textbook chapters using Gemini Flash.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.maateen.me/kalpurush/font.css" rel="stylesheet" />
      </head>
      <body className="antialiased bg-slate-50 font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
