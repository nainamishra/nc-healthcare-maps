/* Visualization 2: one focused comparison of selected providers and community sites. */
(()=>{
const $=id=>document.getElementById(id);
const fmt=d3.format(',d'),fmtRate=d3.format('.2f');
const PALETTE=['#e4edf4','#aecbdd','#71a3c6','#377baa','#174c74'];
let counties=[],sites=[],features=[],byFips=new Map();
const num=v=>v===''||v==null?null:(Number.isFinite(+v)?+v:null);
const valid=v=>Number.isFinite(v);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function tip(e,html){const el=$('tooltip');el.innerHTML=html;el.hidden=false;const w=el.offsetWidth,h=el.offsetHeight;el.style.left=Math.max(8,Math.min(innerWidth-w-8,e.clientX+12))+'px';el.style.top=Math.max(8,Math.min(innerHeight-h-8,e.clientY-20))+'px';}
function hide(){ $('tooltip').hidden=true; }
function plot(){
 const included=sites.filter(s=>s.kind==='community'&&valid(s.lon)&&valid(s.lat));
 const counts=d3.rollup(included,v=>v.length,d=>d.fips);
 const rates=counties.map(d=>d.selected_provider_rate).filter(valid);
 const siteRates=counties.map(d=> d.population>0 ? (counts.get(d.fips)||0)/d.population*10000:null).filter(valid);
 const max=d3.max(rates)||1,med=d3.median(rates),siteMed=d3.median(siteRates);
 $('median-providers').textContent=valid(med)?fmtRate(med):'No data';
 $('median-sites').textContent=valid(siteMed)?fmtRate(siteMed):'No data';
 const lowBoth=counties.filter(d=>valid(d.selected_provider_rate)&&d.selected_provider_rate<med&&d.population>0&&((counts.get(d.fips)||0)/d.population*10000)<siteMed);
 const ranked=lowBoth.slice().sort((a,b)=>{const score=d=> (med>0?d.selected_provider_rate/med:d.selected_provider_rate) + (siteMed>0?((counts.get(d.fips)||0)/d.population*10000)/siteMed:((counts.get(d.fips)||0)/d.population*10000));return score(a)-score(b);});
 const selected=ranked.slice(0,3);
 $('overlay-title').textContent=`${lowBoth.length} NC counties fall below the median for both selected providers and mapped community sites`;
 $('overlay-subtitle').textContent='Primary care physicians, psychiatrists, and dentists per 10,000 residents (2023); dots show selected HRSA-listed community sites.';
 $('site-total').textContent=fmt(included.length);
 $('overlay-key-title').textContent='Selected providers per 10,000 residents';
 $('overlay-scale-max').textContent=fmtRate(max);
 $('overlay-dot-label').textContent='Selected community health centers and rural health clinics';
 $('site-label-explanation').textContent='Labels identify three counties with especially low rates of both selected providers and mapped sites; counts on labels refer to mapped sites.';
 const svg=d3.select('#site-map'),W=960,H=500;svg.selectAll('*').remove();svg.attr('viewBox',`0 0 ${W} ${H}`).attr('preserveAspectRatio','xMidYMid meet');
 const projection=d3.geoMercator().fitExtent([[50,32],[W-50,H-36]],{type:'FeatureCollection',features}),path=d3.geoPath(projection);
 const color=d3.scaleLinear().domain([0,max*.25,max*.5,max*.75,max]).range(PALETTE).clamp(true);
 svg.append('g').selectAll('path').data(features).join('path').attr('class','region').attr('d',path).attr('fill',f=>{const d=byFips.get(String(f.id).padStart(5,'0'));return valid(d?.selected_provider_rate)?color(d.selected_provider_rate):'#e7e9ec';})
 .on('mousemove',(e,f)=>{const d=byFips.get(String(f.id).padStart(5,'0'));if(!d)return;const n=counts.get(d.fips)||0;tip(e,`<div class="tt-name">${safe(d.county)} County</div><div class="tt-row"><span>Selected providers</span><strong>${valid(d.selected_provider_count)?fmt(d.selected_provider_count):'No data'}</strong></div><div class="tt-row"><span>Selected providers per 10,000</span><strong>${valid(d.selected_provider_rate)?fmtRate(d.selected_provider_rate):'No data'}</strong></div><div class="tt-row"><span>Mapped sites</span><strong>${fmt(n)}</strong></div><div class="tt-row"><span>Mapped sites per 10,000</span><strong>${d.population>0?fmtRate(n/d.population*10000):'No data'}</strong></div>`);}).on('mouseleave',hide);
 svg.append('g').selectAll('circle').data(included).join('circle').attr('class','site-point').attr('cx',d=>projection([d.lon,d.lat])?.[0]??-100).attr('cy',d=>projection([d.lon,d.lat])?.[1]??-100).attr('r',2.1)
 .on('mousemove',(e,d)=>tip(e,`<div class="tt-name">${safe(d.name)}</div><div class="tt-row"><span>City</span><strong>${safe(d.city)}</strong></div><div class="tt-row"><span>Site type</span><strong>${safe(d.type)}</strong></div>`)).on('mouseleave',hide);
 const shapes=new Map(features.map(f=>[String(f.id).padStart(5,'0'),f]));
 const group=svg.append('g').attr('class','overlay-annotations').style('pointer-events','none');
 selected.forEach((d,i)=>{const f=shapes.get(d.fips);if(!f)return;const [x,y]=path.centroid(f),right=x>W/2,dx=right?-45:45,ly=y+((i%3)-1)*37;const tx=x+dx,ty=Math.max(30,Math.min(H-38,ly)),anchor=right?'end':'start',xText=tx+(right?-5:5);
 group.append('path').attr('class','map-leader zero').attr('d',`M${x},${y} L${tx},${ty}`);
 group.append('circle').attr('class','map-pin zero').attr('cx',x).attr('cy',y).attr('r',3.2);
 const t=group.append('text').attr('class','map-label zero').attr('x',xText).attr('y',ty-9).attr('text-anchor',anchor);
 t.append('tspan').attr('x',xText).text(d.county);
 const n=counts.get(d.fips)||0;t.append('tspan').attr('x',xText).attr('dy','1.25em').attr('class','label-value').text(`${n} ${n===1?'site':'sites'}`);
 });
 hide();
}
async function init(){try{
const [s,c,atlas]=await Promise.all([d3.csv('data/nc_sites_overlay.csv'),d3.csv('data/counties.csv'),d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json')]);
sites=s.map(d=>({...d,lat:num(d.lat),lon:num(d.lon)}));counties=c.filter(d=>d.state==='NC').map(d=>({...d,population:num(d.population),selected_provider_count:num(d.selected_provider_count),selected_provider_rate:num(d.selected_provider_rate)}));
byFips=new Map(counties.map(d=>[d.fips,d]));features=topojson.feature(atlas,atlas.objects.counties).features.filter(f=>String(f.id).padStart(5,'0').startsWith('37'));
$('site-loading').remove();plot();
}catch(e){console.error(e);$('site-loading').textContent='Map could not load. Use Live Server and check your internet connection.';}}
init();
})();
