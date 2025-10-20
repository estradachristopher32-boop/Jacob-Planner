import type { NextApiRequest, NextApiResponse } from 'next';
import { createServiceClient } from '../../lib/supabaseClient';
import fs from 'fs';
import path from 'path';

interface CSVRow {
  sku: string;
  store: string;
  category: string;
  item_name: string;
  unit_size: string;
  approx_price: string;
  notes: string;
}

function parsePrice(priceStr: string): number {
  // Extract numeric value from price string like "$4.99/lb (≈$9.98)" or "$15.00 est."
  const match = priceStr.match(/\$([0-9.]+)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0;
}

function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(',');
    
    if (values.length === headers.length) {
      rows.push({
        sku: values[0]?.trim() || '',
        store: values[1]?.trim() || '',
        category: values[2]?.trim() || '',
        item_name: values[3]?.trim() || '',
        unit_size: values[4]?.trim() || '',
        approx_price: values[5]?.trim() || '',
        notes: values[6]?.trim() || ''
      });
    }
  }

  return rows;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create service client for server-side queries
    const supabase = createServiceClient();

    // Read CSV from data directory
    const csvPath = path.join(process.cwd(), 'data', 'store_products.csv');
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'CSV file not found at data/store_products.csv' });
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);

    console.log(`Parsed ${rows.length} rows from CSV`);

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Map to track store names to IDs
    const storeMap = new Map<string, string>();

    // Fetch existing stores
    const { data: existingStores } = await supabase.from('stores').select('id, name');
    if (existingStores) {
      for (const store of existingStores) {
        storeMap.set(store.name, store.id);
      }
    }

    // Map to track ingredient names to IDs
    const ingredientMap = new Map<string, string>();

    // Fetch existing ingredients
    const { data: existingIngredients } = await supabase.from('ingredients').select('id, name');
    if (existingIngredients) {
      for (const ingredient of existingIngredients) {
        ingredientMap.set(ingredient.name.toLowerCase(), ingredient.id);
      }
    }

    for (const row of rows) {
      try {
        // Normalize store name
        let storeName = row.store;
        if (storeName === 'H-E-B') {
          storeName = 'HEB - S Fry Rd (Katy)';
        } else if (storeName === 'Costco') {
          storeName = 'Costco (nearest)';
        } else if (storeName === 'H-E-B or Costco') {
          // For dual store items, default to H-E-B
          storeName = 'HEB - S Fry Rd (Katy)';
        }

        // Get or create store
        let storeId = storeMap.get(storeName);
        if (!storeId) {
          const { data: newStore, error: storeError } = await supabase
            .from('stores')
            .insert({ name: storeName, address: `Imported from CSV - ${row.store}` })
            .select('id')
            .single();

          if (storeError || !newStore) {
            errors.push(`Failed to create store ${storeName}: ${storeError?.message}`);
            skippedCount++;
            continue;
          }
          storeId = newStore.id;
          storeMap.set(storeName, storeId);
        }

        // Get or create ingredient
        const ingredientName = row.item_name;
        const ingredientKey = ingredientName.toLowerCase();
        let ingredientId = ingredientMap.get(ingredientKey);

        if (!ingredientId) {
          const { data: newIngredient, error: ingredientError } = await supabase
            .from('ingredients')
            .insert({ name: ingredientName, default_qty: row.unit_size })
            .select('id')
            .single();

          if (ingredientError || !newIngredient) {
            errors.push(`Failed to create ingredient ${ingredientName}: ${ingredientError?.message}`);
            skippedCount++;
            continue;
          }
          ingredientId = newIngredient.id;
          ingredientMap.set(ingredientKey, ingredientId);
        }

        // Parse price
        const price = parsePrice(row.approx_price);

        // Insert or update store_product
        const { error: productError } = await supabase
          .from('store_products')
          .upsert({
            ingredient_id: ingredientId,
            store_id: storeId,
            product_name: ingredientName,
            brand: row.category, // Using category as brand for now
            price_estimate: price
          }, {
            onConflict: 'ingredient_id,store_id',
            ignoreDuplicates: false
          });

        if (productError) {
          errors.push(`Failed to import ${row.sku} (${ingredientName}): ${productError.message}`);
          skippedCount++;
        } else {
          importedCount++;
        }

      } catch (err: any) {
        errors.push(`Error processing row ${row.sku}: ${err.message}`);
        skippedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      total: rows.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : [] // Return first 10 errors
    });

  } catch (error: any) {
    console.error('Error importing CSV:', error);
    return res.status(500).json({ 
      error: 'Failed to import CSV',
      details: error.message
    });
  }
}
