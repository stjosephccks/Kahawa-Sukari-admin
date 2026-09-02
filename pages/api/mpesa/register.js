const mpesaService = require('../../../lib/mpesaService');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { validationUrl, confirmationUrl } = req.body;

    if (!validationUrl || !confirmationUrl) {
      return res.status(400).json({ error: 'Validation URL and Confirmation URL are required' });
    }

    const result = await mpesaService.registerC2BUrls(validationUrl, confirmationUrl);
    return res.json(result);
  } catch (error) {
    console.error('M-Pesa registration error:', error);
    return res.status(500).json({ error: 'Failed to register C2B URLs' });
  }
}
