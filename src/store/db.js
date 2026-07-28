import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid'; // need to install uuid

// Define tables (stores)
const productsDB = localforage.createInstance({ name: 'shopBilling', storeName: 'products' });
const salesDB = localforage.createInstance({ name: 'shopBilling', storeName: 'sales' });
const customersDB = localforage.createInstance({ name: 'shopBilling', storeName: 'customers' });
const investmentsDB = localforage.createInstance({ name: 'shopBilling', storeName: 'investments' });

// Products
export const addProduct = async (product) => {
  const id = uuidv4();
  const newProduct = { ...product, id };
  await productsDB.setItem(id, newProduct);
  return newProduct;
};

export const getProducts = async () => {
  const products = [];
  await productsDB.iterate((value) => {
    products.push(value);
  });
  return products;
};

export const getProductByBarcode = async (barcode) => {
  let found = null;
  await productsDB.iterate((value) => {
    if (value.barcode === barcode) {
      found = value;
    }
  });
  return found;
};

// Sales
export const addSale = async (sale) => {
  const id = uuidv4();
  const newSale = { ...sale, id, timestamp: Date.now() };
  await salesDB.setItem(id, newSale);
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
