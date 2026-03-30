/**
 * Changelog Entity - Local Storage Based
 * Menyimpan riwayat pembaruan sistem JAMU KITO INTERNASIONAL
 * CRUD operations dengan localStorage persistence
 */

const STORAGE_KEY = 'jamu_kito_changelogs';

import { changelog2026 } from './changelogs/2026';
import { changelog2025H2 } from './changelogs/2025-H2';
import { changelog2025H1 } from './changelogs/2025-H1';
import { generatedChangelogs } from './changelogs/generated';

const DEFAULT_CHANGELOGS = [
  ...changelog2026,
  ...changelog2025H2,
  ...changelog2025H1,
  ...generatedChangelogs
];

// ===========================
// CHANGELOG ENTITY CLASS
// ===========================
class ChangelogEntity {
  constructor() {
    this._initializeStorage();
  }

  _clearAndResetData() {
    // Karena kita mengupdate data dari simulasi ke data riil, 
    // kita perlu memaksa override localStorage dengan data default baru (kecuali entry manual)
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (existing) {
        const stored = JSON.parse(existing);
        // Pertahankan entry manual jika ada (dibuat via admin panel)
        const manualEntries = stored.filter(e => e.type !== 'automatic');
        const newData = [...manualEntries, ...DEFAULT_CHANGELOGS];
        // Sort ulang
        newData.sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CHANGELOGS));
      }
    } catch (e) {
      console.warn("Gagal update localStorage", e);
    }
  }

  _initializeStorage() {
    this._clearAndResetData();
  }

  _getData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [...DEFAULT_CHANGELOGS];
    } catch {
      return this._fallbackData || [...DEFAULT_CHANGELOGS];
    }
  }

  _saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      this._fallbackData = data;
    }
  }

  _sortData(data, sortBy) {
    if (!sortBy) return data;
    const desc = sortBy.startsWith('-');
    const field = desc ? sortBy.slice(1) : sortBy;
    return [...data].sort((a, b) => {
      const va = a[field] || '';
      const vb = b[field] || '';
      if (va < vb) return desc ? 1 : -1;
      if (va > vb) return desc ? -1 : 1;
      return 0;
    });
  }

  // CRUD Operations matching Base44 SDK interface
  async list(sortBy) {
    const data = this._getData();
    return this._sortData(data, sortBy);
  }

  async filter(conditions = {}, sortBy) {
    const data = this._getData();
    const filtered = data.filter(entry => {
      return Object.entries(conditions).every(([key, val]) => {
        return entry[key] === val;
      });
    });
    return this._sortData(filtered, sortBy);
  }

  async get(id) {
    const data = this._getData();
    const entry = data.find(e => e.id === id);
    if (!entry) throw new Error(`Changelog entry not found: ${id}`);
    return entry;
  }

  async create(entryData) {
    const data = this._getData();
    const newEntry = {
      ...entryData,
      id: entryData.id || `cl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
    };
    data.unshift(newEntry);
    this._saveData(data);
    return newEntry;
  }

  async update(id, updateData) {
    const data = this._getData();
    const idx = data.findIndex(e => e.id === id);
    if (idx === -1) throw new Error(`Changelog entry not found: ${id}`);
    data[idx] = { ...data[idx], ...updateData, updated_at: new Date().toISOString() };
    this._saveData(data);
    return data[idx];
  }

  async delete(id) {
    const data = this._getData();
    const filtered = data.filter(e => e.id !== id);
    if (filtered.length === data.length) throw new Error(`Changelog entry not found: ${id}`);
    this._saveData(filtered);
    return true;
  }
}

export const Changelog = new ChangelogEntity();
