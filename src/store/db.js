import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid'; // need to install uuid

// Define tables (stores)
const productsDB = localforage.createInstance({ name: 'shopBilling', storeName: 'products' });
const barcodeIndexDB = localforage.createInstance({ name: 'shopBilling', storeName: 'barcodeIndex' });
const salesDB = localforage.createInstance({ name: 'shopBilling', storeName: 'sales' });
const customersDB = localforage.createInstance({ name: 'shopBilling', storeName: 'customers' });
const investmentsDB = localforage.createInstance({ name: 'shopBilling', storeName: 'investments' });
const expensesDB = localforage.createInstance({ name: 'shopBilling', storeName: 'expenses' });
const settingsDB = localforage.createInstance({ name: 'shopBilling', storeName: 'settings' });

// Products
export const addProduct = async (product) => {
  const id = uuidv4();
  const newProduct = { ...product, id, stock: product.stock || 0 };
  await productsDB.setItem(id, newProduct);
  if (product.barcode) {
    await barcodeIndexDB.setItem(product.barcode, id);
  }
  return newProduct;
};

export const updateProductStock = async (id, qtyChange) => {
  const p = await productsDB.getItem(id);
  if (p) {
    p.stock = (p.stock || 0) + qtyChange;
    await productsDB.setItem(id, p);
  }
};

export const updateProductPrice = async (id, newPrice) => {
  const p = await productsDB.getItem(id);
  if (p) {
    p.price = parseFloat(newPrice);
    await productsDB.setItem(id, p);
  }
};

export const updateProduct = async (id, updates) => {
  const p = await productsDB.getItem(id);
  if (p) {
    const updated = { ...p, ...updates };
    await productsDB.setItem(id, updated);
    return updated;
  }
  return null;
};

export const getProducts = async () => {
  const products = [];
  await productsDB.iterate((value) => {
    products.push(value);
  });
  return products;
};

export const getProductByBarcode = async (barcode) => {
  const productId = await barcodeIndexDB.getItem(barcode);
  if (productId) {
    return await productsDB.getItem(productId);
  }

  // Fallback for old data without index
  let found = null;
  await productsDB.iterate((value) => {
    if (value.barcode === barcode) {
      found = value;
    }
  });
  if (found) {
    await barcodeIndexDB.setItem(barcode, found.id);
  }
  return found;
};

// Sales
export const addSale = async (sale) => {
  const id = uuidv4();
  const newSale = { ...sale, id, timestamp: Date.now() };
  await salesDB.setItem(id, newSale);
  
  // Deduct stock for each sold item
  if (sale.items && sale.items.length > 0) {
    for (const item of sale.items) {
      if (!item.isCustom) {
        await updateProductStock(item.id, -item.qty);
      }
    }
  }
  
  return newSale;
};

export const getSales = async () => {
  const sales = [];
  await salesDB.iterate((value) => {
    sales.push(value);
  });
  return sales.sort((a, b) => b.timestamp - a.timestamp);
};

// Customers (Pay Later)
export const addCustomer = async (customer) => {
  const id = uuidv4();
  const newCustomer = { ...customer, id, status: 'pending', timestamp: Date.now() };
  await customersDB.setItem(id, newCustomer);
  return newCustomer;
};

export const getCustomers = async () => {
  const customers = [];
  await customersDB.iterate((value) => {
    customers.push(value);
  });
  return customers.sort((a, b) => b.timestamp - a.timestamp);
};

export const updateCustomerStatus = async (id, status) => {
  const customer = await customersDB.getItem(id);
  if (customer) {
    customer.status = status;
    await customersDB.setItem(id, customer);
  }
};

// Investments
export const addInvestment = async (investment) => {
  const id = uuidv4();
  const newInvestment = { ...investment, id, timestamp: Date.now() };
  await investmentsDB.setItem(id, newInvestment);
  return newInvestment;
};

export const getInvestments = async () => {
  const investments = [];
  await investmentsDB.iterate((value) => {
    investments.push(value);
  });
  return investments.sort((a, b) => b.timestamp - a.timestamp);
};

// Expenses
export const addExpense = async (expense) => {
  const id = uuidv4();
  const newExpense = { ...expense, id, timestamp: Date.now() };
  await expensesDB.setItem(id, newExpense);
  return newExpense;
};

export const getExpenses = async () => {
  const expenses = [];
  await expensesDB.iterate((value) => {
    expenses.push(value);
  });
  return expenses.sort((a, b) => b.timestamp - a.timestamp);
};

// ==========================================
// BACKUP AND RESTORE (MIGRATION)
// ==========================================

export const exportFullDatabase = async () => {
  const data = {
    products: [],
    sales: [],
    customers: [],
    investments: [],
    expenses: [],
    settings: []
  };

  await productsDB.iterate((value) => data.products.push(value));
  await salesDB.iterate((value) => data.sales.push(value));
  await customersDB.iterate((value) => data.customers.push(value));
  await investmentsDB.iterate((value) => data.investments.push(value));
  await expensesDB.iterate((value) => data.expenses.push(value));
  await settingsDB.iterate((value, key) => data.settings.push({ key, value }));

  return JSON.stringify(data);
};

export const importFullDatabase = async (jsonData) => {
  try {
    const data = JSON.parse(jsonData);

    // Clear existing databases to ensure a clean restore
    await productsDB.clear();
    await salesDB.clear();
    await customersDB.clear();
    await investmentsDB.clear();
    await expensesDB.clear();
    await settingsDB.clear();

    // Import products
    if (data.products && Array.isArray(data.products)) {
      for (const p of data.products) {
        if (p.id) await productsDB.setItem(p.id, p);
      }
    }

    // Import sales
    if (data.sales && Array.isArray(data.sales)) {
      for (const s of data.sales) {
        if (s.id) await salesDB.setItem(s.id, s);
      }
    }

    // Import customers
    if (data.customers && Array.isArray(data.customers)) {
      for (const c of data.customers) {
        if (c.id) await customersDB.setItem(c.id, c);
      }
    }

    // Import investments
    if (data.investments && Array.isArray(data.investments)) {
      for (const i of data.investments) {
        if (i.id) await investmentsDB.setItem(i.id, i);
      }
    }

    // Import expenses
    if (data.expenses && Array.isArray(data.expenses)) {
      for (const e of data.expenses) {
        if (e.id) await expensesDB.setItem(e.id, e);
      }
    }

    // Import settings
    if (data.settings && Array.isArray(data.settings)) {
      for (const s of data.settings) {
        if (s.key) await settingsDB.setItem(s.key, s.value);
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to import database:", error);
    return false;
  }
};

// Settings
export const saveSetting = async (key, value) => {
  await settingsDB.setItem(key, value);
};

export const getSetting = async (key) => {
  return await settingsDB.getItem(key);
};
