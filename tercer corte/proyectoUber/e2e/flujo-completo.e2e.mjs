/*
 * PRUEBA END-TO-END (E2E) - flujo completo en el navegador
 * Requiere: mock-backend en :8000 y `ng serve` en :4200.
 * Ejecutar con el runner Playwright/patchright:
 *   node browser.mjs http://localhost:4200/login --script e2e/flujo-completo.e2e.mjs
 * Guarda capturas en docs/capturas/ (usadas en PRUEBAS.md).
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SHOTS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'capturas');

export default async function run(page) {
  const steps = [];
  const ok = (id, text) => steps.push(`✔ ${id} ${text}`);
  const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  const btn = (name) => page.locator('ion-button', { hasText: name }).first();
  const toastText = async () => {
    await page.waitForSelector('ion-toast', { timeout: 5000 });
    await page.waitForFunction(() => document.querySelector('ion-toast')?.shadowRoot?.querySelector('.toast-message')?.textContent);
    const text = await page.locator('ion-toast').last()
      .evaluate((t) => t.shadowRoot.querySelector('.toast-message').textContent.trim());
    await page.evaluate(() => document.querySelectorAll('ion-toast').forEach((t) => t.remove()));
    return text;
  };
  const wait = (ms) => page.waitForTimeout(ms);

  async function quickLogin(index) {
    await page.goto('http://localhost:4200/login');
    await page.waitForSelector('text=Ingreso Rápido por Rol');
    await page.locator('.account').nth(index).locator('ion-button', { hasText: 'Entrar' }).click();
    // Se descarta el toast "Inicio de sesión exitoso" para no confundirlo con el siguiente.
    await toastText();
  }
  async function logout() {
    await page.locator('ion-button.logout').click();
    await page.waitForURL('**/login');
  }

  await page.setViewportSize({ width: 375, height: 667 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // ---------- E2E-01 Login ----------
  await page.waitForSelector('text=Bienvenido a Uber');
  await wait(400);
  await shot('01-login');
  await page.locator('.account').first().scrollIntoViewIfNeeded();
  await shot('02-ingreso-rapido');
  ok('E2E-01', 'Pantalla de login con pestañas e ingreso rápido por rol');

  // ---------- E2E-02 Credenciales inválidas ----------
  await page.locator('ion-input[name=login] input').fill('cliente@uber.com');
  await page.locator('ion-input[name=password] input').fill('incorrecta');
  await btn('Ingresar a la Plataforma').click();
  const bad = await toastText();
  if (!bad.includes('Credenciales inválidas')) throw new Error(`E2E-02 toast inesperado: ${bad}`);
  ok('E2E-02', `Clave incorrecta -> "${bad}"`);

  // ---------- E2E-03 Cliente solicita viaje ----------
  await quickLogin(0);
  await page.waitForURL('**/client');
  await page.waitForSelector('text=Solicitar Viaje');
  await wait(1500); // mosaicos del mapa
  await shot('03-cliente-solicitar');
  await btn('Estimar tarifa').click();
  await page.waitForSelector('text=Estimación del servidor');
  const estimate = await page.locator('.estimate .total').innerText();
  if (!estimate.includes('6.500')) throw new Error(`E2E-03 estimación inesperada ${estimate}`);
  await page.locator('.estimate').scrollIntoViewIfNeeded();
  await shot('04-cliente-estimacion');
  ok('E2E-03', `Estimación del servidor = ${estimate}`);

  await btn('Confirmar viaje').click();
  await page.waitForSelector('text=Buscando conductor…');
  await wait(800);
  await shot('05-cliente-buscando');
  ok('E2E-04', 'Viaje solicitado: estado "Buscando conductor"');
  await logout();

  // ---------- E2E-05 Conductor acepta y ejecuta el viaje ----------
  await quickLogin(1);
  await page.waitForURL('**/driver');
  await page.waitForSelector('text=Carlos Rodríguez');
  await page.locator('ion-toggle').first().click();
  await page.waitForSelector('text=Disponibilidad cambiada a: En línea');
  await page.waitForSelector('text=Parque de la 93', { timeout: 8000 });
  await wait(1200);
  await shot('06-conductor-disponible');
  ok('E2E-05', 'Conductor en línea ve la solicitud pendiente');

  await page.locator('.request ion-button', { hasText: 'Aceptar' }).first().click();
  await page.waitForSelector('text=Llegué al punto de recogida');
  await wait(3500); // al menos un envío GPS
  await shot('07-conductor-viaje-asignado');
  ok('E2E-06', 'Solicitud aceptada; transmisión GPS activa');

  await btn('Llegué al punto de recogida').click();
  await page.waitForSelector('ion-button:has-text("Iniciar viaje")');
  await btn('Iniciar viaje').click();
  await page.waitForSelector('ion-button:has-text("Finalizar viaje")');
  await wait(6500); // el carro avanza en la simulación
  await page.locator('.gps-title').scrollIntoViewIfNeeded();
  await shot('08-conductor-gps-en-vivo');
  const sent = await page.locator('.sent').innerText();
  ok('E2E-07', `Llegada e inicio registrados; ${sent}`);

  await btn('Finalizar viaje').click();
  const fin = await toastText();
  if (!fin.startsWith('Viaje finalizado')) throw new Error(`E2E-08 ${fin}`);
  ok('E2E-08', fin);
  await logout();

  // ---------- E2E-09 Cliente califica ----------
  await quickLogin(0);
  await page.waitForURL('**/client');
  await page.waitForSelector('.trip ion-button:has-text("Calificar")');
  await page.locator('.trip ion-button', { hasText: 'Calificar' }).first().click();
  await page.waitForSelector('text=¿Cómo estuvo tu viaje?');
  await page.locator('.star-row button').nth(3).click();
  await page.locator('ion-modal ion-textarea textarea').fill('Muy buen servicio, carro limpio.');
  await wait(600);
  await shot('09-cliente-calificar');
  await page.locator('ion-modal ion-button', { hasText: 'Enviar calificación' }).click();
  const thanks = await toastText();
  await page.waitForSelector('ion-modal', { state: 'detached' }).catch(() => undefined);
  await wait(600);
  await page.locator('.trip').first().scrollIntoViewIfNeeded();
  await shot('10-cliente-historial');
  ok('E2E-09', `Calificación 4★ -> "${thanks}"`);
  await logout();

  // ---------- E2E-10 Conductor pendiente ----------
  await quickLogin(2);
  await page.waitForURL('**/driver');
  await page.waitForSelector('text=Andrés Torres');
  await page.locator('ion-toggle').first().click();
  const pending = await toastText();
  await wait(400);
  await shot('11-conductor-pendiente');
  const checked = await page.locator('ion-toggle').first().evaluate((t) => t.checked);
  if (checked) throw new Error('E2E-10 el toggle quedó encendido');
  ok('E2E-10', `Conductor pendiente -> "${pending}" y el interruptor vuelve a apagado`);
  await logout();

  // ---------- E2E-11 Administrador ----------
  await quickLogin(3);
  await page.waitForURL('**/admin');
  await page.waitForSelector('text=Ingresos totales');
  await wait(800);
  const revenue = await page.locator('.revenue b').innerText();
  await shot('12-admin-panel');
  ok('E2E-11', `Panel admin: ingresos ${revenue}`);

  await page.locator('ion-segment-button[value=drivers]').click();
  await page.waitForSelector('text=Andrés Torres (Pendiente)');
  const card = page.locator('ion-card', { hasText: 'Andrés Torres (Pendiente)' });
  await card.locator('ion-button', { hasText: 'Aprobar' }).click();
  await page.waitForSelector('ion-alert');
  await page.locator('ion-alert button', { hasText: 'Aprobar' }).click();
  const approved = await toastText();
  await wait(600);
  await shot('13-admin-conductores');
  ok('E2E-12', `Aprobación de conductor -> "${approved}"`);

  await page.locator('ion-segment-button[value=audit]').click();
  await page.waitForSelector('.log');
  await wait(400);
  await shot('14-admin-auditoria');
  ok('E2E-13', `Auditoría: ${await page.locator('.log').count()} registros`);

  // ---------- E2E-14 Guard por rol ----------
  await page.goto('http://localhost:4200/client');
  await page.waitForURL('**/admin');
  ok('E2E-14', 'Un admin que abre /client es redirigido a /admin');

  return steps;
}
