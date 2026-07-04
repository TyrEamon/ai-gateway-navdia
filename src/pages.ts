import { Context } from 'hono'
import { getProviders, getProxyKeys } from './storage'
import { SITE_CONFIG } from './config'
import type { Env } from './types'

const H = (title: string) => `
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ${SITE_CONFIG.title}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;background:#f0f2f5;color:#1f2937;line-height:1.5;min-height:100vh;display:flex;flex-direction:column}
    .ct{max-width:1200px;margin:0 auto;padding:0 16px;width:100%}
    hd{background:rgba(255,255,255,.93);backdrop-filter:blur(12px);border-bottom:1px solid #e5e7eb;padding:12px 0;position:sticky;top:0;z-index:100;display:block}
    hd .ct{display:flex;align-items:center;justify-content:space-between}
    hd h1{font-size:1.15rem;font-weight:700;color:#111827}
    hd h1 i{color:#4f6ef7;margin-right:6px}
    hd .nav{display:flex;gap:8px;align-items:center}
    .btn{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:6px;font-size:.8rem;font-weight:500;cursor:pointer;border:none;transition:all .12s;text-decoration:none;white-space:nowrap}
    .btn-p{background:#4f6ef7;color:#fff}
    .btn-p:hover{background:#3b5de7}
    .btn-s{background:#f3f4f6;color:#4b5563}
    .btn-s:hover{background:#e5e7eb}
    .btn-d{background:#fef2f2;color:#dc2626}
    .btn-d:hover{background:#fee2e2}
    .btn-g{background:#f0fdf4;color:#16a34a}
    .btn-g:hover{background:#dcfce7}
    .btn-gh{background:transparent;color:#6b7280;padding:4px 8px}
    .btn-gh:hover{background:#f3f4f6}
    .btn-xs{padding:3px 8px;font-size:.75rem}
    .card{background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.05);padding:20px;margin-bottom:14px;border:1px solid #e5e7eb}
    .card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #f3f4f6}
    .card-hd h2{font-size:.95rem;font-weight:600;color:#111827}
    .card-hd h2 i{color:#4f6ef7;margin-right:6px;width:16px;text-align:center}
    footer{display:block;margin-top:auto;background:#fff;border-top:1px solid #e5e7eb;padding:14px 0;text-align:center;color:#9ca3af;font-size:.8rem}
    footer a{color:inherit;text-decoration:none}
    footer a:hover{text-decoration:underline}
    input,textarea,select{width:100%;padding:6px 9px;border:1px solid #d1d5db;border-radius:5px;font-size:.84rem;transition:border-color .12s;outline:none;font-family:inherit;background:#fff}
    input:focus,textarea:focus{border-color:#4f6ef7;box-shadow:0 0 0 2px rgba(79,110,247,.12)}
    textarea{resize:vertical;min-height:44px;font-family:'SF Mono','Fira Code',monospace;font-size:.78rem}
    label{display:block;font-size:.75rem;font-weight:600;color:#6b7280;margin-bottom:2px}
    .fg{margin-bottom:8px}
    .fr{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .fr3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
    .fa{margin-top:10px;display:flex;gap:8px}
    .tg{position:relative;display:inline-block;width:34px;height:18px;flex-shrink:0}
    .tg input{opacity:0;width:0;height:0}
    .tg .sl{position:absolute;cursor:pointer;inset:0;background:#d1d5db;border-radius:18px;transition:.2s}
    .tg .sl::before{content:"";position:absolute;height:12px;width:12px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s}
    .tg input:checked+.sl{background:#4f6ef7}
    .tg input:checked+.sl::before{transform:translateX(16px)}
    .bd{display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:10px;font-size:.7rem;font-weight:500;white-space:nowrap}
    .bd-on{background:#dcfce7;color:#16a34a}
    .bd-off{background:#f3f4f6;color:#9ca3af}
    .bd-info{background:#eef2ff;color:#4f6ef7}
    .tag{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:4px;font-size:.76rem;background:#f9fafb;color:#4b5563;border:1px solid #e5e7eb;cursor:pointer;transition:border-color .12s}
    .tag:hover{border-color:#d1d5db}
    .tag i{font-size:.6rem;color:#9ca3af}
    .g2{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
    .mw{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
    .pi{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
    .pi:hover{border-color:#d1d5db}
    .ps{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;cursor:pointer;background:#fafbfc}
    .ps:hover{background:#f3f4f6}
    .ps .l{display:flex;align-items:center;gap:8px;min-width:0;flex:1}
    .ps .l h3{font-size:.85rem;font-weight:600;white-space:nowrap}
    .ps .l .pu{font-size:.73rem;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;display:inline-flex;align-items:center;gap:3px}
    .ps .l .pu i.cp{font-size:.7rem;cursor:pointer;color:#9ca3af;padding:1px}
    .ps .l .pu i.cp:hover{color:#4f6ef7}
    .pd{padding:12px;display:none;border-top:1px solid #f3f4f6}
    .pd.open{display:block}
    .pd .fr{grid-template-columns:1fr 1.5fr}
    .pd .fr3{grid-template-columns:1fr 1fr 70px}
    .ki{display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f9fafb;flex-wrap:wrap}
    .ki .kv{min-width:0;flex:1 1 60%}    .ki:last-child{border-bottom:none}
    .kv{font-family:'SF Mono','Fira Code',monospace;font-size:.8rem;color:#4b5563;display:inline-flex;align-items:center;gap:5px}
    .kv i.cp{font-size:.75rem;cursor:pointer;color:#9ca3af}
    .kv i.cp:hover{color:#4f6ef7}
    .sg{display:flex;gap:12px;flex-wrap:wrap}
    .sg .sc{flex:1;min-width:110px;background:#fafbfc;border-radius:8px;padding:10px;text-align:center;border:1px solid #e5e7eb}
    .sg .sc .n{font-size:1.2rem;font-weight:700;color:#4f6ef7}
    .sg .sc .l{font-size:.73rem;color:#9ca3af;margin-top:2px}
    .al{padding:7px 10px;border-radius:5px;font-size:.8rem;display:flex;align-items:center;gap:5px}
    .al-s{background:#f0fdf4;color:#166534}
    .al-e{background:#fef2f2;color:#991b1b}
    .al-i{background:#eef2ff;color:#3730a3}
    .tc{text-align:center}
    .mt-1{margin-top:4px}
    .mt-2{margin-top:8px}
    .mb-2{margin-bottom:8px}
    .fc{display:flex;align-items:center;gap:5px}
    .fw{width:100%}
    .mu{color:#9ca3af;font-size:.8rem}
    .cd{font-family:'SF Mono','Fira Code',monospace;font-size:.8rem;background:#f3f4f6;padding:1px 4px;border-radius:3px}
    .ov{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cp{cursor:pointer;user-select:none}
    .gp{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .modal-o{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:9999;display:flex;align-items:center;justify-content:center}
    .modal{background:#fff;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.15);width:90%;max-width:400px;padding:22px;animation:mi .15s ease}
    .modal h3{font-size:.95rem;font-weight:600;margin-bottom:10px}
    .modal p{font-size:.84rem;color:#6b7280;margin-bottom:14px}
    .modal .fa{margin-top:14px;margin-bottom:0}
    .modal select{margin-bottom:8px}
    @keyframes mi{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
    .mk{background:#f3f4f6;border:1px solid #e5e7eb;border-radius:5px;padding:8px 10px;font-family:'SF Mono','Fira Code',monospace;font-size:.8rem;word-break:break-all;user-select:all;margin:6px 0}
    .hd{display:none!important}
    @media(max-width:768px){
      .sg .sc {flex: 1 1 100% !important;min-width:0 !important;}
      .fr,.fr3,.pd .fr,.pd .fr3{grid-template-columns:1fr}
      .g2{grid-template-columns:1fr}
      .gp{grid-template-columns:1fr}
      .ki{flex-wrap:wrap}
      .ki>div:first-child{flex:1 1 100%;overflow:hidden}
      .ki>.fc{margin-top:4px}
    }
  </style>
</head>`

