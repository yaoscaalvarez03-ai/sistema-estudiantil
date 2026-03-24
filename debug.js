import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log('PAGE UNCAUGHT ERROR:', err.message);
  });

  try {
    console.log('Navegando a la home...');
    await page.goto('http://localhost:5173/');

    console.log('Ingresando credenciales...');
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', 'geraldpoveda98@gmail.com');
    await page.type('input[name="password"]', '123456');
    
    console.log('Haciendo submit...');
    await page.click('button[type="submit"]');

    // Esperar a que la url cambie a /admin (si el login es exitoso o ya estaba)
    console.log('Esperando red...');
    await new Promise(r => setTimeout(r, 4000));
    
    console.log('URL actual tras click:', page.url());

    console.log('Navegando a /admin/students...');
    await page.goto('http://localhost:5173/admin/students', { waitUntil: 'networkidle0' });

    console.log('Esperando...');
    await new Promise(r => setTimeout(r, 2000));
    console.log('Hecho. URL final:', page.url());
  } catch (e) {
    console.log('PUPPETEER SCRIPT ERROR:', e);
  } finally {
    await browser.close();
  }
})();
