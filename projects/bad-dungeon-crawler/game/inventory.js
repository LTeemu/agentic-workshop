export const SLOT_ORDER = ['weapon', 'armor', 'accessory'];
export const MAX_BACKPACK = 20;

export function createInventory() {
  return {
    equipped: { weapon: null, armor: null, accessory: null },
    backpack: [],
    gold: 0,
  };
}

export function addToBackpack(inv, item) {
  if (inv.backpack.length >= MAX_BACKPACK) return false;
  inv.backpack.push(item);
  return true;
}

export function removeFromBackpack(inv, index) {
  if (index < 0 || index >= inv.backpack.length) return null;
  return inv.backpack.splice(index, 1)[0];
}

export function equipItem(inv, backpackIndex) {
  const item = inv.backpack[backpackIndex];
  if (!item || !SLOT_ORDER.includes(item.type)) return null;

  const slot = item.type;
  const prev = inv.equipped[slot];
  inv.equipped[slot] = item;
  inv.backpack.splice(backpackIndex, 1);

  if (prev) inv.backpack.push(prev);
  return item;
}

export function unequipItem(inv, slot) {
  if (!inv.equipped[slot]) return null;
  if (inv.backpack.length >= MAX_BACKPACK) return null;

  const item = inv.equipped[slot];
  inv.equipped[slot] = null;
  inv.backpack.push(item);
  return item;
}

export function getEquippedList(inv) {
  return SLOT_ORDER.map((slot) => inv.equipped[slot]);
}

export function countByRarity(inv) {
  const counts = {};
  for (const item of inv.backpack) {
    counts[item.rarity] = (counts[item.rarity] || 0) + 1;
  }
  for (const item of Object.values(inv.equipped)) {
    if (item) counts[item.rarity] = (counts[item.rarity] || 0) + 1;
  }
  return counts;
}
