const assert = require('node:assert/strict');
const path = require('node:path');
const {mkdirSync} = require('node:fs');
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright' : 'playwright');
const root = path.resolve(__dirname, '..');
const previewFile = process.argv[2] || path.join(root, 'test-results/liam-preview.html');
mkdirSync(path.join(root, 'test-results'), {recursive: true});
(async () => {
  const browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const page = await browser.newPage({viewport: {width: 393, height: 852}, isMobile: true, hasTouch: true});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(require('node:url').pathToFileURL(previewFile).href + '#register');
  await page.waitForSelector('.select-trigger');
  assert.equal(await page.locator('#register-form select').count(), 6);
  assert.equal(await page.locator('#register-form .select-trigger').count(), 6);
  const select = name => page.locator(`select[name="${name}"]`);
  const trigger = name => select(name).locator('..').locator('.select-trigger');
  async function choose(name, value) {
    await trigger(name).click();
    await page.getByRole('option', {name: value, exact: true}).click();
    assert.equal(await page.locator('dialog').evaluate(el => el.open), false);
    assert.equal(await trigger(name).getAttribute('aria-expanded'), 'false');
  }
  await choose('schoolId', 'Mi colegio aún no aparece');
  assert.equal(await page.locator('#school-request').isVisible(), true);
  await choose('grade', '3°');
  await choose('day', '8');
  await choose('month', 'Oct');
  await choose('year', '2018');
  await choose('age', '8');
  assert.deepEqual(await page.evaluate(() => {
    const data = new FormData(document.querySelector('#register-form'));
    return ['schoolId', 'grade', 'day', 'month', 'year', 'age'].map(key => data.get(key));
  }), ['request', '3', '8', '10', '2018', '8']);
  await trigger('grade').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  assert.equal(await select('grade').inputValue(), '4');
  await trigger('age').click();
  await page.keyboard.press('Escape');
  assert.equal(await trigger('age').evaluate(el => el === document.activeElement), true);
  await trigger('schoolId').click();
  await page.getByRole('searchbox').fill('NoExiste123');
  assert.equal(await page.getByText('No encontramos ese colegio.').isVisible(), true);
  await page.getByRole('searchbox').fill('Mi colegio');
  assert.equal(await page.getByRole('option').count(), 1);
  await page.getByRole('button', {name: 'Cerrar opciones'}).click();
  for (const width of [320, 360, 393, 480]) {
    await page.setViewportSize({width, height: 852});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Registration overflow ' + width);
    for (const name of ['day', 'month', 'year']) {
      const bounds = await trigger(name).evaluate(el => ({width: el.clientWidth, content: el.scrollWidth, valueHeight: el.firstChild.getBoundingClientRect().height}));
      assert.equal(bounds.content <= bounds.width, true, `${name} clipped at ${width}`);
      assert.ok(bounds.valueHeight < 30, `${name} wraps at ${width}`);
    }
    const background = () => page.locator('.screen').evaluate(el => {
      const style = getComputedStyle(el);
      return {width: style.width, image: style.backgroundImage, size: style.backgroundSize};
    });
    const before = await background();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    assert.deepEqual(await background(), before, 'Background changes on scroll');
    await page.setViewportSize({width, height: 710});
    assert.deepEqual(await background(), before, 'Background changes with mobile chrome height');
    await trigger('year').click();
    const openWidth = await page.locator('.screen').evaluate(el => getComputedStyle(el).width);
    assert.equal(openWidth, before.width, 'Backdrop resizes background');
    const dialog = await page.locator('dialog').boundingBox();
    assert.ok(dialog.width <= width && dialog.x >= 0 && dialog.y >= 0);
    await page.getByRole('button', {name: 'Cerrar opciones'}).click();
  }
  await page.setViewportSize({width: 393, height: 852});
  await trigger('year').click();
  await page.screenshot({path: root + '/test-results/09-selectors.png'});
  await page.getByRole('button', {name: 'Cerrar opciones'}).click();
  await page.locator('fieldset').scrollIntoViewIfNeeded();
  await page.screenshot({path: root + '/test-results/08-registration.png'});
  // Exercise native constraint validation without a backend or real account.
  await page.evaluate(() => {
    const form = document.createElement('form');
    form.id = 'qa-form';
    form.innerHTML = '<label class="field"><span>Campo de prueba</span><select name="qa" required><option value="">Elige</option><option value="ok">Correcto</option></select></label><button type="submit">Probar</button>';
    form.addEventListener('submit', event => { event.preventDefault(); form.dataset.submitted = 'yes'; });
    document.querySelector('#app').append(form);
  });
  await page.locator('#qa-form .select-trigger').waitFor();
  await page.locator('#qa-form [type=submit]').click();
  assert.equal(await page.locator('#qa-form').getAttribute('data-submitted'), null);
  assert.equal(await page.locator('#qa-form .select-trigger').getAttribute('aria-invalid'), 'true');
  await choose('qa', 'Correcto');
  await page.locator('#qa-form [type=submit]').click();
  assert.equal(await page.locator('#qa-form').getAttribute('data-submitted'), 'yes');
  await page.locator('#qa-form').evaluate(el => el.reset());
  await page.waitForFunction(() => document.querySelector('#qa-form .select-value').textContent === 'Elige');
  await page.locator('#qa-form').evaluate(el => el.remove());
  await page.locator('[data-role=teacher]').click();
  assert.equal(await page.locator('#register-form .select-trigger').count(), 1);
  await trigger('schoolId').click();
  await page.evaluate(() => location.hash = 'preview');
  await page.waitForSelector('.bottom-nav');
  assert.equal(await page.locator('dialog').evaluate(el => el.open), false);
  assert.equal(await page.locator('html').getAttribute('class'), '');
  await page.locator('.bottom-nav [data-nav=profile]').click();
  await page.getByRole('button', {name: 'Área de padres'}).click();
  await page.getByRole('button', {name: 'ABRIR ÁREA DE PADRES'}).click();
  await page.getByRole('button', {name: 'CREAR REFUERZO'}).click();
  await choose('subject', 'Ciencias Naturales');
  await choose('goal', 'Repasar la clase');
  await page.getByRole('button', {name: 'Crear una actividad manual'}).click();
  await page.getByRole('button', {name: 'CREAR ACTIVIDAD',exact:true}).click();
  await page.locator('#activity-editor').waitFor();
  await choose('subject', 'Arte');
  await choose('a0', 'C');
  assert.equal(await select('a0').inputValue(), '2');
  for (const width of [320, 393, 480]) {
    await page.setViewportSize({width, height: 852});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('PASS: all registration selectors, keyboard, search, validation, reset, role/route changes, reinforcement/manual selectors; 320/360/393/480px; stable scenery on scroll, resize and dialog open; no JS errors.');
})().catch(error => { console.error(error); process.exit(1); });
