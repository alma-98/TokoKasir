const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const KEY='tokokasir_mvp_v1';
const seed={
 settings:{businessName:'Toko Sejahtera',ownerName:'Pemilik Toko',phone:'+62 852 8339 7198',email:'alma.budsteddy88@gmail.com'},
 products:[
  {id:1,name:'Kopi Susu Gula Aren',category:'Minuman',price:18000,stock:32,sold:0},
  {id:2,name:'Americano',category:'Minuman',price:15000,stock:25,sold:0},
  {id:3,name:'Nasi Goreng Spesial',category:'Makanan',price:28000,stock:18,sold:0},
  {id:4,name:'Mie Goreng',category:'Makanan',price:22000,stock:20,sold:0},
  {id:5,name:'Air Mineral',category:'Minuman',price:6000,stock:50,sold:0},
  {id:6,name:'Roti Bakar',category:'Snack',price:16000,stock:12,sold:0}
 ],
 customers:[
  {id:1,name:'Budi Santoso',phone:'081234567890',email:'budi@example.com'},
  {id:2,name:'Siti Rahma',phone:'081298765432',email:'siti@example.com'}
 ],
 branches:[{id:1,name:'Cabang Utama',location:'Indonesia',active:true}],
 transactions:[],
 cart:[],payment:'Tunai'
};
let state=load();
function load(){try{return JSON.parse(localStorage.getItem(KEY))||structuredClone(seed)}catch(e){return structuredClone(seed)}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function rupiah(n){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0)}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function todayKey(d=new Date()){return new Date(d).toLocaleDateString('en-CA')}
function initials(s){return (s||'PT').split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

const pageMeta={
 dashboard:['Dashboard','Ringkasan performa bisnis Anda'],pos:['Kasir / POS','Buat transaksi penjualan baru'],
 products:['Produk & Stok','Kelola katalog dan persediaan'],transactions:['Transaksi','Riwayat penjualan bisnis'],
 customers:['Pelanggan','Database dan loyalitas pelanggan'],reports:['Laporan','Analisis performa penjualan'],
 branches:['Multi-Cabang','Kelola seluruh lokasi bisnis'],ai:['AI Insight','Analisis dan rekomendasi berbasis data'],
 settings:['Pengaturan','Konfigurasi profil bisnis']
};
function openPage(name){
 $$('.page').forEach(x=>x.classList.remove('active')); $('#page-'+name).classList.add('active');
 $$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===name));
 $('#pageTitle').textContent=pageMeta[name][0]; $('#pageSubtitle').textContent=pageMeta[name][1];
 $('#sidebar').classList.remove('open'); renderAll();
}
$$('.nav-item').forEach(b=>b.onclick=()=>openPage(b.dataset.page));
document.addEventListener('click',e=>{const b=e.target.closest('[data-open-page]');if(b)openPage(b.dataset.openPage)});
$$('.go-pos').forEach(b=>b.onclick=()=>openPage('pos'));
$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');

$('#loginForm').onsubmit=e=>{
 e.preventDefault(); if($('#loginPin').value!=='1234')return toast('PIN demo salah. Gunakan 1234.');
 state.settings.ownerName=$('#loginName').value||state.settings.ownerName;save();
 $('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');renderAll();
};
$('#logoutBtn').onclick=()=>{$('#appView').classList.add('hidden');$('#loginView').classList.remove('hidden')};

