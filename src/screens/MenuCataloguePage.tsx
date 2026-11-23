'use client';

import { CATEGORIES, formatINR, type Category, type MenuItemDto } from '@/shared';
import { useMemo, useState } from 'react';
import { useCatalogue } from '../api/hooks';
import { Button, Checkbox, DietMarker, DishTile, EmptyState, ErrorState, FilterChips, Pill, Skeleton, TextField } from '../components/ui';
import { CATEGORY_NAMES, DIET_NAMES, MenuItemDialog } from './MenuItemDialog';

type CategoryFilter = Category | 'ALL';

/** S11 Menu catalogue (US-06): search, category filter, archived toggle, add / edit in the S12 dialog. */
export function MenuCataloguePage() {
  const catalogue = useCatalogue();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<MenuItemDto | 'new' | null>(null);

  const all = useMemo(() => catalogue.data ?? [], [catalogue.data]);
  const activeCount = all.filter((i) => i.isActive).length;
  const archivedCount = all.length - activeCount;
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter(
      (i) =>
        (showArchived || i.isActive) &&
        (category === 'ALL' || i.category === category) &&
        (!q || i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q)),
    );
  }, [all, search, category, showArchived]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-headline-xl-m md:text-headline-xl">Menu catalogue</h1>
          {catalogue.data && (
            <p className="text-body-md text-text-secondary">
              {activeCount} active {activeCount === 1 ? 'dish' : 'dishes'} · {archivedCount} archived
            </p>
          )}
        </div>
        <Button icon="add" onClick={() => setEditing('new')}>Add item</Button>
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1">
            <TextField label="Search dishes" icon="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or description" />
          </div>
          <Checkbox label="Show archived" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        </div>
        <FilterChips
          label="Filter by category"
          value={category}
          onChange={setCategory}
          chips={[{ value: 'ALL', label: 'All' }, ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_NAMES[c] }))]}
        />
      </div>

      {catalogue.isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading dishes">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : catalogue.isError ? (
        <div className="card"><ErrorState message="We couldn't load the dishes." onRetry={() => void catalogue.refetch()} /></div>
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState icon="menu_book" title={all.length === 0 ? 'No dishes yet' : 'No dishes match'} action={all.length === 0 ? <Button icon="add" onClick={() => setEditing('new')}>Add the first dish</Button> : undefined}>
            {all.length === 0 ? 'Add dishes here, then put them on a daily menu.' : 'Try another search or category.'}
          </EmptyState>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-body-md">
            <thead className="bg-surface-cream text-label-md uppercase tracking-wider text-text-secondary">
              <tr>
                <th scope="col" className="px-4 py-3">Dish</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Diet</th>
                <th scope="col" className="px-4 py-3 text-right">Price</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className={`border-t border-border-sand ${i.isActive ? '' : 'opacity-60'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <DishTile name={i.name} category={i.category} size={44} />
                      <div className="min-w-0">
                        <p id={`dish-name-${i.id}`} className="text-label-lg">{i.name}</p>
                        {i.description && <p className="line-clamp-1 text-body-sm text-text-secondary">{i.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Pill>{CATEGORY_NAMES[i.category]}</Pill></td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="inline-flex"><DietMarker diet={i.diet} /></span> {DIET_NAMES[i.diet]}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular">{formatINR(i.pricePaise)}</td>
                  <td className="px-4 py-3">
                    <Pill tone={i.isActive ? 'success' : 'neutral'} icon={i.isActive ? 'check_circle' : 'archive'}>{i.isActive ? 'Active' : 'Archived'}</Pill>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {/* Described by the dish name (not labelled), so only the name cell carries the dish name */}
                    <Button variant="ghost" size="sm" icon="edit" aria-describedby={`dish-name-${i.id}`} onClick={() => setEditing(i)}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <MenuItemDialog item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
