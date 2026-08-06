import { mdToPdf } from 'md-to-pdf';

(async () => {
  try {
    const pdf = await mdToPdf({ path: 'report.md' }, { dest: 'Shop_Billing_Features.pdf' });
    console.log('PDF generated successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
})();
