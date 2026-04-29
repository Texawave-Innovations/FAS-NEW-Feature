// src/pages/RecycleBin.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Trash2, RotateCcw, AlertTriangle, RefreshCw,
  ChevronDown, ChevronRight, Search, Shield,
  Package, Receipt, ShoppingCart, FileText,
  Truck, Users, BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getDeletedRecords, restoreRecord, deleteRecord } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';

// ─── Module Configuration ────────────────────────────────────────────────────

interface ModuleConfig {
  key: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  color: string;
  labelField: string;   // the field to display as the record's name
  dateField?: string;   // optional date field for display
  secondaryField?: string;
}

const MODULES: ModuleConfig[] = [
  {
    key: 'sales/quotations',
    label: 'Quotations',
    path: 'sales/quotations',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    labelField: 'quoteNumber',
    dateField: 'quoteDate',
    secondaryField: 'customerName',
  },
  {
    key: 'sales/orderAcknowledgements',
    label: 'Orders',
    path: 'sales/orderAcknowledgements',
    icon: <ShoppingCart className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    labelField: 'soNumber',
    dateField: 'soDate',
    secondaryField: 'customerName',
  },
  {
    key: 'sales/invoices',
    label: 'Invoices',
    path: 'sales/invoices',
    icon: <Receipt className="h-4 w-4" />,
    color: 'bg-green-100 text-green-800 border-green-200',
    labelField: 'invoiceNumber',
    dateField: 'invoiceDate',
    secondaryField: 'customerName',
  },
  {
    key: 'sales/shipments',
    label: 'Shipments',
    path: 'sales/shipments',
    icon: <Truck className="h-4 w-4" />,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    labelField: 'shipmentId',
    dateField: 'dispatchDate',
    secondaryField: 'customerName',
  },
  {
    key: 'sales/customers',
    label: 'Customers',
    path: 'sales/customers',
    icon: <Users className="h-4 w-4" />,
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    labelField: 'companyName',
    secondaryField: 'gst',
  },
  {
    key: 'sales/products',
    label: 'Products',
    path: 'sales/products',
    icon: <Package className="h-4 w-4" />,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    labelField: 'productName',
    secondaryField: 'category',
  },
  {
    key: 'sales/leads',
    label: 'Leads',
    path: 'sales/leads',
    icon: <BarChart2 className="h-4 w-4" />,
    color: 'bg-pink-100 text-pink-800 border-pink-200',
    labelField: 'companyName',
    secondaryField: 'contactPerson',
  },
  {
    key: 'sales/deliveryChallans',
    label: 'Delivery Challans',
    path: 'sales/deliveryChallans',
    icon: <Truck className="h-4 w-4" />,
    color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    labelField: 'dcNumber',
    dateField: 'dcDate',
    secondaryField: 'customerName',
  },
  {
    key: 'sales/nrgp',
    label: 'Non-Ret. Gate Pass',
    path: 'sales/nrgp',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-red-100 text-red-800 border-red-200',
    labelField: 'nrgpNumber',
    dateField: 'nrgpDate',
    secondaryField: 'customerName',
  },
  {
    key: 'sales/rgp',
    label: 'Ret. Gate Pass',
    path: 'sales/rgp',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    labelField: 'rgpNumber',
    dateField: 'rgpDate',
    secondaryField: 'customerName',
  },
  {
    key: 'hr/employees',
    label: 'Employees',
    path: 'hr/employees',
    icon: <Users className="h-4 w-4" />,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    labelField: 'name',
    secondaryField: 'department',
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeletedRecord {
  id: string;
  moduleKey: string;
  moduleLabel: string;
  displayName: string;
  secondary?: string;
  deletedAt: number;
  deletedBy?: string;
  dateLabel?: string;
  raw: any;
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  open, title, description, confirmLabel,
  confirmClassName = 'bg-red-600 hover:bg-red-700',
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={confirmClassName}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RecycleBin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Access denied. Admin only.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const [records, setRecords] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Confirm dialogs
  const [restoreTarget, setRestoreTarget] = useState<DeletedRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeletedRecord | null>(null);
  const [bulkDeleteModule, setBulkDeleteModule] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadAllDeleted = useCallback(async () => {
    setLoading(true);
    try {
      const results: DeletedRecord[] = [];

      await Promise.all(
        MODULES.map(async (mod) => {
          try {
            const deleted = await getDeletedRecords(mod.path);
            deleted.forEach((r: any) => {
              const cfg = MODULES.find(m => m.key === mod.key)!;
              results.push({
                id: r.id,
                moduleKey: mod.key,
                moduleLabel: mod.label,
                displayName: r[cfg.labelField] || r.id,
                secondary: cfg.secondaryField ? r[cfg.secondaryField] : undefined,
                deletedAt: r.deleted_at || r.updatedAt || 0,
                deletedBy: r.deleted_by,
                dateLabel: cfg.dateField && r[cfg.dateField]
                  ? (() => {
                      try {
                        const d = new Date(r[cfg.dateField]);
                        return isNaN(d.getTime()) ? undefined : format(d, 'dd MMM yyyy');
                      } catch { return undefined; }
                    })()
                  : undefined,
                raw: r,
              });
            });
          } catch (err) {
            console.error(`Failed to load deleted records for ${mod.key}`, err);
          }
        })
      );

      results.sort((a, b) => b.deletedAt - a.deletedAt);
      setRecords(results);
    } catch (err) {
      toast.error('Failed to load recycle bin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllDeleted();
  }, [loadAllDeleted]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setIsProcessing(true);
    try {
      await restoreRecord(restoreTarget.moduleKey, restoreTarget.id);
      toast.success(`"${restoreTarget.displayName}" restored successfully`);
      setRecords(prev => prev.filter(r => !(r.id === restoreTarget.id && r.moduleKey === restoreTarget.moduleKey)));
    } catch {
      toast.error('Restore failed');
    } finally {
      setRestoreTarget(null);
      setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    try {
      await deleteRecord(deleteTarget.moduleKey, deleteTarget.id);
      toast.success(`"${deleteTarget.displayName}" permanently deleted`);
      setRecords(prev => prev.filter(r => !(r.id === deleteTarget.id && r.moduleKey === deleteTarget.moduleKey)));
    } catch {
      toast.error('Permanent delete failed');
    } finally {
      setDeleteTarget(null);
      setIsProcessing(false);
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (!bulkDeleteModule) return;
    setIsProcessing(true);
    const toDelete = records.filter(r => r.moduleKey === bulkDeleteModule);
    try {
      await Promise.all(toDelete.map(r => deleteRecord(r.moduleKey, r.id)));
      toast.success(`${toDelete.length} record(s) permanently deleted`);
      setRecords(prev => prev.filter(r => r.moduleKey !== bulkDeleteModule));
    } catch {
      toast.error('Bulk delete failed');
    } finally {
      setBulkDeleteModule(null);
      setIsProcessing(false);
    }
  };

  // ─── Filter & Group ─────────────────────────────────────────────────────────

  const filteredRecords = searchQuery.trim()
    ? records.filter(r => {
        const q = searchQuery.toLowerCase();
        return (
          r.displayName.toLowerCase().includes(q) ||
          (r.secondary || '').toLowerCase().includes(q) ||
          (r.deletedBy || '').toLowerCase().includes(q) ||
          r.moduleLabel.toLowerCase().includes(q)
        );
      })
    : records;

  const grouped = MODULES.reduce((acc, mod) => {
    const items = filteredRecords.filter(r => r.moduleKey === mod.key);
    if (items.length > 0) acc[mod.key] = { config: mod, items };
    return acc;
  }, {} as Record<string, { config: ModuleConfig; items: DeletedRecord[] }>);

  const toggleModule = (key: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalCount = filteredRecords.length;

  // ─── Not admin ──────────────────────────────────────────────────────────────

  if (!user || user.role !== 'admin') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Shield className="h-16 w-16 text-red-400" />
          <h2 className="text-2xl font-bold text-red-700">Access Denied</h2>
          <p className="text-gray-500">Only administrators can access the Recycle Bin.</p>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="space-y-6 pb-12">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 rounded-xl">
              <Trash2 className="h-7 w-7 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Recycle Bin</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {totalCount === 0 ? 'No deleted records' : `${totalCount} deleted record${totalCount !== 1 ? 's' : ''} across all modules`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 border-red-200 text-red-700 bg-red-50">
              <Shield className="h-3.5 w-3.5" />
              Admin Only
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllDeleted}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Info Banner ── */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold">Soft-Deleted Records</p>
            <p className="mt-0.5 text-amber-700">
              Records here have been soft-deleted. They are still stored in the database.
              You can <strong>restore</strong> them to their original location or <strong>permanently delete</strong> them to free up storage.
              Permanent deletion cannot be undone.
            </p>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deleted records..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <RefreshCw className="h-10 w-10 text-blue-500 animate-spin" />
            <p className="text-muted-foreground">Loading recycle bin...</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="p-6 bg-green-50 rounded-full">
              <Trash2 className="h-12 w-12 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700">Recycle Bin is Empty</h3>
            <p className="text-muted-foreground max-w-sm">
              {searchQuery ? 'No deleted records match your search.' : 'No records have been soft-deleted yet. When you delete records from any module, they will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.values(grouped).map(({ config, items }) => {
              const isExpanded = expandedModules.has(config.key);

              return (
                <Card key={config.key} className="overflow-hidden border shadow-sm">
                  {/* Module Header */}
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
                    onClick={() => toggleModule(config.key)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
                        {config.icon}
                        {config.label}
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">
                        {items.length} deleted record{items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 text-xs gap-1"
                        onClick={e => {
                          e.stopPropagation();
                          setBulkDeleteModule(config.key);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete All
                      </Button>
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </button>

                  {/* Records Table */}
                  {isExpanded && (
                    <CardContent className="p-0 border-t">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="pl-5">Record</TableHead>
                              <TableHead>Details</TableHead>
                              <TableHead>Deleted By</TableHead>
                              <TableHead>Deleted At</TableHead>
                              <TableHead className="text-right pr-5">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map(record => (
                              <TableRow
                                key={`${record.moduleKey}-${record.id}`}
                                className="hover:bg-red-50/30"
                              >
                                <TableCell className="pl-5 font-semibold text-gray-800 font-mono">
                                  {record.displayName}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {record.secondary && (
                                    <span className="block">{record.secondary}</span>
                                  )}
                                  {record.dateLabel && (
                                    <span className="block text-xs text-gray-400">{record.dateLabel}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {record.deletedBy ? (
                                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 text-xs font-medium">
                                      {record.deletedBy}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {record.deletedAt ? (
                                    <div>
                                      <span className="block">
                                        {format(new Date(record.deletedAt), 'dd MMM yyyy')}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {format(new Date(record.deletedAt), 'HH:mm')}
                                      </span>
                                    </div>
                                  ) : '—'}
                                </TableCell>
                                <TableCell className="pr-5">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50 text-xs"
                                      onClick={() => setRestoreTarget(record)}
                                      disabled={isProcessing}
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />
                                      Restore
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5 text-red-700 border-red-200 hover:bg-red-50 text-xs"
                                      onClick={() => setDeleteTarget(record)}
                                      disabled={isProcessing}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete Forever
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Restore Confirm ── */}
      <ConfirmDialog
        open={!!restoreTarget}
        title="Restore Record"
        description={`Restore "${restoreTarget?.displayName}" back to ${restoreTarget?.moduleLabel}? It will appear in normal queries again.`}
        confirmLabel="Restore"
        confirmClassName="bg-green-600 hover:bg-green-700"
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
      />

      {/* ── Permanent Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Permanently Delete Record"
        description={`Permanently delete "${deleteTarget?.displayName}" from ${deleteTarget?.moduleLabel}? This action CANNOT be undone. The record will be removed from the database forever.`}
        confirmLabel="Delete Forever"
        onConfirm={handlePermanentDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Bulk Delete Confirm ── */}
      <ConfirmDialog
        open={!!bulkDeleteModule}
        title={`Permanently Delete All ${MODULES.find(m => m.key === bulkDeleteModule)?.label || ''}`}
        description={`This will permanently delete ALL ${records.filter(r => r.moduleKey === bulkDeleteModule).length} deleted records from ${MODULES.find(m => m.key === bulkDeleteModule)?.label || ''}. This CANNOT be undone.`}
        confirmLabel="Delete All Forever"
        onConfirm={handleBulkPermanentDelete}
        onCancel={() => setBulkDeleteModule(null)}
      />
    </Layout>
  );
}
