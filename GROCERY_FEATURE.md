# Grocery Aggregation and Budget-Aware Swap Feature

This document describes the new grocery aggregation and budget tracking features added to Jacob Planner.

## Overview

The grocery feature allows users to:
1. Automatically aggregate ingredient needs from their weekly meal plans
2. Get estimated costs based on store product prices
3. Compare against their weekly budget
4. Receive swap suggestions when over budget

## Components

### 1. CSV Seed Data (`data/store_products.csv`)

Contains 50 products from H-E-B and Costco with price estimates. This serves as the seed data for the `store_products` table.

### 2. Server-Side Libraries

#### `lib/supabaseClient.ts`
- `supabase` - Client-side Supabase client using anon key
- `createServiceClient()` - Server-side client with service role key for API routes

#### `lib/grocery.ts`
- `aggregateGroceryForWeek()` - Fetches weekly meal plans and aggregates ingredient quantities
- `estimateCost()` - Calculates total cost, prioritizing preferred stores
- `proposeSwaps()` - Suggests cheaper alternatives when over budget, respecting user ingredient likes

### 3. API Routes

#### `POST /api/import-store-csv`
Imports the CSV data from `data/store_products.csv` into the database:
- Creates stores if they don't exist
- Creates ingredients if they don't exist  
- Upserts store_products with price estimates
- Returns import statistics (imported, skipped, errors)

**Usage:**
```bash
curl -X POST http://localhost:3000/api/import-store-csv
```

#### `GET /api/generate-grocery`
Generates a grocery list for a specific week:

**Query Parameters:**
- `user_id` (optional) - User ID, defaults to `00000000-0000-0000-0000-000000000000`
- `week_start` (optional) - Week start date (YYYY-MM-DD), defaults to current week's Monday

**Response:**
```json
{
  "aggregated": [...],
  "total_cost": 45.67,
  "budget": 100,
  "over_budget": false,
  "swaps": [],
  "week_start": "2025-10-20"
}
```

**Usage:**
```bash
curl "http://localhost:3000/api/generate-grocery?week_start=2025-10-20"
```

### 4. UI Pages

#### `/grocery` - Grocery List Page
Displays:
- Weekly grocery list with aggregated ingredients
- Estimated cost per ingredient and total
- Budget comparison
- Swap suggestions when over budget
- Week selector to view different weeks

#### `/settings` - Settings Page (existing, updated)
Already exists in the repository. Allows users to:
- Set weekly budget
- Select preferred stores

## Database Schema

The feature uses these tables from `supabase/schema.sql`:
- `users` - User accounts
- `user_settings` - Weekly budget and preferred stores
- `stores` - Store information (H-E-B, Costco)
- `meals` - User's saved meals
- `ingredients` - Ingredient catalog
- `store_products` - Store-specific products with prices
- `meal_ingredients` - Ingredients per meal with quantities
- `weekly_plan` - Meal planning by day and slot
- `ingredient_likes` - User preferences (avoids swapping liked ingredients)

## Setup Instructions

### 1. Database Setup

Run the schema from `supabase/schema.sql` in your Supabase SQL editor. This creates:
- All required tables
- Default user (ID: `00000000-0000-0000-0000-000000000000`)
- Default settings (weekly_budget: $100)
- H-E-B and Costco store seeds
- Sample ingredients and products

### 2. Environment Variables

Create a `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important:** Keep the service role key secure. It's only used in API routes (server-side).

### 3. Install Dependencies

```bash
npm install
```

### 4. Import Store Products

Start the development server and import the CSV:

```bash
npm run dev
```

Then import the product data:

```bash
curl -X POST http://localhost:3000/api/import-store-csv
```

This will import all 50 products from `data/store_products.csv`.

### 5. Plan Some Meals

To see the grocery feature in action, you need to:
1. Add some meal plans to the `weekly_plan` table
2. Make sure meals have ingredients via `meal_ingredients`
3. Visit `/grocery` to see your aggregated list

You can add test data via SQL:

```sql
-- Example: Add a meal plan entry
INSERT INTO weekly_plan (user_id, week_start, day_of_week, meal_slot, meal_id)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '2025-10-20',
  0,
  'breakfast',
  'your-meal-id-here'
);
```

## Algorithm Details

### Cost Estimation

1. For each ingredient in the aggregated list:
   - Fetch all matching `store_products`
   - Sort by: preferred stores first, then lowest price
   - Select the best match
   - Add price to total

### Swap Proposals

When `total_cost > weekly_budget`:

1. Calculate deficit: `deficit = total_cost - budget`
2. For each ingredient (excluding liked ingredients):
   - Find all cheaper alternatives from any store
   - Calculate potential savings
3. Sort swaps by savings (descending)
4. Return swaps until cumulative savings >= deficit

### Constraints

- Swaps respect user preferences via `ingredient_likes` table
- Preferred stores are prioritized but not required
- Swaps are suggestions only (manual implementation for now)

## Testing

### Manual Testing Checklist

1. ✓ CSV import works and creates ingredients/stores
2. ✓ Grocery API returns aggregated list
3. ✓ Cost estimation includes all ingredients
4. ✓ Budget comparison works correctly
5. ✓ Swap proposals appear when over budget
6. ✓ Swaps respect ingredient likes
7. ✓ UI displays all data correctly

### Example Test Scenario

1. Set weekly budget to $50 in settings
2. Plan meals totaling > $50 in ingredients
3. Visit grocery page
4. Verify over-budget warning appears
5. Verify swap suggestions are shown
6. Verify swaps would reduce cost below budget

## Future Enhancements

- Automatic swap acceptance (update meal plans)
- Quantity aggregation math (handle "1 lb", "2 cups", etc.)
- Shopping list export (PDF, print)
- Store location-based sorting
- Price history tracking
- Recipe scaling based on servings
- Nutritional information alongside costs

## Troubleshooting

### Import fails
- Check that `data/store_products.csv` exists
- Verify Supabase service role key is set
- Check logs for specific error messages

### No grocery list shows
- Verify you have meals planned for the selected week
- Check that meals have ingredients linked
- Ensure store_products exist for those ingredients

### Costs are $0
- Run the CSV import to populate prices
- Verify store_products table has data
- Check ingredient_id matches between tables

### Swaps not appearing
- Verify total cost exceeds budget
- Check that cheaper alternatives exist for ingredients
- Ensure ingredients aren't in user's liked list
