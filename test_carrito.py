# check: en el carrito no hay boton de cerrar por WhatsApp, y el pegazulejo se agrega
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium'); pg=b.new_page()
    pg.add_init_script("localStorage.setItem('bt_carrito', JSON.stringify([{codigo:'X',nombre:'Prueba',formato:'10X10',unidad:'M2',cant:1,precio:100}]))")
    pg.goto('http://localhost:8899/carrito/', wait_until='networkidle'); pg.wait_for_timeout(300)
    assert pg.query_selector('#wa') is None, 'no debe haber boton de WhatsApp en el carrito'
    assert pg.is_visible('.complemento'), 'debe verse la sugerencia de pegazulejo'
    n0=len(pg.query_selector_all('#filas tr'))
    pg.click('.add-pega'); pg.wait_for_timeout(300)
    n1=len(pg.query_selector_all('#filas tr'))
    assert n1==n0+1, (n0,n1)
    cod=pg.evaluate("JSON.parse(localStorage.getItem('bt_carrito')).map(x=>x.codigo)")
    print('OK  carrito sin WhatsApp · pegazulejo agregado ->', cod)
    b.close()