// ===== 首页 =====

export async function renderHomePage(c: Context<{ Bindings: Env }>, isLoggedIn: boolean) {
  const providers = await getProviders(c.env)
  const host = c.req.header('host') || 'localhost:8787'

  return c.html(`<!DOCTYPE html><html lang="zh-CN">
${H('首页')}
<body>
<hd><div class="ct">
  <h1><i class="fas fa-cloud"></i>${SITE_CONFIG.title} <span style="font-weight:400;font-size:.85rem;color:#9ca3af;">| ${SITE_CONFIG.subtitle}</span></h1>
  <div class="nav">
    ${isLoggedIn
      ? `<a href="/admin" class="btn btn-p"><i class="fas fa-cog"></i>管理</a><a href="/admin/logout" class="btn btn-gh"><i class="fas fa-sign-out-alt"></i>退出</a>`
      : `<a href="/admin/login" class="btn btn-p"><i class="fas fa-sign-in-alt"></i>登录</a>`
    }
  </div>
</div></hd>

<main class="ct" style="padding:24px 16px;">

  <!-- 三卡片总览行 -->
  <div class="sg" style="margin-bottom:28px;">
    <div class="sc" style="flex: 1 1 calc(50% - 12px);;text-align:left;padding:14px;min-width:240px;">
      <h2 style="font-size:1rem;font-weight:700;margin-bottom:5px;"><i class="fas fa-cubes" style="color:#4f6ef7;"></i> 模型广场</h2>
      <p class="mu" style="font-size:.77rem;margin-bottom:2px;">
        本站 API 接口：<code class="cd">https://${host}/v1</code> <i class="fas fa-copy cp" style="font-size:.65rem;color:#9ca3af;vertical-align:middle;" onclick='copyText("https://${host}/v1",this)'></i>
      </p>
      <p class="mu" style="font-size:.77rem;">模型名称格式：<code class="cd">提供商ID/模型ID</code></p>
    </div>
    <div class="sc" style="flex: 1 1 calc(25% - 12px);;display:flex;flex-direction:column;justify-content:center;padding:10px 12px;">
      <div style="display:flex;align-items:center;gap:4px;"><i class="fas fa-server" style="color:#9ca3af;font-size:.75rem;width:14px;text-align:center;"></i><span style="color:#6b7280;font-size:.82rem;">提供商总计</span><span class="n" style="font-size:1rem;margin-left:auto;">${providers.length}</span></div>
      <div style="display:flex;align-items:center;gap:4px;margin-top:6px;"><i class="fas fa-check-circle" style="color:#16a34a;font-size:.75rem;width:14px;text-align:center;"></i><span style="color:#6b7280;font-size:.82rem;">已启用</span><span class="n" style="font-size:1rem;margin-left:auto;">${providers.filter(p=>p.enabled).length}</span></div>
    </div>
    <div class="sc" style="flex: 1 1 calc(25% - 12px);;display:flex;flex-direction:column;justify-content:center;padding:10px 12px;">
      <div style="display:flex;align-items:center;gap:4px;"><i class="fas fa-cube" style="color:#9ca3af;font-size:.75rem;width:14px;text-align:center;"></i><span style="color:#6b7280;font-size:.82rem;">模型总计</span><span class="n" style="font-size:1rem;margin-left:auto;">${providers.reduce((s,p)=>s+p.models.length,0)}</span></div>
      <div style="display:flex;align-items:center;gap:4px;margin-top:6px;"><i class="fas fa-check-circle" style="color:#16a34a;font-size:.75rem;width:14px;text-align:center;"></i><span style="color:#6b7280;font-size:.82rem;">已启用</span><span class="n" style="font-size:1rem;margin-left:auto;">${providers.reduce((s,p)=>s+p.models.filter(m=>m.enabled).length,0)}</span></div>
    </div>
  </div>

  <div class="g2">
    ${providers.filter(p=>p.enabled).map(p=>`
      <div class="card" style="padding:14px;">
        <div class="fc" style="justify-content:space-between;">
	          <h3 style="font-size:.9rem;font-weight:600;"><i class="fas fa-server" style="color:#4f6ef7;margin-right:5px;"></i>${p.name} <span style="font-size:.65rem;font-weight:400;padding:1px 5px;border-radius:4px;border:1px solid #d1d5db;color:#6b7280;vertical-align:middle;">${(p.apiType||'openai')==='anthropic'?'Anthropic':'OpenAI'}</span></h3>
          <span class="bd ${p.enabled?'bd-on':'bd-off'}">${p.enabled?'已启用':'未启用'}</span>
        </div>
        <p class="mu" style="margin-top:3px;font-size:.75rem;display:flex;align-items:center;gap:3px;">
          <i class="fas fa-link" style="flex-shrink:0;"></i>
          <span class="ov" style="flex:1;">${p.baseUrl}</span>
          <i class="fas fa-copy cp" style="font-size:.65rem;color:#9ca3af;flex-shrink:0;" onclick='copyText("${p.baseUrl}",this)'></i>
        </p>
        ${p.models.filter(m=>m.enabled).length
          ? `<div class="mw">${p.models.filter(m=>m.enabled).map(m=>`<span class="tag" onclick='copyText("${p.id}/${m.id}",this)'><i class="fas fa-cube"></i>${p.id}/${m.id}</span>`).join('')}</div>`
          : `<p class="mu" style="margin-top:5px;font-style:italic;">暂无启用的模型</p>`
        }
      </div>
    `).join('')}
  </div>
</main>

<footer><div class="ct">&copy; ${new Date().getFullYear()} <a href="${SITE_CONFIG.authorUrl}" target="_blank">${SITE_CONFIG.title}</a> by <a href="${SITE_CONFIG.blogUrl}" target="_blank">${SITE_CONFIG.author}</a></div></footer>

<script>
function copyText(t,el){const ic=el.tagName==='I'?el:el.querySelector('i');const oc=ic.className;const os=ic.style.color;navigator.clipboard.writeText(t).then(()=>{ic.className='fas fa-check';ic.style.color='#16a34a';setTimeout(()=>{ic.className=oc;ic.style.color=os},3000)}).catch(()=>{})}

// provider api keys
function getKeys(id){const c=document.getElementById('keys-'+id);const items=c.querySelectorAll('[data-kidx]');return Array.from(items).map(item=>{const idx=parseInt(item.dataset.kidx);const k=document.getElementById('k-'+id+'-'+idx).value.trim();const en=document.getElementById('ken-'+id+'-'+idx).checked;return k?{key:k,enabled:en}:null}).filter(Boolean)}
function addKeyRow(id){const inp=document.getElementById('nk-'+id),k=inp.value.trim();if(!k){toast('请输入 API Key','error');return}
const c=document.getElementById('keys-'+id),cnt=c.querySelectorAll('[data-kidx]').length;const d=document.createElement('div');d.className='fc';d.style.marginBottom='3px';d.dataset.kidx=cnt;d.innerHTML='<input type="text" value="'+k+'" style="flex:1;" id="k-'+id+'-'+cnt+'" placeholder="API Key"><label class="tg"><input type="checkbox" checked id="ken-'+id+'-'+cnt+'"><span class="sl"></span></label><button class="btn btn-gh btn-xs" onclick="testKeyRow(\\''+id+'\\','+cnt+')" title="测试"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" onclick="rmKeyRow(\\''+id+'\\','+cnt+')"><i class="fas fa-times" style="color:#9ca3af;"></i></button>';c.appendChild(d);inp.value='';inp.focus()}
function rmKeyRow(id,idx){const c=document.getElementById('keys-'+id);c.querySelectorAll('[data-kidx]').forEach(item=>{if(parseInt(item.dataset.kidx)===idx)item.remove()})}
async function testKeyRow(id,idx){const k=document.getElementById('k-'+id+'-'+idx).value.trim();const url=document.getElementById('url-'+id).value.trim();if(!k){toast('请输入 API Key','error');return}
const tr=document.getElementById('tr-'+id);tr.innerHTML='<span class="mu"><i class="fas fa-spinner fa-spin"></i> 测试中...</span>';
try{const r=await fetch(url.replace(/\\/$/,'').replace(/\\/v1$/,'')+'/v1/models',{method:'GET',headers:{'Authorization':'Bearer '+k}});tr.innerHTML=r.ok?'<div class="al al-s"><i class="fas fa-check-circle"></i> 连接成功</div>':'<div class="al al-e"><i class="fas fa-times-circle"></i> HTTP '+r.status+'</div>';setTimeout(()=>tr.innerHTML='',5000)}catch(e){tr.innerHTML='<div class="al al-e"><i class="fas fa-times-circle"></i> 连接失败</div>';setTimeout(()=>tr.innerHTML='',5000)}}
function addAKeyRow(){const c=document.getElementById('akeys');const d=document.createElement('div');d.className='fc';d.style.marginBottom='4px';d.innerHTML='<input type="text" placeholder="sk-xxx" style="flex:1;" class="aki"><label class="tg"><input type="checkbox" checked class="ake"><span class="sl"></span></label><button class="btn btn-gh btn-xs" onclick="testNewAKey(this)" title="测试"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" onclick="this.parentElement.remove()"><i class="fas fa-times" style="color:#9ca3af;"></i></button>';c.appendChild(d)}
function testNewAKey(btn){const inp=btn.parentElement.querySelector('.aki'),k=inp.value.trim();if(!k){toast('请输入 API Key','error');return}
const url=document.getElementById('aurl').value.trim();if(!url){toast('请先填写 API 地址','error');return}
const tr=document.getElementById('atestR');tr.innerHTML='<span class="mu"><i class="fas fa-spinner fa-spin"></i> 测试中...</span>';
fetch(url.replace(/\\/$/,'').replace(/\\/v1$/,'')+'/v1/models',{method:'GET',headers:{'Authorization':'Bearer '+k}}).then(r=>{tr.innerHTML=r.ok?'<div class="al al-s"><i class="fas fa-check-circle"></i> 连接成功</div>':'<div class="al al-e"><i class="fas fa-times-circle"></i> HTTP '+r.status+'</div>';setTimeout(()=>tr.innerHTML='',5000)}).catch(()=>{tr.innerHTML='<div class="al al-e"><i class="fas fa-times-circle"></i> 连接失败</div>';setTimeout(()=>tr.innerHTML='',5000)})}
// proxy key list
function toggleKeyVis(id){const el=document.getElementById('kv-'+id);const full=el.dataset.full;if(el.textContent.includes('****')){el.textContent=full}else{el.textContent=full.length>12?full.substring(0,8)+'****'+full.substring(full.length-4):full}}
async function toggleProxyKey(id,checked){const r=await fetch('/admin/api/proxy-keys/'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:checked})});const d=await r.json();if(!d.success)toast(d.message||'操作失败','error')}

</script>
</body></html>`)
	}

