import { SupabaseClient } from '@supabase/supabase-js';

export interface AggregatedIngredient {
  ingredient_id: string;
  ingredient_name: string;
  total_quantity: string;
  quantities: { meal: string; quantity: string; meal_id: string }[];
  best_price?: number;
  best_store?: string;
  best_product?: string;
}

export interface SwapProposal {
  ingredient_id: string;
  ingredient_name: string;
  current_price: number;
  current_store: string;
  proposed_price: number;
  proposed_store: string;
  proposed_product: string;
  savings: number;
}

/**
 * Aggregate grocery needs for a user for a specific week
 * Fetches weekly_plan -> meals -> meal_ingredients -> ingredients
 * Returns list of ingredients with aggregated quantities
 */
export async function aggregateGroceryForWeek(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string
): Promise<AggregatedIngredient[]> {
  // Fetch weekly plan for the user for the specific week
  const { data: weeklyPlan, error: planError } = await supabase
    .from('weekly_plan')
    .select(`
      id,
      meal_id,
      meal_slot,
      day_of_week,
      meals (
        id,
        name,
        meal_ingredients (
          ingredient_id,
          quantity,
          ingredients (
            id,
            name
          )
        )
      )
    `)
    .eq('user_id', userId)
    .eq('week_start', weekStart);

  if (planError) {
    console.error('Error fetching weekly plan:', planError);
    return [];
  }

  if (!weeklyPlan || weeklyPlan.length === 0) {
    return [];
  }

  // Aggregate ingredients by ingredient_id
  const ingredientMap = new Map<string, AggregatedIngredient>();

  for (const planItem of weeklyPlan) {
    const meal = (planItem as any).meals;
    if (!meal) continue;

    const mealIngredients = meal.meal_ingredients || [];
    for (const mi of mealIngredients) {
      const ingredient = mi.ingredients;
      if (!ingredient) continue;

      const ingredientId = ingredient.id;
      if (!ingredientMap.has(ingredientId)) {
        ingredientMap.set(ingredientId, {
          ingredient_id: ingredientId,
          ingredient_name: ingredient.name,
          total_quantity: mi.quantity || '1',
          quantities: []
        });
      }

      const agg = ingredientMap.get(ingredientId)!;
      agg.quantities.push({
        meal: meal.name,
        quantity: mi.quantity || '1',
        meal_id: meal.id
      });
    }
  }

  return Array.from(ingredientMap.values());
}

/**
 * Estimate total cost for aggregated grocery list
 * Looks up best matching store_products for each ingredient, prioritizing preferred stores
 * Returns total estimated cost
 */
export async function estimateCost(
  supabase: SupabaseClient,
  aggregatedList: AggregatedIngredient[],
  preferredStores: string[]
): Promise<{ total: number; updatedList: AggregatedIngredient[] }> {
  let total = 0;
  const updatedList: AggregatedIngredient[] = [];

  for (const item of aggregatedList) {
    // Fetch all store_products for this ingredient
    const { data: products, error } = await supabase
      .from('store_products')
      .select('id, store_id, product_name, price_estimate, stores(id, name)')
      .eq('ingredient_id', item.ingredient_id);

    if (error || !products || products.length === 0) {
      // No products found, skip or use default price of 0
      updatedList.push({ ...item, best_price: 0, best_store: 'Unknown', best_product: 'N/A' });
      continue;
    }

    // Sort products: preferred stores first, then by price
    const sortedProducts = products.sort((a, b) => {
      const aIsPreferred = preferredStores.includes(a.store_id);
      const bIsPreferred = preferredStores.includes(b.store_id);

      if (aIsPreferred && !bIsPreferred) return -1;
      if (!aIsPreferred && bIsPreferred) return 1;

      // Both preferred or both not preferred, sort by price
      return (a.price_estimate || 0) - (b.price_estimate || 0);
    });

    const bestProduct = sortedProducts[0];
    const price = bestProduct.price_estimate || 0;
    const store = (bestProduct as any).stores?.name || 'Unknown';

    total += price;
    updatedList.push({
      ...item,
      best_price: price,
      best_store: store,
      best_product: bestProduct.product_name || 'N/A'
    });
  }

  return { total, updatedList };
}

/**
 * Propose cheaper swaps when estimated cost exceeds budget
 * Finds alternate store_products that are cheaper
 * Avoids swapping ingredients the user dislikes (checks ingredient_likes)
 * Returns list of swap proposals sorted by potential savings
 */
export async function proposeSwaps(
  supabase: SupabaseClient,
  userId: string,
  aggregatedList: AggregatedIngredient[],
  preferredStores: string[],
  budget: number,
  currentTotal: number
): Promise<SwapProposal[]> {
  if (currentTotal <= budget) {
    return [];
  }

  // Fetch user ingredient likes to avoid swapping liked ingredients
  const { data: likes } = await supabase
    .from('ingredient_likes')
    .select('ingredient_id, score')
    .eq('user_id', userId);

  const likedIngredients = new Set<string>();
  if (likes) {
    for (const like of likes) {
      if (like.score > 0) {
        likedIngredients.add(like.ingredient_id);
      }
    }
  }

  const proposals: SwapProposal[] = [];

  for (const item of aggregatedList) {
    // Skip if user likes this ingredient
    if (likedIngredients.has(item.ingredient_id)) {
      continue;
    }

    // Skip if no current price
    if (!item.best_price || item.best_price === 0) {
      continue;
    }

    // Fetch all store_products for this ingredient
    const { data: products, error } = await supabase
      .from('store_products')
      .select('id, store_id, product_name, price_estimate, stores(id, name)')
      .eq('ingredient_id', item.ingredient_id);

    if (error || !products || products.length === 0) {
      continue;
    }

    // Find cheaper alternatives
    for (const product of products) {
      const price = product.price_estimate || 0;
      if (price < item.best_price!) {
        const store = (product as any).stores?.name || 'Unknown';
        const savings = item.best_price! - price;

        proposals.push({
          ingredient_id: item.ingredient_id,
          ingredient_name: item.ingredient_name,
          current_price: item.best_price!,
          current_store: item.best_store || 'Unknown',
          proposed_price: price,
          proposed_store: store,
          proposed_product: product.product_name || 'N/A',
          savings
        });
      }
    }
  }

  // Sort by savings (descending)
  proposals.sort((a, b) => b.savings - a.savings);

  // Return only swaps that would help meet budget
  const deficit = currentTotal - budget;
  const result: SwapProposal[] = [];
  let totalSavings = 0;

  for (const proposal of proposals) {
    result.push(proposal);
    totalSavings += proposal.savings;
    if (totalSavings >= deficit) {
      break;
    }
  }

  return result;
}
