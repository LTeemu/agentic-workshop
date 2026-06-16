const RARITIES = [
  { name: 'common', weight: 40, affixes: 0, color: '#9e9e9e', mult: 1.0 },
  { name: 'uncommon', weight: 30, affixes: 1, color: '#4caf50', mult: 1.25 },
  { name: 'rare', weight: 20, affixes: 2, color: '#2196f3', mult: 1.5 },
  { name: 'epic', weight: 8, affixes: 3, color: '#9c27b0', mult: 2.0 },
  { name: 'legendary', weight: 2, affixes: 4, color: '#ff9800', mult: 3.0 },
];

const BASE_TYPES = [
  { name: 'Short Sword', type: 'weapon', stats: { atk: [3, 6], def: 0, hpBonus: 0 } },
  { name: 'Long Blade', type: 'weapon', stats: { atk: [5, 9], def: 0, hpBonus: 0 } },
  { name: 'Axe', type: 'weapon', stats: { atk: [4, 11], def: 0, hpBonus: 0 } },
  { name: 'Leather Vest', type: 'armor', stats: { atk: 0, def: [2, 4], hpBonus: 0 } },
  { name: 'Chainmail', type: 'armor', stats: { atk: 0, def: [3, 6], hpBonus: 0 } },
  { name: 'Plate', type: 'armor', stats: { atk: 0, def: [5, 9], hpBonus: 0 } },
  { name: 'Ring', type: 'accessory', stats: { atk: 0, def: 0, hpBonus: [3, 8] } },
  { name: 'Amulet', type: 'accessory', stats: { atk: 0, def: [1, 2], hpBonus: [5, 12] } },
];

const PREFIXES = [
  { name: 'Sharp', cond: (i) => i.atk > 0, mod: () => ({ atk: rand(1, 3) }) },
  { name: 'Sturdy', cond: (i) => i.def > 0, mod: () => ({ def: rand(1, 2) }) },
  { name: 'Vital', cond: (i) => true, mod: () => ({ hpBonus: rand(3, 7) }) },
  { name: 'Keen', cond: (i) => i.atk > 0, mod: () => ({ atk: rand(2, 4) }) },
  { name: 'Fortified', cond: (i) => i.def > 0, mod: () => ({ def: rand(2, 3) }) },
  {
    name: 'Balanced',
    cond: (i) => true,
    mod: () => ({ atk: rand(0, 2), def: rand(0, 2), hpBonus: rand(1, 4) }),
  },
];

const SUFFIXES = [
  { name: 'of Power', mod: () => ({ atkMult: 1 + rand(10, 25) / 100 }) },
  { name: 'of Protection', mod: () => ({ defMult: 1 + rand(10, 25) / 100 }) },
  { name: 'of the Leech', mod: () => ({ lifeSteal: rand(3, 8) }) },
  { name: 'of Frost', mod: () => ({ chill: rand(10, 30) }) },
  { name: 'of the Whale', mod: () => ({ hpBonus: rand(8, 18) }) },
  { name: 'of Precision', mod: () => ({ crit: rand(3, 8) }) },
];

import { rand } from './utils.js';

function pickWeighted(arr) {
  const total = arr.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const item of arr) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return arr[arr.length - 1];
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateItem(depth) {
  const base = pick(BASE_TYPES);
  const rarity = pickWeighted(RARITIES);
  const mult = rarity.mult + (depth - 1) * 0.1;

  const atk =
    typeof base.stats.atk === 'number'
      ? base.stats.atk
      : rand(base.stats.atk[0], base.stats.atk[1]);
  const def =
    typeof base.stats.def === 'number'
      ? base.stats.def
      : rand(base.stats.def[0], base.stats.def[1]);
  const hpBonus =
    typeof base.stats.hpBonus === 'number'
      ? base.stats.hpBonus
      : rand(base.stats.hpBonus[0], base.stats.hpBonus[1]);

  const item = {
    id: generateId(),
    name: base.name,
    type: base.type,
    rarity: rarity.name,
    rarityColor: rarity.color,
    atk: Math.round(atk * mult),
    def: Math.round(def * mult),
    hpBonus: Math.round(hpBonus * mult),
    atkMult: 1.0,
    defMult: 1.0,
    lifeSteal: 0,
    chill: 0,
    crit: 0,
    affixes: [],
  };

  const availablePrefixes = PREFIXES.filter((p) => p.cond(item));
  const availableSuffixes = [...SUFFIXES];

  const totalAffixes = rarity.affixes;
  const prefixCount = Math.min(Math.ceil(totalAffixes / 2), availablePrefixes.length);
  const suffixCount = Math.min(totalAffixes - prefixCount, availableSuffixes.length);

  const chosenPrefixes = shuffle(availablePrefixes).slice(0, prefixCount);
  const chosenSuffixes = shuffle(availableSuffixes).slice(0, suffixCount);

  for (const p of chosenPrefixes) {
    const mod = p.mod();
    Object.assign(item, mod);
    item.affixes.push(p.name);
  }

  for (const s of chosenSuffixes) {
    const mod = s.mod();
    Object.assign(item, mod);
    item.affixes.push(s.name);
  }

  return item;
}

let idCounter = 0;
function generateId() {
  return `item_${Date.now()}_${idCounter++}`;
}

export function itemDisplayName(item) {
  return item.affixes.length ? `${item.affixes.join(' ')} ${item.name}` : item.name;
}

export function formatStats(item) {
  const lines = [];
  if (item.atk > 0) lines.push(`ATK +${item.atk}`);
  if (item.def > 0) lines.push(`DEF +${item.def}`);
  if (item.hpBonus > 0) lines.push(`HP +${item.hpBonus}`);
  if (item.atkMult > 1) lines.push(`ATK x${item.atkMult.toFixed(2)}`);
  if (item.defMult > 1) lines.push(`DEF x${item.defMult.toFixed(2)}`);
  if (item.lifeSteal > 0) lines.push(`Life Steal ${item.lifeSteal}%`);
  if (item.chill > 0) lines.push(`Chill ${item.chill}%`);
  if (item.crit > 0) lines.push(`Crit ${item.crit}%`);
  return lines;
}

export function calcStats(player, equipped) {
  let atk = 2,
    def = 0,
    maxHp = player.maxHp;

  for (const item of equipped) {
    if (!item) continue;
    atk += item.atk;
    def += item.def;
    maxHp += item.hpBonus;
    atk *= item.atkMult || 1;
    def *= item.defMult || 1;
  }

  return { atk: Math.round(atk), def: Math.round(def), maxHp };
}
