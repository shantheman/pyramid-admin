export function easternDay(now=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function range(period='30d',now=new Date(),start='2026-11-24') {
 const through=easternDay(now), d=new Date(through+'T12:00:00Z');
 const shift=n=>new Date(d.getTime()-n*86400000).toISOString().slice(0,10);
 return period==='yesterday'?{from:shift(1),through:shift(1)}:{from:period==='all'?start:period==='today'?through:[start,shift(period==='7d'?6:29)].sort().at(-1),through};
}
export const inRange=(r,from,through)=>r.day>=from&&r.day<=through;
export const money=v=>v==null||!Number.isFinite(v)?'N/A':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v/1e6);
export const count=v=>v==null?'N/A':Number(v).toLocaleString('en-US',{maximumFractionDigits:0});
export function sourceTotal(source,key,from,through) {
 // A successful lookup does not cover dates before/after the provider's report.
 if(!source?.records||source.status!=='ok'||!source.from_day||!source.through_day||from<source.from_day||through>source.through_day)return null;
 if(source.coverage_days){for(let day=new Date(from+'T12:00:00Z');day.toISOString().slice(0,10)<=through;day.setUTCDate(day.getUTCDate()+1)){if(!source.coverage_days.includes(day.toISOString().slice(0,10)))return null;}}
 const rows=source.records.filter(r=>inRange(r,from,through));
 if(rows.some(r=>r[key]==null))return null;
 return rows.reduce((sum,r)=>sum+Number(r[key]),0);
}
export function pnl(sources,from,through){
 const playSales=sourceTotal(sources.google_sales,'gross_micros',from,through), play=sourceTotal(sources.google_earnings,'gross_micros',from,through), apple=sourceTotal(sources.apple_sales,'gross_micros',from,through);
 const playNet=sourceTotal(sources.google_earnings,'net_micros',from,through), appleNet=sourceTotal(sources.apple_sales,'net_micros',from,through);
 const admob=sourceTotal(sources.admob,'net_micros',from,through), spend=sourceTotal(sources.ads,'spend_micros',from,through);
 const sum=xs=>xs.some(x=>x==null)?null:xs.reduce((a,b)=>a+b,0);
 const gross=sum([play,apple]),netIap=sum([playNet,appleNet]),fees=gross==null||netIap==null?null:gross-netIap;
 return {playSales,play,apple,playNet,appleNet,admob,spend,gross,fees,netIap,income:sum([netIap,admob,spend==null?null:-spend])};
}
export function aggregateDaily(source,key,from,through) {
 const days=[];for(let d=new Date(from+'T12:00:00Z');d.toISOString().slice(0,10)<=through;d.setUTCDate(d.getUTCDate()+1)){
  const day=d.toISOString().slice(0,10);days.push({day,value:sourceTotal(source,key,day,day)});
 }return days;
}
