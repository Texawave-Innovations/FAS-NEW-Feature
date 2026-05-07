'use client';

// src/modules/master/SalesMaster.tsx
// Added: Running Number master section (top of page).
// Unchanged: all existing Payment Terms, Delivery Terms, etc. sections below.

import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { database } from '@/services/firebase';
import { ref, set, get } from 'firebase/database';
import {
  DocType,
  RunningNumberConfig,
  getAllRunningNumbers,
  saveRunningNumberConfig,
} from '@/services/runningNumberService';

// ── Running Number doc types ─────────────────────────────────────────────────
const DOC_TYPES: { key: DocType; label: string; placeholder: string }[] = [
  { key: 'quoteNo',    label: 'Quote No',    placeholder: 'e.g. SQFY26-27' },
  { key: 'soNumber',   label: 'SO Number',   placeholder: 'e.g. SOFY26-27' },
  { key: 'invoiceNo',  label: 'Invoice No',  placeholder: 'e.g. INVFY26-27' },
  { key: 'shipmentId', label: 'Shipment ID', placeholder: 'e.g. SHIPFY26-27' },
  { key: 'dcNo',       label: 'DC No',       placeholder: 'e.g. DCFY26-27' },
  { key: 'nrgpNo',     label: 'NRGP No',     placeholder: 'e.g. NRGPFY26-27' },
  { key: 'rgpNo',      label: 'RGP No',      placeholder: 'e.g. RGPFY26-27' },
];

