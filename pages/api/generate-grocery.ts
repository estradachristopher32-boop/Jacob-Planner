import type { NextApiRequest, NextApiResponse } from 'next';
import { createServiceClient } from '../../lib/supabaseClient';
import { aggregateGroceryForWeek, estimateCost, proposeSwaps } from '../../lib/grocery';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get query params
    const userId = (req.query.user_id as string) || '00000000-0000-0000-0000-000000000000';
    let weekStart = req.query.week_start as string;

    // Default to current week's Monday if not provided
    if (!weekStart) {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Get Monday
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      weekStart = monday.toISOString().split('T')[0];
    }

    // Create service client for server-side queries
    const supabase = createServiceClient();

    // Fetch user settings (weekly budget and preferred stores)
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('weekly_budget, preferred_stores')
      .eq('user_id', userId)
      .single();

    if (settingsError) {
      console.error('Error fetching user settings:', settingsError);
      return res.status(500).json({ 
        error: 'Failed to fetch user settings',
        details: settingsError.message
      });
    }

    const budget = Number(settings?.weekly_budget || 100);
    const preferredStores = settings?.preferred_stores || [];

    // Aggregate grocery list for the week
    const aggregated = await aggregateGroceryForWeek(supabase, userId, weekStart);

    if (aggregated.length === 0) {
      return res.status(200).json({
        aggregated: [],
        total_cost: 0,
        budget,
        over_budget: false,
        swaps: [],
        message: 'No meals planned for this week'
      });
    }

    // Estimate cost
    const { total, updatedList } = await estimateCost(supabase, aggregated, preferredStores);

    const overBudget = total > budget;

    // Propose swaps if over budget
    let swaps = [];
    if (overBudget) {
      swaps = await proposeSwaps(supabase, userId, updatedList, preferredStores, budget, total);
    }

    return res.status(200).json({
      aggregated: updatedList,
      total_cost: total,
      budget,
      over_budget: overBudget,
      swaps,
      week_start: weekStart
    });

  } catch (error: any) {
    console.error('Error generating grocery list:', error);
    return res.status(500).json({ 
      error: 'Failed to generate grocery list',
      details: error.message
    });
  }
}
