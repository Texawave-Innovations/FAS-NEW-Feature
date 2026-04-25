import { useState, useEffect, useRef } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { database, storage, storageRef, uploadBytes, getDownloadURL } from '@/services/firebase';
import { ref, set, get, push, update } from 'firebase/database';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CustomerRecord { customerCode: string; customerName: string; }
interface FGItemRecord { fgItemCode: string; fgDescription: string; uom: string; fgRmCode: string; }

interface LineItem {
  fgItem: string; fgDescription: string; uom: string;
  poQty: string; unitPrice: string; dueDate: string;
  rmCode: string; referenceNo: string;
}

interface SalesOrderRecord {
  soNumber: string; poNumber: string;
  customerId: string; customerName: string;
  poUploadUrl: string; poFileName: string;
  lineItems: LineItem[];
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

const emptyLine: LineItem = {
  fgItem: '', fgDescription: '', uom: '',
  poQty: '0.000', unitPrice: '0.000',
  dueDate: new Date().toISOString().split('T')[0],
  rmCode: '', referenceNo: '',
};

type Tab  = 'creation' | 'approval';
type View = 'summary' | 'form';

const STATUS_BADGE: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function SalesOrder() {
  const [activeTab, setActiveTab] = useState<Tab>('creation');
  const [view, setView]           = useState<View>('summary');

  // Master data
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [fgItems,   setFgItems]   = useState<FGItemRecord[]>([]);
  const [rmCodes,   setRmCodes]   = useState<string[]>([]);

  // Saved SOs
  const [salesOrders, setSalesOrders] = useState<Record<string, SalesOrderRecord>>({});

  // ── Creation header state ──
  const [poNumber,    setPoNumber]    = useState('');
  const [customerId,  setCustomerId]  = useState('');
  const [customerName,setCustomerName]= useState('');
  const [soNumber,    setSoNumber]    = useState('');
  const [poFileName,  setPoFileName]  = useState('');
  const [poUploadUrl, setPoUploadUrl] = useState('');
  const [uploading,   setUploading]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Creation line-item state ──
  const [line,      setLine]      = useState<LineItem>(emptyLine);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // ── Approval state ──
  const [appSOKey,     setAppSOKey]   = useState('');
  const [appDueDate,   setAppDueDate] = useState('');
  const [approvalRows, setApprovalRows] = useState<(LineItem & { soNo: string; poNo: string; customerName: string; orderDate: string; soKey: string; selected: boolean })[]>([]);

  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [matSnap, salesSnap, soSnap] = await Promise.all([
      get(ref(database, 'masters/material')),
      get(ref(database, 'masters/sales')),
      get(ref(database, 'production/salesOrders')),
    ]);
    if (matSnap.exists()) {
      const items = Object.values((matSnap.val().items || {}) as Record<string, any>);
      setFgItems(items.filter((i: any) => i.itemType === 'FG').map((i: any) => ({
        fgItemCode: i.fgItemCode, fgDescription: i.fgDescription,
        uom: i.uom, fgRmCode: i.fgRmCode,
      })));
      setRmCodes(items.filter((i: any) => i.itemType === 'RM').map((i: any) => i.rmCode));
    }
    if (salesSnap.exists() && salesSnap.val().customers) {
      setCustomers(Object.values(salesSnap.val().customers as Record<string, any>).map((c) => ({
        customerCode: c.customerCode, customerName: c.customerName,
      })));
    }
    if (soSnap.exists()) setSalesOrders(soSnap.val());
  };

  // ── Creation helpers ──────────────────────────────────────────────────────────
  const handleCustomerChange = (code: string) => {
    const c = customers.find((x) => x.customerCode === code);
    setCustomerId(code);
    setCustomerName(c?.customerName ?? '');
  };

