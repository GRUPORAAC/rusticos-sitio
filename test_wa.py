# check minimo: el boton de WhatsApp solo aparece con CP fuera de rango
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    pg=b.new_page()
    pg.add_init_script("localStorage.setItem('bt_carrito', JSON.stringify([{codigo:'X',nombre:'Prueba',formato:'10X10',unidad:'M2',cant:1,precio:100}]))")
    pg.goto('http://localhost:8899/pagar/', wait_until='networkidle')
    pg.wait_for_timeout(300)
    casos=[('04120','CDMX, dentro',False), ('57000','Neza, dentro (alta)',False), ('44100','Guadalajara, fuera',True)]
    for cp,eti,esperado in casos:
        pg.fill('[name=cp]',''); pg.fill('[name=cp]',cp); pg.wait_for_timeout(250)
        got=pg.is_visible('#wa')
        print(f'  CP {cp} ({eti}): WhatsApp visible={got} esperado={esperado}')
        assert got==esperado, (cp,got,esperado)
    print('OK')
    b.close()
