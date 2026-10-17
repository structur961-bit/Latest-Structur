import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RecipeEditor({ businessId, value, onChange }) {
 const [inventory, setInventory] = useState([]);
 const [error, setError] = useState('');
 useEffect(() => {
  let active = true;
  base44.entities.InventoryItem.filter({business_id:businessId},'name').then(rows=>{if(active)setInventory(rows);}).catch(err=>{if(active)setError(err.message);});
  return ()=>{active=false;};
 },[businessId]);
 const rows=Array.isArray(value)?value:[];
 const change=(index,patch)=>onChange(rows.map((row,i)=>i===index?{...row,...patch}:row));
 return <div className="space-y-3 rounded-lg border p-3">
  <Label>Recipe and inventory</Label>
  <p className="text-xs text-muted-foreground">Quantities are per menu item in each inventory item's unit. Completing an order deducts these ingredients once. Cancelling or refunding the order restores them.</p>
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {rows.map((row,index)=><div key={index} className="flex gap-2 items-center">
   <select aria-label={`Ingredient ${index+1}`} required className="h-9 min-w-0 flex-1 rounded-md border px-2 text-sm bg-background" value={row.inventory_item_id} onChange={e=>change(index,{inventory_item_id:e.target.value})}>
    <option value="">Select inventory item</option>
    {inventory.map(item=><option key={item.id} value={item.id}>{item.name} ({item.unit||'unit'})</option>)}
   </select>
   <Input aria-label={`Ingredient quantity ${index+1}`} type="number" min="0.000001" step="any" required value={row.quantity} onChange={e=>change(index,{quantity:e.target.value})} className="w-24" />
   <Button type="button" variant="outline" size="sm" aria-label={`Remove ingredient ${index+1}`} onClick={()=>onChange(rows.filter((_,i)=>i!==index))}>Remove</Button>
  </div>)}
  <Button type="button" variant="outline" size="sm" disabled={!!error} onClick={()=>onChange([...rows,{inventory_item_id:'',quantity:1}])}>Add ingredient</Button>
 </div>;
}
