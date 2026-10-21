import assert from 'node:assert/strict';
import { configuredProduct, packageLimit } from '../src/lib/product-options.ts';
const size = { name: 'Tamaño', values: ['Personal', 'Mediano'], prices: { Mediano: 5 }, required: true, max_choices: 1 };
const extras = { name: 'Ingredientes', values: ['Pollo', 'Huevo'], prices: { Pollo: 3, Huevo: 1.5 }, max_choices: 2 };
const product = { name: 'Chaufa de pollo', price: 12, options: [size, extras] };
assert.equal(configuredProduct(product, {}).valid, false);
assert.equal(configuredProduct(product, { Tamaño: ['Personal', 'Mediano'] }).valid, false);
assert.equal(configuredProduct(product, { Tamaño: ['Inventado'] }).valid, false);
assert.deepEqual(configuredProduct(product, { Tamaño: ['Mediano'], Ingredientes: ['Pollo', 'Huevo'] }), {
  valid: true, price: 21.5, options: { Tamaño: 'Mediano', Ingredientes: 'Pollo, Huevo' },
});
assert.equal(configuredProduct(product, { Tamaño: ['Personal'] }).price, 12);
assert.equal(configuredProduct(product, { Tamaño: ['Personal'], Ingredientes: ['Pollo', 'Pollo'] }).valid, false);
assert.equal(configuredProduct({ ...product, options: [extras, size] }, { Tamaño: ['Mediano'], Ingredientes: ['Huevo'] }).price, 18.5);
assert.equal(configuredProduct({ price: 0.1, options: [{ ...size, prices: { Personal: 0.2 } }] }, { Tamaño: ['Personal'] }).price, 0.3);
assert.equal(packageLimit(product), null);
assert.equal(packageLimit({ name: 'Paquete de 12 piezas', options: [{ name: 'Sabor' }] }), 12);
assert.equal(packageLimit({ name: 'Paquete de 12 piezas', options: [size] }), null);
assert.equal(packageLimit({ name: 'Combo de 6', options: [{ name: 'Cantidad / presentación' }] }), null);
console.log('Opciones: tamaños, ingredientes, recargos, límites y paquetes OK');
