'use client';

import { NavLink, Outlet } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { cn } from '@/lib/utils';
import { LiveClock } from '@/components/layout/LiveClock';

import {
  Home,
  Users,
  Package,
  FileText,
  ShoppingCart,
  ClipboardList,
  Receipt,
  Truck,
  Boxes,
  BadgeMinus,
  BadgeCheck,
  Layers,          // BOM icon
} from 'lucide-react';

// Updated + organized tabs with icons
const salesTabs = [
  {
    id: 'dashboard',
    label: (
      <span className="flex items-center gap-1">
        <Home size={16} />
        Dashboard
      </span>
    ),
    path: '/sales',
  },

  // Master Data
  {
    id: 'customers',
    label: (
      <span className="flex items-center gap-1">
        <Users size={16} />
        Customers
      </span>
    ),
    path: '/sales/customers',
  },
  {
    id: 'products',
    label: (
      <span className="flex items-center gap-1">
        <Package size={16} />
        Items
      </span>
    ),
    path: '/sales/products',
  },

  // Inventory
  // {
  //   id: 'inventory',
  //   label: (
  //     <span className="flex items-center gap-1">
  //       <Boxes size={16} />
  //       Inventory
  //     </span>
  //   ),
  //   path: '/sales/inventory',
  // },

  // BOM – Bill of Materials
  {
    id: 'bom',
    label: (
      <span className="flex items-center gap-1">
        <Layers size={16} />
        BOM
      </span>
    ),
    path: '/sales/bom',
  },

  // Quotations & Orders
  {
    id: 'quotations',
    label: (
      <span className="flex items-center gap-1">
        <FileText size={16} />
        Quotations
      </span>
    ),
    path: '/sales/quotations',
  },
  {
    id: 'orders',
    label: (
      <span className="flex items-center gap-1">
        <ShoppingCart size={16} />
        Orders
      </span>
    ),
    path: '/sales/orders',
  },

  // Invoices & Shipments
  {
    id: 'invoices',
    label: (
      <span className="flex items-center gap-1">
        <Receipt size={16} />
        Invoices
      </span>
    ),
    path: '/sales/invoices',
  },
  {
    id: 'shipments',
    label: (
      <span className="flex items-center gap-1">
        <Truck size={16} />
        Shipments
      </span>
    ),
    path: '/sales/shipments',
  },

  // Delivery Challan
  {
    id: 'challan',
    label: (
      <span className="flex items-center gap-1">
        <ClipboardList size={16} />
        Delivery Challan
      </span>
    ),
    path: '/sales/challan',
  },

  // Non-returnable Gate Pass
  {
    id: 'nr-gatepass',
    label: (
      <span className="flex items-center gap-1">
        <BadgeMinus size={16} />
        Non-returnable Gate Pass
      </span>
    ),
    path: '/sales/ngp',
  },

  // Returnable Gate Pass
  {
    id: 'r-gatepass',
    label: (
      <span className="flex items-center gap-1">
        <BadgeCheck size={16} />
        Returnable Gate Pass
      </span>
    ),
    path: '/sales/gp',
  },
];

export default function SalesLayout() {
  return (
    <Layout>
      <div className="space-y-6 pb-10">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sales Management</h1>
            <p className="text-muted-foreground mt-1">
              Complete end-to-end sales lifecycle control
            </p>
          </div>
          <LiveClock />
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex gap-2 overflow-x-auto no-scrollbar -mb-px">
            {salesTabs.map((tab) => (
              <NavLink
                key={tab.id}
                to={tab.path}
                end={tab.path === '/sales'}
                className={({ isActive }) =>
                  cn(
                    'px-4 py-2 text-sm font-medium rounded-t-md whitespace-nowrap transition-all flex items-center gap-1',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive
                      ? 'bg-background text-primary border-b-2 border-primary shadow-sm'
                      : 'text-muted-foreground'
                  )
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Content */}
        <Outlet />
      </div>
    </Layout>
  );
}
