/* Pri&Jo Auto Garage — separate front end. Uses the configured Supabase project. */
const SUPABASE_URL = "https://ptluwoeogfkqavhspdjj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_wDsWINauH0jX9rezsEwczw_RovrM6Nv";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const state = { page: "dashboard", rows: {}, editing: null, search: "" };
const configs = {
  vehicles: {
    title: "Vehicles", singular: "Vehicle", table: "vehicles",
    fields: [
      ["registration","Registration / Chassis No.","text",true],
      ["customer","Customer name","text",true],
      ["model","Vehicle model","text",false],
      ["model_year","Model year","number",false],
      ["color","Colour","text",false],
      ["date_in","Date received","date",false],
      ["date_out","Expected / actual date out","date",false],
      ["job_type","Job type","select",false,["Repair","Storage"]],
      ["status","Status","select",false,["Storage","Under Repair","Completed","Released"]],
      ["released_to","Released to","text",false],
      ["contact","Contact number","text",false],
      ["description","Work / vehicle notes","textarea",false],
      ["billed","Billed amount (KSh)","number",false],
      ["paid","Amount paid (KSh)","number",false]
    ], columns: ["registration","customer","model","job_type","status","date_in"]
  },
  expenses: {
    title: "Expenses", singular: "Expense", table: "expenses",
    fields: [
      ["vehicle_id","Vehicle ID (optional)","text",false],
      ["expense_date","Expense date","date",true],
      ["description","Description","text",true],
      ["category","Category","select",true,["Parts","Materials","Labour","Transport","Other"]],
      ["amount","Amount (KSh)","number",true]
    ], columns: ["expense_date","description","category","amount","vehicle_id"]
  },
  petty_cash: {
    title: "Petty Cash", singular: "Petty Cash Entry", table: "petty_cash",
    fields: [
      ["transaction_date","Date","date",true],
      ["description","Description","text",true],
      ["type","Transaction type","select",true,["Received","Spent"]],
      ["amount","Amount (KSh)","number",true],
      ["handled_by","Handled by","text",false],
      ["notes","Notes","textarea",false]
    ], columns: ["transaction_date","description","type","amount","handled_by"]
  },
  invoices: {
    title: "Invoices", singular: "Invoice", table: "invoices",
    fields: [
      ["invoice_number","Invoice number","text",true],
      ["vehicle_id","Vehicle ID / registration","text",false],
      ["customer","Customer name","text",true],
      ["invoice_date","Invoice date","date",true],
      ["description","Description / items","textarea",true],
      ["amount","Total amount (KSh)","number",true],
      ["paid","Amount paid (KSh)","number",false],
      ["status","Status","select",false,["Unpaid","Partially Paid","Paid"]]
    ], columns: ["invoice_number","customer","invoice_date","amount","status"]
  },
  gate_passes: {
    title: "Gate Passes", singular: "Gate Pass", table: "gate_passes",
    fields: [
      ["pass_number","Gate pass number","text",true],
      ["vehicle_id","Vehicle ID / registration","text",false],
      ["customer","Customer name","text",true],
      ["pass_date","Date","date",true],
      ["released_to","Released to","text",true],
      ["contact","Contact number","text",false],
      ["description","Vehicle / items released","textarea",true],
      ["authorized_by","Authorized by","text",false]
    ], columns: ["pass_number","customer","pass_date","released_to","description"]
  }
};
const titles = {
  dashboard: ["Dashboard","Your garage at a glance","Track vehicles, spending and garage documents in one place."],
  vehicles: ["Vehicles","Vehicle register","Manage repair and storage vehicles."],
  expenses: ["Expenses","Expense register","Record and review garage spending."],
  petty_cash: ["Petty Cash","Petty cash ledger","Track money received, money spent and the running balance."],
  invoices: ["Invoices","Customer invoices","Create invoices and print or share the actual saved details."],
  gate_passes: ["Gate Passes","Vehicle release documents","Create gate passes and print or share the actual saved details."],
  reports: ["Reports","Garage reports","Review totals and print reports from saved records."]
};
const $ = id => document.getElementById(id);
const money = n => "KSh " + Number(n || 0).toLocaleString("en-KE",{maximumFractionDigits:2});
const safe = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function showNotice(msg){$("notice").textContent=msg;$("notice").hidden=!msg}
function dateToday(){return new Date().toISOString().slice(0,10)}
function formatDate(s){return s ? safe(String(s).slice(0,10)) : "—"}
function titleCase(s){return String(s||"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
function displayValue(key,val){
  if(["amount","billed","paid"].includes(key)) return money(val);
  if(key.includes("date")) return formatDate(val);
  if(key==="status"||key==="job_type"||key==="type"){
    const cls=/released|completed|paid|received/i.test(String(val))?"green":/repair|partial/i.test(String(val))?"blue":/unpaid|spent/i.test(String(val))?"amber":"";
    return `<span class="badge ${cls}">${safe(val||"—")}</span>`;
  }
  return safe(val||"—");
}
function recordId(r){return r.id}
async function load(table){
  const {data,error}=await db.from(table).select("*").order("created_at",{ascending:false}).limit(500);
  if(error){
    // Some existing tables may not expose created_at; retry without ordering.
    const retry=await db.from(table).select("*").limit(500);
    if(retry.error) throw retry.error;
    state.rows[table]=retry.data||[];
  } else state.rows[table]=data||[];
  return state.rows[table];
}
function rowsFor(table){return state.rows[table]||[]}
function total(table,key){return rowsFor(table).reduce((a,r)=>a+Number(r[key]||0),0)}
function renderStats(){
  const vehicles=rowsFor("vehicles"), expenses=rowsFor("expenses"), cash=rowsFor("petty_cash"), req=state.rows.requisitions||[];
  const balance=cash.reduce((s,r)=>s+(String(r.type||"").toLowerCase()==="received"?Number(r.amount||0):-Number(r.amount||0)),0);
  const pending=req.filter(r=>/pending/i.test(r.status||"")).length;
  return `<div class="stats">
    <div class="stat-card"><div class="stat-top">Total Vehicles <span class="stat-icon">▣</span></div><div class="stat-value">${vehicles.length}</div><div class="stat-foot">Records in vehicle register</div></div>
    <div class="stat-card"><div class="stat-top">Total Expenses <span class="stat-icon">↗</span></div><div class="stat-value" style="font-size:23px">${money(total("expenses","amount"))}</div><div class="stat-foot">Recorded garage expenses</div></div>
    <div class="stat-card"><div class="stat-top">Petty Cash Balance <span class="stat-icon">◉</span></div><div class="stat-value" style="font-size:23px">${money(balance)}</div><div class="stat-foot">Received less spent</div></div>
    <div class="stat-card"><div class="stat-top">Pending Requisitions <span class="stat-icon">◷</span></div><div class="stat-value">${pending}</div><div class="stat-foot">Pending items, if requisitions table exists</div></div>
  </div>`;
}
function tableHtml(table, records, keys, action=true){
  const cfg=configs[table];
  if(!records.length) return `<div class="empty"><b>No records yet</b>Add your first ${cfg.singular.toLowerCase()} to get started.</div>`;
  return `<div class="table-wrap"><table><thead><tr>${keys.map(k=>`<th>${safe(cfg.fields.find(f=>f[0]===k)?.[1]||titleCase(k))}</th>`).join("")}${action?"<th>Actions</th>":""}</tr></thead><tbody>${records.map(r=>`<tr>${keys.map(k=>`<td>${displayValue(k,r[k])}</td>`).join("")}${action?`<td><div class="row-actions"><button class="icon-btn" title="Edit" data-edit="${table}" data-id="${safe(r.id)}">✎</button><button class="icon-btn" title="Print" data-print="${table}" data-id="${safe(r.id)}">⎙</button><button class="icon-btn" title="Share" data-share="${table}" data-id="${safe(r.id)}">↗</button><button class="icon-btn" title="Delete" data-delete="${table}" data-id="${safe(r.id)}">⌫</button></div></td>`:""}</tr>`).join("")}</tbody></table></div>`;
}
function dashboardHtml(){
  const recent=rowsFor("vehicles").slice(0,5);
  return `${renderStats()}<div class="dashboard-grid">
    <div class="panel"><div class="panel-head"><div><h3>Recent Vehicles</h3><p>Latest entries in your garage</p></div><button class="link-btn" data-goto="vehicles">View all →</button></div>${tableHtml("vehicles",recent,["registration","customer","model","status"],false)}</div>
    <div><div class="panel"><div class="panel-head"><div><h3>Expense Summary</h3><p>Spending by category</p></div><button class="link-btn" data-goto="expenses">View expenses →</button></div>${expenseSummary()}</div>
    <div class="panel"><div class="panel-head"><div><h3>Quick Actions</h3><p>Common garage tasks</p></div></div><div class="quick-actions"><button class="btn btn-light" data-new="vehicles">＋ Add Vehicle</button> <button class="btn btn-light" data-new="expenses">＋ Record Expense</button><button class="btn btn-light" data-new="invoices">＋ Create Invoice</button><button class="btn btn-light" data-new="gate_passes">＋ Gate Pass</button></div></div></div></div>`;
}
function expenseSummary(){
  const groups={};rowsFor("expenses").forEach(r=>groups[r.category||"Other"]=(groups[r.category||"Other"]||0)+Number(r.amount||0));
  const entries=Object.entries(groups).sort((a,b)=>b[1]-a[1]);
  if(!entries.length)return `<div class="empty"><b>No expenses recorded</b>Your expense totals will appear here.</div>`;
  const max=Math.max(...entries.map(x=>x[1]),1);
  return entries.map(([name,val])=>`<div style="margin:14px 0"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:7px"><b>${safe(name)}</b><span>${money(val)}</span></div><div style="height:6px;border-radius:10px;background:#eef1f7;overflow:hidden"><div style="height:100%;width:${Math.round(val/max*100)}%;background:#2864e8;border-radius:10px"></div></div></div>`).join("");
}
function listPage(table){
  const cfg=configs[table], rows=rowsFor(table);
  const q=state.search.toLowerCase();
  const filtered=rows.filter(r=>Object.values(r).some(v=>String(v??"").toLowerCase().includes(q)));
  return `<div class="panel"><div class="toolbar"><input class="search" id="tableSearch" placeholder="Search ${cfg.title.toLowerCase()}..." value="${safe(state.search)}"><button class="btn btn-primary" data-new="${table}">＋ Add ${cfg.singular}</button></div>${tableHtml(table,filtered,cfg.columns,true)}</div>`;
}
function pettyCashPage(){
  const received=rowsFor("petty_cash").filter(r=>/received/i.test(r.type||"")).reduce((s,r)=>s+Number(r.amount||0),0);
  const spent=rowsFor("petty_cash").filter(r=>/spent/i.test(r.type||"")).reduce((s,r)=>s+Number(r.amount||0),0);
  return `<div class="stats"><div class="stat-card"><div class="stat-top">Total Received</div><div class="stat-value" style="font-size:23px">${money(received)}</div></div><div class="stat-card"><div class="stat-top">Total Spent</div><div class="stat-value" style="font-size:23px">${money(spent)}</div></div><div class="stat-card"><div class="stat-top">Current Balance</div><div class="stat-value" style="font-size:23px">${money(received-spent)}</div></div><div class="stat-card"><div class="stat-top">Transactions</div><div class="stat-value">${rowsFor("petty_cash").length}</div></div></div>${listPage("petty_cash")}`;
}
function reportsPage(){
  return `<div class="report-grid">
  <div class="report-card"><h3>Vehicle Register</h3><p>${rowsFor("vehicles").length} vehicle records</p><button class="btn btn-primary" data-report="vehicles">Print vehicle report</button></div>
  <div class="report-card"><h3>Expense Report</h3><p>Total recorded expenses: ${money(total("expenses","amount"))}</p><button class="btn btn-primary" data-report="expenses">Print expense report</button></div>
  <div class="report-card"><h3>Petty Cash Report</h3><p>${rowsFor("petty_cash").length} petty cash transactions</p><button class="btn btn-primary" data-report="petty_cash">Print petty cash report</button></div>
  <div class="report-card"><h3>Invoices</h3><p>${rowsFor("invoices").length} saved invoices</p><button class="btn btn-primary" data-report="invoices">Print invoice list</button></div>
  <div class="report-card"><h3>Gate Passes</h3><p>${rowsFor("gate_passes").length} saved gate passes</p><button class="btn btn-primary" data-report="gate_passes">Print gate pass list</button></div>
  </div>`;
}
async function refreshPage(){
  const [title,welcome,desc]=titles[state.page];$("pageTitle").textContent=title;$("welcomeTitle").textContent=welcome;$("welcomeText").textContent=desc;
  $("primaryAction").hidden=state.page==="reports";$("primaryAction").textContent=state.page==="dashboard"?"＋ Add Vehicle":"＋ Add "+(configs[state.page]?.singular||"Record");
  let html="";
  if(state.page==="dashboard")html=dashboardHtml();
  else if(state.page==="reports")html=reportsPage();
  else if(state.page==="petty_cash")html=pettyCashPage();
  else html=listPage(state.page);
  $("pageContent").innerHTML=html;
  bindContentEvents();
}
async function go(page){
  state.page=page;state.search="";
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  $("sidebar").classList.remove("open");
  try{
    const tables=["vehicles","expenses","petty_cash","invoices","gate_passes"];
    for(const t of tables){try{await load(t)}catch(e){state.rows[t]=[];showNotice(`Could not load ${t}. Check that the Supabase table exists and allows access. Details: ${e.message||e}`)}}
    try{await load("requisitions")}catch(e){state.rows.requisitions=[]}
    if(!$("notice").textContent.startsWith("Could not"))showNotice("");
  }catch(e){showNotice("Database connection issue: "+(e.message||e))}
  await refreshPage();
}
function fieldInput(f,value){
  const [key,label,type,required,options]=f;let control="";
  if(type==="select") control=`<select name="${key}" ${required?"required":""}><option value="">Choose...</option>${options.map(o=>`<option ${String(value??"")===o?"selected":""}>${safe(o)}</option>`).join("")}</select>`;
  else if(type==="textarea")control=`<textarea name="${key}" ${required?"required":""}>${safe(value??"")}</textarea>`;
  else control=`<input name="${key}" type="${type}" value="${safe(value??"")}" ${required?"required":""} ${type==="number"?'min="0" step="0.01"':""}>`;
  return `<div class="field ${type==="textarea"?"full":""}"><label>${safe(label)}${required?" *":""}</label>${control}</div>`;
}
function openForm(table,id=null){
  const cfg=configs[table];if(!cfg)return;
  const record=id?rowsFor(table).find(r=>String(r.id)===String(id)):null;
  state.editing={table,id:record?.id||null};
  $("dialogTitle").textContent=(record?"Edit ":"Add ")+cfg.singular;
  $("formFields").innerHTML=cfg.fields.map(f=>fieldInput(f,record?.[f[0]]??(f[0].includes("date")?dateToday():""))).join("");
  $("recordDialog").showModal();
}
function bindContentEvents(){
  $("pageContent").querySelectorAll("[data-goto]").forEach(b=>b.onclick=()=>go(b.dataset.goto));
  $("pageContent").querySelectorAll("[data-new]").forEach(b=>b.onclick=()=>openForm(b.dataset.new));
  $("pageContent").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openForm(b.dataset.edit,b.dataset.id));
  $("pageContent").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteRecord(b.dataset.delete,b.dataset.id));
  $("pageContent").querySelectorAll("[data-print]").forEach(b=>b.onclick=()=>printRecord(b.dataset.print,b.dataset.id));
  $("pageContent").querySelectorAll("[data-share]").forEach(b=>b.onclick=()=>shareRecord(b.dataset.share,b.dataset.id));
  $("pageContent").querySelectorAll("[data-report]").forEach(b=>b.onclick=()=>printReport(b.dataset.report));
  const search=$("tableSearch");if(search)search.oninput=()=>{const pos=search.selectionStart;state.search=search.value;refreshPage().then(()=>{const next=$("tableSearch");if(next){next.focus();next.setSelectionRange(pos,pos)}})};
}
async function saveRecord(event){
  event.preventDefault();if(!state.editing)return;
  const {table,id}=state.editing,cfg=configs[table],form=new FormData($("recordForm")),payload={};
  cfg.fields.forEach(f=>{let v=form.get(f[0]);if(v!==null&&v!==""){payload[f[0]]=f[2]==="number"?Number(v):v}else if(f[2]==="number")payload[f[0]]=0;});
  if(table==="gate_passes"&&!payload.pass_number)payload.pass_number="GP-"+Date.now().toString().slice(-8);
  if(table==="invoices"&&!payload.invoice_number)payload.invoice_number="INV-"+Date.now().toString().slice(-8);
  try{
    let result=id?await db.from(table).update(payload).eq("id",id).select():await db.from(table).insert(payload).select();
    if(result.error)throw result.error;
    $("recordDialog").close();toast(id?"Record updated":"Record saved");await go(state.page);
  }catch(e){toast("Save failed: "+(e.message||e));showNotice("Could not save to Supabase. Check table column names and permissions. Details: "+(e.message||e))}
}
async function deleteRecord(table,id){
  if(!confirm("Delete this record permanently?"))return;
  try{const {error}=await db.from(table).delete().eq("id",id);if(error)throw error;toast("Record deleted");await go(state.page)}
  catch(e){showNotice("Delete failed: "+(e.message||e))}
}
function recordText(table,r){
  const cfg=configs[table];return ["PRI&JO AUTO GARAGE",cfg.title.toUpperCase(),...cfg.fields.filter(f=>r[f[0]]!==undefined&&r[f[0]]!==null&&r[f[0]]!=="").map(f=>`${f[1]}: ${r[f[0]]}`)].join("\n");
}
function printableHtml(title,body){
 return `<!doctype html><html><head><meta charset="utf-8"><title>${safe(title)}</title><style>body{font:14px Arial,sans-serif;color:#182238;padding:32px}header{border-bottom:3px solid #2864e8;padding-bottom:15px;margin-bottom:25px}h1{margin:0;font-size:23px}small{letter-spacing:2px;color:#2864e8;font-weight:bold}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{text-align:left;padding:10px;border:1px solid #dce2eb;font-size:12px}th{background:#eef2fa}p{white-space:pre-wrap;line-height:1.7}.total{font-weight:bold}@media print{button{display:none}}</style></head><body><header><small>PRI&JO AUTO GARAGE</small><h1>${safe(title)}</h1><p>Garage Operations Document</p></header>${body}<script>window.onload=()=>window.print()<\/script></body></html>`;
}
function openPrint(html){const w=window.open("","_blank");if(!w){toast("Allow pop-ups to print this document");return}w.document.open();w.document.write(html);w.document.close()}
function printRecord(table,id){
 const r=rowsFor(table).find(x=>String(x.id)===String(id));if(!r)return;
 const cfg=configs[table];
 const body=`<table>${cfg.fields.filter(f=>r[f[0]]!==undefined&&r[f[0]]!==null&&r[f[0]]!=="").map(f=>`<tr><th>${safe(f[1])}</th><td>${safe(r[f[0]])}</td></tr>`).join("")}</table><p>Printed: ${new Date().toLocaleString()}</p>`;
 openPrint(printableHtml(`${cfg.singular} ${r.invoice_number||r.pass_number||""}`,body));
}
async function shareRecord(table,id){
 const r=rowsFor(table).find(x=>String(x.id)===String(id));if(!r)return;
 const textContent=recordText(table,r);
 if(navigator.share){try{await navigator.share({title:`Pri&Jo ${configs[table].singular}`,text:textContent});return}catch(e){if(e.name==="AbortError")return}}
 try{await navigator.clipboard.writeText(textContent);toast("Record details copied. Paste into WhatsApp or email.")}catch(e){prompt("Copy and share this record:",textContent)}
}
function printReport(table){
 const cfg=configs[table],rows=rowsFor(table);
 const fields=cfg.columns;
 const body=`<p>Report generated: ${new Date().toLocaleString()}</p><table><thead><tr>${fields.map(k=>`<th>${safe(cfg.fields.find(f=>f[0]===k)?.[1]||titleCase(k))}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${fields.map(k=>`<td>${safe(r[k]??"—")}</td>`).join("")}</tr>`).join("")}</tbody></table><p class="total">Records: ${rows.length}${table==="expenses"?" | Total: "+money(total("expenses","amount")):""}</p>`;
 openPrint(printableHtml(cfg.title+" Report",body));
}
$("nav").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b)go(b.dataset.page)});
$("primaryAction").onclick=()=>openForm(state.page==="dashboard"?"vehicles":state.page);
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
$("closeDialog").onclick=()=>$("recordDialog").close();
$("cancelDialog").onclick=()=>$("recordDialog").close();
$("recordForm").addEventListener("submit",saveRecord);
go("dashboard");
