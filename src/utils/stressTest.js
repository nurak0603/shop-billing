import { addProduct, addSale } from '../store/db';

export const runStressTest = async (productCount = 1000, saleCount = 500) => {
  console.log(`Starting stress test: ${productCount} products, ${saleCount} sales...`);

  const startTime = performance.now();

  // 1. Add Products
  const products = [];
  for (let i = 0; i < productCount; i++) {
    const p = await addProduct({
      name: `Test Product ${i}`,
      price: Math.floor(Math.random() * 1000) + 10,
      costPrice: Math.floor(Math.random() * 500) + 5,
      barcode: `TEST-${Date.now()}-${i}`,
      keyword: `test${i}`
    });
    products.push(p);
    if (i % 100 === 0) console.log(`Added ${i} products...`);
  }

  // 2. Add Sales
  for (let i = 0; i < saleCount; i++) {
    const itemCount = Math.floor(Math.random() * 5) + 1;
    const items = [];
    let total = 0;

    for (let j = 0; j < itemCount; j++) {
      const prod = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      items.push({ ...prod, qty });
      total += prod.price * qty;
    }

    await addSale({
      items,
      total,
      method: ['cash', 'gpay', 'card'][Math.floor(Math.random() * 3)],
      timestamp: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in last 30 days
    });
    if (i % 50 === 0) console.log(`Added ${i} sales...`);
  }

  const endTime = performance.now();
  console.log(`Stress test complete! Took ${((endTime - startTime) / 1000).toFixed(2)} seconds.`);
  return (endTime - startTime) / 1000;
};
