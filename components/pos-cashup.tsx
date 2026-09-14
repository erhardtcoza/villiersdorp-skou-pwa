"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {api} from '../lib/app-api';
import {cashupJournal,countedCashCents,type CashupIntent,type CashupReceipt} from '../lib/pos-cashup';
type Shift={id:string;terminal_code:string;status:string;opened_at:number};
type Preview={shift:Shift;snapshot?:{revision:number;fingerprint:string;expected_cash_cents:number|null;blockers:string[];totals:Record<string,number>};receipt?:CashupReceipt|null;legacy_receipt_missing?:boolean};
const money=(cents:number)=>`R ${(cents/100).toFixed(2)}`;
const labels:Record<string,string>={opening_float_cents:'Openingskontant',cash_sales_cents:'Kontantverkope',card_sales_cents:'Kaartverkope',wallet_sales_cents:'Beursieverkope',other_sales_cents:'Ander verkope',cash_topups_cents:'Kontant-beursieaanvullings',card_topups_cents:'Kaart-beursieaanvullings',card_refunds_cents:'Kaart-refunds',wallet_refunds_cents:'Beursie-refunds',unclassified_refunds_cents:'Ongeklassifiseerde refunds'};
export function POSCashupPanel({userId,onBack}:{userId:number;onBack:()=>void}){
  const [shifts,setShifts]=useState<Shift[]>([]),[preview,setPreview]=useState<Preview|null>(null),[receipt,setReceipt]=useState<CashupReceipt|null>(null);
  const [pending,setPending]=useState<CashupIntent|null>(null),[amount,setAmount]=useState(''),[reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [cancelReason,setCancelReason]=useState(''),[message,setMessage]=useState('');
  const flight=useRef(false),mounted=useRef(true);
  const journal=useMemo(()=>cashupJournal({getItem:k=>sessionStorage.getItem(k),setItem:(k,v)=>sessionStorage.setItem(k,v),removeItem:k=>sessionStorage.removeItem(k)},userId,api),[userId]);
  async function action(work:()=>Promise<void>){
    if(flight.current)return;flight.current=true;setBusy(true);setError('');setMessage('');
    try{await work();}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Kasafsluiting kon nie gelaai word nie.');}
    finally{flight.current=false;if(mounted.current){setBusy(false);try{setPending(journal.pending());}catch{setError('Gestoorde kasafsluiting kon nie gelees word nie. Kontak admin voordat jy weer afsluit.');}}}
  }
  const refresh=()=>action(async()=>{setPending(journal.pending());const data=await api('/api/app/pos/cashups');if(mounted.current)setShifts(data.shifts||[]);});
  useEffect(()=>{mounted.current=true;void refresh();return()=>{mounted.current=false;};},[journal]);
  const select=(id:string)=>action(async()=>{const data=await api(`/api/app/pos/cashups/${encodeURIComponent(id)}`);if(mounted.current){setPreview(data);setReceipt(null);setAmount('');setReason('');}});
  const close=(resume:boolean)=>action(async()=>{
    const s=preview?.snapshot;
    const draft=resume?null:(preview&&s&&s.expected_cash_cents!==null?{shift_id:preview.shift.id,expected_revision:s.revision,expected_fingerprint:s.fingerprint,expected_cash_cents:s.expected_cash_cents,counted_cash_cents:countedCashCents(amount),variance_reason:reason.trim()}:null);
    if(!resume&&(!draft||s?.blockers.length))throw Error('Herlaai die kasstaat en los uitstaande betalings op voordat jy afsluit.');
    const result=await journal.run(draft);if(mounted.current){setReceipt(result);setPreview(null);}
  });
  const shownReceipt=receipt||preview?.receipt;
  const cancel=()=>action(async()=>{
    const result=await journal.cancel(pending?.cancel_reason?null:cancelReason);
    if(mounted.current){setPreview(null);setCancelReason('');
      if(result.status==='completed'){setReceipt(result.receipt);setMessage('Die skof was reeds afgesluit. Hier is die oorspronklike ontvangsbewys; niks is heropen nie.');}
      else{setReceipt(null);setMessage('Die afsluitversoek is gekanselleer. Herlaai die kasstaat voordat jy ’n nuwe afsluiting indien.');}
    }
  });
  return <section className="bar-page-content">
    <button className="sheet-primary-link sheet-primary-button" onClick={onBack} disabled={busy}>Terug na POS-afdelings</button>
    <h2>Kasafsluiting</h2><p>Stop eers jou POS-skof. Tel die kontant in jou kas, insluitend openingskontant en kontant-beursieaanvullings.</p>
    {error&&<p className="form-error" role="alert">{error}</p>}
    {message&&<p className="success-note" role="status">{message}</p>}
    {pending&&<article className="refund-panel"><h3>Kasafsluiting wag vir bevestiging</h3><p>Skof {pending.shift_id} · Getel: {money(pending.counted_cash_cents)}</p><p>Moenie ’n nuwe afsluiting maak nie. Hervat dieselfde versoek; kontak admin as dit nie bevestig kan word nie.</p>
      {!pending.cancel_reason&&<button className="refund-submit" disabled={busy} onClick={()=>void close(true)}>Hervat kasafsluiting</button>}
      <label>Rede om afsluitversoek te kanselleer<textarea value={pending.cancel_reason||cancelReason} disabled={busy||Boolean(pending.cancel_reason)} maxLength={2000} onChange={e=>setCancelReason(e.target.value)}/></label>
      <p>Dit kanselleer net ’n onafgehandelde versoek. ’n Afgeslote skof word nie heropen nie.</p>
      <button className="refund-submit" disabled={busy} onClick={()=>void cancel()}>{pending.cancel_reason?'Hervat kansellasie':'Kanselleer afsluitversoek'}</button>
    </article>}
    {shownReceipt&&<article className="bar-transaction-card"><h3>Skof afgesluit</h3><p>Skof: {shownReceipt.shift_id}</p><p>Verwag: {money(shownReceipt.expected_cash_cents)} · Getel: {money(shownReceipt.counted_cash_cents)}</p><p>Verskil: {money(shownReceipt.variance_cents)}</p><p>{shownReceipt.variance_reason}</p><small>Verwysing: {shownReceipt.idempotency_key}</small></article>}
    <button className="sheet-primary-link sheet-primary-button" disabled={busy} onClick={()=>void refresh()}>{busy?'Besig…':'Verfris skofte'}</button>
    {!busy&&!shifts.length&&<p>Geen skofte vir kasafsluiting gevind nie. Stop eers jou oop POS-skof.</p>}
    <div className="bar-transaction-list">{shifts.map(s=><button className="pos-launch-card" key={s.id} disabled={busy||Boolean(pending)} onClick={()=>void select(s.id)}><strong>{s.terminal_code}</strong><small>{s.id} · {new Date(s.opened_at*1000).toLocaleString('af-ZA')}</small><span>{s.status==='closed'?'Afgesluit':'Gereed vir kontantkontrole'}</span></button>)}</div>
    {preview?.legacy_receipt_missing&&<p className="provider-note">Hierdie ou skof is afgesluit, maar het nie ’n herstelbare kasafsluitbewys nie. Kontak admin.</p>}
    {preview?.snapshot&&<article className="refund-panel"><h3>Kasstaat · {preview.shift.terminal_code}</h3><dl>{Object.entries(preview.snapshot.totals).map(([key,value])=><div key={key}><dt>{labels[key]||key}</dt><dd>{money(value)}</dd></div>)}</dl>
      {preview.snapshot.blockers.length>0?<p role="alert">Nog nie gereed vir afsluiting nie: {preview.snapshot.blockers.join(', ')}. Kontroleer uitstaande transaksies of kontak admin.</p>:<>
        <p>Verwagte kontant: <strong>{money(preview.snapshot.expected_cash_cents!)}</strong></p>
        <label>Getelde kontant<input inputMode="decimal" value={amount} disabled={busy||Boolean(pending)} onChange={e=>setAmount(e.target.value)}/></label>
        <label>Rede vir verskil<textarea value={reason} disabled={busy||Boolean(pending)} onChange={e=>setReason(e.target.value)} maxLength={2000}/></label>
        <p>Afsluiting is finaal. Die kasstaat en jou getelde bedrag word as ’n ouditrekord bewaar.</p>
        <button className="refund-submit" disabled={busy||Boolean(pending)||!amount.trim()} onClick={()=>void close(false)}>Bevestig en sluit skof af</button>
      </>}
    </article>}
  </section>;
}
