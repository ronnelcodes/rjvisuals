import { json, requireAdmin } from './_shared.mjs';
export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  try { await requireAdmin(event); }
  catch (error) {
    return error.message === 'Unauthorized' ? json(401, { error: 'Sign in required' }) : json(503, { error: 'Studio access unavailable' });
  }
  return json(200, {
    labs: [
      ['Primary', 'Bay Photo', 'Default for Lustre prints and enlargements. Review and place orders manually.'],
      ['Backup', 'Nations Photo Lab', 'Use when Bay Photo cannot meet the size, finish, deadline, or shipping requirements.'],
      ['Final contender', 'Miller’s Professional Imaging', 'Verify account requirements, availability, and sample quality before ordering.']
    ],
    notes: [
      'Confirm payment before submitting to the lab. Check cropping, color, resolution, and shipping.',
      'Use the full-resolution originals, not the watermarked gallery copies.',
      'Confirm current lab pricing and delivery estimates before quoting or placing the order.'
    ]
  });
}
