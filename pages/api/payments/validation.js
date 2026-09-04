const mpesaService = require('../../../lib/mpesaService');
const { mongooseConnect } = require('../../../lib/mongoose');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await mongooseConnect();
    const validationResponse = mpesaService.validateC2BPayment(req.body);
    return res.json(validationResponse);
  } catch (error) {
    console.error('M-Pesa validation error:', error);
    return res.status(500).json({ error: 'Validation failed' });
  }
}
