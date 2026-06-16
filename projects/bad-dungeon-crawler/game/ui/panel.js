import { SLOT_ORDER } from '../inventory.js';
import { itemDisplayName, formatStats } from '../loot.js';

const PANEL_W = 360;
const PANEL_H = 440;
const SLOT_H = 30;
const GRID_COLS = 4;
const GRID_GAP = 4;
const TITLE_H = 28;

export function createPanel() {
  return { visible: false, sel: -1, tab: 'backpack' };
}

export function togglePanel(state) {
  state.visible = !state.visible;
  state.sel = -1;
}

export function renderPanel(ctx, inv, state, canvasW, canvasH) {
  if (!state.visible) return;

  const px = Math.floor((canvasW - PANEL_W) / 2);
  const py = Math.floor((canvasH - PANEL_H) / 2);

  // Panel shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = '#0e0e14';
  ctx.fillRect(px, py, PANEL_W, PANEL_H);
  ctx.shadowBlur = 0;

  // Border
  ctx.strokeStyle = '#2a2a36';
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, PANEL_W, PANEL_H);

  // Title bar
  ctx.fillStyle = '#1a1a24';
  ctx.fillRect(px + 1, py + 1, PANEL_W - 2, TITLE_H);
  ctx.fillStyle = '#6b6b78';
  ctx.font = '10px monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText('INVENTORY', px + 12, py + TITLE_H / 2);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#3a3a44';
  ctx.fillText('[I] close', px + PANEL_W - 12, py + TITLE_H / 2);
  ctx.textAlign = 'start';

  // Tab bar
  const tabY = py + TITLE_H + 1;
  const tabH = 24;
  const tabs = ['backpack', 'equipment'];
  tabs.forEach((tab, i) => {
    const tabX = px + (i === 0 ? 1 : PANEL_W / 2);
    const tabW = PANEL_W / 2 - (i === 0 ? 2 : 1);
    const active = state.tab === tab;

    ctx.fillStyle = active ? '#181820' : '#121216';
    ctx.fillRect(tabX, tabY, tabW, tabH);
    ctx.strokeStyle = active ? '#3a3a48' : '#1e1e28';
    ctx.lineWidth = 1;
    ctx.strokeRect(tabX, tabY, tabW, tabH);

    // Active tab bottom border override
    if (active) {
      ctx.fillStyle = '#181820';
      ctx.fillRect(tabX + 1, tabY + tabH - 1, tabW - 2, 1);
    }

    ctx.fillStyle = active ? '#d4d4d8' : '#5a5a64';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = tab === 'backpack' ? 'BACKPACK' : 'EQUIPMENT';
    ctx.fillText(label, tabX + tabW / 2, tabY + tabH / 2);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  });

  // Content area
  let y = tabY + tabH + 8;
  if (state.tab === 'backpack') {
    y = renderBackpack(ctx, inv, state, px, py, y);
  } else {
    y = renderEquipment(ctx, inv, state, px, py, y);
  }

  // Bottom hint
  ctx.fillStyle = '#3a3a44';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  const hintY = py + PANEL_H - 10;
  if (state.tab === 'backpack') {
    ctx.fillText('Arrow keys navigate  ·  E equip  ·  TAB switch', px + PANEL_W / 2, hintY);
  } else {
    ctx.fillText('Arrow keys navigate  ·  E unequip  ·  TAB switch', px + PANEL_W / 2, hintY);
  }
  ctx.textAlign = 'start';

  renderTooltip(ctx, inv, state, px, py, canvasW, canvasH);
}

