"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {api} from '../lib/app-api';
import {openingFloatCents,shiftOpeningJournal,shiftStopJournal,validateOpenShift,validateStoppedShift,type POSShift,type ShiftContext,type ShiftLease,type PendingShiftStop} from '../lib/pos-shift';

export function POSShiftPanel({userId,context,lease,disabled,onReady}:{userId:number;context:ShiftContext;lease:ShiftLease;disabled:boolean;onReady:(ready:boolean)=>void}) {
  const [shift,setShift]=useState<POSShift|null>(null);
  const [amount,setAmount]=useState('');
  const [pending,setPending]=useState(false);
  const [busy,setBusy]=useState(true);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState('');
  const [stopReason,setStopReason]=useState('');
  const [pendingStop,setPendingStop]=useState<PendingShiftStop|null>(null);
  const [stopMessage,setStopMessage]=useState('');
  const generation=useRef(0),inFlight=useRef(false);
  const journal=useMemo(()=>shiftOpeningJournal({getItem:k=>window.sessionStorage.getItem(k),setItem:(k,v)=>window.sessionStorage.setItem(k,v),removeItem:k=>window.sessionStorage.removeItem(k)},userId,context),[userId,context.terminal_code,context.event_id,context.location_id]);
  const stopJournal=useMemo(()=>shiftStopJournal({getItem:k=>window.sessionStorage.getItem(k),setItem:(k,v)=>window.sessionStorage.setItem(k,v),removeItem:k=>window.sessionStorage.removeItem(k)},userId,context),[userId,context.terminal_code,context.event_id,context.location_id]);
  const body={...context,...lease};
  const refresh=async()=>{
    if(inFlight.current)return;
    inFlight.current=true;
    const requestGeneration=generation.current;
    setBusy(true);setError('');setLoaded(false);setShift(null);onReady(false);
    try{
      const savedStop=stopJournal.pending();setPendingStop(savedStop);if(savedStop)setStopReason(savedStop.reason);
      const result=await api('/api/pos-v1/shifts/current',{method:'POST',body:JSON.stringify(body)});
      if(requestGeneration!==generation.current)return;
      const current=result.shift===null?null:validateOpenShift(result.shift,userId,context);
      if(current){journal.clear();setPending(false);}
      else {const saved=journal.pending();setPending(Boolean(saved));if(saved)setAmount((saved.opening_float_cents/100).toFixed(2));}
      setShift(current);setLoaded(true);onReady(Boolean(current)&&!savedStop);
    }catch(err){if(requestGeneration===generation.current)setError(err instanceof Error?err.message:'Skof kon nie gelaai word nie.');}
    finally{if(requestGeneration===generation.current){inFlight.current=false;setBusy(false);}}
  };
  useEffect(()=>{
    generation.current++;
    inFlight.current=false;
    const timer=window.setTimeout(()=>void refresh(),0);
    return()=>{window.clearTimeout(timer);generation.current++;onReady(false);};
  },[journal,lease.lease_token,lease.device_instance_id]);
  const open=async()=>{
    if(inFlight.current||busy||disabled||!loaded||pendingStop)return;
    inFlight.current=true;setBusy(true);setError('');onReady(false);
    const requestGeneration=generation.current;
    try{
      const entry=journal.prepare(openingFloatCents(amount));setPending(true);
      const result=await api('/api/pos-v1/shifts/open',{method:'POST',body:JSON.stringify({...body,...entry})});
      if(requestGeneration!==generation.current)return;
      const opened=validateOpenShift(result.shift,userId,context);
      journal.clear();setPending(false);setShift(opened);onReady(true);
    }catch(err){if(requestGeneration===generation.current)setError(err instanceof Error?err.message:'Skof kon nie oopgemaak word nie.');}
    finally{if(requestGeneration===generation.current){inFlight.current=false;setBusy(false);}}
  };
  const stop=async()=>{
    if(inFlight.current||busy||disabled||(!shift&&!pendingStop))return;
    inFlight.current=true;setBusy(true);setError('');onReady(false);
    const requestGeneration=generation.current;
    try{
      const entry=stopJournal.pending()||(shift?stopJournal.prepare(shift,stopReason):null);
      if(!entry)throw new Error('Herlaai eers die skof.');
      setPendingStop(entry);
      const result=await api('/api/pos-v1/shifts/stop',{method:'POST',body:JSON.stringify({...body,...entry})});
      if(requestGeneration!==generation.current)return;
      const stopped=validateStoppedShift(result.shift,userId,context,entry);
      stopJournal.clear();setPendingStop(null);setShift(null);setLoaded(false);setStopReason('');setAmount('');
      setStopMessage(stopped.status==='closed'?'Skof gestop en reeds afgesluit.':'Skof gestop. Kontantafsluiting is nog uitstaande. Hangende verkope kan steeds herstel word.');
    }catch(err){if(requestGeneration===generation.current)setError(err instanceof Error?err.message:'Skof kon nie gestop word nie.');}
    finally{if(requestGeneration===generation.current){inFlight.current=false;setBusy(false);}}
  };
  return <section className="topup-panel" aria-label="Kassierskof">
    <h3>Kassierskof</h3>
    {busy&&<p role="status">Kontroleer skof…</p>}
    {error&&<p className="form-error" role="alert">{error==='terminal_shift_requires_handover'?'Daar is nog ’n ander kassier se oop skof op hierdie terminal. Kontak admin vir oorhandiging.':error}</p>}
    {stopMessage&&<p role="status">{stopMessage}</p>}
    {shift?<p className="success-note">{pendingStop?'Skof-stop wag op bevestiging':'Skof oop'} · Openingskontant R {(shift.opening_float_cents/100).toFixed(2)}</p>:loaded&&!pendingStop&&<>
      <label>Openingskontant (R)<input inputMode="decimal" value={amount} disabled={busy||disabled||pending} onChange={e=>setAmount(e.target.value)} placeholder="0.00" /></label>
      <p>Bevestig die kontant waarmee jy hierdie skof begin. Gebruik 0 as daar geen kontant is nie.</p>
      <button type="button" className="app-primary" disabled={busy||disabled||!amount.trim()} onClick={()=>void open()}>{pending?'Hervat skof-oopmaak':'Bevestig en maak skof oop'}</button>
    </>}
    {(shift||pendingStop)&&<>
      <label>Rede om skof te stop<input value={stopReason} maxLength={500} disabled={busy||disabled||Boolean(pendingStop)} onChange={e=>setStopReason(e.target.value)} /></label>
      <p>Stop nuwe verkope op hierdie skof. Dit is nie kontantafsluiting of uitteken nie.</p>
      <button type="button" className="sheet-secondary" disabled={busy||disabled||!stopReason.trim()} onClick={()=>void stop()}>{pendingStop?'Hervat skof-stop':'Stop hierdie skof'}</button>
    </>}
    <button type="button" className="sheet-secondary" disabled={busy||disabled} onClick={()=>void refresh()}>Herlaai skof</button>
  </section>;
}
