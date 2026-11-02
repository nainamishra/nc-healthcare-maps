/* Narrative choropleth: each visible annotation has a defined selection rule. */
const METRICS={
 primary:{name:'primary care physicians',title:'Two NC counties recorded no primary care physicians in 2023',interpretation:''},
 psychiatry:{name:'psychiatrists',title:'42 NC counties recorded no psychiatrists in 2023',interpretation:''},
 dentistry:{name:'dentists',title:'Four NC counties recorded no dentists in 2023',interpretation:''}
};
const ATLAS_URL='https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json';
const palette=['#e4edf4','#aecbdd','#71a3c6','#377baa','#174c74'];
const fmtInt=d3.format(',.0f'),fmtRate=d3.format('.2f');
const $=id=>document.getElementById(id);
const numeric=x=>x===''||x==null?null:(Number.isFinite(+x)?+x:null);
const finite=Number.isFinite;
let data,selected='primary';
function providerRate(d){return d?.[selected+'_rate'];}
function providerCount(d){return d?.[selected];}
function setText(id,value){$(id).textContent=value;}
function convert(raw){return raw.map(d=>({...d,population:numeric(d.population),primary:numeric(d.primary),psychiatry:numeric(d.psychiatry),dentistry:numeric(d.dentistry),primary_rate:numeric(d.primary_rate),psychiatry_rate:numeric(d.psychiatry_rate),dentistry_rate:numeric(d.dentistry_rate)}));}
async function load(){const [rawCounties,rawStates,atlas]=await Promise.all([d3.csv('data/counties.csv'),d3.csv('data/states.csv'),d3.json(ATLAS_URL)]);const counties=convert(rawCounties),states=convert(rawStates);return {counties,states,atlas,nc:counties.filter(d=>d.state==='NC'),countiesById:new Map(counties.map(d=>[d.fips,d])),statesById:new Map(states.map(d=>[d.fips,d]))};}
function tipFor(event,d,name,kind){const tooltip=d3.select('#tooltip');tooltip.html(`<div class="tt-name">${name}</div><div class="tt-row"><span>${METRICS[selected].name}</span><strong>${finite(providerCount(d))?fmtInt(providerCount(d)):'No data'}</strong></div><div class="tt-row"><span>Population</span><strong>${finite(d?.population)?fmtInt(d.population):'No data'}</strong></div><div class="tt-row"><span>Providers per 10,000</span><strong>${finite(providerRate(d))?fmtRate(providerRate(d)):'No data'}</strong></div><div class="tt-foot">${kind} · AHRF 2023 · Recorded workforce, not direct access</div>`).attr('hidden',null);moveTip(event);}
function moveTip(e){const t=$('tooltip'),w=t.offsetWidth,h=t.offsetHeight;d3.select(t).style('left',Math.max(8,Math.min(window.innerWidth-w-8,e.clientX+14))+'px').style('top',Math.max(8,Math.min(window.innerHeight-h-8,e.clientY-15))+'px');}
function hideTip(){d3.select('#tooltip').attr('hidden',true);}
function scale(max){return d3.scaleLinear().domain([0,max*.25,max*.5,max*.75,max]).range(palette).clamp(true);}
function featuresNC(){return topojson.feature(data.atlas,data.atlas.objects.counties).features.filter(f=>String(f.id).padStart(5,'0').startsWith('37'));}
function zeroCounties(){return data.nc.filter(d=>providerCount(d)===0);}
/* Label every zero-count county when there are four or fewer; otherwise label the three most populous.
   Additionally label the highest-rate county to show both ends of the distribution. */