function renderAll(){renderHeader();renderDashboard();renderPOS();renderProducts();renderTransactions();renderCustomers();renderReports();renderBranches();renderAI();renderSettings()}
function renderHeader(){
 $('#welcomeName').textContent=`Halo, ${state.settings.ownerName} 👋`;
 $('#avatar').textContent=initials(state.settings.ownerName);
 const active=state.branches.find(b=>b.active)||state.branches[0];$('#activeBranch').textContent=active?.name||'Cabang Utama';
}
function renderDashboard(){
 const today=state.transactions.filter(t=>t.date.startsWith(todayKey()));
 const rev=today.reduce((a,t)=>a+t.total,0), low=state.products.filter(p=>p.stock<=5).length;
 $('#statRevenue').textContent=rupiah(rev);$('#statTransactions').textContent=today.length;$('#statProducts').textContent=state.products.length;
 $('#statCustomers').textContent=state.customers.length;$('#lowStockText').textContent=`${low} stok menipis`;
 const days=[...Array(7)].map((_,i)=>{let d=new Date();d.setDate(d.getDate()-(6-i));return d});
 const vals=days.map(d=>state.transactions.filter(t=>t.date.startsWith(todayKey(d))).reduce((a,t)=>a+t.total,0));
 const max=Math.max(...vals,1);
 $('#salesChart').innerHTML=days.map((d,i)=>`<div class="bar-col"><div class="bar" title="${rupiah(vals[i])}" style="height:${Math.max(3,vals[i]/max*100)}%"></div><small>${d.toLocaleDateString('id-ID',{weekday:'short'})}</small></div>`).join('');
 const top=[...state.products].sort((a,b)=>b.sold-a.sold).slice(0,5);
 $('#topProducts').innerHTML=top.map((p,i)=>`<div class="rank-item"><span class="rank-num">${i+1}</span><div class="rank-info"><b>${esc(p.name)}</b><small>${p.sold} terjual</small></div><strong>${rupiah(p.price)}</strong></div>`).join('');
 $('#dashboardAiText').textContent=aiSummary();
}
function aiSummary(){
 if(!state.transactions.length)return 'Mulai lakukan transaksi untuk mendapatkan insight otomatis dari data penjualan.';
 const best=[...state.products].sort((a,b)=>b.sold-a.sold)[0];
 const low=state.products.filter(p=>p.stock<=5);
 return `${best?.name||'Produk'} adalah produk terlaris dengan ${best?.sold||0} item terjual. ${low.length?`${low.length} produk perlu segera direstok.`:'Kondisi stok saat ini masih aman.'}`;
}
function renderPOS(){
 const q=($('#productSearch')?.value||'').toLowerCase(), cat=$('#categoryFilter')?.value||'';
 const cats=[...new Set(state.products.map(p=>p.category))];
 const old=$('#categoryFilter').value;$('#categoryFilter').innerHTML='<option value="">Semua Kategori</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join('');$('#categoryFilter').value=old;
 const products=state.products.filter(p=>p.name.toLowerCase().includes(q)&&(!cat||p.category===cat));
 $('#posProducts').innerHTML=products.map(p=>`<div class="product-card" onclick="addToCart(${p.id})"><div class="product-thumb">${esc(p.name[0])}</div><h4>${esc(p.name)}</h4><p>${esc(p.category)} · Stok ${p.stock}</p><strong>${rupiah(p.price)}</strong></div>`).join('')||'<div class="empty">Produk tidak ditemukan.</div>';
 $('#saleCustomer').innerHTML='<option value="">Pelanggan Umum</option>'+state.customers.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
 renderCart();
}
$('#productSearch').oninput=renderPOS;$('#categoryFilter').onchange=renderPOS;
window.addToCart=id=>{
 const p=state.products.find(x=>x.id===id);if(!p||p.stock<=0)return toast('Stok produk habis.');
 const c=state.cart.find(x=>x.id===id);if(c){if(c.qty>=p.stock)return toast('Jumlah melebihi stok.');c.qty++}else state.cart.push({id,qty:1});
 save();renderCart();
};
window.changeQty=(id,n)=>{const c=state.cart.find(x=>x.id===id),p=state.products.find(x=>x.id===id);if(!c)return;c.qty+=n;if(c.qty>p.stock)c.qty=p.stock;if(c.qty<=0)state.cart=state.cart.filter(x=>x.id!==id);save();renderCart()};
function renderCart(){
 const items=state.cart.map(c=>({...c,p:state.products.find(p=>p.id===c.id)})).filter(x=>x.p);
 $('#cartItems').innerHTML=items.length?items.map(x=>`<div class="cart-item"><div><h4>${esc(x.p.name)}</h4><small>${rupiah(x.p.price)} × ${x.qty}</small></div><div class="qty"><button onclick="changeQty(${x.id},-1)">−</button><b>${x.qty}</b><button onclick="changeQty(${x.id},1)">+</button></div></div>`).join(''):'<div class="empty">Belum ada item.<br>Pilih produk untuk memulai.</div>';
 const subtotal=items.reduce((a,x)=>a+x.p.price*x.qty,0),discount=Number($('#discount').value)||0,total=Math.max(0,subtotal-discount);
 $('#cartCount').textContent=`${items.reduce((a,x)=>a+x.qty,0)} item`;$('#subtotal').textContent=rupiah(subtotal);$('#grandTotal').textContent=rupiah(total);
}
$('#discount').oninput=renderCart;$('#clearCart').onclick=()=>{state.cart=[];save();renderCart()};
$$('.pay-method').forEach(b=>b.onclick=()=>{$$('.pay-method').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.payment=b.dataset.method;save()});
$('#checkoutBtn').onclick=()=>{
 if(!state.cart.length)return toast('Keranjang masih kosong.');
 const items=state.cart.map(c=>{const p=state.products.find(p=>p.id===c.id);return{id:p.id,name:p.name,price:p.price,qty:c.qty}}),subtotal=items.reduce((a,x)=>a+x.price*x.qty,0),discount=Number($('#discount').value)||0,total=Math.max(0,subtotal-discount);
 for(const item of items){const p=state.products.find(x=>x.id===item.id);if(p.stock<item.qty)return toast(`Stok ${p.name} tidak cukup.`)}
 items.forEach(item=>{const p=state.products.find(x=>x.id===item.id);p.stock-=item.qty;p.sold+=item.qty});
 const cid=Number($('#saleCustomer').value)||null,cust=state.customers.find(c=>c.id===cid);
 const tx={id:'TRX-'+Date.now().toString().slice(-8),date:new Date().toISOString(),customer:cust?.name||'Pelanggan Umum',customerPhone:cust?.phone||'',items,payment:state.payment,subtotal,discount,total};
 state.transactions.unshift(tx);state.cart=[];save();$('#discount').value=0;renderAll();showReceipt(tx);
};
function showReceipt(tx){
 $('#receiptContent').innerHTML=`<div style="text-align:center"><b>${esc(state.settings.businessName)}</b><p>${new Date(tx.date).toLocaleString('id-ID')}<br>${tx.id}</p></div>${tx.items.map(i=>`<div class="receipt-line"><span>${esc(i.name)} × ${i.qty}</span><b>${rupiah(i.price*i.qty)}</b></div>`).join('')}<div class="receipt-line receipt-total"><span>Total</span><b>${rupiah(tx.total)}</b></div><div class="receipt-line"><span>Pembayaran</span><b>${tx.payment}</b></div>`;
 $('#receiptModal').classList.remove('hidden');$('#whatsappReceipt').onclick=()=>{const text=encodeURIComponent(`Struk ${state.settings.businessName}\n${tx.id}\nTotal: ${rupiah(tx.total)}\nTerima kasih.`);const phone=tx.customerPhone.replace(/\D/g,'').replace(/^0/,'62');window.open(phone?`https://wa.me/${phone}?text=${text}`:`https://wa.me/?text=${text}`,'_blank')};
}
$('#printReceipt').onclick=()=>window.print();

