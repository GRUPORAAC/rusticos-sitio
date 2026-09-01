# check minimo: filtrar por color muestra el boton; al darle, vuelve a verse todo
from playwright.sync_api import sync_playwright
U='http://localhost:8899/azulejo/esmaltados/'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    pg=b.new_page(); pg.goto(U, wait_until='networkidle')
    vis=lambda: pg.eval_on_selector_all('.tarjeta','els=>els.filter(e=>!e.hidden).length')
    total=vis(); assert total>1, total
    assert pg.is_hidden('#quitar-filtro'), 'el boton no debe verse sin filtro'
    pg.click('.fila .gota')                      # primera familia de color
    pg.wait_for_timeout(200)
    filtrado=vis(); assert filtrado<total, (filtrado,total)
    assert pg.is_visible('#quitar-filtro'), 'el boton debe verse con filtro'
    pg.click('#quitar-filtro'); pg.wait_for_timeout(200)
    assert vis()==total, (vis(), total)
    assert pg.is_hidden('#quitar-filtro')
    print(f'OK  {total} productos -> {filtrado} filtrados -> {vis()} al quitar el filtro')
    b.close()
