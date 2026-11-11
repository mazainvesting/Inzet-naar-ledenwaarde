import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Ledenwaarde | Persoonlijke werkruimte',description:'Van ledenprobleem naar aantoonbare bijdrage. Dossiers, metingen, draagvlak en actualiteit op één plek.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="nl"><body>{children}</body></html>}
