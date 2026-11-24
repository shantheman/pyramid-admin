export function easternDay(now=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function range(period='30d',now=new Date(),start='2026-11-24') {
 const through=easternDay(now), d=new Date(through+'T12:00:00Z');
 const shift=n=>new Date(d.getTime()-n*86400000).toISOString().slice(0,10);
 return period==='yesterday'?{from:shift(1),through:shift(1)}:{from:period==='all'?start:period==='today'?through:[start,shift(period==='7d'?6:29)].sort().at(-1),through};
}
export const inRange=(r,from,through)=>r.day>=from&&r.day<=through;
export const money=v=>v==null||!Number.isFinite(v)?'N/A':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v/1e6);
export const count=v=>v==null?'N/A':Number(v).toLocaleString('en-US',{maximumFractionDigits:0});
// Testing devices, by the Genesis rule of a fixed cutoff: a device first seen
// before the public launch is a testing device. The collector marks each
// PostHog row; a row from before the mark existed predates launch too.
export const isTest=r=>r.test!==false;
export const withTests=include=>include?null:r=>!isTest(r);
// How many testing devices the funnel source knows of, over all dates.
export function testDevices(source) {
 if(!source?.records||source.status!=='ok')return null;
 return source.records.filter(isTest).reduce((sum,r)=>sum+(Number(r.installed)||0),0);
}
// `keep` narrows the rows that are summed (PostHog sources only: store
// reports carry no test mark and must not be passed one).
export function sourceTotal(source,key,from,through,keep=null) {
 // A successful lookup does not cover dates before/after the provider's report.
 if(!source?.records||source.status!=='ok'||!source.from_day||!source.through_day||from<source.from_day||through>source.through_day)return null;
 if(source.coverage_days){for(let day=new Date(from+'T12:00:00Z');day.toISOString().slice(0,10)<=through;day.setUTCDate(day.getUTCDate()+1)){if(!source.coverage_days.includes(day.toISOString().slice(0,10)))return null;}}
 const rows=source.records.filter(r=>inRange(r,from,through)&&(!keep||keep(r)));
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
// The funnel: devices grouped by the day of their first report, and how many
// of each group have reached each step by now. Steps are listed in the order
// most players meet them; they are not strictly nested (a player can buy
// Patron before floor 45), so "of previous" can exceed 100%.
export const FUNNEL_STEPS=[['installed','Opened the game'],['floor6','Reached floor 6'],['first_boon','Took a deity\u2019s boon'],['floor12','Reached floor 12 \u00b7 first perk'],['returned','Came back on a later day'],['first_ad','Watched a rewarded ad'],['floor25','Reached floor 25 \u00b7 can dedicate'],['dedicated','Dedicated a pyramid'],['floor45','Reached floor 45'],['purchased','Bought Patron of the Gods'],['floor75','Reached floor 75'],['floor100','Reached floor 100'],['floor120','Reached floor 120 \u00b7 the summit']];
// Steps for devices first seen from..through, optionally on one platform.
// Testing devices are left out unless asked for.
// null when the source cannot answer; a day with no new devices is a true zero.
export function funnelSteps(source,from,through,platform='all',includeTests=false) {
 if(!source?.records||source.status!=='ok'||!source.from_day||!source.through_day)return null;
 const rows=source.records.filter(r=>inRange(r,from,through)&&(platform==='all'||r.os===platform)&&(includeTests||!isTest(r)));
 if(rows.some(r=>FUNNEL_STEPS.some(([key])=>!Number.isFinite(Number(r[key])))))return null;
 return FUNNEL_STEPS.map(([key,label])=>({key,label,count:rows.reduce((sum,r)=>sum+Number(r[key]),0)}));
}
export const share=(n,d)=>d?Math.round(n/d*100)+'%':'\u2014';
export function aggregateDaily(source,key,from,through,keep=null) {
 const days=[];for(let d=new Date(from+'T12:00:00Z');d.toISOString().slice(0,10)<=through;d.setUTCDate(d.getUTCDate()+1)){
  const day=d.toISOString().slice(0,10);days.push({day,value:sourceTotal(source,key,day,day,keep)});
 }return days;
}
