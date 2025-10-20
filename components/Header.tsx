import React from 'react';
import Link from 'next/link';

export default function Header() {
  return (
    <header style={{
      padding: '16px',
      backgroundColor: '#f0f0f0',
      borderBottom: '1px solid #ccc',
      marginBottom: '16px'
    }}>
      <nav style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none', fontWeight: 'bold', fontSize: '18px', color: '#333' }}>
          Jacob Planner
        </Link>
        <Link href="/grocery" style={{ textDecoration: 'none', color: '#0070f3' }}>
          Grocery
        </Link>
        <Link href="/settings" style={{ textDecoration: 'none', color: '#0070f3' }}>
          Settings
        </Link>
      </nav>
    </header>
  );
}