  const handleFGItemChange = (code: string) => {
    const item = fgItems.find((i) => i.fgItemCode === code);
    setLine((l) => ({
      ...l, fgItem: code,
      fgDescription: item?.fgDescription ?? '',
      uom: item?.uom ?? '',
      rmCode: item?.fgRmCode ?? '',
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = storageRef(storage, `so-documents/${Date.now()}_${file.name}`);
      await uploadBytes(path, file);
      const url = await getDownloadURL(path);
      setPoFileName(file.name);
      setPoUploadUrl(url);
      toast({ title: `${file.name} uploaded` });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addLineItem = () => {
    if (!line.fgItem || !line.poQty) {
      toast({ title: 'FG Item and PO Qty are required', variant: 'destructive' });
      return;
    }
    setLineItems((prev) => [...prev, line]);
    setLine(emptyLine);
  };

  const saveSO = async () => {
    if (!poNumber.trim() || !customerId) {
      toast({ title: 'PO Number and Customer are required', variant: 'destructive' });
      return;
    }
    if (lineItems.length === 0) {
      toast({ title: 'Add at least one line item', variant: 'destructive' });
      return;
    }
    const record: SalesOrderRecord = {
      soNumber, poNumber, customerId, customerName,
      poUploadUrl, poFileName, lineItems,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    const newRef = push(ref(database, 'production/salesOrders'));
    await set(newRef, record);
    setSalesOrders((prev) => ({ ...prev, [newRef.key!]: record }));
    toast({ title: `SO ${soNumber || poNumber} saved` });
    setPoNumber(''); setCustomerId(''); setCustomerName('');
    setSoNumber(''); setPoFileName(''); setPoUploadUrl('');
    setLineItems([]);
    setView('summary');
  };

  // ── Approval helpers ──────────────────────────────────────────────────────────
  const selectedSO = appSOKey ? salesOrders[appSOKey] : null;

  // flatten all pending SOs into rows
  const buildRows = (orders: Record<string, SalesOrderRecord>, soKey = '', dueDate = '') => {
    const pending = Object.entries(orders).filter(([, so]) => !so.status || so.status === 'pending');
    const filtered = soKey ? pending.filter(([k]) => k === soKey) : pending;
    return filtered.flatMap(([key, so]) =>
      (Array.isArray(so.lineItems) ? so.lineItems : Object.values(so.lineItems || {})).map((li: LineItem) => ({
        ...li,
        soNo: so.soNumber || so.poNumber,
        poNo: so.poNumber,
        customerName: so.customerName,
        orderDate: new Date(so.createdAt).toLocaleDateString(),
        soKey: key,
        selected: false,
      }))
    ).filter((r) => !dueDate || r.dueDate === dueDate);
  };

  const handleSOSelect = (key: string) => {
    setAppSOKey(key);
    // auto-refresh rows with the new SO filter applied
    setApprovalRows(buildRows(salesOrders, key, appDueDate));
  };

  const handleLoad = () => {
    setApprovalRows(buildRows(salesOrders, appSOKey, appDueDate));
  };

  const toggleRow = (idx: number) =>
    setApprovalRows((rows) => rows.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r));

  const toggleAll = (checked: boolean) =>
    setApprovalRows((rows) => rows.map((r) => ({ ...r, selected: checked })));

  const applyDecision = async (decision: 'approved' | 'rejected') => {
    const hasSelection = approvalRows.some((r) => r.selected);
    if (!hasSelection) {
      toast({ title: 'Select at least one row', variant: 'destructive' });
      return;
    }
    // get unique SO keys from selected rows
    const keys = [...new Set(approvalRows.filter((r) => r.selected).map((r) => r.soKey))];
    await Promise.all(keys.map((k) =>
      update(ref(database, `production/salesOrders/${k}`), { status: decision })
    ));
    setSalesOrders((prev) => {
      const next = { ...prev };
      keys.forEach((k) => { next[k] = { ...next[k], status: decision }; });
      return next;
    });
    toast({ title: `${keys.length} SO(s) ${decision}` });
    setAppSOKey(''); setAppDueDate('');
    setApprovalRows(buildRows(
      { ...salesOrders, ...Object.fromEntries(keys.map((k) => [k, { ...salesOrders[k], status: decision }])) }
    ));
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string }[] = [
    { key: 'creation', label: 'Sales Order Creation' },
    { key: 'approval', label: 'Sales Order Approval' },
  ];

  const pendingSOs = Object.entries(salesOrders).filter(([, so]) => !so.status || so.status === 'pending');

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Sub-nav */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button key={tab.key}
            onClick={async () => {
              setActiveTab(tab.key);
              setView('summary');
              const soSnap = await get(ref(database, 'production/salesOrders'));
              const orders = soSnap.exists() ? soSnap.val() : {};
              setSalesOrders(orders);
              if (tab.key === 'approval') {
                setAppSOKey(''); setAppDueDate('');
                setApprovalRows(buildRows(orders));
              }
            }}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {/* ══ CREATION TAB ══════════════════════════════════════════════════════════ */}
      {activeTab === 'creation' && (
        <div className="space-y-4">
          {/* breadcrumb — only in form view */}
          {view === 'form' && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="hover:text-foreground cursor-pointer" onClick={() => setView('summary')}>SO Summary</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-primary font-medium">SO Creation</span>
            </div>
          )}

          {/* Summary list */}
          {view === 'summary' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">SO Summary</h2>
                <Button onClick={() => setView('form')} className="bg-primary">
                  <Plus className="h-4 w-4 mr-1" /> New SO
                </Button>
              </div>
              <Card>
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SO Number</TableHead>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(salesOrders).map(([id, so]) => (
                        <TableRow key={id}>
                          <TableCell className="font-medium text-primary">{so.soNumber}</TableCell>
                          <TableCell>{so.poNumber}</TableCell>
                          <TableCell>{so.customerName}</TableCell>
                          <TableCell>{so.lineItems?.length ?? 0}</TableCell>
                          <TableCell>{new Date(so.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${STATUS_BADGE[so.status ?? 'pending']}`}>
                              {so.status ?? 'pending'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {Object.keys(salesOrders).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No sales orders yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Creation form */}
          {view === 'form' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">SO Creation</h2>

              {/* Header card */}
              <Card>
                <CardContent className="pt-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    <div className="space-y-1">
                      <Label>PO Number <span className="text-red-500">*</span></Label>
                      <Input placeholder="Enter PO number" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Customer Id <span className="text-red-500">*</span></Label>
                      <Select value={customerId} onValueChange={handleCustomerChange}>
                        <SelectTrigger><SelectValue placeholder="-- SELECT --" /></SelectTrigger>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.customerCode} value={c.customerCode}>{c.customerCode}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Customer Name</Label>
                      <Input readOnly value={customerName} className="bg-muted" placeholder="Auto-filled" />
                    </div>
                    <div className="space-y-1">
                      <Label>SO Number</Label>
                      <Input placeholder="Enter SO number" value={soNumber} onChange={(e) => setSoNumber(e.target.value)} />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label>PO Upload</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={poFileName} placeholder="No file chosen"
                          className="flex-1 cursor-pointer" onClick={() => fileRef.current?.click()} />
                        <Button variant="outline" className="border-primary text-primary"
                          disabled={uploading} onClick={() => fileRef.current?.click()}>
                          {uploading ? 'Uploading…' : 'Browse'}
                        </Button>
                        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
                      </div>
                      {poUploadUrl && (
                        <a href={poUploadUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                          View uploaded file
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line item card */}
              <Card>
                <CardContent className="pt-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    <div className="space-y-1">
                      <Label>FG Item <span className="text-red-500">*</span></Label>
                      <Select value={line.fgItem} onValueChange={handleFGItemChange}>
                        <SelectTrigger><SelectValue placeholder="-- SELECT --" /></SelectTrigger>
                        <SelectContent>
                          {fgItems.map((i) => (
                            <SelectItem key={i.fgItemCode} value={i.fgItemCode}>{i.fgItemCode}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>FG Item Description</Label>
                      <Input readOnly value={line.fgDescription} className="bg-muted" placeholder="Auto-filled" />
                    </div>
                    <div className="space-y-1">
                      <Label>UOM</Label>
                      <Input readOnly value={line.uom} className="bg-muted" placeholder="Auto-filled" />
                    </div>
                    <div className="space-y-1">
                      <Label>PO Qty <span className="text-red-500">*</span></Label>
                      <Input type="number" value={line.poQty}
                        onChange={(e) => setLine({ ...line, poQty: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Unit Price</Label>
                      <Input type="number" value={line.unitPrice}
                        onChange={(e) => setLine({ ...line, unitPrice: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Due Date</Label>
                      <Input type="date" value={line.dueDate}
                        onChange={(e) => setLine({ ...line, dueDate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>RM Code <span className="text-red-500">*</span></Label>
                      <Select value={line.rmCode} onValueChange={(v) => setLine({ ...line, rmCode: v })}>
                        <SelectTrigger><SelectValue placeholder="-- SELECT --" /></SelectTrigger>
                        <SelectContent>
                          {rmCodes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Reference No</Label>
                      <Input placeholder="Enter reference no" value={line.referenceNo}
                        onChange={(e) => setLine({ ...line, referenceNo: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={addLineItem} className="bg-green-600 hover:bg-green-700 text-white">
                      <Plus className="h-4 w-4 mr-1" /> ADD
                    </Button>
                    <Button onClick={() => setLine(emptyLine)} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                      CLEAR
                    </Button>
                  </div>

                  {lineItems.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>FG Item</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>UOM</TableHead>
                          <TableHead>PO Qty</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>RM Code</TableHead>
                          <TableHead>Ref No</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell className="font-medium">{item.fgItem}</TableCell>
                            <TableCell>{item.fgDescription}</TableCell>
                            <TableCell>{item.uom}</TableCell>
                            <TableCell>{item.poQty}</TableCell>
                            <TableCell>{item.unitPrice}</TableCell>
                            <TableCell>{item.dueDate}</TableCell>
                            <TableCell>{item.rmCode}</TableCell>
                            <TableCell>{item.referenceNo}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button onClick={saveSO} className="bg-primary px-8">Save SO</Button>
                <Button variant="outline" onClick={() => setView('summary')}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ APPROVAL TAB ══════════════════════════════════════════════════════════ */}
      {activeTab === 'approval' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">SO Approval</h2>

          {/* Filter card */}
          <Card>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4 items-end">
                <div className="space-y-1">
                  <Label>SO No</Label>
                  <Select value={appSOKey} onValueChange={handleSOSelect}>
                    <SelectTrigger><SelectValue placeholder="-- SELECT --" /></SelectTrigger>
                    <SelectContent>
                      {pendingSOs.length === 0 && (
                        <SelectItem value="_none" disabled>No pending SOs</SelectItem>
                      )}
                      {pendingSOs.map(([key, so]) => (
                        <SelectItem key={key} value={key}>{so.soNumber || so.poNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>PO No</Label>
                  <Input readOnly value={selectedSO?.poNumber ?? ''} className="bg-muted" placeholder="Auto-filled" />
                </div>
                <div className="space-y-1">
                  <Label>Customer Name</Label>
                  <Input readOnly value={selectedSO?.customerName ?? ''} className="bg-muted" placeholder="Auto-filled" />
                </div>
                <div className="space-y-1">
                  <Label>Due Date</Label>
                  <Input type="date" value={appDueDate} onChange={(e) => setAppDueDate(e.target.value)} />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={handleLoad} className="bg-primary px-8" disabled={!appSOKey}>
                  Load
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SO Pending Details */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                SO Pending Details
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={approvalRows.length > 0 && approvalRows.every((r) => r.selected)}
                        onCheckedChange={(v) => toggleAll(!!v)}
                      />
                    </TableHead>
                    <TableHead>S.No</TableHead>
                    <TableHead>SO No</TableHead>
                    <TableHead>PO No</TableHead>
                    <TableHead>Cus Name</TableHead>
                    <TableHead>FG Item Code</TableHead>
                    <TableHead>FG Item Name</TableHead>
                    <TableHead>PO Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalRows.map((row, idx) => (
                    <TableRow key={idx} className={row.selected ? 'bg-blue-50' : ''}>
                      <TableCell>
                        <Checkbox checked={row.selected} onCheckedChange={() => toggleRow(idx)} />
                      </TableCell>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium text-primary">{row.soNo}</TableCell>
                      <TableCell>{row.poNo}</TableCell>
                      <TableCell>{row.customerName}</TableCell>
                      <TableCell>{row.fgItem}</TableCell>
                      <TableCell>{row.fgDescription}</TableCell>
                      <TableCell>{row.poQty}</TableCell>
                      <TableCell>{row.unitPrice}</TableCell>
                      <TableCell>{row.orderDate}</TableCell>
                      <TableCell>{row.dueDate}</TableCell>
                    </TableRow>
                  ))}
                  {approvalRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        No pending SO line items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Approve / Reject */}
          {approvalRows.length > 0 && (
            <div className="flex gap-3">
              <Button onClick={() => applyDecision('rejected')}
                className="bg-red-500 hover:bg-red-600 text-white px-6">
                Reject
              </Button>
              <Button onClick={() => applyDecision('approved')}
                className="bg-green-600 hover:bg-green-700 text-white px-6">
                Approve
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
