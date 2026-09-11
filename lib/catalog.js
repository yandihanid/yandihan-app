export const PRODUCT_TYPES = new Set(['main', 'sub'])

export function parseProductType(value) {
  const type = String(value || '').trim().toLowerCase()
  return PRODUCT_TYPES.has(type) ? type : null
}

export function splitProducts(products = []) {
  const main = []
  const sub = []
  for (const product of products) {
    if (product?.is_sub_product === true) sub.push(product)
    else main.push(product)
  }
  return { main, sub }
}
