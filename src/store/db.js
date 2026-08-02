import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid'; // need to install uuid

// Define tables (stores)
const productsDB = localforage.createInstance({ name: 'shopBilling', storeName: 'products' });
const barcodeIndexDB = localforage.createInstance({ name: 'shopBilling', storeName: 'barcodeIndex' });
const salesDB = localforage.createInstance({ name: 'shopBilling', storeName: 'sales' });
const customersDB = localforage.createInstance({ name: 'shopBilling', storeName: 'customers' });
const investmentsDB = localforage.createInstance({ name: 'shopBilling', storeName: 'investments' });
const expensesDB = localforage.createInstance({ name: 'shopBilling', storeName: 'expenses' });

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

export const updateProductStock = async (id, delta) => {
  const product = await productsDB.getItem(id);
  if (product) {
    product.stock = (product.stock || 0) + delta;
    await productsDB.setItem(id, product);
    return product;
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
