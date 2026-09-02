// Register C2B URLs with Safaricom
const MpesaService = require('../lib/mpesaService');

const mpesaService = new MpesaService();

// Your production URLs (must be HTTPS and publicly accessible)
const BASE_URL = process.env.MPESA_BASE_URL || 'https://your-domain.com';

const validationUrl = `${BASE_URL}/api/mpesa/validation`;
const confirmationUrl = `${BASE_URL}/api/mpesa/confirmation`;

console.log('Registering C2B URLs...');
console.log('Validation URL:', validationUrl);
console.log('Confirmation URL:', confirmationUrl);

mpesaService.registerC2BUrls(validationUrl, confirmationUrl)
  .then(results => {
    console.log('Registration results:');
    results.forEach(result => {
      if (result.success) {
        console.log(`✓ ${result.paybill} (${result.shortcode}): Success`);
      } else {
        console.log(`✗ ${result.paybill} (${result.shortcode}): Failed - ${result.error}`);
      }
    });
  })
  .catch(error => {
    console.error('Error:', error);
  });
