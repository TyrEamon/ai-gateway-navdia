// copy
function copyText(t,el){const i=el.tagName==='I'?el:el.querySelector('i');const oc=i.className;const os=i.style.color;navigator.clipboard.writeText(t).then(()=>{i.className='fas fa-check';i.style.color='#16a34a';setTimeout(()=>{i.className=oc;i.style.color=os},3000)}).catch(()=>{})}

// modal
function showM(h){document.getElementById('mc').innerHTML=h;document.getElementById('modal').classList.remove('hd')}
function closeM(){document.getElementById('modal').classList.add('hd')}
function cM(msg){return new Promise(r=>{showM('<h3><i class="fas fa-question-circle" style="color:#4f6ef7;"></i> 确认</h3><p>'+msg+'</p><div class="fa"><button class="btn btn-s" onclick="closeM();r(false)">取消</button><button class="btn btn-p" onclick="closeM();r(true)">确定</button></div>');window.r=r})}
function pM(msg,def){return new Promise(r=>{showM('<h3><i class="fas fa-pen" style="color:#4f6ef7;"></i> '+msg+'</h3><div class="fg"><input type="text" id="pv" value="'+(def||'')+'" placeholder="请输入" onkeydown="if(event.key===\'Enter\'){closeM();r(document.getElementById(\'pv\').value.trim())}"></div><div class="fa"><button class="btn btn-s" onclick="closeM();r(null)">取消</button><button class="btn btn-p" onclick="closeM();r(document.getElementById(\'pv\').value.trim())">确定</button></div>');window.r=r;setTimeout(()=>{const e=document.getElementById('pv');if(e)e.focus()})})
}
function aM(msg,t){const i=t==='success'?'fa-check-circle':'fa-exclamation-circle';const c=t==='success'?'#16a34a':'#dc2626';showM('<h3><i class="fas '+i+'" style="color:'+c+';"></i> '+(t==='success'?'成功':'提示')+'</h3><p>'+msg+'</p><div class="fa"><button class="btn btn-p" onclick="closeM()">确定</button></div>')}

function toast(msg,t){const el=document.getElementById('toast');const i=t==='success'?'fa-check-circle':'fa-times-circle';const bg=t==='success'?'#f0fdf4':'#fef2f2';const c=t==='success'?'#166534':'#991b1b';el.innerHTML='<div class="al" style="background:'+bg+';color:'+c+';"><i class="fas '+i+'"></i> '+msg+'</div>';el.classList.remove('hd');setTimeout(()=>el.classList.add('hd'),3000)}

// providers
function tog(id){const d=document.getElementById('dt-'+id),c=document.getElementById('ch-'+id);d.classList.toggle('open');c.style.transform=d.classList.contains('open')?'rotate(90deg)':''}

function showAdd(){document.getElementById('af').classList.remove('hd')}
function hideAdd(){document.getElementById('af').classList.add('hd')}

let mdlCount=1;
function addMdlRow(){const c=document.getElementById('amodels');const d=document.createElement('div');d.className='fc';d.style.marginBottom='4px';d.innerHTML='<input type="text" placeholder="deepseek-chat" style="flex:1;" class="ami"><button class="btn btn-gh btn-xs" onclick="testNewMdl(this)"><i class="fas fa-plug"></i></button>';c.appendChild(d)}
function testNewMdl(btn){const inp=btn.parentElement.querySelector('.ami');const mid=inp.value.trim();if(!mid){toast('请输入模型 ID','error');return}
const url=document.getElementById('aurl').value.trim();const keys=document.getElementById('akeys').value.trim().split('\n').filter(Boolean);
const tr=document.getElementById('atestR');tr.innerHTML='<span class="mu"><i class="fas fa-spinner fa-spin"></i> 测试中...</span>';
const apiKey=keys[0]||'dummy';fetch(url.replace(/\/$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},body:JSON.stringify({model:mid,messages:[{role:'user',content:'hi'}],max_tokens:1})}).then(r=>{tr.innerHTML=r.ok?'<div class="al al-s"><i class="fas fa-check-circle"></i> 连接成功</div>':'<div class="al al-e"><i class="fas fa-times-circle"></i> HTTP '+r.status+'</div>'}).catch(()=>{tr.innerHTML='<div class="al al-e"><i class="fas fa-times-circle"></i> 连接失败</div>'})}