export async function renderLoginPage(c: Context<{ Bindings: Env }>) {
	  return c.html(`<!DOCTYPE html><html lang="zh-CN">
	${H('登录')}
<body>
<hd><div class="ct">
  <h1><i class="fas fa-cloud"></i>${SITE_CONFIG.title}</h1>
  <div class="nav"><a href="/" class="btn btn-gh"><i class="fas fa-home"></i>首页</a></div>
</div></hd>
<div style="display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 110px);padding:20px;">
  <div class="card" style="width:100%;max-width:360px;padding:24px;">
    <h2 style="text-align:center;font-size:1.05rem;margin-bottom:3px;"><i class="fas fa-lock" style="color:#4f6ef7;"></i> 管理员登录</h2>
    <p class="tc mu" style="margin-bottom:10px;">账号由 Cloudflare 环境变量配置</p>
    <div id="er" class="al al-e hd mb-2"><i class="fas fa-exclamation-circle"></i><span id="em"></span></div>
    <div class="fg" style="margin:16px 0;"><label><i class="fas fa-user"></i> 用户名</label><input type="text" style="margin-top:6px;" id="u" placeholder="请输入用户名"></div>
    <div class="fg" style="margin:16px 0;"><label><i class="fas fa-lock"></i> 密码</label><input type="password" style="margin-top:6px;" id="p" placeholder="请输入密码" onkeydown="if(event.key==='Enter')l()"></div>
    <button class="btn btn-p fw" onclick="l()" style="justify-content:center;padding:7px;"><i class="fas fa-sign-in-alt"></i> 登录</button>
  </div>
</div>
<script>
async function l(){const u=document.getElementById('u').value.trim(),p=document.getElementById('p').value;const er=document.getElementById('er'),em=document.getElementById('em');if(!u||!p){em.textContent='请填写用户名和密码';er.classList.remove('hd');return}
try{const r=await fetch('/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});const d=await r.json();if(d.success)window.location.href='/admin';else{em.textContent=d.message||'登录失败';er.classList.remove('hd')}}catch(e){em.textContent='网络错误';er.classList.remove('hd')}}
</script>
</body></html>`)
}

