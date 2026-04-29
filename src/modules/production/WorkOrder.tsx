import { useState, useEffect, useMemo } from 'react';
import { CheckSquare, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { database } from '@/services/firebase';
import { ref, get, push, set, update } from 'firebase/database';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SORecord {
  soNumber: string;
  poNumber: string;
  customerId: string;
  customerName: string;
  status: string;
  lineItems: {
    fgItem: string;
    fgDescription: string;
    uom: string;
    poQty: string;
    dueDate: string;
  }[];
}

interface FGItemRecord {
  fgItemCode: string;
  fgDescription: string;
  finishSizeL: string;
  finishSizeW: string;
  finishSizeH: string;
  customerGroup: string;
}

interface RMItemRecord {
  rmCode: string;
  rmDescription: string;
  gradeCode: string;
}

interface RouteRecord {
  routeId: string;
  routeName: string;
}

interface ProcessTypeRecord {
  processTypeName: string;
}

interface ProcessMasterRecord {
  processId: string;
  processName: string;
  processType: string;
}

interface ItemRouteRecord {
  itemCode: string;
  routeCode: string;
  routeType: string;
}

interface RouteSeqRow {
  processType: string;
  processName: string;
  productionMethod: string;
  location: string;
  processDueDate: string;
}

const PRODUCTION_METHODS = ['In-House Within Location', 'In-House Different Location', 'Outsourced'];
const emptyRouteSeqHeader = { routeId: '', routeName: '', routeType: '' };

interface WorkOrderRecord {
  workOrderType: string;
  poNo: string;
  soNo: string;
  workOrderNo: string;
  createDate: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerGroup: string;
  fgItem: string;
  fgDescription: string;
  finishingSize: string;
  poQty: string;
  requiredQty: string;
  createdAt: string;
}

const emptyForm = {
  workOrderType: '',
  poNo: '',
  soNo: '',
  workOrderNo: '',
  createDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  customerId: '',
  customerName: '',
  customerGroup: '',
  fgItem: '',
  fgDescription: '',
  finishingSize: '',
  poQty: '0.00',
  requiredQty: '0.000',
};

const emptyDetail = {
  warehouse: '',
  rmGrade: '',
  materialCode: '',
  sizeL: '0.00',
  sizeW: '0.00',
  sizeH: '0.00',
  rmCode: '',
  stockInHand: '0.000',
  dieNoL: '0.00',
  dieNoW: '0.00',
  dieNoH: '0.00',
  requiredQty: '0.000',
  tubeQty: '0.000',
  totalWeight: '0.00',
  toolSize: '0.000',
};

const WORK_ORDER_TYPES = ['Production', 'ReProcess', 'Scheduling'];

// ── Component ──────────────────────────────────────────────────────────────────

export default function WorkOrder() {
  const [approvedSOs,    setApprovedSOs]    = useState<Record<string, SORecord>>({});
  const [fgItemMap,      setFgItemMap]      = useState<Record<string, FGItemRecord>>({});
  const [workOrders,     setWorkOrders]     = useState<Record<string, WorkOrderRecord>>({});
  const [rmItems,        setRmItems]        = useState<RMItemRecord[]>([]);
  const [warehouses,     setWarehouses]     = useState<string[]>([]);
  const [form,           setForm]           = useState(emptyForm);
  const [showDetailForm, setShowDetailForm] = useState(false);
  const [detailForm,     setDetailForm]     = useState(emptyDetail);
  const [lastWoKey,      setLastWoKey]      = useState('');
  const [editingKey,     setEditingKey]     = useState<string | null>(null);

  // Route Sequence state
  const [routes,          setRoutes]          = useState<RouteRecord[]>([]);
  const [processTypes,    setProcessTypes]    = useState<ProcessTypeRecord[]>([]);
  const [processMasters,  setProcessMasters]  = useState<ProcessMasterRecord[]>([]);
  const [itemRoutes,      setItemRoutes]      = useState<ItemRouteRecord[]>([]);
  const [showRouteSeq,    setShowRouteSeq]    = useState(false);
  const [routeSeqHeader,  setRouteSeqHeader]  = useState(emptyRouteSeqHeader);
  const [routeSeqRows,    setRouteSeqRows]    = useState<RouteSeqRow[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [soSnap, matSnap, woSnap, salesSnap] = await Promise.all([
      get(ref(database, 'production/salesOrders')),
      get(ref(database, 'masters/material')),
      get(ref(database, 'production/workOrders')),
      get(ref(database, 'masters/sales/warehouses')),
    ]);
    // Load route/process masters separately
    const [routeSnap, ptSnap, pmSnap, irSnap] = await Promise.all([
      get(ref(database, 'masters/material/routes')),
      get(ref(database, 'masters/material/processTypes')),
      get(ref(database, 'masters/material/processes')),
      get(ref(database, 'masters/material/itemRoutes')),
    ]);
    if (routeSnap.exists())
      setRoutes(Object.values(routeSnap.val() as Record<string, RouteRecord>));
    if (ptSnap.exists())
      setProcessTypes(Object.values(ptSnap.val() as Record<string, ProcessTypeRecord>));
    if (pmSnap.exists())
      setProcessMasters(Object.values(pmSnap.val() as Record<string, ProcessMasterRecord>));
    if (irSnap.exists())
      setItemRoutes(Object.values(irSnap.val() as Record<string, ItemRouteRecord>));

    if (soSnap.exists()) {
      const all = soSnap.val() as Record<string, SORecord>;
      const approved: Record<string, SORecord> = {};
      Object.entries(all).forEach(([k, v]) => {
        if (v.status === 'approved') approved[k] = v;
      });
      setApprovedSOs(approved);
    }

    if (matSnap.exists()) {
      const itemsRaw = Object.values((matSnap.val().items || {}) as Record<string, any>);

      const fgMap: Record<string, FGItemRecord> = {};
      itemsRaw.filter((i: any) => i.itemType === 'FG').forEach((i: any) => {
        fgMap[i.fgItemCode] = {
          fgItemCode: i.fgItemCode,
          fgDescription: i.fgDescription,
          finishSizeL: i.finishSizeL || '',
          finishSizeW: i.finishSizeW || '',
          finishSizeH: i.finishSizeH || '',
          customerGroup: i.customerGroup || '',
        };
      });
      setFgItemMap(fgMap);

      const rms: RMItemRecord[] = itemsRaw
        .filter((i: any) => i.itemType === 'RM' && i.rmCode)
        .map((i: any) => ({
          rmCode: i.rmCode || '',
          rmDescription: i.rmDescription || '',
          gradeCode: i.gradeCode || '',
        }));
      setRmItems(rms);
    }

    if (woSnap.exists()) setWorkOrders(woSnap.val());

    if (salesSnap.exists()) {
      const val = salesSnap.val();
      const list: string[] = Array.isArray(val)
        ? val.filter(Boolean)
        : Object.values(val as Record<string, string>).filter(Boolean);
      setWarehouses(list);
    }
  };

  // Unique RM grades for dropdown
  const rmGrades = useMemo(() => {
    const seen = new Set<string>();
    return rmItems.filter(i => i.gradeCode && !seen.has(i.gradeCode) && !!seen.add(i.gradeCode));
  }, [rmItems]);

  // Auto-calculate Qty/Tube
  const qtyPerTube = useMemo(() => {
    const rq = parseFloat(detailForm.requiredQty) || 0;
    const tq = parseFloat(detailForm.tubeQty) || 0;
    if (tq === 0) return '0.00';
    return (rq / tq).toFixed(2);
  }, [detailForm.requiredQty, detailForm.tubeQty]);

  // When SO is selected, auto-fill from first line item
  const handleSOChange = (soKey: string) => {
    const so = approvedSOs[soKey];
    if (!so) return;

    const li = Array.isArray(so.lineItems)
      ? so.lineItems[0]
      : Object.values(so.lineItems || {})[0] as any;

    const fg = li ? fgItemMap[li.fgItem] : undefined;
    const finishingSize = fg
      ? [fg.finishSizeL, fg.finishSizeW, fg.finishSizeH].filter(Boolean).join(' x ')
      : '';

    setForm((f) => ({
      ...f,
      soNo: soKey,
      poNo: so.poNumber,
      customerId: so.customerId,
      customerName: so.customerName,
      customerGroup: fg?.customerGroup || '',
      fgItem: li?.fgItem || '',
      fgDescription: li?.fgDescription || '',
      finishingSize,
      dueDate: li?.dueDate || '',
      poQty: li?.poQty || '0.00',
    }));
  };

  const handleRmGradeChange = (grade: string) => {
    const found = rmItems.find(i => i.gradeCode === grade);
    setDetailForm(d => ({ ...d, rmGrade: grade, rmCode: found?.rmCode || '' }));
  };

  const handleWorkOrderInput = async () => {
    if (!form.workOrderType || !form.soNo) {
      toast({ title: 'Work Order Type and SO No are required', variant: 'destructive' });
      return;
    }

    if (editingKey) {
      // Update existing record
      const record: WorkOrderRecord = { ...form, createdAt: workOrders[editingKey]?.createdAt ?? new Date().toISOString() };
      await set(ref(database, `production/workOrders/${editingKey}`), record);
      setWorkOrders((prev) => ({ ...prev, [editingKey]: record }));
      toast({ title: `Work Order ${form.workOrderNo} updated` });
      setEditingKey(null);
      setForm(emptyForm);
      return;
    }

    // Create new record
    const count = Object.keys(workOrders).length + 1;
    const now = new Date();
    const woNo = `WO${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(count).padStart(4, '0')}`;

    const record: WorkOrderRecord = {
      ...form,
      workOrderNo: woNo,
      createdAt: new Date().toISOString(),
    };
    const newRef = push(ref(database, 'production/workOrders'));
    await set(newRef, record);
    setWorkOrders((prev) => ({ ...prev, [newRef.key!]: record }));
    toast({ title: `Work Order ${woNo} created` });
    setLastWoKey(newRef.key!);
    setDetailForm(emptyDetail);
    setShowDetailForm(true);
    setForm(emptyForm);
  };

  const handleRouteSequence = async () => {
    if (!lastWoKey) return;
    await update(ref(database, `production/workOrders/${lastWoKey}`), {
      detail: { ...detailForm, qtyPerTube },
    });
    // Initialise rows from all process types
    setRouteSeqRows(
      processTypes.map(pt => ({
        processType: pt.processTypeName,
        processName: '',
        productionMethod: '',
        location: '',
        processDueDate: '',
      }))
    );
    setRouteSeqHeader(emptyRouteSeqHeader);
    setShowRouteSeq(true);
  };

  const handleRouteIdChange = (routeId: string) => {
    const route = routes.find(r => r.routeId === routeId);
    const fgItem = workOrders[lastWoKey]?.fgItem || '';
    const ir = itemRoutes.find(r => r.routeCode === routeId && r.itemCode === fgItem);
    setRouteSeqHeader({
      routeId,
      routeName: route?.routeName || '',
      routeType: ir?.routeType || '',
    });
  };

  const updateRouteSeqRow = (idx: number, field: keyof RouteSeqRow, value: string) => {
    setRouteSeqRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleSaveRouteSeq = async () => {
    if (!routeSeqHeader.routeId) {
      toast({ title: 'Please select a Route ID', variant: 'destructive' });
      return;
    }
    await update(ref(database, `production/workOrders/${lastWoKey}`), {
      routeSequence: { header: routeSeqHeader, rows: routeSeqRows },
    });
    toast({ title: 'Route Sequence saved' });
    setShowRouteSeq(false);
  };

  const handleEdit = (key: string, wo: WorkOrderRecord) => {
    setForm({
      workOrderType: wo.workOrderType,
      poNo:          wo.poNo,
      soNo:          wo.soNo,
      workOrderNo:   wo.workOrderNo,
      createDate:    wo.createDate,
      dueDate:       wo.dueDate,
      customerId:    wo.customerId,
      customerName:  wo.customerName,
      customerGroup: wo.customerGroup,
      fgItem:        wo.fgItem,
      fgDescription: wo.fgDescription,
      finishingSize: wo.finishingSize,
      poQty:         wo.poQty,
      requiredQty:   wo.requiredQty,
    });
    setEditingKey(key);
    setShowDetailForm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckStocks = () => {
    if (!form.fgItem) {
      toast({ title: 'Select an SO first', variant: 'destructive' });
      return;
    }
    toast({ title: `Stock check for ${form.fgItem} — coming soon` });
  };

  const readOnly = 'bg-muted text-muted-foreground';

  return (
    <div className="space-y-6">
      {/* ── Main Form Card ──────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6 space-y-5">

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
            <div className="space-y-1">
              <Label>Work Order Type <span className="text-red-500">*</span></Label>
              <Select value={form.workOrderType} onValueChange={(v) => setForm({ ...form, workOrderType: v })}>
                <SelectTrigger><SelectValue placeholder="-- SELECT --" /></SelectTrigger>
                <SelectContent>
                  {WORK_ORDER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>SO No <span className="text-red-500">*</span></Label>
              <Select value={form.soNo} onValueChange={handleSOChange}>
                <SelectTrigger><SelectValue placeholder="-- SELECT --" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(approvedSOs).length === 0 && (
                    <SelectItem value="_none" disabled>No approved SOs</SelectItem>
                  )}
                  {Object.entries(approvedSOs).map(([key, so]) => (
                    <SelectItem key={key} value={key}>{so.soNumber || so.poNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Work Order No</Label>
              <Input readOnly value={form.workOrderNo} className={readOnly} placeholder="Auto-generated on save" />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
            <div className="space-y-1">
              <Label>PO No <span className="text-red-500">*</span></Label>
              <Input readOnly value={form.poNo} className={readOnly} placeholder="Auto-filled from SO" />
            </div>
            <div className="space-y-1">
              <Label>Create Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.createDate}
                onChange={(e) => setForm({ ...form, createDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Due Date</Label>
              <Input readOnly value={form.dueDate} className={readOnly} placeholder="Auto-filled from SO" />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
            <div className="space-y-1">
              <Label>Customer ID</Label>
              <Input readOnly value={form.customerId} className={readOnly} placeholder="Auto-filled" />
            </div>
            <div className="space-y-1">
              <Label>Customer Name</Label>
              <Input readOnly value={form.customerName} className={readOnly} placeholder="Auto-filled" />
            </div>
            <div className="space-y-1">
              <Label>Customer Group</Label>
              <Input readOnly value={form.customerGroup} className={readOnly} placeholder="Auto-filled" />
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
            <div className="space-y-1">
              <Label>FG Item</Label>
              <Input readOnly value={form.fgItem} className={readOnly} placeholder="Auto-filled" />
            </div>
            <div className="space-y-1">
              <Label>FG Item Description</Label>
              <Input readOnly value={form.fgDescription} className={readOnly} placeholder="Auto-filled" />
            </div>
            <div className="space-y-1">
              <Label>Finishing Size</Label>
              <Input readOnly value={form.finishingSize} className={readOnly} placeholder="Auto-filled" />
            </div>
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
            <div className="space-y-1">
              <Label>PO Qty</Label>
              <Input readOnly value={form.poQty} className={readOnly} />
            </div>
            <div className="space-y-1">
              <Label>Required Qty</Label>
              <Input type="number" placeholder="0.000" value={form.requiredQty}
                onChange={(e) => setForm({ ...form, requiredQty: e.target.value })} />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-2">
            {editingKey && (
              <Button variant="outline" onClick={() => { setEditingKey(null); setForm(emptyForm); }}
                className="px-6">
                Cancel Edit
              </Button>
            )}
            <Button onClick={handleWorkOrderInput} className="bg-slate-700 hover:bg-slate-800 text-white px-6">
              {editingKey ? 'Update Work Order' : 'Work Order Input'}
            </Button>
            <Button onClick={handleCheckStocks}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 flex items-center gap-2">
              <CheckSquare className="h-4 w-4" /> Check Stocks
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Production Detail Card (appears after WO is created) ────────────── */}
      {showDetailForm && (
        <Card>
          <CardContent className="pt-6 space-y-5">

            {/* Row 1: Warehouse */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <Label>Warehouse <span className="text-red-500">*</span></Label>
                <Select value={detailForm.warehouse}
                  onValueChange={(v) => setDetailForm(d => ({ ...d, warehouse: v }))}>
                  <SelectTrigger><SelectValue placeholder="-- SELECT --" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.length === 0 && (
                      <SelectItem value="_none" disabled>No warehouses — add in Sales Master</SelectItem>
                    )}
                    {warehouses.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: RM Grade | Material Code | Size */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <Label>RM Grade <span className="text-red-500">*</span></Label>
                <Select value={detailForm.rmGrade} onValueChange={handleRmGradeChange}>
                  <SelectTrigger><SelectValue placeholder="-- SELECT --" /></SelectTrigger>
                  <SelectContent>
                    {rmGrades.length === 0 && (
                      <SelectItem value="_none" disabled>No RM grades found</SelectItem>
                    )}
                    {rmGrades.map(g => (
                      <SelectItem key={g.gradeCode} value={g.gradeCode}>{g.gradeCode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Material Code <span className="text-red-500">*</span></Label>
                <Select value={detailForm.materialCode}
                  onValueChange={(v) => setDetailForm(d => ({ ...d, materialCode: v }))}>
                  <SelectTrigger><SelectValue placeholder="---SELECT---" /></SelectTrigger>
                  <SelectContent>
                    {rmItems.length === 0 && (
                      <SelectItem value="_none" disabled>No materials found</SelectItem>
                    )}
                    {rmItems.map(i => (
                      <SelectItem key={i.rmCode} value={i.rmCode}>{i.rmCode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Size</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="0.00" value={detailForm.sizeL}
                    onChange={(e) => setDetailForm(d => ({ ...d, sizeL: e.target.value }))} />
                  <Input type="number" placeholder="0.00" value={detailForm.sizeW}
                    onChange={(e) => setDetailForm(d => ({ ...d, sizeW: e.target.value }))} />
                  <Input type="number" placeholder="0.00" value={detailForm.sizeH}
                    onChange={(e) => setDetailForm(d => ({ ...d, sizeH: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Row 3: RM Code | Stock In Hand | Die No */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <Label>RM Code <span className="text-red-500">*</span></Label>
                <Input readOnly value={detailForm.rmCode} className={readOnly}
                  placeholder="Auto-filled from RM Grade" />
              </div>
              <div className="space-y-1">
                <Label>Stock In Hand</Label>
                <Input readOnly value={detailForm.stockInHand} className={readOnly} />
              </div>
              <div className="space-y-1">
                <Label>Die No</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="0.00" value={detailForm.dieNoL}
                    onChange={(e) => setDetailForm(d => ({ ...d, dieNoL: e.target.value }))} />
                  <Input type="number" placeholder="0.00" value={detailForm.dieNoW}
                    onChange={(e) => setDetailForm(d => ({ ...d, dieNoW: e.target.value }))} />
                  <Input type="number" placeholder="0.00" value={detailForm.dieNoH}
                    onChange={(e) => setDetailForm(d => ({ ...d, dieNoH: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Row 4: Required Qty | Tube Qty | Qty/Tube */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <Label>Required Qty <span className="text-red-500">*</span></Label>
                <Input type="number" placeholder="0.000" value={detailForm.requiredQty}
                  onChange={(e) => setDetailForm(d => ({ ...d, requiredQty: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Tube Qty <span className="text-red-500">*</span></Label>
                <Input type="number" placeholder="0.000" value={detailForm.tubeQty}
                  onChange={(e) => setDetailForm(d => ({ ...d, tubeQty: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Qty/Tube</Label>
                <Input readOnly value={qtyPerTube} className={readOnly} />
              </div>
            </div>

            {/* Row 5: Total Weight | Tool Size */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <Label>Total Weight <span className="text-red-500">*</span></Label>
                <Input type="number" placeholder="0.00" value={detailForm.totalWeight}
                  onChange={(e) => setDetailForm(d => ({ ...d, totalWeight: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Tool Size</Label>
                <Input type="number" placeholder="0.000" value={detailForm.toolSize}
                  onChange={(e) => setDetailForm(d => ({ ...d, toolSize: e.target.value }))} />
              </div>
            </div>

            {/* Route Sequence button */}
            <div className="flex justify-end pt-2">
              <Button onClick={handleRouteSequence}
                className="bg-slate-700 hover:bg-slate-800 text-white px-6">
                Route Sequence
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Route Sequence Section ──────────────────────────────────────────── */}
      {showRouteSeq && (
        <Card>
          <CardContent className="pt-6 space-y-5">

            {/* Header row: Route ID | Route Name | Route Type (dropdown) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <Label>Route ID <span className="text-red-500">*</span></Label>
                <Select value={routeSeqHeader.routeId} onValueChange={handleRouteIdChange}>
                  <SelectTrigger><SelectValue placeholder="-- SELECT --" /></SelectTrigger>
                  <SelectContent>
                    {routes.length === 0 && (
                      <SelectItem value="_none" disabled>No routes in Route Master</SelectItem>
                    )}
                    {routes.map(r => (
                      <SelectItem key={r.routeId} value={r.routeId}>{r.routeId}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Route Name</Label>
                <Input readOnly value={routeSeqHeader.routeName}
                  className="bg-muted text-muted-foreground" placeholder="Auto-filled from Route ID" />
              </div>
              <div className="space-y-1">
                <Label>Route Type <span className="text-red-500">*</span></Label>
                <Select value={routeSeqHeader.routeType}
                  onValueChange={(v) => {
                    setRouteSeqHeader(h => ({ ...h, routeType: v }));
                    // Build process rows when both Route ID and Route Type are set
                    if (routeSeqHeader.routeId) {
                      setRouteSeqRows(processTypes.map(pt => ({
                        processType: pt.processTypeName,
                        processName: '',
                        productionMethod: '',
                        location: '',
                        processDueDate: '',
                      })));
                    }
                  }}>
                  <SelectTrigger><SelectValue placeholder="-- SELECT --" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="Alternate">Alternate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Process table — shown only after both Route ID and Route Type selected */}
            {routeSeqHeader.routeId && routeSeqHeader.routeType && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead className="w-12">S.No</TableHead>
                      <TableHead>Process Type</TableHead>
                      <TableHead>Process Name</TableHead>
                      <TableHead>Production Method</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Process Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routeSeqRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                          No process types found — add them in Material Master → Process → Process Type Master
                        </TableCell>
                      </TableRow>
                    )}
                    {routeSeqRows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{row.processType}</TableCell>

                        {/* Process Name — filtered by process type */}
                        <TableCell>
                          <Select value={row.processName}
                            onValueChange={(v) => updateRouteSeqRow(idx, 'processName', v)}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {processMasters.filter(p => p.processType === row.processType).map(p => (
                                <SelectItem key={p.processId} value={p.processName}>{p.processName}</SelectItem>
                              ))}
                              {processMasters.filter(p => p.processType === row.processType).length === 0 && (
                                <SelectItem value="_none" disabled>No processes for this type</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Production Method */}
                        <TableCell>
                          <Select value={row.productionMethod}
                            onValueChange={(v) => updateRouteSeqRow(idx, 'productionMethod', v)}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {PRODUCTION_METHODS.map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Location */}
                        <TableCell>
                          <Input className="h-8 text-sm" placeholder="Enter location"
                            value={row.location}
                            onChange={(e) => updateRouteSeqRow(idx, 'location', e.target.value)} />
                        </TableCell>

                        {/* Process Due Date */}
                        <TableCell>
                          <Input type="date" className="h-8 text-sm"
                            value={row.processDueDate}
                            onChange={(e) => updateRouteSeqRow(idx, 'processDueDate', e.target.value)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Save / Clear / Cancel */}
            <div className="flex gap-3 justify-end pt-2">
              <Button onClick={handleSaveRouteSeq}
                className="bg-green-600 hover:bg-green-700 text-white px-6">Save</Button>
              <Button onClick={() => {
                  setRouteSeqHeader(emptyRouteSeqHeader);
                  setRouteSeqRows([]);
                }}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-6">Clear</Button>
              <Button onClick={() => { setShowRouteSeq(false); setRouteSeqHeader(emptyRouteSeqHeader); setRouteSeqRows([]); }}
                className="bg-red-500 hover:bg-red-600 text-white px-6">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Work Orders Table ────────────────────────────────────────────────── */}
      {Object.keys(workOrders).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WO No</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>SO No</TableHead>
                  <TableHead>PO No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>FG Item</TableHead>
                  <TableHead>PO Qty</TableHead>
                  <TableHead>Req Qty</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(workOrders).map(([id, wo]) => (
                  <TableRow key={id} className={editingKey === id ? 'bg-amber-50' : ''}>
                    <TableCell className="font-medium text-primary">{wo.workOrderNo}</TableCell>
                    <TableCell>{wo.workOrderType}</TableCell>
                    <TableCell>{approvedSOs[wo.soNo]?.soNumber || wo.soNo}</TableCell>
                    <TableCell>{wo.poNo}</TableCell>
                    <TableCell>{wo.customerName}</TableCell>
                    <TableCell>{wo.fgItem}</TableCell>
                    <TableCell>{wo.poQty}</TableCell>
                    <TableCell>{wo.requiredQty}</TableCell>
                    <TableCell>{wo.dueDate}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost"
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8 p-0"
                        onClick={() => handleEdit(id, wo)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
