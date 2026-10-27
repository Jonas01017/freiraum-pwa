import { useEffect, useId, useRef, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { X, type LucideIcon, Leaf } from 'lucide-react';

export function IconButton({icon: Icon, label, ...props}: {icon: LucideIcon; label: string} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className="icon-button" aria-label={label} title={label} {...props}><Icon size={21} aria-hidden="true" /></button>;
}
export function Modal({title, children, footer, onClose, wide=false}: {title: string; children: ReactNode; footer?: ReactNode; onClose: () => void; wide?: boolean}) {
  const ref=useRef<HTMLDialogElement>(null), heading=useId();
  useEffect(() => {
    const dialog=ref.current!;
    const previous=document.activeElement as HTMLElement | null;
    const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow=overflow; previous?.focus(); };
  },[]);
  return <dialog ref={ref} className={`modal ${wide?'detail-modal':''}`} aria-labelledby={heading}
    onCancel={e => { e.preventDefault(); onClose(); }}
    onClick={e => { if (e.target===ref.current) { const r=ref.current.getBoundingClientRect(); if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom) onClose(); } }}>
    <header className="modal-header"><h2 id={heading}>{title}</h2><IconButton icon={X} label="Schließen" onClick={onClose}/></header>
    <div className="modal-content">{children}</div>
    {footer && <footer className="modal-footer">{footer}</footer>}
  </dialog>;
}
export function Empty({title='Alles hat seinen Platz', children}: {title?: string; children: ReactNode}) {
  return <div className="empty-state"><span className="empty-icon"><Leaf size={32}/></span><h2>{title}</h2><p>{children}</p></div>;
}
export function Chips({values, selected, onChange, label}: {values: readonly string[]; selected: string; onChange:(value:string)=>void; label:string}) {
  return <div className="chips" role="group" aria-label={label}>{values.map(value=><button type="button" key={value} className={`chip ${selected===value?'selected':''}`} aria-pressed={selected===value} onClick={()=>onChange(value)}>{value}</button>)}</div>;
}