// ===== 管理后台 =====

export async function renderAdminPage(c: Context<{ Bindings: Env }>) {
  const providers = await getProviders(c.env)
  const proxyKeys = await getProxyKeys(c.env)
  const tModels = providers.reduce((s, p) => s + p.models.length, 0)

  return c.html(`<!DOCTYPE html><html lang="zh-CN">
${H('管理')}
<body>
<hd><div class="ct">
  <h1><i class="fas fa-cloud"></i>${SITE_CONFIG.title}<span style="font-size:14px;font-weight:normal;color:#9ca3af;margin-left:5px;">| 统一的 AI 管理平台</span></h1>
  <div class="nav"><a href="/" class="btn btn-gh"><i class="fas fa-home"></i>首页</a><a href="/admin/logout" class="btn btn-gh"><i class="fas fa-sign-out-alt"></i>退出</a></div>
</div></hd>

<main class="ct" style="padding:14px 16px;">
<div id="toast" class="hd" style="position:fixed;top:14px;right:14px;z-index:9998;min-width:260px;"></div>

<!-- 提供商 -->
<div class="card" style="margin-top:10px;">
  <div class="card-hd">
    <h2><i class="fas fa-server"></i>提供商</h2>
    <button class="btn btn-p btn-xs" onclick="showAdd()"><i class="fas fa-plus"></i> 添加</button>
  </div>

  <!-- 添加表单 -->
  <div style="display:flex;gap:12px;margin-bottom:12px;">
  <div id="af" class="hd" style="padding:14px;background:#fafbfc;border-radius:8px;border:1px dashed #d1d5db;width:calc(50% - 5px);">
    <h3 style="font-size:.88rem;margin-bottom:10px;"><i class="fas fa-plus-circle" style="color:#4f6ef7;"></i> 添加新提供商</h3>
    <div class="fr">
      <div class="fg"><label>名称</label><input type="text" id="anm" placeholder="DeepSeek"></div>
      <div class="fg"><label>ID</label><input type="text" id="aid" placeholder="deepseek"></div>
    </div>
	    <div class="fg"><label>API 地址</label><input type="url" id="aurl" placeholder="https://api.deepseek.com"></div>
	    <div class="fg"><label>API 格式</label><select id="afmt" style="flex:1;padding:7px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.82rem;background:#fff;"><option value="openai">OpenAI 兼容</option><option value="anthropic">Anthropic 兼容</option></select></div>
	    <div class="fg"><label>API Keys</label>
      <div id="akeys"><div class="fc" style="margin-bottom:4px;"><input type="text" placeholder="sk-xxx" style="flex:1;" class="aki"><label class="tg"><input type="checkbox" checked class="ake"><span class="sl"></span></label><button class="btn btn-gh btn-xs" onclick="testNewAKey(this)" title="测试"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" onclick="this.parentElement.remove()"><i class="fas fa-times" style="color:#9ca3af;"></i></button></div></div>
      <button class="btn btn-gh btn-xs" onclick="addAKeyRow()"><i class="fas fa-plus"></i> 添加 Key</button>
    </div>
	    <div class="fg">
	      <label>模型 ID <span class="mu">（支持多个）</span></label>
	      <div id="amodels"><div class="fc" style="margin-bottom:4px;"><input type="text" placeholder="deepseek-chat" style="flex:1;" class="ami"><label class="tg"><input type="checkbox" checked class="ame"><span class="sl"></span></label><button class="btn btn-gh btn-xs" onclick="testNewMdl(this)" title="测试"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" onclick="this.parentElement.remove()"><i class="fas fa-times" style="color:#9ca3af;"></i></button></div></div>
	      <button class="btn btn-gh btn-xs" onclick="addMdlRow()"><i class="fas fa-plus"></i> 添加模型</button>
	    </div>
    <div class="fc" style="margin-top:8px;gap:8px;">
      <label class="tg"><input type="checkbox" checked id="aen"><span class="sl"></span></label>
      <span class="mu">启用</span>
      <span style="flex:1;"></span>
      <button class="btn btn-g btn-xs" onclick="createProv()"><i class="fas fa-check"></i> 创建</button>
      <button class="btn btn-gh btn-xs" onclick="hideAdd()">取消</button>
    </div>
    <div id="atestR" class="mt-1"></div>
  </div>
  <div id="amc" class="hd" style="flex:1;padding:14px;background:#fafbfc;border-radius:8px;border:1px dashed #d1d5db;max-height:420px;overflow-y:auto;">
    <h3 style="font-size:.88rem;margin-bottom:10px;"><i class="fas fa-cube" style="color:#4f6ef7;"></i> 可用模型</h3>
    <div id="amcl"></div>
  </div>
  </div>

  <!-- 列表 -->
  <div class="gp" id="plist">
    ${providers.map(p=>`
    <div class="pi" data-id="${p.id}">
      <div class="ps" onclick="tog('${p.id}')">
        <div class="l">
          <i class="fas fa-chevron-right" style="color:#d1d5db;font-size:.65rem;transition:transform .12s;" id="ch-${p.id}"></i>
          <div><h3>${p.name}</h3><div class="pu"><i class="fas fa-link"></i><span class="ov">${p.baseUrl}</span><i class="fas fa-copy cp" onclick="event.stopPropagation();copyText('${p.baseUrl}',this)"></i></div></div>
        </div>
        <div class="fc" style="flex-shrink:0;">
	          <label class="tg" onclick="event.stopPropagation()"><input type="checkbox" ${p.enabled?'checked':''} id="en-${p.id}" onchange="togglePb('${p.id}',this.checked)"><span class="sl"></span></label>
	          <span class="bd ${p.enabled?'bd-on':'bd-off'}">${p.enabled?'已启用':'未启用'}</span>
        </div>
      </div>
      <div class="pd" id="dt-${p.id}">
        <div class="fr">
          <div class="fg"><label>名称</label><input type="text" id="nm-${p.id}" value="${p.name}"></div>
          <div class="fg"><label>ID</label><input type="text" value="${p.id}" disabled style="background:#f9fafb;"></div>
        </div>
	        <div class="fg"><label>API 地址</label><input type="url" id="url-${p.id}" value="${p.baseUrl}"></div>
	        <div class="fg"><label>API 格式</label><select id="at-${p.id}" style="flex:1;padding:7px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:.82rem;background:#fff;"><option value="openai" ${(p.apiType||'openai')==='openai'?'selected':''}>OpenAI 兼容</option><option value="anthropic" ${p.apiType==='anthropic'?'selected':''}>Anthropic 兼容</option></select></div>
	        <div class="fg"><label>API Keys</label>
          <div id="keys-${p.id}">${p.apiKeys.map((k, ki)=>`
            <div class="fc" style="margin-bottom:3px;" data-kidx="${ki}">
              <input type="text" value="${k.key}" style="flex:1;" id="k-${p.id}-${ki}" placeholder="API Key">
              <label class="tg"><input type="checkbox" ${k.enabled?'checked':''} id="ken-${p.id}-${ki}"><span class="sl"></span></label>
              <button class="btn btn-gh btn-xs" onclick="testKeyRow('${p.id}',${ki})" title="测试"><i class="fas fa-plug"></i></button>
              <button class="btn btn-gh btn-xs" onclick="rmKeyRow('${p.id}',${ki})"><i class="fas fa-times" style="color:#9ca3af;"></i></button>
            </div>`).join('')}
          </div>
          <div class="fc mt-1"><input type="text" id="nk-${p.id}" placeholder="API Key" style="flex:1;"><button class="btn btn-gh btn-xs" onclick="addKeyRow('${p.id}')"><i class="fas fa-plus"></i> 添加</button></div>
        </div>
        <div class="fg">
          <label>模型</label>
          <div id="ml-${p.id}">${p.models.map((m,mi)=>`
            <div class="fc" style="margin-bottom:3px;" data-idx="${mi}">
              <input type="text" value="${m.id}" style="flex:1;" id="mid-${p.id}-${mi}" placeholder="模型 ID">
              <label class="tg"><input type="checkbox" ${m.enabled?'checked':''} id="men-${p.id}-${mi}"><span class="sl"></span></label>
              <button class="btn btn-gh btn-xs" onclick="testMdl('${p.id}','${m.id}',${mi})" title="测试"><i class="fas fa-plug"></i></button>
              <button class="btn btn-gh btn-xs" onclick="rmMdl('${p.id}',${mi})"><i class="fas fa-times" style="color:#9ca3af;"></i></button>
            </div>`).join('')}
          </div>
          <div class="fc mt-1"><input type="text" id="nmid-${p.id}" placeholder="模型 ID" style="flex:1;"><button class="btn btn-gh btn-xs" onclick="addMdl('${p.id}')"><i class="fas fa-plus"></i> 添加</button></div>
        </div>
	        <div class="fc" style="gap:8px;margin-top:2px;">
	          <span style="flex:1;"></span>
          <button class="btn btn-g btn-xs" onclick="save('${p.id}')"><i class="fas fa-save"></i> 保存</button>
          <button class="btn btn-d btn-xs" onclick="del('${p.id}')"><i class="fas fa-trash"></i> 删除</button>
        </div>
        <div id="tr-${p.id}" class="mt-1"></div>
      </div>
    </div>`).join('')}
  </div>
</div>

<!-- 转发 Key -->
<div class="card">
  <div class="card-hd"><h2><i class="fas fa-key"></i>API Key 列表</h2><button class="btn btn-p btn-xs" onclick="genKey()"><i class="fas fa-plus"></i> 生成</button></div>
  ${proxyKeys.length===0?'<p class="mu" style="font-style:italic;">暂无转发 Key</p>':''}
  ${proxyKeys.map(k=>`
    <div class="ki" data-id="${k.id}">
      <div>
        <div class="kv"><i class="fas fa-key" style="color:#4f6ef7;width:12px;"></i> <span id="kv-${k.id}" data-full="${k.key}">${k.key.length>12?k.key.substring(0,8)+'****'+k.key.substring(k.key.length-4):k.key}</span> <i class="fas fa-eye cp" onclick="toggleKeyVis('${k.id}')" title="显示/隐藏"></i> <i class="fas fa-copy cp" onclick='copyText("${k.key}",this)'></i></div>
        <div class="mu" style="font-size:.72rem;">${k.name} · 创建日期：${new Date(k.createdAt).toLocaleDateString()} · 有效截止：${k.expiresAt?new Date(k.expiresAt).toLocaleDateString():'永久'}</div>
      </div>
      <div class="fc"><label class="tg"><input type="checkbox" ${k.enabled?'checked':''} onchange="toggleProxyKey('${k.id}',this.checked)"><span class="sl"></span></label><span class="bd ${k.enabled?'bd-on':'bd-off'}">${k.enabled?'已启用':'已禁用'}</span><button class="btn btn-gh btn-xs" onclick="rmKey('${k.id}')"><i class="fas fa-trash" style="color:#9ca3af;"></i></button></div>
    </div>`).join('')}
</div>
</main>

<div id="modal" class="modal-o hd" onclick="if(event.target===this)closeM()"><div class="modal" id="mc"></div></div>

<footer><div class="ct">&copy; ${new Date().getFullYear()} <a href="${SITE_CONFIG.authorUrl}" target="_blank">${SITE_CONFIG.title}</a> by <a href="${SITE_CONFIG.blogUrl}" target="_blank">${SITE_CONFIG.author}</a></div></footer>

<script>
// copy
function copyText(t,el){const i=el.tagName==='I'?el:el.querySelector('i');const oc=i.className;const os=i.style.color;navigator.clipboard.writeText(t).then(()=>{i.className='fas fa-check';i.style.color='#16a34a';setTimeout(()=>{i.className=oc;i.style.color=os},3000)}).catch(()=>{})}

// modal
function showM(h){document.getElementById('mc').innerHTML=h;document.getElementById('modal').classList.remove('hd')}
function closeM(){document.getElementById('modal').classList.add('hd')}
function cM(msg){return new Promise(r=>{showM('<h3><i class="fas fa-question-circle" style="color:#4f6ef7;"></i> 确认</h3><p>'+msg+'</p><div class="fa"><button class="btn btn-s" onclick="closeM();r(false)">取消</button><button class="btn btn-p" onclick="closeM();r(true)">确定</button></div>');window.r=r})}
function pM(msg,def){return new Promise(r=>{showM('<h3><i class="fas fa-pen" style="color:#4f6ef7;"></i> '+msg+'</h3><div class="fg"><input type="text" id="pv" value="'+(def||'')+'" placeholder="请输入"></div><div class="fa"><button class="btn btn-s" id="pMc">取消</button><button class="btn btn-p" id="pMo">确定</button></div>');window.r=r;const inp=document.getElementById('pv');if(inp){inp.focus();inp.addEventListener('keydown',function(e){if(e.key==='Enter'){closeM();r(inp.value.trim())}})}document.getElementById('pMc').addEventListener('click',function(){closeM();r(null)});document.getElementById('pMo').addEventListener('click',function(){closeM();r(inp.value.trim())})})}
function aM(msg,t){const i=t==='success'?'fa-check-circle':'fa-exclamation-circle';const c=t==='success'?'#16a34a':'#dc2626';showM('<h3><i class="fas '+i+'" style="color:'+c+';"></i> '+(t==='success'?'成功':'提示')+'</h3><p>'+msg+'</p><div class="fa"><button class="btn btn-p" onclick="closeM()">确定</button></div>')}

function toast(msg,t){const el=document.getElementById('toast');const i=t==='success'?'fa-check-circle':'fa-times-circle';const bg=t==='success'?'#f0fdf4':'#fef2f2';const c=t==='success'?'#166534':'#991b1b';el.innerHTML='<div class="al" style="background:'+bg+';color:'+c+';"><i class="fas '+i+'"></i> '+msg+'</div>';el.classList.remove('hd');setTimeout(()=>el.classList.add('hd'),3000)}

// providers
function tog(id){const d=document.getElementById('dt-'+id),c=document.getElementById('ch-'+id);d.classList.toggle('open');c.style.transform=d.classList.contains('open')?'rotate(90deg)':''}

function showAdd(){document.getElementById('af').classList.remove('hd')}
function hideAdd(){document.getElementById('af').classList.add('hd');document.getElementById('amc').classList.add('hd')}

// provider api keys (add form)
function addAKeyRow(){const c=document.getElementById('akeys');const d=document.createElement('div');d.className='fc';d.style.marginBottom='4px';d.innerHTML='<input type="text" placeholder="sk-xxx" style="flex:1;" class="aki"><label class="tg"><input type="checkbox" checked class="ake"><span class="sl"></span></label><button class="btn btn-gh btn-xs" onclick="testNewAKey(this)" title="测试"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" onclick="this.parentElement.remove()"><i class="fas fa-times" style="color:#9ca3af;"></i></button>';c.appendChild(d)}
function testNewAKey(btn){const inp=btn.parentElement.querySelector('.aki'),k=inp.value.trim();if(!k){toast('请输入 API Key','error');return}
		const url=document.getElementById('aurl').value.trim();if(!url){toast('请先填写 API 地址','error');return}
		const apiType=document.getElementById('afmt').value;const testUrl=url.replace(/\\/$/,'')+'/models';const headers=apiType==='anthropic'?{'x-api-key':k,'anthropic-version':'2023-06-01'}:{'Authorization':'Bearer '+k};
	const tr=document.getElementById('atestR');tr.innerHTML='<span class="mu"><i class="fas fa-spinner fa-spin"></i> 测试中...</span>';
	fetch(testUrl,{method:'GET',headers}).then(async r=>{if(r.ok){try{const d=await r.json();const models=d.data||[];const h=models.map(m=>'<div style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:.82rem;display:flex;align-items:center;gap:6px;"><i class="fas fa-cube" style="color:#6b7280;width:14px;flex-shrink:0;"></i><span style="flex:1;cursor:pointer;overflow:hidden;text-overflow:ellipsis;" onclick="copyText(\\''+m.id+'\\',this)">'+m.id+'</span><button class="btn btn-gh btn-xs" onclick="addMdlToForm(\\''+m.id+'\\')" title="添加到表单" style="flex-shrink:0;padding:1px 5px;font-size:.9rem;line-height:1;">+</button></div>').join('');document.getElementById('amcl').innerHTML=h?'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">'+h+'</div>':'<span class="mu">未返回模型列表</span>';document.getElementById('amc').classList.remove('hd')}catch(e){}tr.innerHTML='<div class="al al-s"><i class="fas fa-check-circle"></i> 连接成功</div>'}else{document.getElementById('amc').classList.add('hd');tr.innerHTML='<div class="al al-e"><i class="fas fa-times-circle"></i> HTTP '+r.status+'</div>'};setTimeout(()=>tr.innerHTML='',5000)}).catch(()=>{document.getElementById('amc').classList.add('hd');tr.innerHTML='<div class="al al-e"><i class="fas fa-times-circle"></i> 连接失败</div>';setTimeout(()=>tr.innerHTML='',5000)})}

let mdlCount=1;
function addMdlRow(){const c=document.getElementById('amodels');const d=document.createElement('div');d.className='fc';d.style.marginBottom='4px';d.innerHTML='<input type="text" placeholder="deepseek-chat" style="flex:1;" class="ami"><label class="tg"><input type="checkbox" checked class="ame"><span class="sl"></span></label><button class="btn btn-gh btn-xs" onclick="testNewMdl(this)"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" onclick="this.parentElement.remove()"><i class="fas fa-times" style="color:#9ca3af;"></i></button>';c.appendChild(d)}
function addMdlToForm(mid){const c=document.getElementById('amodels');const d=document.createElement('div');d.className='fc';d.style.marginBottom='4px';d.innerHTML='<input type="text" value="'+mid+'" style="flex:1;" class="ami"><label class="tg"><input type="checkbox" checked class="ame"><span class="sl"></span></label><button class="btn btn-gh btn-xs" onclick="testNewMdl(this)"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" onclick="this.parentElement.remove()"><i class="fas fa-times" style="color:#9ca3af;"></i></button>';c.appendChild(d)}
function testNewMdl(btn){const inp=btn.parentElement.querySelector('.ami');const mid=inp.value.trim();if(!mid){toast('请输入模型 ID','error');return}
const url=document.getElementById('aurl').value.trim();const akeys=document.querySelectorAll('#akeys .aki');const apiKey=Array.from(akeys).map(inp=>inp.value.trim()).filter(Boolean)[0]||'dummy';const apiType=document.getElementById('afmt').value;const testUrl=url.replace(/\\/$/,'')+'/'+(apiType==='anthropic'?'messages':'chat/completions');const headers=apiType==='anthropic'?{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'}:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey};
const tr=document.getElementById('atestR');tr.innerHTML='<span class="mu"><i class="fas fa-spinner fa-spin"></i> 测试中...</span>';
fetch(testUrl,{method:'POST',headers,body:JSON.stringify({model:mid,messages:[{role:'user',content:'hi'}],max_tokens:1})}).then(r=>{tr.innerHTML=r.ok?'<div class="al al-s"><i class="fas fa-check-circle"></i> 连接成功</div>':'<div class="al al-e"><i class="fas fa-times-circle"></i> HTTP '+r.status+'</div>';setTimeout(()=>tr.innerHTML='',5000)}).catch(()=>{tr.innerHTML='<div class="al al-e"><i class="fas fa-times-circle"></i> 连接失败</div>';setTimeout(()=>tr.innerHTML='',5000)})}

async function createProv(){const nm=document.getElementById('anm').value.trim(),id=document.getElementById('aid').value.trim(),url=document.getElementById('aurl').value.trim(),apiType=document.getElementById('afmt').value;const aki=document.querySelectorAll('#akeys .aki');const keys=Array.from(aki).map((inp,i)=>{const k=inp.value.trim();const en=inp.parentElement.querySelector('.ake')?.checked??true;return k?{key:k,enabled:en}:null}).filter(Boolean);const ami=document.querySelectorAll('#amodels .ami');const models=Array.from(ami).map(inp=>{const mid=inp.value.trim();const en=inp.parentElement.querySelector('.ame')?.checked??true;return mid?{id:mid,enabled:en}:null}).filter(Boolean);const enabled=document.getElementById('aen').checked;if(!nm||!id||!url){toast('请填写名称、ID 和 API 地址','error');return}
const r=await fetch('/admin/api/providers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name:nm,baseUrl:url,apiType,apiKeys:keys,models,enabled})});const d=await r.json();if(d.success){toast('已创建','success');location.reload()}else toast(d.message||'创建失败','error')}

// provider api keys (edit)
function getKeys(id){const c=document.getElementById('keys-'+id);const items=c.querySelectorAll('[data-kidx]');return Array.from(items).map(item=>{const idx=parseInt(item.dataset.kidx);const k=document.getElementById('k-'+id+'-'+idx).value.trim();const en=document.getElementById('ken-'+id+'-'+idx).checked;return k?{key:k,enabled:en}:null}).filter(Boolean)}
function addKeyRow(id){const inp=document.getElementById('nk-'+id),k=inp.value.trim();if(!k){toast('请输入 API Key','error');return}
const c=document.getElementById('keys-'+id),cnt=c.querySelectorAll('[data-kidx]').length;const d=document.createElement('div');d.className='fc';d.style.marginBottom='3px';d.dataset.kidx=cnt;d.innerHTML='<input type="text" value="'+k+'" style="flex:1;" id="k-'+id+'-'+cnt+'" placeholder="API Key"><label class="tg"><input type="checkbox" checked id="ken-'+id+'-'+cnt+'"><span class="sl"></span></label><button class="btn btn-gh btn-xs" onclick="testKeyRow(\\''+id+'\\','+cnt+')" title="测试"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" onclick="rmKeyRow(\\''+id+'\\','+cnt+')"><i class="fas fa-times" style="color:#9ca3af;"></i></button>';c.appendChild(d);inp.value='';inp.focus()}
function rmKeyRow(id,idx){const c=document.getElementById('keys-'+id);c.querySelectorAll('[data-kidx]').forEach(item=>{if(parseInt(item.dataset.kidx)===idx)item.remove()})}
async function testKeyRow(id,idx){const k=document.getElementById('k-'+id+'-'+idx).value.trim();const url=document.getElementById('url-'+id).value.trim();if(!k){toast('请输入 API Key','error');return}
const apiType=document.getElementById('at-'+id).value;const testUrl=url.replace(/\\/$/,'')+'/models';const headers=apiType==='anthropic'?{'x-api-key':k,'anthropic-version':'2023-06-01'}:{'Authorization':'Bearer '+k};
const tr=document.getElementById('tr-'+id);tr.innerHTML='<span class="mu"><i class="fas fa-spinner fa-spin"></i> 测试中...</span>';
try{const r=await fetch(testUrl,{method:'GET',headers});tr.innerHTML=r.ok?'<div class="al al-s"><i class="fas fa-check-circle"></i> 连接成功</div>':'<div class="al al-e"><i class="fas fa-times-circle"></i> HTTP '+r.status+'</div>';setTimeout(()=>tr.innerHTML='',5000)}catch(e){tr.innerHTML='<div class="al al-e"><i class="fas fa-times-circle"></i> 连接失败</div>';setTimeout(()=>tr.innerHTML='',5000)}}

function getMdl(id){const c=document.getElementById('ml-'+id),items=c.querySelectorAll('[data-idx]');return Array.from(items).map(item=>{const idx=parseInt(item.dataset.idx),mid=document.getElementById('mid-'+id+'-'+idx).value.trim(),en=document.getElementById('men-'+id+'-'+idx).checked;return mid?{id:mid,enabled:en}:null}).filter(Boolean)}

async function save(id){const nm=document.getElementById('nm-'+id).value.trim(),url=document.getElementById('url-'+id).value.trim(),apiType=document.getElementById('at-'+id).value;const keys=getKeys(id);const models=getMdl(id),enabled=document.getElementById('en-'+id).checked;const r=await fetch('/admin/api/providers/'+encodeURIComponent(id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:nm,baseUrl:url,apiType,apiKeys:keys,models,enabled})});const d=await r.json();if(d.success){toast('已保存','success');location.reload()}else toast(d.message||'保存失败','error')}

async function del(id){if(!(await cM('确定要删除此提供商？')))return;const r=await fetch('/admin/api/providers/'+encodeURIComponent(id),{method:'DELETE'});const d=await r.json();if(d.success){toast('已删除','success');location.reload()}else toast(d.message||'删除失败','error')}

function addMdl(id){const inp=document.getElementById('nmid-'+id),mid=inp.value.trim();if(!mid){toast('请输入模型 ID','error');return}
const c=document.getElementById('ml-'+id),cnt=c.querySelectorAll('[data-idx]').length;const d=document.createElement('div');d.className='fc';d.style.marginBottom='3px';d.dataset.idx=cnt;d.innerHTML='<input type="text" value="'+mid+'" style="flex:1;" id="mid-'+id+'-'+cnt+'" placeholder="模型 ID"><label class="tg"><input type="checkbox" checked id="men-'+id+'-'+cnt+'"><span class="sl"></span></label><button class="btn btn-gh btn-xs" id="tm-'+id+'-'+cnt+'"><i class="fas fa-plug"></i></button><button class="btn btn-gh btn-xs" id="rm-'+id+'-'+cnt+'"><i class="fas fa-times" style="color:#9ca3af;"></i></button>';c.appendChild(d);document.getElementById('tm-'+id+'-'+cnt).addEventListener('click',function(){testMdl(id,mid,cnt)});document.getElementById('rm-'+id+'-'+cnt).addEventListener('click',function(){rmMdl(id,cnt)});inp.value=''}

function rmMdl(id,idx){const c=document.getElementById('ml-'+id);c.querySelectorAll('[data-idx]').forEach(item=>{if(parseInt(item.dataset.idx)===idx)item.remove()})}

async function testMdl(id,mid,idx){const tr=document.getElementById('tr-'+id);tr.innerHTML='<span class="mu"><i class="fas fa-spinner fa-spin"></i> 测试中...</span>';try{const r=await fetch('/admin/api/providers/'+encodeURIComponent(id)+'/test-model',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({modelId:mid})});const d=await r.json();if(d.success&&d.data){tr.innerHTML=d.data.success?'<div class="al al-s"><i class="fas fa-check-circle"></i> 连接成功 (HTTP '+d.data.statusCode+')</div>':'<div class="al al-e"><i class="fas fa-times-circle"></i> '+(d.data.message||'连接失败')+'</div>';setTimeout(()=>tr.innerHTML='',5000)}else tr.innerHTML='<div class="al al-e"><i class="fas fa-times-circle"></i> '+(d.message||'测试失败')+'</div>';setTimeout(()=>tr.innerHTML='',5000)}catch(e){tr.innerHTML='<div class="al al-e"><i class="fas fa-times-circle"></i> 请求失败</div>';setTimeout(()=>tr.innerHTML='',5000)}}

// proxy keys
async function genKey(){const name=await pM('输入 Key 名称（可选）');if(name===null)return;showM('<h3><i class="fas fa-key" style="color:#4f6ef7;"></i> 生成转发 Key</h3><div class="fg"><label>有效期</label><select id="exp"><option value="30d">30 天</option><option value="90d">90 天</option><option value="180d">180 天</option><option value="1y">1 年</option><option value="forever" selected>永久</option></select></div><div class="fa"><button class="btn btn-s" id="gKc">取消</button><button class="btn btn-p" id="gKo">生成</button></div>');document.getElementById('gKc').addEventListener('click',closeM);document.getElementById('gKo').addEventListener('click',function(){doGenKey(document.getElementById('exp').value,name)})}

async function doGenKey(exp,name){closeM();const nm=name||'';const r=await fetch('/admin/api/proxy-keys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:nm,expiresIn:exp})});const d=await r.json();if(d.success&&d.data){showM('<h3><i class="fas fa-check-circle" style="color:#16a34a;"></i> 生成成功</h3><p>请立即复制保存，关闭后将不再显示：</p><div class="mk">'+d.data.key+'</div><div class="fa"><button class="btn btn-p" onclick="closeM();location.reload()">关闭</button></div>')}else toast(d.message||'生成失败','error')}

	async function rmKey(id){if(!(await cM('确定要删除此 Key？')))return;const r=await fetch('/admin/api/proxy-keys/'+encodeURIComponent(id),{method:'DELETE'});const d=await r.json();if(d.success){toast('已删除','success');location.reload()}else toast(d.message||'删除失败','error')}

// proxy key list interactions
function togglePb(id,checked){const pi=document.querySelector('.pi[data-id="'+id+'"]');if(!pi)return;const b=pi.querySelector('.ps .bd');if(b){b.textContent=checked?'已启用':'未启用';b.className='bd '+(checked?'bd-on':'bd-off')}}
function toggleKeyVis(id){const el=document.getElementById('kv-'+id);const full=el.dataset.full;if(el.textContent.includes('****')){el.textContent=full}else{el.textContent=full.length>12?full.substring(0,8)+'****'+full.substring(full.length-4):full}}
async function toggleProxyKey(id,checked){const r=await fetch('/admin/api/proxy-keys/'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:checked})});const d=await r.json();if(d.success){const ki=document.querySelector('.ki[data-id="'+id+'"]');if(ki){const b=ki.querySelector('.fc .bd');if(b){b.textContent=checked?'已启用':'已禁用';b.className='bd '+(checked?'bd-on':'bd-off')}}}else toast(d.message||'操作失败','error')}
</script>
</body></html>`)
}