function renderProducts(){
 $('#productTable').innerHTML=state.products.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.category)}</td><td>${rupiah(p.price)}</td><td>${p.stock}</td><td><span class="status ${p.stock<=5?'low':'ok'}">${p.stock<=5?'Stok Menipis':'Tersedia'}</span></td><td><button class="action-btn" onclick="editProduct(${p.id})">Edit</button><button class="action-btn" onclick="deleteProduct(${p.id})">Hapus</button></td></tr>`).join('');
}
function openModal(id){$(id).classList.remove('hidden')}function closeModals(){$$('.modal').forEach(m=>m.classList.add('hidden'))}
$$('.close-modal').forEach(b=>b.onclick=closeModals);$$('.modal').forEach(m=>m.onclick=e=>{if(e.target===m)closeModals()});
$('#addProductBtn').onclick=()=>{$('#productForm').reset();$('#productId').value='';$('#productModalTitle').textContent='Tambah Produk';openModal('#productModal')};
window.editProduct=id=>{const p=state.products.find(x=>x.id===id);$('#productId').value=p.id;$('#productName').value=p.name;$('#productCategory').value=p.category;$('#productPrice').value=p.price;$('#productStock').value=p.stock;$('#productModalTitle').textContent='Edit Produk';openModal('#productModal')};
window.deleteProduct=id=>{if(confirm('Hapus produk ini?')){state.products=state.products.filter(p=>p.id!==id);save();renderAll()}};
$('#productForm').onsubmit=e=>{e.preventDefault();const id=Number($('#productId').value),data={name:$('#productName').value,category:$('#productCategory').value,price:Number($('#productPrice').value),stock:Number($('#productStock').value)};if(id){Object.assign(state.products.find(p=>p.id===id),data)}else state.products.push({id:Date.now(),...data,sold:0});save();closeModals();renderAll();toast('Produk berhasil disimpan.')};

function renderTransactions(){
 $('#transactionTable').innerHTML=state.transactions.length?state.transactions.map(t=>`<tr><td><b>${t.id}</b></td><td>${new Date(t.date).toLocaleString('id-ID')}</td><td>${esc(t.customer)}</td><td>${t.items.reduce((a,i)=>a+i.qty,0)}</td><td>${t.payment}</td><td><b>${rupiah(t.total)}</b></td></tr>`).join(''):'<tr><td colspan="6"><div class="empty">Belum ada transaksi.</div></td></tr>';
}
function csvDownload(filename,rows){const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n'),blob=new Blob([csv],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href)}
$('#exportTransactions').onclick=$('#exportReport').onclick=()=>csvDownload('tokokasir-transaksi.csv',[['ID','Waktu','Pelanggan','Pembayaran','Total'],...state.transactions.map(t=>[t.id,t.date,t.customer,t.payment,t.total])]);

function renderCustomers(){
 $('#customerGrid').innerHTML=state.customers.map(c=>`<div class="customer-card"><div class="customer-avatar">${initials(c.name)}</div><h4>${esc(c.name)}</h4><p>☎ ${esc(c.phone||'-')}</p><p>✉ ${esc(c.email||'-')}</p><button class="action-btn" onclick="deleteCustomer(${c.id})" style="margin-top:12px">Hapus</button></div>`).join('')||'<div class="empty">Belum ada pelanggan.</div>';
}
$('#addCustomerBtn').onclick=()=>{$('#customerForm').reset();openModal('#customerModal')};
$('#customerForm').onsubmit=e=>{e.preventDefault();state.customers.push({id:Date.now(),name:$('#customerName').value,phone:$('#customerPhone').value,email:$('#customerEmail').value});save();closeModals();renderAll();toast('Pelanggan ditambahkan.')};
window.deleteCustomer=id=>{if(confirm('Hapus pelanggan ini?')){state.customers=state.customers.filter(c=>c.id!==id);save();renderAll()}};

function renderReports(){
 const rev=state.transactions.reduce((a,t)=>a+t.total,0),count=state.transactions.length,items=state.transactions.reduce((a,t)=>a+t.items.reduce((b,i)=>b+i.qty,0),0);
 $('#reportRevenue').textContent=rupiah(rev);$('#reportTransactions').textContent=count;$('#reportAverage').textContent=rupiah(count?rev/count:0);$('#reportItems').textContent=items;
 const pays=['Tunai','QRIS','Transfer'].map(name=>({name,count:state.transactions.filter(t=>t.payment===name).length})),max=Math.max(...pays.map(x=>x.count),1);
 $('#paymentReport').innerHTML=pays.map(x=>`<div class="progress-row"><div><span>${x.name}</span><b>${x.count} transaksi</b></div><div class="progress"><span style="width:${x.count/max*100}%"></span></div></div>`).join('');
 const top=[...state.products].sort((a,b)=>b.sold-a.sold).slice(0,5),m=Math.max(...top.map(x=>x.sold),1);
 $('#productReport').innerHTML=top.map(x=>`<div class="progress-row"><div><span>${esc(x.name)}</span><b>${x.sold} item</b></div><div class="progress"><span style="width:${x.sold/m*100}%"></span></div></div>`).join('');
}
function renderBranches(){
 $('#branchGrid').innerHTML=state.branches.map(b=>`<div class="branch-card"><span class="status ${b.active?'ok':''}">${b.active?'Aktif':'Cabang'}</span><h4>${esc(b.name)}</h4><p>⌖ ${esc(b.location)}</p><button class="action-btn" onclick="activateBranch(${b.id})" style="margin-top:12px">${b.active?'Cabang Aktif':'Jadikan Aktif'}</button></div>`).join('');
}
$('#addBranchBtn').onclick=()=>{$('#branchForm').reset();openModal('#branchModal')};
$('#branchForm').onsubmit=e=>{e.preventDefault();state.branches.push({id:Date.now(),name:$('#branchName').value,location:$('#branchLocation').value,active:false});save();closeModals();renderAll();toast('Cabang ditambahkan.')};
window.activateBranch=id=>{state.branches.forEach(b=>b.active=b.id===id);save();renderAll()};

function renderAI(){
 const best=[...state.products].sort((a,b)=>b.sold-a.sold)[0],low=state.products.filter(p=>p.stock<=5),rev=state.transactions.reduce((a,t)=>a+t.total,0);
 const insights=[
  ['📈','Performa Penjualan',state.transactions.length?`Total omzet tercatat ${rupiah(rev)} dari ${state.transactions.length} transaksi.`:'Belum cukup data transaksi untuk membaca tren penjualan.'],
  ['🏆','Produk Unggulan',best&&best.sold?`${best.name} memimpin dengan ${best.sold} item terjual.`:'Produk terlaris akan muncul setelah transaksi dilakukan.'],
  ['📦','Kesehatan Stok',low.length?`${low.length} produk memiliki stok 5 atau kurang dan perlu perhatian.`:'Semua stok produk berada pada level aman.']
 ];
 $('#insightGrid').innerHTML=insights.map(i=>`<div class="insight-card"><div class="insight-icon">${i[0]}</div><h3>${i[1]}</h3><p>${i[2]}</p></div>`).join('');
 const rec=[];if(low.length)rec.push(`Restok ${low.slice(0,3).map(p=>p.name).join(', ')} sebelum kehabisan.`);if(best&&best.sold)rec.push(`Pertahankan ketersediaan ${best.name} karena memiliki penjualan tertinggi.`);if(!state.customers.length)rec.push('Mulai kumpulkan database pelanggan untuk program loyalitas.');if(!rec.length)rec.push('Terus kumpulkan data transaksi agar rekomendasi menjadi semakin relevan.');
 $('#recommendations').innerHTML=rec.map((r,i)=>`<div class="recommendation"><span>${i+1}</span><div><b>Prioritas ${i+1}</b><p>${esc(r)}</p></div></div>`).join('');
}
function renderSettings(){
 $('#businessName').value=state.settings.businessName;$('#ownerName').value=state.settings.ownerName;$('#businessPhone').value=state.settings.phone;$('#businessEmail').value=state.settings.email;
}
$('#saveSettings').onclick=()=>{state.settings={businessName:$('#businessName').value,ownerName:$('#ownerName').value,phone:$('#businessPhone').value,email:$('#businessEmail').value};save();renderAll();toast('Pengaturan disimpan.')};
$('#resetDemo').onclick=()=>{if(confirm('Reset semua data demo?')){state=structuredClone(seed);save();renderAll();toast('Data demo berhasil direset.')}};

renderAll();

/* =========================================
   TOKOKASIR PLAN DEMO
========================================= */

const planParams = new URLSearchParams(window.location.search);
const currentPlan = planParams.get("plan") || "pro";

const planConfig = {
  free: {
    name: "GRATIS",
    price: "Rp0 / bulan"
  },

  pro: {
    name: "PRO",
    price: "Rp99.000 / bulan"
  },

  business: {
    name: "BUSINESS",
    price: "Rp299.000 / bulan"
  }
};

function applyPlanDemo() {

  const plan = planConfig[currentPlan] || planConfig.pro;

  console.log(
    "TokoKasir Demo:",
    plan.name,
    plan.price
  );

  const title = document.querySelector("#pageTitle");

  if (title) {
    title.setAttribute(
      "data-plan",
      plan.name
    );
  }

  /*
  ==========================================
  FREE PLAN
  ==========================================
  */

  if (currentPlan === "free") {

    const lockedPages = [
      "customers",
      "ai",
      "branches"
    ];

    document
      .querySelectorAll(".nav-item")
      .forEach(item => {

        if (
          lockedPages.includes(
            item.dataset.page
          )
        ) {

          item.innerHTML += " 🔒";

          item.onclick = function(event) {

            event.preventDefault();

            alert(
              "Fitur ini tersedia di TokoKasir Pro atau Business."
            );

          };

        }

      });

  }

  /*
  ==========================================
  PRO PLAN
  ==========================================
  */

  if (currentPlan === "pro") {

    document
      .querySelectorAll(
        '[data-page="branches"]'
      )
      .forEach(item => {

        item.innerHTML += " 🔒";

        item.onclick = function(event) {

          event.preventDefault();

          alert(
            "Multi-Cabang tersedia di TokoKasir Business."
          );

        };

      });

  }

  /*
  ==========================================
  BUSINESS PLAN
  ==========================================
  */

  if (currentPlan === "business") {

    document.body.classList.add(
      "business-plan"
    );

  }

}

applyPlanDemo();

const planBadge =
  document.getElementById("planBadge");

if (planBadge) {

  planBadge.textContent =
    "DEMO " +
    currentPlan.toUpperCase();

}