function labeledZeros(){const all=zeroCounties();return all.length<=4?all:all.slice().sort((a,b)=>b.population-a.population).slice(0,3);}
function drawGeo(selector,features,lookup,isUS,max){const svg=d3.select(selector);svg.selectAll('*').remove();const W=960,H=isUS?420:470;svg.attr('viewBox',`0 0 ${W} ${H}`).attr('preserveAspectRatio','xMidYMid meet');const projection=isUS?d3.geoAlbersUsa():d3.geoMercator();projection.fitExtent([[36,30],[W-36,H-36]],{type:'FeatureCollection',features});const path=d3.geoPath(projection),color=scale(max),key=f=>String(f.id).padStart(isUS?2:5,'0');
svg.selectAll('path.region').data(features).join('path').attr('class','region').attr('d',path).attr('fill',f=>{const d=lookup.get(key(f));const v=providerRate(d);return !finite(v)?'#e7e9ec':color(v);}).attr('tabindex',0).attr('aria-label',f=>`${f.properties.name}: ${finite(providerRate(lookup.get(key(f))))?fmtRate(providerRate(lookup.get(key(f))))+' providers per 10,000':'No data'}`).on('mousemove',(e,f)=>tipFor(e,lookup.get(key(f)),f.properties.name,isUS?'State':'County')).on('mouseleave',hideTip).on('focus',(e,f)=>{const r=e.target.getBoundingClientRect();tipFor({clientX:r.left+r.width/2,clientY:r.top+r.height/2},lookup.get(key(f)),f.properties.name,isUS?'State':'County');}).on('blur',hideTip);
if(isUS){const nc=features.find(f=>key(f)==='37');if(nc){const [x,y]=path.centroid(nc);svg.append('text').attr('class','nc-label').attr('x',x).attr('y',y).attr('text-anchor','middle').text('NC');}return;}
const wanted=labeledZeros().map(d=>({d,kind:'zero'}));
const highest=data.nc.filter(d=>finite(providerRate(d))).sort((a,b)=>providerRate(b)-providerRate(a))[0];
if(highest&&!wanted.some(a=>a.d.fips===highest.fips))wanted.push({d:highest,kind:'high'});
const annotations=wanted.map(a=>{const f=features.find(f=>key(f)===a.d.fips);return f?{...a,f,xy:path.centroid(f)}:null;}).filter(Boolean).sort((a,b)=>a.xy[1]-b.xy[1]);
/* Directly label selected counties with light leaders; avoid overlaps without covering the underlying colors. */
annotations.forEach((a,i)=>{const [x,y]=a.xy;const toRight=x>W*.52;
  const dx=toRight?-31:31,dy=(i%3-1)*20-8;
  let lx=x+dx,ly=y+dy;
  for(let j=0;j<i;j++){const prev=annotations[j];if(!prev.label)continue;
    if(Math.abs(ly-prev.label[1])<35&&Math.abs(lx-prev.label[0])<165&&toRight===prev.label[2])ly+=ly>=prev.label[1]?36:-36;
  }
  ly=Math.max(30,Math.min(H-27,ly));a.label=[lx,ly,toRight];
  svg.append('path').attr('class','map-leader '+a.kind).attr('d',`M${x},${y} L${lx},${ly}`);
  svg.append('circle').attr('class','map-pin '+a.kind).attr('cx',x).attr('cy',y).attr('r',3.2);
  const annotation=svg.append('text').attr('class','map-label '+a.kind)
    .attr('x',lx+(toRight?-4:4)).attr('y',ly-12)
    .attr('text-anchor',toRight?'end':'start');
  annotation.append('tspan').attr('x',lx+(toRight?-4:4)).text(a.d.county);
  annotation.append('tspan').attr('x',lx+(toRight?-4:4)).attr('dy','1.25em')
    .attr('class','label-value')
    .text(a.kind==='zero'?'0 providers':`${fmtRate(providerRate(a.d))} providers / 10,000`);
});
}
function benchmark(){
 const nc=data.statesById.get('37');
 const included=data.states.filter(d=>finite(providerRate(d))&&finite(d.population)&&finite(providerCount(d))&&d.population>0);
 const totalPopulation=d3.sum(included,d=>d.population);
 const us=totalPopulation>0?d3.sum(included,providerCount)/totalPopulation*10000:null;
 const n=providerRate(nc);
 const max=Math.max(n||0,us||0,0.1)*1.08;
 setText('nc-rate',finite(n)?fmtRate(n):'N/A');
 setText('us-rate',finite(us)?fmtRate(us):'N/A');
 $('nc-bar').style.width=finite(n)?`${100*n/max}%`:'0%';
 $('us-bar').style.width=finite(us)?`${100*us/max}%`:'0%';
 const delta=finite(n)&&finite(us)?n-us:null;
 setText('comparison-takeaway',!finite(delta)?'A comparable benchmark is unavailable.':Math.abs(delta)<.005?'NC is approximately equal to the available US benchmark.':`NC is ${fmtRate(Math.abs(delta))} providers per 10,000 residents ${delta<0?'below':'above'} the available US benchmark.`);
}
function draw(){
 const cfg=METRICS[selected],zeros=zeroCounties(),all=data.nc.map(providerRate).filter(finite),max=d3.max(all)||1;
 drawGeo('#nc-map',featuresNC(),data.countiesById,false,max);
 setText('story-title',cfg.title);
 setText('story-subtitle',`${cfg.name.charAt(0).toUpperCase()+cfg.name.slice(1)} per 10,000 residents by county, 2023. Darker blue indicates higher availability.`);
 setText('scale-max',fmtRate(max));
 setText('key-title',`${cfg.name[0].toUpperCase()+cfg.name.slice(1)} per 10,000 residents`);
 setText('finding-copy',zeros.length<=4?'Labels identify every county with zero recorded providers and the county with the highest rate.':'Labels identify the three most populous zero-provider counties and the county with the highest rate.');
 setText('zero-count',String(zeros.length));
 setText('zero-explanation',`counties with no recorded ${cfg.name} under this AHRF measure`);
 benchmark();
 document.querySelectorAll('#metric-controls button').forEach(b=>{b.classList.toggle('active',b.dataset.metric===selected);b.setAttribute('aria-pressed',String(b.dataset.metric===selected));});
 hideTip();
}
async function init(){try{data=await load();$('nc-loading').remove();document.querySelectorAll('#metric-controls button').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.metric;draw();}));draw();}catch(e){console.error(e);$('nc-loading').textContent='Could not load the map. Open with VS Code Live Server and check internet access.';$('nc-loading').classList.add('error');}}
init();