// ── Running Number Section ───────────────────────────────────────────────────
function RunningNumberSection() {
  const [configs, setConfigs] = useState<Partial<Record<DocType, RunningNumberConfig>>>({});
  const [selected, setSelected] = useState<DocType | ''>('');
  const [inputValue, setInputValue] = useState('');
  // savedDate: per-docType date shown after ✅ click
  const [savedDate, setSavedDate] = useState<Partial<Record<DocType, string>>>({});
  const [saving, setSaving] = useState(false);

  // Load existing configs on mount
  useEffect(() => {
    getAllRunningNumbers()
      .then((data) => {
        setConfigs(data);
        // Restore saved dates from existing configs
        const dates: Partial<Record<DocType, string>> = {};
        for (const [key, val] of Object.entries(data)) {
          if (val?.updatedAt) dates[key as DocType] = val.updatedAt;
        }
        setSavedDate(dates);
      })
      .catch(() => toast({ title: 'Failed to load running numbers', variant: 'destructive' }));
  }, []);

  // When dropdown changes, pre-fill input with existing prefix if any
  const handleSelect = (val: DocType) => {
    setSelected(val);
    setInputValue(configs[val]?.prefix ?? '');
  };

  const handleSave = async () => {
    if (!selected) {
      toast({ title: 'Please select a document type', variant: 'destructive' });
      return;
    }
    if (!inputValue.trim()) {
      toast({ title: 'Please enter a prefix', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const hh = String(today.getHours()).padStart(2, '0');
      const min = String(today.getMinutes()).padStart(2, '0');
      const dateStr = `${yyyy}/${mm}/${dd} ${hh}:${min}`;

      let finalPrefix = inputValue.trim();
      let nextSeq = 1;

      // Extract numeric part if provided
      const match = finalPrefix.match(/^(.*[^0-9])(\d+)$/);
      if (match) {
        let prefixPart = match[1];
        const numPart = match[2];
        if (prefixPart.endsWith('-') || prefixPart.endsWith('/')) {
          prefixPart = prefixPart.slice(0, -1);
        }
        finalPrefix = prefixPart;
        nextSeq = parseInt(numPart, 10) + 1;
      }

      await saveRunningNumberConfig(selected, finalPrefix, dateStr, nextSeq);

      // Update local state
      setConfigs((prev) => ({
        ...prev,
        [selected]: { prefix: finalPrefix, nextSeq, updatedAt: dateStr },
      }));
      setSavedDate((prev) => ({ ...prev, [selected]: dateStr }));

      toast({ title: `${DOC_TYPES.find((d) => d.key === selected)?.label} saved. Next number: ${finalPrefix}-${String(nextSeq).padStart(4, '0')}` });

      // Reset form
      setSelected('');
      setInputValue('');
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const selectedMeta = DOC_TYPES.find((d) => d.key === selected);

  return (
    <Card className="border-2 border-blue-200 shadow-md">
      <CardHeader className="bg-blue-50 rounded-t-lg pb-3">
        <CardTitle className="text-xl text-blue-900 font-bold">Running Number</CardTitle>
        <p className="text-sm text-blue-700 mt-1">
          Set the prefix (e.g. INVFY26-27). If you include a custom number at the end (e.g. INVFY26-27-0145), the counter will continue from that number instead of resetting to 0001.
        </p>
      </CardHeader>
      <CardContent className="pt-5">
        {/* ── Input Row ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown */}
          <Select value={selected} onValueChange={(v) => handleSelect(v as DocType)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((d) => (
                <SelectItem key={d.key} value={d.key}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Prefix input */}
          <Input
            className="w-52"
            placeholder={selectedMeta?.placeholder ?? 'Select a type first'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            disabled={!selected}
          />

          {/* Edit icon (just focuses the input visually) */}
          <Button variant="ghost" size="icon" disabled={!selected} onClick={() => {}}>
            <Pencil className="h-4 w-4 text-gray-500" />
          </Button>

          {/* Delete – clears current selection */}
          <Button
            variant="ghost"
            size="icon"
            disabled={!selected}
            onClick={() => { setSelected(''); setInputValue(''); }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>

          {/* ✅ Save tick */}
          <Button
            variant="outline"
            size="icon"
            disabled={!selected || !inputValue.trim() || saving}
            onClick={handleSave}
            className="border-green-500 text-green-600 hover:bg-green-50"
          >
            <Check className="h-4 w-4" />
          </Button>

          {/* Date badge – shown right after save, for currently selected type */}
          {selected && savedDate[selected] && (
            <span className="ml-1 px-3 py-1.5 rounded-full border border-gray-400 text-sm font-semibold text-gray-700 bg-white">
              {savedDate[selected]}
            </span>
          )}
        </div>

        {/* ── Summary table of saved configs ── */}
        {Object.keys(configs).length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2 text-left font-semibold">Document Type</th>
                  <th className="border px-4 py-2 text-left font-semibold">Prefix</th>
                  <th className="border px-4 py-2 text-left font-semibold">Next Number</th>
                  <th className="border px-4 py-2 text-left font-semibold">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {DOC_TYPES.filter((d) => configs[d.key]).map((d) => {
                  const cfg = configs[d.key]!;
                  return (
                    <tr key={d.key} className="hover:bg-blue-50 transition-colors">
                      <td className="border px-4 py-2 font-medium">{d.label}</td>
                      <td className="border px-4 py-2">
                        <Badge variant="secondary" className="font-mono">
                          {cfg.prefix}
                        </Badge>
                      </td>
                      <td className="border px-4 py-2 font-mono text-blue-700">
                        {cfg.prefix}-{String(cfg.nextSeq ?? 1).padStart(4, '0')}
                      </td>
                      <td className="border px-4 py-2 text-gray-500">{cfg.updatedAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EXISTING SalesMaster code below — unchanged except RunningNumberSection
// is inserted at the top of the grid.
// ════════════════════════════════════════════════════════════════════════════
export default function SalesMaster() {
  // Sales masters
  const [paymentTerms, setPaymentTerms] = useState<string[]>([]);
  const [deliveryTerms, setDeliveryTerms] = useState<string[]>([]);
  const [dispatchModes, setDispatchModes] = useState<string[]>([]);
  const [gstList, setGstList] = useState<string[]>([]);

  // Inventory/Item masters
  const [itemCategories, setItemCategories] = useState<string[]>([]);
  const [itemTypes, setItemTypes] = useState<string[]>([]);
  const [itemGroups, setItemGroups] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);

  const [newItem, setNewItem] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      const mastersRef = ref(database, 'masters/sales');
      const snapshot = await get(mastersRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const toArray = (val: any) => {
          if (!val) return [];
          if (Array.isArray(val)) return val;
          return Object.keys(val)
            .filter((key) => !isNaN(Number(key)))
            .sort((a, b) => Number(a) - Number(b))
            .map((key) => val[key])
            .filter((item: string) => item !== null && item !== undefined);
        };

        setPaymentTerms(toArray(data.paymentTerms));
        setDeliveryTerms(toArray(data.deliveryTerms));
        setDispatchModes(toArray(data.dispatchModes));
        setGstList(toArray(data.gstList));
        setItemCategories(toArray(data.itemCategories));
        setItemTypes(toArray(data.itemTypes));
        setItemGroups(toArray(data.itemGroups));
        setUnits(toArray(data.units));
      }
    } catch (error) {
      console.error('Error loading master data:', error);
      toast({ title: 'Failed to load masters', variant: 'destructive' });
    }
  };

  const addItem = async (category: string) => {
    if (!newItem.trim()) {
      toast({ title: 'Please enter a value', variant: 'destructive' });
      return;
    }

    let updatedList: string[] = [];
    switch (category) {
      case 'paymentTerms':   updatedList = [...paymentTerms, newItem];   setPaymentTerms(updatedList);   break;
      case 'deliveryTerms':  updatedList = [...deliveryTerms, newItem];  setDeliveryTerms(updatedList);  break;
      case 'dispatchModes':  updatedList = [...dispatchModes, newItem];  setDispatchModes(updatedList);  break;
      case 'gstList':        updatedList = [...gstList, newItem];        setGstList(updatedList);        break;
      case 'itemCategories': updatedList = [...itemCategories, newItem]; setItemCategories(updatedList); break;
      case 'itemTypes':      updatedList = [...itemTypes, newItem];      setItemTypes(updatedList);      break;
      case 'itemGroups':     updatedList = [...itemGroups, newItem];     setItemGroups(updatedList);     break;
      case 'units':          updatedList = [...units, newItem];          setUnits(updatedList);          break;
      default: return;
    }

    await set(ref(database, `masters/sales/${category}`), updatedList);
    setNewItem('');
    setEditingCategory(null);
    toast({ title: `${newItem} added successfully` });
  };

  const removeItem = async (category: string, index: number) => {
    let updatedList: string[] = [];
    switch (category) {
      case 'paymentTerms':   updatedList = paymentTerms.filter((_, i) => i !== index);   setPaymentTerms(updatedList);   break;
      case 'deliveryTerms':  updatedList = deliveryTerms.filter((_, i) => i !== index);  setDeliveryTerms(updatedList);  break;
      case 'dispatchModes':  updatedList = dispatchModes.filter((_, i) => i !== index);  setDispatchModes(updatedList);  break;
      case 'gstList':        updatedList = gstList.filter((_, i) => i !== index);        setGstList(updatedList);        break;
      case 'itemCategories': updatedList = itemCategories.filter((_, i) => i !== index); setItemCategories(updatedList); break;
      case 'itemTypes':      updatedList = itemTypes.filter((_, i) => i !== index);      setItemTypes(updatedList);      break;
      case 'itemGroups':     updatedList = itemGroups.filter((_, i) => i !== index);     setItemGroups(updatedList);     break;
      case 'units':          updatedList = units.filter((_, i) => i !== index);          setUnits(updatedList);          break;
      default: return;
    }

    await set(ref(database, `masters/sales/${category}`), updatedList);
    toast({ title: 'Item removed successfully' });
  };

  const renderList = (title: string, items: string[], category: string) => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          {title}
          <Button
            size="sm"
            onClick={() => { setEditingCategory(category); setNewItem(''); }}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {editingCategory === category && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Enter new value"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem(category)}
              autoFocus
            />
            <Button onClick={() => addItem(category)}>Add</Button>
            <Button variant="outline" onClick={() => { setEditingCategory(null); setNewItem(''); }}>
              Cancel
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No items added yet</p>
          ) : (
            items.map((item, index) => (
              <Badge key={index} variant="secondary" className="text-sm px-3 py-1.5 flex items-center gap-2">
                {item}
                <button
                  onClick={() => removeItem(category, index)}
                  className="hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-center mb-10">Sales & Inventory Masters</h1>

      {/* ── Running Number – NEW section at top ── */}
      <RunningNumberSection />

      {/* ── Existing master lists ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {renderList('Payment Terms',    paymentTerms,   'paymentTerms')}
        {renderList('Delivery Terms',   deliveryTerms,  'deliveryTerms')}
        {renderList('Dispatch Modes',   dispatchModes,  'dispatchModes')}
        {renderList('GST Rates',        gstList,        'gstList')}
        {renderList('Item Categories',  itemCategories, 'itemCategories')}
        {renderList('Item Types',       itemTypes,      'itemTypes')}
        {renderList('Item Groups',      itemGroups,     'itemGroups')}
        {renderList('Units',            units,          'units')}
      </div>
    </div>
  );
}
