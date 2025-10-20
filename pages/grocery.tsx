import React, { useEffect, useState } from 'react';
import Header from '../components/Header';

interface AggregatedIngredient {
  ingredient_id: string;
  ingredient_name: string;
  total_quantity: string;
  quantities: { meal: string; quantity: string; meal_id: string }[];
  best_price?: number;
  best_store?: string;
  best_product?: string;
}

interface SwapProposal {
  ingredient_id: string;
  ingredient_name: string;
  current_price: number;
  current_store: string;
  proposed_price: number;
  proposed_store: string;
  proposed_product: string;
  savings: number;
}

interface GroceryData {
  aggregated: AggregatedIngredient[];
  total_cost: number;
  budget: number;
  over_budget: boolean;
  swaps: SwapProposal[];
  week_start?: string;
  message?: string;
}

const defaultUserId = '00000000-0000-0000-0000-000000000000';

export default function GroceryPage() {
  const [groceryData, setGroceryData] = useState<GroceryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<string>('');

  // Calculate current week's Monday
  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Get Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    setWeekStart(monday.toISOString().split('T')[0]);
  }, []);

  const loadGroceryList = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/generate-grocery?user_id=${defaultUserId}&week_start=${weekStart}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load grocery list');
      }

      const data = await response.json();
      setGroceryData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (weekStart) {
      loadGroceryList();
    }
  }, [weekStart]);

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  return (
    <div>
      <Header />
      <main style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
        <h2>Weekly Grocery List</h2>
        
        <div style={{ marginBottom: 16 }}>
          <label>Week starting: </label>
          <input 
            type="date" 
            value={weekStart} 
            onChange={(e) => setWeekStart(e.target.value)}
            style={{ marginRight: 8 }}
          />
          <button onClick={loadGroceryList} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div style={{ padding: 16, backgroundColor: '#fee', border: '1px solid #fcc', marginBottom: 16 }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {groceryData && (
          <>
            <div style={{ 
              padding: 16, 
              backgroundColor: groceryData.over_budget ? '#fff3cd' : '#d1ecf1', 
              border: `1px solid ${groceryData.over_budget ? '#ffc107' : '#bee5eb'}`,
              marginBottom: 16 
            }}>
              <h3>Budget Summary</h3>
              <p><strong>Total Estimated Cost:</strong> {formatPrice(groceryData.total_cost)}</p>
              <p><strong>Weekly Budget:</strong> {formatPrice(groceryData.budget)}</p>
              {groceryData.over_budget && (
                <p style={{ color: '#856404' }}>
                  <strong>⚠️ Over budget by {formatPrice(groceryData.total_cost - groceryData.budget)}</strong>
                </p>
              )}
              {!groceryData.over_budget && groceryData.total_cost > 0 && (
                <p style={{ color: '#0c5460' }}>
                  <strong>✓ Within budget! Remaining: {formatPrice(groceryData.budget - groceryData.total_cost)}</strong>
                </p>
              )}
            </div>

            {groceryData.message && (
              <div style={{ padding: 16, backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', marginBottom: 16 }}>
                {groceryData.message}
              </div>
            )}

            {groceryData.aggregated.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h3>Grocery List</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: 8, textAlign: 'left', border: '1px solid #dee2e6' }}>Ingredient</th>
                      <th style={{ padding: 8, textAlign: 'left', border: '1px solid #dee2e6' }}>Quantity</th>
                      <th style={{ padding: 8, textAlign: 'left', border: '1px solid #dee2e6' }}>Best Price</th>
                      <th style={{ padding: 8, textAlign: 'left', border: '1px solid #dee2e6' }}>Store</th>
                      <th style={{ padding: 8, textAlign: 'left', border: '1px solid #dee2e6' }}>Product</th>
                      <th style={{ padding: 8, textAlign: 'left', border: '1px solid #dee2e6' }}>Used In</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groceryData.aggregated.map((item) => (
                      <tr key={item.ingredient_id}>
                        <td style={{ padding: 8, border: '1px solid #dee2e6' }}>{item.ingredient_name}</td>
                        <td style={{ padding: 8, border: '1px solid #dee2e6' }}>{item.total_quantity}</td>
                        <td style={{ padding: 8, border: '1px solid #dee2e6' }}>{formatPrice(item.best_price)}</td>
                        <td style={{ padding: 8, border: '1px solid #dee2e6' }}>{item.best_store}</td>
                        <td style={{ padding: 8, border: '1px solid #dee2e6' }}>{item.best_product}</td>
                        <td style={{ padding: 8, border: '1px solid #dee2e6' }}>
                          {item.quantities.map(q => q.meal).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {groceryData.swaps.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h3>Suggested Swaps to Meet Budget</h3>
                <p style={{ marginBottom: 16, color: '#666' }}>
                  These swaps could help you stay within your budget. Consider switching to these alternatives:
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: 8, textAlign: 'left', border: '1px solid #dee2e6' }}>Ingredient</th>
                      <th style={{ padding: 8, textAlign: 'left', border: '1px solid #dee2e6' }}>Current</th>
                      <th style={{ padding: 8, textAlign: 'left', border: '1px solid #dee2e6' }}>Proposed</th>
                      <th style={{ padding: 8, textAlign: 'left', border: '1px solid #dee2e6' }}>Savings</th>
                      <th style={{ padding: 8, textAlign: 'left', border: '1px solid #dee2e6' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groceryData.swaps.map((swap, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: 8, border: '1px solid #dee2e6' }}>{swap.ingredient_name}</td>
                        <td style={{ padding: 8, border: '1px solid #dee2e6' }}>
                          {formatPrice(swap.current_price)} at {swap.current_store}
                        </td>
                        <td style={{ padding: 8, border: '1px solid #dee2e6' }}>
                          {formatPrice(swap.proposed_price)} at {swap.proposed_store}
                          <br />
                          <small style={{ color: '#666' }}>{swap.proposed_product}</small>
                        </td>
                        <td style={{ padding: 8, border: '1px solid #dee2e6', color: '#28a745', fontWeight: 'bold' }}>
                          {formatPrice(swap.savings)}
                        </td>
                        <td style={{ padding: 8, border: '1px solid #dee2e6' }}>
                          <button 
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '12px',
                              cursor: 'not-allowed',
                              opacity: 0.6
                            }}
                            disabled
                            title="Manual swap - update your meal plan to use this alternative"
                          >
                            Accept (Manual)
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ marginTop: 16, fontSize: '14px', color: '#666' }}>
                  Note: Swap acceptance is currently manual. Review these suggestions and update your meal plans 
                  or shopping preferences accordingly.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
