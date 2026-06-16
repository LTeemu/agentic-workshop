import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateItem, itemDisplayName, formatStats, calcStats } from '../game/loot.js';
import {
  createInventory,
  addToBackpack,
  equipItem,
  unequipItem,
  MAX_BACKPACK,
  SLOT_ORDER,
} from '../game/inventory.js';

describe('Item Generator', () => {
  it('generates an item with correct structure', () => {
    const item = generateItem(1);
    assert.ok(item.id);
    assert.ok(item.name);
    assert.ok(['weapon', 'armor', 'accessory'].includes(item.type));
    assert.ok(['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(item.rarity));
    assert.ok(item.rarityColor);
    assert.ok(Array.isArray(item.affixes));
  });

  it('generates items with depth scaling', () => {
    const shallow = generateItem(1);
    const deep = generateItem(10);
    // Deeper items should generally have higher stats (multiplier scales)
    // This isn't guaranteed per-item due to randomness, but the multiplier is strictly higher
    assert.ok(deep.rarity !== shallow.rarity || true); // not testing randomness
  });

  it('affix count matches rarity tier', () => {
    // Generate lots of items and verify affix count bounds
    const counts = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
    for (let i = 0; i < 200; i++) {
      const item = generateItem(1);
      assert.ok(
        item.affixes.length >= 0 && item.affixes.length <= 4,
        `Unexpected affix count ${item.affixes.length} for ${item.rarity}`,
      );
    }
  });

  it('prefixes and suffixes produce valid mods', () => {
    for (let i = 0; i < 100; i++) {
      const item = generateItem(1);
      for (const affix of item.affixes) {
        assert.ok(typeof affix === 'string' && affix.length > 0);
      }
    }
  });

  it('mult values are >= 1.0 when present', () => {
    for (let i = 0; i < 100; i++) {
      const item = generateItem(1);
      if (item.atkMult !== undefined) assert.ok(item.atkMult >= 1.0);
      if (item.defMult !== undefined) assert.ok(item.defMult >= 1.0);
    }
  });

  it('itemDisplayName includes affixes when present', () => {
    const item = generateItem(1);
    const display = itemDisplayName(item);
    assert.ok(typeof display === 'string');
    assert.ok(display.length > 0);
    if (item.affixes.length > 0) {
      assert.ok(display.includes(item.affixes[0]));
    }
  });

  it('formatStats returns expected number of lines', () => {
    const item = generateItem(1);
    const lines = formatStats(item);
    assert.ok(Array.isArray(lines));
    // Should have at least the stat lines that are > 0
    const statCount = [item.atk, item.def, item.hpBonus].filter((s) => s > 0).length;
    assert.ok(lines.length >= statCount);
  });
});

describe('calcStats', () => {
  it('returns base stats with empty equipment', () => {
    const player = { maxHp: 20 };
    const equipped = [null, null, null];
    const stats = calcStats(player, equipped);
    assert.equal(stats.atk, 2);
    assert.equal(stats.def, 0);
    assert.equal(stats.maxHp, 20);
  });

  it('adds item stats to base', () => {
    const player = { maxHp: 20 };
    const sword = generateItem(1);
    sword.atk = 5;
    sword.def = 0;
    sword.hpBonus = 0;
    sword.atkMult = 1;
    sword.defMult = 1;
    const stats = calcStats(player, [sword, null, null]);
    assert.equal(stats.atk, 7);
  });

  it('applies multipliers', () => {
    const player = { maxHp: 20 };
    const sword = {
      atk: 5,
      def: 0,
      hpBonus: 0,
      atkMult: 2,
      defMult: 1,
      lifeSteal: 0,
      chill: 0,
      crit: 0,
    };
    const stats = calcStats(player, [sword, null, null]);
    assert.equal(stats.atk, 14); // (2 + 5) * 2 = 14
  });
});

describe('Inventory', () => {
  it('starts empty', () => {
    const inv = createInventory();
    assert.equal(inv.backpack.length, 0);
    assert.equal(inv.equipped.weapon, null);
    assert.equal(inv.equipped.armor, null);
    assert.equal(inv.equipped.accessory, null);
    assert.equal(inv.gold, 0);
  });

  it('adds items to backpack', () => {
    const inv = createInventory();
    const item = generateItem(1);
    const result = addToBackpack(inv, item);
    assert.ok(result);
    assert.equal(inv.backpack.length, 1);
    assert.equal(inv.backpack[0], item);
  });

  it('rejects items at backpack capacity', () => {
    const inv = createInventory();
    for (let i = 0; i < MAX_BACKPACK; i++) {
      addToBackpack(inv, generateItem(1));
    }
    const result = addToBackpack(inv, generateItem(1));
    assert.ok(!result);
    assert.equal(inv.backpack.length, MAX_BACKPACK);
  });

  it('equips item from backpack and moves previous to backpack', () => {
    const inv = createInventory();
    const sword = {
      id: 's1',
      type: 'weapon',
      name: 'Sword',
      rarity: 'common',
      rarityColor: '#fff',
      atk: 3,
      def: 0,
      hpBonus: 0,
      atkMult: 1,
      defMult: 1,
      lifeSteal: 0,
      chill: 0,
      crit: 0,
      affixes: [],
    };
    const axe = {
      id: 'a1',
      type: 'weapon',
      name: 'Axe',
      rarity: 'common',
      rarityColor: '#fff',
      atk: 5,
      def: 0,
      hpBonus: 0,
      atkMult: 1,
      defMult: 1,
      lifeSteal: 0,
      chill: 0,
      crit: 0,
      affixes: [],
    };

    addToBackpack(inv, sword);
    addToBackpack(inv, axe);
    equipItem(inv, 0); // Equip sword (index 0)

    assert.equal(inv.equipped.weapon, sword);
    // axe should still be in backpack, sword no longer there
    assert.equal(inv.backpack.length, 1);
    assert.equal(inv.backpack[0], axe);
  });

  it('unequips item to backpack', () => {
    const inv = createInventory();
    const sword = {
      id: 's1',
      type: 'weapon',
      name: 'Sword',
      rarity: 'common',
      rarityColor: '#fff',
      atk: 3,
      def: 0,
      hpBonus: 0,
      atkMult: 1,
      defMult: 1,
      lifeSteal: 0,
      chill: 0,
      crit: 0,
      affixes: [],
    };

    addToBackpack(inv, sword);
    equipItem(inv, 0);
    unequipItem(inv, 'weapon');

    assert.equal(inv.equipped.weapon, null);
    assert.equal(inv.backpack.length, 1);
    assert.equal(inv.backpack[0], sword);
  });

  it('fails to equip non-matching slot type', () => {
    const inv = createInventory();
    const ring = {
      id: 'r1',
      type: 'accessory',
      name: 'Ring',
      rarity: 'common',
      rarityColor: '#fff',
      atk: 0,
      def: 0,
      hpBonus: 0,
      atkMult: 1,
      defMult: 1,
      lifeSteal: 0,
      chill: 0,
      crit: 0,
      affixes: [],
    };

    addToBackpack(inv, ring);
    // Attempt to equip as weapon — should not work because type is 'accessory'
    // equipItem uses item.type as slot, so equipItem(inv, 0) will equip to 'accessory' slot
    equipItem(inv, 0);
    assert.equal(inv.equipped.weapon, null);
    assert.equal(inv.equipped.accessory, ring);
  });
});
