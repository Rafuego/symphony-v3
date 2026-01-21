import './globals.css'

export const metadata = {
  title: 'Symphony by Interlude',
  description: 'Creative design engine for modern teams',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#F5F0EB] min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