function renderBackpack(ctx, inv, state, px, py, y) {
  const items = inv.backpack;
  if (items.length === 0) {
    ctx.fillStyle = '#4a4a54';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('— Empty —', px + PANEL_W / 2, y + 40);
    ctx.textAlign = 'start';
    return y + 80;
  }

  const startX = px + 12;
  const cellW = Math.floor((PANEL_W - 24 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
  const cellH = cellW * 0.85;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;

    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    const sx = startX + col * (cellW + GRID_GAP);
    const sy = y + row * (cellH + GRID_GAP);
    const isSel = i === state.sel;

    // Cell background
    ctx.fillStyle = isSel ? '#1e1e2a' : '#121216';
    ctx.fillRect(sx, sy, cellW, cellH);

    // Cell border — rarity glow when selected
    ctx.strokeStyle = isSel ? item.rarityColor : '#1e1e28';
    ctx.lineWidth = isSel ? 1.5 : 1;
    ctx.strokeRect(sx, sy, cellW, cellH);

    // Selection glow
    if (isSel) {
      ctx.shadowColor = item.rarityColor;
      ctx.shadowBlur = 8;
      ctx.strokeRect(sx, sy, cellW, cellH);
      ctx.shadowBlur = 0;
    }

    // Type label
    const typeLabel = { weapon: 'WPN', armor: 'ARM', accessory: 'ACC' }[item.type];
    ctx.fillStyle = item.rarityColor;
    ctx.font = '9px monospace';
    ctx.fillText(typeLabel, sx + 4, sy + 10);

    // Name
    ctx.fillStyle = '#d4d4d8';
    ctx.font = '8px monospace';
    const name = itemDisplayName(item);
    // Truncate with ellipsis
    const maxLen = Math.floor(cellW / 5.5);
    const display = name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;
    ctx.fillText(display, sx + 4, sy + cellH - 4);
  }

  const rows = Math.ceil(items.length / GRID_COLS);
  return y + rows * (cellH + GRID_GAP) + 12;
}

function renderEquipment(ctx, inv, state, px, py, y) {
  SLOT_ORDER.forEach((slot, i) => {
    const item = inv.equipped[slot];
    const sx = px + 12;
    const sy = y;
    const isSel = i === state.sel;
    const slotW = PANEL_W - 24;

    // Slot background
    ctx.fillStyle = isSel ? '#1e1e2a' : '#121216';
    ctx.fillRect(sx, sy, slotW, SLOT_H);

    // Slot border
    ctx.strokeStyle = isSel ? '#6a6a7a' : '#1e1e28';
    ctx.lineWidth = isSel ? 1.5 : 1;
    ctx.strokeRect(sx, sy, slotW, SLOT_H);

    // Slot label
    ctx.fillStyle = isSel ? '#a0a0aa' : '#5a5a64';
    ctx.font = '10px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(slot.toUpperCase(), sx + 10, sy + SLOT_H / 2);

    // Divider
    ctx.strokeStyle = '#1e1e28';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + 72, sy + 4);
    ctx.lineTo(sx + 72, sy + SLOT_H - 4);
    ctx.stroke();

    if (item) {
      ctx.fillStyle = item.rarityColor;
      ctx.font = '10px monospace';
      ctx.fillText(itemDisplayName(item), sx + 80, sy + SLOT_H / 2);
    } else {
      ctx.fillStyle = '#3a3a44';
      ctx.font = '10px monospace';
      ctx.fillText('— empty —', sx + 80, sy + SLOT_H / 2);
    }
    ctx.textBaseline = 'alphabetic';

    y += SLOT_H + 4;
  });
  return y + 12;
}

function renderTooltip(ctx, inv, state, px, py, canvasW, canvasH) {
  if (state.sel < 0) return;

  let item;
  if (state.tab === 'backpack') {
    item = inv.backpack[state.sel];
  } else {
    const equipped = SLOT_ORDER.map((s) => inv.equipped[s]);
    item = equipped[state.sel];
  }
  if (!item) return;

  const lines = [itemDisplayName(item), `[${item.rarity}]`, '', ...formatStats(item)];
  const lineH = 15;
  const tipW = 190;
  const tipH = lines.length * lineH + 14;

  let tipX = px + PANEL_W + 8;
  let tipY = py + 8;
  if (tipX + tipW > canvasW) tipX = px - tipW - 8;
  if (tipY + tipH > canvasH) tipY = canvasH - tipH - 8;

  // Tooltip shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#0e0e14';
  ctx.fillRect(tipX, tipY, tipW, tipH);
  ctx.shadowBlur = 0;

  // Tooltip border
  ctx.strokeStyle = item.rarityColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(tipX, tipY, tipW, tipH);

  // Rarity header bar
  ctx.fillStyle = item.rarityColor + '18'; // very faint tint
  ctx.fillRect(tipX + 1, tipY + 1, tipW - 2, 20);

  ctx.font = '11px monospace';
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '') continue;
    if (i === 0) {
      ctx.fillStyle = item.rarityColor;
      ctx.font = '11px monospace';
    } else {
      ctx.fillStyle = '#a0a0aa';
      ctx.font = '10px monospace';
    }
    ctx.fillText(lines[i], tipX + 8, tipY + 14 + i * lineH);
  }
}
