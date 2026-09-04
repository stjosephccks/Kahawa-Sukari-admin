const mpesaService = require('../../../lib/mpesaService');
const { mongooseConnect } = require('../../../lib/mongoose');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await mongooseConnect();
    const result = await mpesaService.processC2BConfirmation(req.body);
    return res.json(result);
  } catch (error) {
    console.error('M-Pesa confirmation error:', error);
    return res.status(500).json({ error: 'Confirmation failed' });
  }
}