async function createProv(){const nm=document.getElementById('anm').value.trim(),id=document.getElementById('aid').value.trim(),url=document.getElementById('aurl').value.trim();const kt=document.getElementById('akeys').value,keys=kt.split('\n').map(k=>k.trim()).filter(k=>k);const mis=document.querySelectorAll('#amodels .ami');const models=Array.from(mis).map(i=>i.value.trim()).filter(Boolean);const enabled=document.getElementById('aen').checked;if(!nm||!id||!url){toast('请填写名称、ID 和 API 地址','error');return}
const r=await fetch('/admin/api/providers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name:nm,baseUrl:url,apiKeys:keys,models,enabled})});const d=await r.json();if(d.success){toast('已创建','success');location.reload()}else toast(d.message||'创建失败','error')}

function getMdl(id){const c=document.getElementById('ml-'+id),items=c.querySelectorAll('[data-idx]');return Array.from(items).map(item=>{const idx=parseInt(item.dataset.idx),mid=document.getElementById('mid-'+id+'-'+idx).value.trim(),en=document.getElementById('men-'+id+'-'+idx).checked;return mid?{id:mid,enabled:en}:null}).filter(Boolean)}

async function save(id){const nm=document.getElementById('nm-'+id).value.trim(),url=document.getElementById('url-'+id).value.trim();const kt=document.getElementById('keys-'+id).value,keys=kt.split('\n').map(k=>k.trim()).filter(k=>k);const models=getMdl(id),enabled=document.getElementById('en-'+id).checked;const r=await fetch('/admin/api/providers/'+encodeURIComponent(id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:nm,baseUrl:url,apiKeys:keys,models,enabled})});const d=await r.json();if(d.success){toast('已保存','success');location.reload()}else toast(d.message||'保存失败','error')}

async function del(id){if(!(await cM('确定要删除此提供商？')))return;const r=await fetch('/admin/api/providers/'+encodeURIComponent(id),{method:'DELETE'});const d=await r.json();if(d.success){toast('已删除','success');location.reload()}else toast(d.message||'删除失败','error')}

function addMdl(id){const inp=document.getElementById('nmid-'+id),mid=inp.value.trim();if(!mid){toast('请输入模型 ID','error');return}
const c=document.getElementById('ml-'+id),cnt=c.querySelectorAll('[data-idx]').length;const d=document.createElement('div');d.className='fc';d.style.marginBottom='3px';d.dataset.idx=cnt;d.innerHTML='<input type="text" value="'+mid+'" style="flex:1;" id="mid-'+id+'-'+cnt+'" placeholder="模型 ID"><label class="tg"><input type="checkbox" checked id="men-'+id+'-'+cnt+'"><span class="sl"></span></label><button class="btn btn-gh btn-xs" onclick="testMdl(''+id+'',''+mid+'','+cnt+')"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" onclick="rmMdl(''+id+'','+cnt+')"><i class="fas fa-times" style="color:#9ca3af;"></i></button>';c.appendChild(d);inp.value=''}

function rmMdl(id,idx){const c=document.getElementById('ml-'+id);c.querySelectorAll('[data-idx]').forEach(item=>{if(parseInt(item.dataset.idx)===idx)item.remove()})}

async function testMdl(id,mid,idx){const tr=document.getElementById('tr-'+id);tr.innerHTML='<span class="mu"><i class="fas fa-spinner fa-spin"></i> 测试中...</span>';try{const r=await fetch('/admin/api/providers/'+encodeURIComponent(id)+'/test-model',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({modelId:mid})});const d=await r.json();if(d.success&&d.data){tr.innerHTML=d.data.success?'<div class="al al-s"><i class="fas fa-check-circle"></i> 连接成功 (HTTP '+d.data.statusCode+')</div>':'<div class="al al-e"><i class="fas fa-times-circle"></i> '+(d.data.message||'连接失败')+'</div>'}else tr.innerHTML='<div class="al al-e"><i class="fas fa-times-circle"></i> '+(d.message||'测试失败')+'</div>'}catch(e){tr.innerHTML='<div class="al al-e"><i class="fas fa-times-circle"></i> 请求失败</div>'}}

// proxy keys
async function genKey(){const name=await pM('输入 Key 名称（可选）');if(name===null)return;showM('<h3><i class="fas fa-key" style="color:#4f6ef7;"></i> 生成转发 Key</h3><div class="fg"><label>有效期</label><select id="exp"><option value="30d">30 天</option><option value="90d">90 天</option><option value="180d">180 天</option><option value="1y">1 年</option><option value="forever" selected>永久</option></select></div><div class="fa"><button class="btn btn-s" onclick="closeM()">取消</button><button class="btn btn-p" onclick="doGenKey(document.getElementById('exp').value,name)">生成</button></div>')}

async function doGenKey(exp,name){closeM();const nm=name||'';const r=await fetch('/admin/api/proxy-keys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:nm,expiresIn:exp})});const d=await r.json();if(d.success&&d.data){showM('<h3><i class="fas fa-check-circle" style="color:#16a34a;"></i> 生成成功</h3><p>请立即复制保存，关闭后将不再显示：</p><div class="mk">'+d.data.key+'</div><div class="fa"><button class="btn btn-p" onclick="closeM();location.reload()">关闭</button></div>')}else toast(d.message||'生成失败','error')}

async function rmKey(id){if(!(await cM('确定要删除此 Key？')))return;const r=await fetch('/admin/api/proxy-keys/'+encodeURIComponent(id),{method:'DELETE'});const d=await r.json();if(d.success){toast('已删除','success');location.reload()}else toast(d.message||'删除失败','error')}
