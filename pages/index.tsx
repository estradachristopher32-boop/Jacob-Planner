import React from 'react';
import Header from '../components/Header';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      <Header />
      <main style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
        <h1>Welcome to Jacob Planner</h1>
        <p>Your personal meal planning and grocery budgeting assistant.</p>
        
        <div style={{ marginTop: 32 }}>
          <h2>Features</h2>
          <ul>
            <li>
              <Link href="/grocery">
                <strong>Grocery List</strong>
              </Link> - View your weekly grocery needs with cost estimates and budget tracking
            </li>
            <li>
              <Link href="/settings">
                <strong>Settings</strong>
              </Link> - Set your weekly budget and preferred stores
            </li>
          </ul>
        </div>

        <div style={{ 
          marginTop: 32, 
          padding: 16, 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6',
          borderRadius: 4
        }}>
          <h3>Getting Started</h3>
          <ol>
            <li>Configure your Supabase credentials in the <code>.env.local</code> file</li>
            <li>Run the database schema from <code>supabase/schema.sql</code></li>
            <li>Import store products using the API: <code>POST /api/import-store-csv</code></li>
            <li>Plan your meals and check your grocery list</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
